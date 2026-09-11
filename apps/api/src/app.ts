import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Db } from './db.js'
import { healthRoutes } from './routes/health.js'
import { BadJsonError, itemsRoutes } from './routes/items.js'
import { notificationsRoutes } from './routes/notifications.js'
import { ValidationError } from './items/validation.js'

export function createApp(db: Db): Hono {
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

  return app
}
