import { Hono } from 'hono'
import type { Db } from '../db.js'
import type { CaptureService } from '../ai/capture/service.js'
import { findProjectByName } from '../projects/repo.js'
import { AiProviderError, CaptureValidationError } from '../ai/types.js'

const MAX_CAPTURE_LENGTH = 4000

export function captureRoutes(db: Db, service: CaptureService | undefined): Hono {
  const app = new Hono()

  app.post('/interpret', async (c) => {
    if (!service) {
      return c.json({ error: { message: "Smart capture isn't configured." } }, 503)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400)
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return c.json({ error: { message: 'Request body must be a JSON object' } }, 400)
    }
    const record = body as Record<string, unknown>

    if (typeof record.text !== 'string' || record.text.trim() === '') {
      return c.json({ error: { message: 'text is required' } }, 400)
    }
    const text = record.text.trim()
    if (text.length > MAX_CAPTURE_LENGTH) {
      return c.json(
        { error: { message: `text is too long (max ${MAX_CAPTURE_LENGTH} characters)` } },
        400,
      )
    }

    const timezone =
      typeof record.timezone === 'string' &&
      record.timezone.length > 0 &&
      record.timezone.length <= 100
        ? record.timezone
        : undefined
    const currentTime =
      typeof record.currentTime === 'string' && !Number.isNaN(Date.parse(record.currentTime))
        ? record.currentTime
        : undefined

    try {
      const result = await service.interpret({ text, timezone, currentTime })
      let projectId: string | null = null
      if (result.projectName) {
        const project = findProjectByName(db, result.projectName)
        if (project && !project.archivedAt) {
          projectId = project.id
        }
      }
      result.projectId = projectId
      return c.json({ data: result })
    } catch (err) {
      if (err instanceof AiProviderError) {
        return c.json(
          { error: { message: "Kosh couldn't interpret this right now. Your capture is safe." } },
          502,
        )
      }
      if (err instanceof CaptureValidationError) {
        return c.json({ error: { message: "Kosh couldn't understand this clearly." } }, 422)
      }
      throw err
    }
  })

  return app
}
