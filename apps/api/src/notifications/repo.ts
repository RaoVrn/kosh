import type { Db } from '../db.js'
import type { KoshNotification } from '@kosh/shared'
import { uid } from '@kosh/shared'

const COLUMNS = 'id, item_id, type, title, body, created_at, read_at'

export interface NotificationRow {
  id: string
  item_id: string | null
  type: string
  title: string
  body: string | null
  created_at: string
  read_at: string | null
}

export interface CreateNotificationData {
  itemId: string | null
  type: string
  title: string
  body?: string | null
}

function toNotification(row: NotificationRow): KoshNotification {
  return {
    id: row.id,
    itemId: row.item_id,
    type: row.type,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  }
}

export function createNotification(db: Db, data: CreateNotificationData): KoshNotification {
  const now = new Date().toISOString()
  const row: NotificationRow = {
    id: uid(),
    item_id: data.itemId,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    created_at: now,
    read_at: null,
  }
  db.prepare(`INSERT INTO notifications (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    row.id,
    row.item_id,
    row.type,
    row.title,
    row.body,
    row.created_at,
    row.read_at,
  )
  return toNotification(row)
}

export function listNotifications(db: Db, filters: { unread?: boolean } = {}): KoshNotification[] {
  const where = filters.unread ? ' WHERE read_at IS NULL' : ''
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM notifications${where} ORDER BY created_at DESC`)
    .all() as unknown as NotificationRow[]
  return rows.map(toNotification)
}

export function getNotification(db: Db, id: string): KoshNotification | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM notifications WHERE id = ?`).get(id) as
    NotificationRow | undefined
  return row ? toNotification(row) : null
}

export function markNotificationRead(
  db: Db,
  id: string,
  readAt: string | null,
): KoshNotification | null {
  const result = db.prepare('UPDATE notifications SET read_at = ? WHERE id = ?').run(readAt, id)
  if (result.changes === 0) return null
  return getNotification(db, id)
}
