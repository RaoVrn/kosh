import type { TranscriptionProvider } from '../types.js'

export interface TranscriptionService {
  transcribe: (input: { audio: Uint8Array; mime: string; filename: string }) => Promise<string>
}

export function createTranscriptionService(provider: TranscriptionProvider): TranscriptionService {
  return {
    transcribe: (input) => provider.transcribe(input),
  }
}
