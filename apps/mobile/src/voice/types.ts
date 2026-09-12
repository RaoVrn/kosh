export type VoiceStage =
  | 'idle'
  | 'permission'
  | 'preparing'
  | 'recording'
  | 'stopping'
  | 'uploading'
  | 'transcribing'
  | 'transcriptReady'
  | 'interpreting'
  | 'error'

export interface VoiceRecording {
  uri?: string
  blob?: Blob
  name: string
  mime: string
}

export interface VoiceRecorder {
  readonly supported: boolean
  requestPermission: () => Promise<boolean>
  start: () => Promise<void>
  stop: () => Promise<VoiceRecording>
  cancel: () => Promise<void>
  dispose: () => void
}
