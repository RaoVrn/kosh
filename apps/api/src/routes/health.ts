import { Hono } from 'hono'
import type { HealthResponse } from '@kosh/shared'
import type { Db } from '../db.js'

export function healthRoutes(db: Db): Hono {
  const app = new Hono()

  app.get('/health', (c) => {
    db.prepare('SELECT 1').get()
    return c.json<HealthResponse>({ status: 'ok', db: 'ok' })
  })

  return app
}
