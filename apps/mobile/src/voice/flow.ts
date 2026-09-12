import type { VoiceStage } from './types'

export interface VoiceFlowState {
  stage: VoiceStage
  error: string | null
  seconds: number
}

export type VoiceFlowEvent =
  | { type: 'request' }
  | { type: 'permissionDenied'; error: string }
  | { type: 'preparing' }
  | { type: 'prepareFailed'; error: string }
  | { type: 'recordingStarted' }
  | { type: 'stopping' }
  | { type: 'uploading' }
  | { type: 'transcribing' }
  | { type: 'transcribed' }
  | { type: 'transcribeFailed'; error: string }
  | { type: 'recordingFailed'; error: string }
  | { type: 'interpreting' }
  | { type: 'interpretFailed' }
  | { type: 'tick' }
  | { type: 'reset' }

export const initialVoiceFlowState: VoiceFlowState = {
  stage: 'idle',
  error: null,
  seconds: 0,
}

export function voiceFlowReducer(state: VoiceFlowState, event: VoiceFlowEvent): VoiceFlowState {
  switch (event.type) {
    case 'request':
      return state.stage === 'idle'
        ? { stage: 'permission', error: null, seconds: 0 }
        : state
    case 'permissionDenied':
      return state.stage === 'permission'
        ? { stage: 'error', error: event.error, seconds: 0 }
        : state
    case 'preparing':
      return state.stage === 'permission'
        ? { stage: 'preparing', error: null, seconds: 0 }
        : state
    case 'prepareFailed':
      return state.stage === 'preparing'
        ? { stage: 'error', error: event.error, seconds: 0 }
        : state
    case 'recordingStarted':
      return state.stage === 'preparing'
        ? { stage: 'recording', error: null, seconds: 0 }
        : state
    case 'tick':
      return state.stage === 'recording'
        ? { ...state, seconds: state.seconds + 1 }
        : state
    case 'stopping':
      return state.stage === 'recording'
        ? { stage: 'stopping', error: null, seconds: state.seconds }
        : state
    case 'uploading':
      return state.stage === 'stopping'
        ? { stage: 'uploading', error: null, seconds: state.seconds }
        : state
    case 'transcribing':
      return state.stage === 'uploading'
        ? { stage: 'transcribing', error: null, seconds: state.seconds }
        : state
    case 'transcribed':
      return state.stage === 'transcribing'
        ? { stage: 'transcriptReady', error: null, seconds: state.seconds }
        : state
    case 'transcribeFailed':
      return state.stage === 'transcribing'
        ? { stage: 'error', error: event.error, seconds: 0 }
        : state
    case 'recordingFailed':
      return state.stage === 'recording' || state.stage === 'stopping' || state.stage === 'uploading'
        ? { stage: 'error', error: event.error, seconds: 0 }
        : state
    case 'interpreting':
      return state.stage === 'transcriptReady'
        ? { stage: 'interpreting', error: null, seconds: state.seconds }
        : state
    case 'interpretFailed':
      return state.stage === 'interpreting'
        ? { stage: 'transcriptReady', error: null, seconds: state.seconds }
        : state
    case 'reset':
      return initialVoiceFlowState
  }
}