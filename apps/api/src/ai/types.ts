export interface InterpretCaptureInput {
  text: string
  timezone?: string
  currentTime?: string
  systemPrompt: string
}

export interface AiProvider {
  interpretCapture: (input: InterpretCaptureInput) => Promise<string>
}

export interface TranscribeInput {
  audio: Uint8Array
  mime: string
  filename: string
}

export interface TranscriptionProvider {
  transcribe: (input: TranscribeInput) => Promise<string>
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiProviderError'
  }
}

export class CaptureValidationError extends Error {
  constructor(message = 'The AI returned invalid output') {
    super(message)
    this.name = 'CaptureValidationError'
  }
}
