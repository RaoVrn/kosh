import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Db } from './db.js'
import { healthRoutes } from './routes/health.js'
import { BadJsonError, itemsRoutes } from './routes/items.js'
import { notificationsRoutes } from './routes/notifications.js'
import { projectsRoutes } from './routes/projects.js'
import { captureRoutes } from './routes/capture.js'
import { transcribeRoutes } from './routes/transcribe.js'
import { ValidationError } from './items/validation.js'
import type { CaptureService } from './ai/capture/service.js'
import type { TranscriptionService } from './ai/transcription/service.js'

export interface AppServices {
  capture?: CaptureService
  transcribe?: TranscriptionService
}

export function createApp(db: Db, services: AppServices = {}): Hono {
  const app = new Hono()

  app.use(
    '/api/*',
    cors({
      origin: (origin) => {
        if (!origin) return origin
        try {
          const url = new URL(origin)
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return origin
        } catch {
          return null
        }
        return null
      },
    }),
  )

  app.onError((err, c) => {
    if (err instanceof ValidationError || err instanceof BadJsonError) {
      return c.json({ error: { message: err.message } }, 400)
    }
    console.error(err)
    return c.json({ error: { message: 'Internal server error' } }, 500)
  })

  app.get('/', (c) => c.json({ name: 'kosh-api', status: 'ok' }))
  app.route('/api/v1', healthRoutes(db))
  app.route('/api/v1/items', itemsRoutes(db))
  app.route('/api/v1/notifications', notificationsRoutes(db))
  app.route('/api/v1/projects', projectsRoutes(db))
  app.route('/api/v1/capture', captureRoutes(db, services.capture))
  app.route('/api/v1/transcribe', transcribeRoutes(services.transcribe))

  return app
}
