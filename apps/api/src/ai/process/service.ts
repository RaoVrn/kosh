import type { InboxProcessingResult } from '@kosh/shared'
import type { AiProvider } from '../types.js'
import { processingPromptV1 } from './prompt.js'
import { validateProcessingOutput } from './validate.js'

export interface ProcessingService {
  process: (input: {
    text: string
    timezone?: string
    currentTime?: string
  }) => Promise<InboxProcessingResult>
}

export function createProcessingService(provider: AiProvider): ProcessingService {
  return {
    async process({ text, timezone, currentTime }) {
      const raw = await provider.interpretCapture({
        text,
        timezone,
        currentTime,
        systemPrompt: processingPromptV1,
      })
      return validateProcessingOutput(raw, text)
    },
  }
}
