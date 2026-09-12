import { describe, expect, it } from 'vitest'
import { initialVoiceFlowState, voiceFlowReducer } from '../src/voice/flow'

describe('voice flow state machine', () => {
  it('sequences the native lifecycle: permission → preparing → recording', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    expect(s.stage).toBe('permission')
    s = voiceFlowReducer(s, { type: 'preparing' })
    expect(s.stage).toBe('preparing')
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    expect(s.stage).toBe('recording')
  })

  it('never enters recording when initialization fails', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'prepareFailed', error: 'Could not start recording.' })
    expect(s.stage).toBe('error')
    expect(s.error).toBe('Could not start recording.')

    const again = voiceFlowReducer(s, { type: 'recordingStarted' })
    expect(again.stage).toBe('error')
  })

  it('turns permission denial into a controlled error state', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    s = voiceFlowReducer(s, {
      type: 'permissionDenied',
      error: 'Microphone permission was denied.',
    })
    expect(s.stage).toBe('error')
    expect(s.error).toBe('Microphone permission was denied.')
  })

  it('only ticks the timer while actually recording', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'tick' })
    expect(s.seconds).toBe(0)

    s = voiceFlowReducer(s, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    s = voiceFlowReducer(s, { type: 'tick' })
    s = voiceFlowReducer(s, { type: 'tick' })
    expect(s.stage).toBe('recording')
    expect(s.seconds).toBe(2)

    s = voiceFlowReducer(s, { type: 'stopping' })
    const after = voiceFlowReducer(s, { type: 'tick' })
    expect(after.seconds).toBe(2)
  })

  it('moves stop → uploading → transcribing → transcriptReady', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    s = voiceFlowReducer(s, { type: 'stopping' })
    expect(s.stage).toBe('stopping')
    s = voiceFlowReducer(s, { type: 'uploading' })
    expect(s.stage).toBe('uploading')
    s = voiceFlowReducer(s, { type: 'transcribing' })
    expect(s.stage).toBe('transcribing')
    s = voiceFlowReducer(s, { type: 'transcribed' })
    expect(s.stage).toBe('transcriptReady')
  })

  it('surfaces transcription errors safely and returns to idle on reset', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    s = voiceFlowReducer(s, { type: 'stopping' })
    s = voiceFlowReducer(s, { type: 'uploading' })
    s = voiceFlowReducer(s, { type: 'transcribing' })
    s = voiceFlowReducer(s, {
      type: 'transcribeFailed',
      error: "Your recording couldn't be transcribed. Try again.",
    })
    expect(s.stage).toBe('error')
    expect(s.error).toContain('couldn')

    s = voiceFlowReducer(s, { type: 'reset' })
    expect(s).toEqual(initialVoiceFlowState)
  })

  it('allows recording again after an error via reset', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'permissionDenied', error: 'denied' })
    s = voiceFlowReducer(s, { type: 'reset' })
    expect(s.stage).toBe('idle')

    s = voiceFlowReducer(s, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    expect(s.stage).toBe('recording')
  })

  it('allows recording again from transcriptReady via reset', () => {
    let s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    s = voiceFlowReducer(s, { type: 'stopping' })
    s = voiceFlowReducer(s, { type: 'uploading' })
    s = voiceFlowReducer(s, { type: 'transcribing' })
    s = voiceFlowReducer(s, { type: 'transcribed' })
    expect(s.stage).toBe('transcriptReady')

    s = voiceFlowReducer(s, { type: 'reset' })
    s = voiceFlowReducer(s, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    expect(s.stage).toBe('recording')
  })

  it('moves transcriptReady → interpreting and back on interpret failure', () => {
    let s: ReturnType<typeof voiceFlowReducer>
    s = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    s = voiceFlowReducer(s, { type: 'preparing' })
    s = voiceFlowReducer(s, { type: 'recordingStarted' })
    s = voiceFlowReducer(s, { type: 'stopping' })
    s = voiceFlowReducer(s, { type: 'uploading' })
    s = voiceFlowReducer(s, { type: 'transcribing' })
    s = voiceFlowReducer(s, { type: 'transcribed' })
    s = voiceFlowReducer(s, { type: 'interpreting' })
    expect(s.stage).toBe('interpreting')
    s = voiceFlowReducer(s, { type: 'interpretFailed' })
    expect(s.stage).toBe('transcriptReady')
  })

  it('ignores invalid transitions for the current stage', () => {
    const idle = voiceFlowReducer(initialVoiceFlowState, { type: 'recordingStarted' })
    expect(idle.stage).toBe('idle')

    const request = voiceFlowReducer(initialVoiceFlowState, { type: 'request' })
    const earlyStop = voiceFlowReducer(request, { type: 'stopping' })
    expect(earlyStop.stage).toBe('permission')

    const preparing = voiceFlowReducer(request, { type: 'preparing' })
    const skipStop = voiceFlowReducer(preparing, { type: 'transcribing' })
    expect(skipStop.stage).toBe('preparing')
  })
})
