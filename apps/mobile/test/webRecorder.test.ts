import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebRecorder, pickSupportedMimeType } from '../src/voice/webRecorder'
import type { WebMediaRecorderLike } from '../src/voice/webRecorder'

function makeTrack() {
  return { stop: vi.fn() }
}

function makeStream() {
  const trackA = makeTrack()
  const trackB = makeTrack()
  return {
    stream: { getTracks: () => [trackA, trackB] } as unknown as MediaStream,
    tracks: [trackA, trackB],
  }
}

class FakeMediaRecorder implements WebMediaRecorderLike {
  static instances: FakeMediaRecorder[] = []
  state = 'inactive'
  mimeType = 'audio/webm;codecs=opus'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  started = false
  failToStart = false

  constructor(public stream: MediaStream, public options?: { mimeType?: string }) {
    if (options?.mimeType) this.mimeType = options.mimeType
    FakeMediaRecorder.instances.push(this)
  }

  start() {
    if (this.failToStart) return
    this.state = 'recording'
    this.started = true
    this.ondataavailable?.({ data: new Blob(['audio-chunk']) })
  }

  stop() {
    this.state = 'inactive'
    this.onstop?.()
  }
}

function makeDeps(overrides: Partial<{ failToStart: boolean }> = {}) {
  const recorded = makeStream()
  const getUserMedia = vi.fn(async () => recorded.stream)
  class Recorder extends FakeMediaRecorder {
    constructor(stream: MediaStream, options?: { mimeType?: string }) {
      super(stream, options)
      this.failToStart = overrides.failToStart ?? false
    }
  }
  return {
    deps: { getUserMedia, MediaRecorderCtor: Recorder },
    recorded,
    getUserMedia,
  }
}

describe('pickSupportedMimeType', () => {
  it('selects the first MIME the browser supports', () => {
    const selected = pickSupportedMimeType(
      ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'],
      (mime) => mime === 'audio/ogg;codecs=opus',
    )
    expect(selected).toEqual({
      full: 'audio/ogg;codecs=opus',
      base: 'audio/ogg',
      extension: 'ogg',
    })
  })

  it('falls back to mp4 when only mp4 is supported', () => {
    const selected = pickSupportedMimeType(
      ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'],
      (mime) => mime === 'audio/mp4',
    )
    expect(selected?.base).toBe('audio/mp4')
    expect(selected?.extension).toBe('m4a')
  })

  it('returns null when nothing is supported', () => {
    expect(pickSupportedMimeType(['audio/webm'], () => false)).toBeNull()
  })
})

describe('createWebRecorder (browser MediaRecorder adapter)', () => {
  beforeEach(() => {
    FakeMediaRecorder.instances = []
  })

  it('requests permission via getUserMedia and releases the probe stream', async () => {
    const { deps, recorded, getUserMedia } = makeDeps()
    const recorder = createWebRecorder(deps)

    expect(await recorder.requestPermission()).toBe(true)
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(recorded.tracks[0].stop).toHaveBeenCalled()
    expect(recorded.tracks[1].stop).toHaveBeenCalled()
  })

  it('reports permission denial as a controlled false, not a throw', async () => {
    const deps = {
      getUserMedia: vi.fn(async (): Promise<MediaStream> => {
        throw new Error('Permission denied')
      }),
      MediaRecorderCtor: FakeMediaRecorder,
    }
    const recorder = createWebRecorder(deps)
    expect(await recorder.requestPermission()).toBe(false)
  })

  it('starts recording through MediaRecorder after acquiring the stream', async () => {
    const { deps, getUserMedia, recorded } = makeDeps()
    const recorder = createWebRecorder(deps)

    await recorder.start()
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(FakeMediaRecorder.instances).toHaveLength(1)
    expect(FakeMediaRecorder.instances[0].started).toBe(true)
    expect(FakeMediaRecorder.instances[0].stream).toBe(recorded.stream)
  })

  it('passes a supported MIME type to the recorder and uses it for the Blob', async () => {
    const { deps } = makeDeps()
    const recorder = createWebRecorder(deps)

    await recorder.start()
    const recording = await recorder.stop()

    expect(FakeMediaRecorder.instances[0].options?.mimeType).toBe('audio/webm;codecs=opus')
    expect(recording.mime).toBe('audio/webm')
    expect(recording.name).toBe('recording.webm')
    expect(recording.blob?.type).toBe('audio/webm')
  })

  it('throws when the recorder fails to enter the recording state', async () => {
    const { deps } = makeDeps({ failToStart: true })
    const recorder = createWebRecorder(deps)
    await expect(recorder.start()).rejects.toThrow(/recording state/)
  })

  it('stops recording, collects chunks into a Blob and stops the tracks', async () => {
    const { deps, recorded } = makeDeps()
    const recorder = createWebRecorder(deps)

    await recorder.start()
    const recording = await recorder.stop()

    expect(recording.name).toBe('recording.webm')
    expect(recording.mime).toBe('audio/webm')
    expect(recording.blob).toBeInstanceOf(Blob)
    expect(recording.blob?.size).toBeGreaterThan(0)
    expect(recorded.tracks[0].stop).toHaveBeenCalled()
    expect(recorded.tracks[1].stop).toHaveBeenCalled()
  })

  it('throws when stopping without an active recording', async () => {
    const { deps } = makeDeps()
    const recorder = createWebRecorder(deps)
    await expect(recorder.stop()).rejects.toThrow('No active recording')
  })

  it('cancel stops the media stream tracks', async () => {
    const { deps, recorded } = makeDeps()
    const recorder = createWebRecorder(deps)

    await recorder.start()
    await recorder.cancel()
    expect(recorded.tracks[0].stop).toHaveBeenCalled()
    expect(recorded.tracks[1].stop).toHaveBeenCalled()
    await expect(recorder.stop()).rejects.toThrow('No active recording')
  })

  it('cancel is safe to call twice (no double-stop crash)', async () => {
    const { deps } = makeDeps()
    const recorder = createWebRecorder(deps)
    await recorder.start()
    await recorder.cancel()
    await expect(recorder.cancel()).resolves.toBeUndefined()
  })

  it('fails controlled when MediaRecorder is unsupported', async () => {
    const recorder = createWebRecorder()
    expect(recorder.supported).toBe(false)
    expect(await recorder.requestPermission()).toBe(false)
    await expect(recorder.start()).rejects.toThrow(/not supported/)
  })
})