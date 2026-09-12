import type { VoiceRecorder, VoiceRecording } from './types'
import { canUseMediaRecorder } from './platform'

export interface WebMediaRecorderLike {
  readonly state: string
  readonly mimeType: string
  ondataavailable: ((event: { data: Blob }) => void) | null
  onstop: (() => void) | null
  onerror: ((event: unknown) => void) | null
  start: () => void
  stop: () => void
}

export interface WebRecorderDeps {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  MediaRecorderCtor: new (stream: MediaStream, options?: { mimeType?: string }) => WebMediaRecorderLike
}

function defaultGetUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(constraints)
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

type MediaRecorderCtor = new (
  stream: MediaStream,
  options?: { mimeType?: string },
) => WebMediaRecorderLike

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
]

interface SelectedMime {
  full: string
  base: string
  extension: string
}

function baseMime(full: string): string {
  return full.split(';')[0].trim()
}

function extensionFor(base: string): string {
  if (base.includes('ogg')) return 'ogg'
  if (base.includes('mp4') || base.includes('m4a')) return 'm4a'
  return 'webm'
}

export function pickSupportedMimeType(
  candidates: string[] = MIME_CANDIDATES,
  isTypeSupported: (mimeType: string) => boolean,
): SelectedMime | null {
  for (const candidate of candidates) {
    if (isTypeSupported(candidate)) {
      const base = baseMime(candidate)
      return { full: candidate, base, extension: extensionFor(base) }
    }
  }
  return null
}

export function createWebRecorder(deps?: WebRecorderDeps): VoiceRecorder {
  const supported = Boolean(deps) || canUseMediaRecorder()
  const getUserMedia = deps?.getUserMedia ?? defaultGetUserMedia
  const nativeCtor =
    typeof MediaRecorder === 'undefined' ? null : (MediaRecorder as unknown as MediaRecorderCtor)
  const MediaRecorderCtor: MediaRecorderCtor = deps?.MediaRecorderCtor ?? nativeCtor!

  let stream: MediaStream | null = null
  let mediaRecorder: WebMediaRecorderLike | null = null
  let chunks: Blob[] = []
  let selected: SelectedMime | null = null

  const clear = () => {
    chunks = []
    mediaRecorder = null
    stream = null
  }

  return {
    supported,
    async requestPermission() {
      if (!supported) {
        console.log('[voice] web: MediaRecorder unsupported — permission unavailable')
        return false
      }
      try {
        const probe = await getUserMedia({ audio: true })
        stopTracks(probe)
        console.log('[voice] web: permission granted')
        return true
      } catch (err) {
        console.log('[voice] web: permission denied', err instanceof Error ? err.message : err)
        return false
      }
    },
    async start() {
      if (!supported) {
        throw new Error('MediaRecorder is not supported in this browser')
      }
      const isTypeSupported = deps
        ? (mime: string) => MIME_CANDIDATES.includes(mime)
        : (mime: string) => MediaRecorder.isTypeSupported(mime)
      selected = pickSupportedMimeType(MIME_CANDIDATES, isTypeSupported)
      console.log(
        `[voice] web: mime selected ${selected ? `${selected.full} (${selected.base})` : 'none'}`,
      )

      chunks = []
      const acquired = await getUserMedia({ audio: true })
      stream = acquired
      const recorder = new MediaRecorderCtor(
        acquired,
        selected ? { mimeType: selected.full } : undefined,
      )
      mediaRecorder = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => {}
      recorder.start()
      if (recorder.state !== 'recording') {
        throw new Error('MediaRecorder failed to enter the recording state')
      }
      console.log('[voice] web: recorder started')
    },
    async stop() {
      const recorder = mediaRecorder
      if (!recorder || recorder.state === 'inactive') {
        throw new Error('No active recording')
      }
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve()
        recorder.stop()
      })
      stopTracks(stream)
      console.log(`[voice] web: recorder stopped (${chunks.length} chunk(s))`)
      const mime = selected?.base ?? 'audio/webm'
      const extension = selected?.extension ?? 'webm'
      const blob = new Blob(chunks, { type: mime })
      if (blob.size === 0) {
        throw new Error('Recording produced no audio')
      }
      console.log(`[voice] web: audio blob ${blob.size} bytes (${mime})`)
      const recording: VoiceRecording = {
        blob,
        name: `recording.${extension}`,
        mime,
      }
      clear()
      return recording
    },
    async cancel() {
      const recorder = mediaRecorder
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        try {
          recorder.stop()
        } catch {
          // recorder may already be stopping
        }
      }
      stopTracks(stream)
      clear()
      console.log('[voice] web: cancelled — stream released')
    },
    dispose() {
      void this.cancel()
    },
  }
}