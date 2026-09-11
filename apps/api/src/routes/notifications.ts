import { Hono } from 'hono'
import type { Db } from '../db.js'
import * as notifRepo from '../notifications/repo.js'
import { ValidationError, isValidIsoDate, parseId } from '../items/validation.js'

export function notificationsRoutes(db: Db): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const unread = c.req.query('unread') === 'true'
    const notifications = notifRepo.listNotifications(db, { unread })
    return c.json({ data: notifications })
  })

  app.patch('/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400)
    }
    const notification = notifRepo.markNotificationRead(db, id, parseReadAt(body))
    if (!notification) return c.json({ error: { message: 'Notification not found' } }, 404)
    return c.json({ data: notification })
  })

  return app
}

function parseReadAt(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object')
  }
  const value = (body as Record<string, unknown>).readAt
  if (value === undefined) return new Date().toISOString()
  if (value === null) return null
  if (!isValidIsoDate(value)) throw new ValidationError('readAt must be a valid ISO-8601 date')
  return value
}
