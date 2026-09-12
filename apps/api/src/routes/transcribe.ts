import { Hono } from 'hono'
import type { TranscriptionService } from '../ai/transcription/service.js'
import { AiProviderError } from '../ai/types.js'

const MAX_AUDIO_BYTES = 10 * 1024 * 1024
const ALLOWED_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'application/ogg',
])

export function transcribeRoutes(service: TranscriptionService | undefined): Hono {
  const app = new Hono()

  app.post('/', async (c) => {
    if (!service) {
      return c.json({ error: { message: "Transcription isn't configured." } }, 503)
    }

    const body = await c.req.parseBody()
    const file = body['audio']
    if (!file || typeof file === 'string') {
      return c.json(
        { error: { message: 'An audio file is required (multipart field "audio")' } },
        400,
      )
    }

    const mime = file.type || ''
    if (!ALLOWED_MIMES.has(mime)) {
      return c.json({ error: { message: 'Unsupported audio format' } }, 400)
    }

    const audio = new Uint8Array(await file.arrayBuffer())
    if (audio.byteLength === 0) {
      return c.json({ error: { message: 'Empty audio file' } }, 400)
    }
    if (audio.byteLength > MAX_AUDIO_BYTES) {
      return c.json(
        {
          error: { message: `Audio file is too large (max ${MAX_AUDIO_BYTES / (1024 * 1024)} MB)` },
        },
        413,
      )
    }

    console.log(
      `[voice] transcription: received ${file.name || 'recording'} (${mime}, ${audio.byteLength} bytes)`,
    )

    try {
      const text = await service.transcribe({
        audio,
        mime,
        filename: file.name || 'recording',
      })
      if (!text.trim()) {
        return c.json({ error: { message: 'No speech detected in the recording.' } }, 422)
      }
      console.log('[voice] transcription: returning transcript to client')
      return c.json({ data: { text } })
    } catch (err) {
      if (err instanceof AiProviderError) {
        return c.json(
          { error: { message: "Your recording couldn't be transcribed. Try again." } },
          502,
        )
      }
      throw err
    }
  })

  return app
}
