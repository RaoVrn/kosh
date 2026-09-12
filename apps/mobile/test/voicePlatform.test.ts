import { afterEach, describe, expect, it } from 'vitest'
import { canUseMediaRecorder, isWebPlatform } from '../src/voice/platform'

afterEach(() => {
  delete (globalThis as Record<string, unknown>).MediaRecorder
})

describe('voice platform helpers', () => {
  it('detects web vs native platforms', () => {
    expect(isWebPlatform('web')).toBe(true)
    expect(isWebPlatform('ios')).toBe(false)
    expect(isWebPlatform('android')).toBe(false)
  })

  it('reports MediaRecorder support only when the browser provides it', () => {
    expect(canUseMediaRecorder(() => undefined)).toBe(false)
    expect(canUseMediaRecorder(() => ({}))).toBe(false)
    expect(
      canUseMediaRecorder(() => ({
        mediaDevices: { getUserMedia: () => Promise.resolve({} as MediaStream) },
      })),
    ).toBe(false)
  })

  it('reports support when both getUserMedia and MediaRecorder exist', () => {
    ;(globalThis as Record<string, unknown>).MediaRecorder = class MediaRecorder {}
    expect(
      canUseMediaRecorder(() => ({
        mediaDevices: { getUserMedia: () => Promise.resolve({} as MediaStream) },
      })),
    ).toBe(true)
  })
})
