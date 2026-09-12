import type { AiConfig } from '../config.js'
import { AiProviderError } from '../types.js'
import type { AiProvider, TranscriptionProvider } from '../types.js'

export function createOpenAiCompatibleProvider(config: AiConfig): AiProvider {
  return {
    async interpretCapture({ text, timezone, currentTime, systemPrompt }) {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          response_format: { type: 'json_object' },
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                `currentTime: ${currentTime ?? new Date().toISOString()}`,
                `timezone: ${timezone ?? 'UTC'}`,
                `User capture: ${text}`,
              ].join('\n'),
            },
          ],
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      })

      if (!res.ok) {
        throw new AiProviderError(`AI provider error (${res.status})`)
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const content = body.choices?.[0]?.message?.content
      if (!content) throw new AiProviderError('AI provider returned no content')
      return content
    },
  }
}

export function createOpenAiCompatibleTranscriptionProvider(
  config: AiConfig,
): TranscriptionProvider {
  return {
    async transcribe({ audio, mime, filename }) {
      const form = new FormData()
      form.append('model', config.transcriptionModel)
      form.append('file', new Blob([audio], { type: mime }), filename)

      console.log(
        `[voice] transcription: uploading ${filename} (${mime}, ${audio.byteLength} bytes) to ${config.baseUrl}/audio/transcriptions`,
      )

      const res = await fetch(`${config.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.apiKey}`,
        },
        body: form,
        signal: AbortSignal.timeout(config.transcriptionTimeoutMs),
      })

      if (!res.ok) {
        console.log(
          `[voice] transcription: provider error ${res.status} (model ${config.transcriptionModel})`,
        )
        throw new AiProviderError(`Transcription provider error (${res.status})`)
      }
      const body = (await res.json()) as { text?: string }
      const text = body.text?.trim()
      if (!text) throw new AiProviderError('Transcription provider returned no text')
      console.log(`[voice] transcription: success (${text.length} chars)`)
      return text
    },
  }
}
