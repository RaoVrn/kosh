import { Hono } from 'hono'
import type { Db } from './db.js'
import { healthRoutes } from './routes/health.js'

export function createApp(db: Db): Hono {
  const app = new Hono()

  app.get('/', (c) => c.json({ name: 'kosh-api', status: 'ok' }))
  app.route('/api/v1', healthRoutes(db))

  return app
}
