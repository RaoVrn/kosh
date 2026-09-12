import type { CaptureResult } from '@kosh/shared'
import type { AiProvider } from '../types.js'
import { capturePromptV1 } from './prompt.js'
import { validateCaptureOutput } from './validate.js'

export interface CaptureService {
  interpret: (input: {
    text: string
    timezone?: string
    currentTime?: string
  }) => Promise<CaptureResult>
}

export function createCaptureService(provider: AiProvider): CaptureService {
  return {
    async interpret({ text, timezone, currentTime }) {
      const raw = await provider.interpretCapture({
        text,
        timezone,
        currentTime,
        systemPrompt: capturePromptV1,
      })
      return validateCaptureOutput(raw, text)
    },
  }
}
