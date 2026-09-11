import type { Db } from '../db.js'
import type { Item, ItemStatus, ItemType, Priority } from '@kosh/shared'
import { uid } from '@kosh/shared'

const COLUMNS =
  'id, type, status, title, body, url, due_at, reminder_at, reminded_at, priority, tags, created_at, updated_at, done_at'

export interface ItemRow {
  id: string
  type: string
  status: string
  title: string
  body: string | null
  url: string | null
  due_at: string | null
  reminder_at: string | null
  reminded_at: string | null
  priority: string | null
  tags: string | null
  created_at: string
  updated_at: string
  done_at: string | null
}

export interface CreateItemData {
  title: string
  type: ItemType
  status: ItemStatus
  priority: Priority | null
  body?: string | null
  url?: string | null
  dueAt?: string | null
  reminderAt?: string | null
  tags?: string[] | null
}

export type UpdateItemData = Partial<CreateItemData>

export interface ListFilters {
  type?: string
  status?: string
  limit?: number
  offset?: number
}

export interface SearchItemFilters {
  type?: string
  status?: string
  query: string
  limit?: number
  offset?: number
}

function toItem(row: ItemRow): Item {
  let tags: string[] | null = null
  if (row.tags) {
    try {
      const parsed: unknown = JSON.parse(row.tags)
      if (Array.isArray(parsed)) {
        tags = parsed.filter((t): t is string => typeof t === 'string')
        if (tags.length === 0) tags = null
      }
    } catch {
      tags = null
    }
  }
  return {
    id: row.id,
    type: row.type as ItemType,
    status: row.status as ItemStatus,
    title: row.title,
    body: row.body,
    url: row.url,
    dueAt: row.due_at,
    reminderAt: row.reminder_at,
    remindedAt: row.reminded_at,
    priority: row.priority as Priority | null,
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    doneAt: row.done_at,
  }
}

function rowValues(item: Item): (string | null)[] {
  return [
    item.id,
    item.type,
    item.status,
    item.title,
    item.body ?? null,
    item.url ?? null,
    item.dueAt ?? null,
    item.reminderAt ?? null,
    item.remindedAt ?? null,
    item.priority ?? null,
    item.tags && item.tags.length > 0 ? JSON.stringify(item.tags) : null,
    item.createdAt,
    item.updatedAt,
    item.doneAt ?? null,
  ]
}

export function insertItem(db: Db, item: Item): Item {
  db.prepare(
    `INSERT INTO items (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(...rowValues(item))
  return item
}

export function createItem(db: Db, data: CreateItemData): Item {
  const now = new Date().toISOString()
  const item: Item = {
    id: uid(),
    type: data.type,
    status: data.status,
    title: data.title,
    body: data.body ?? null,
    url: data.url ?? null,
    dueAt: data.dueAt ?? null,
    reminderAt: data.reminderAt ?? null,
    remindedAt: null,
    priority: data.priority,
    tags: data.tags && data.tags.length > 0 ? data.tags : null,
    createdAt: now,
    updatedAt: now,
    doneAt: null,
  }
  return insertItem(db, item)
}

export function listItems(db: Db, filters: ListFilters = {}): Item[] {
  const where: string[] = []
  const params: (string | number)[] = []
  if (filters.type) {
    where.push('type = ?')
    params.push(filters.type)
  }
  if (filters.status) {
    where.push('status = ?')
    params.push(filters.status)
  }
  let sql =
    `SELECT ${COLUMNS} FROM items` +
    (where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY created_at DESC'
  if (filters.limit !== undefined) {
    sql += ' LIMIT ?'
    params.push(filters.limit)
  }
  if (filters.offset) {
    sql += ' OFFSET ?'
    params.push(filters.offset)
  }
  const rows = db.prepare(sql).all(...params) as unknown as ItemRow[]
  return rows.map(toItem)
}

export function searchItems(db: Db, filters: SearchItemFilters): Item[] {
  const cols = COLUMNS.split(', ')
    .map((c) => `items.${c}`)
    .join(', ')
  let sql =
    `SELECT ${cols} FROM items ` +
    'JOIN (SELECT rowid, bm25(items_fts) AS rank FROM items_fts WHERE items_fts MATCH ?) AS f ' +
    'ON f.rowid = items.rowid'
  const params: (string | number)[] = [filters.query]
  const where: string[] = []
  if (filters.type) {
    where.push('items.type = ?')
    params.push(filters.type)
  }
  if (filters.status) {
    where.push('items.status = ?')
    params.push(filters.status)
  }
  if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`
  sql += ' ORDER BY f.rank'
  if (filters.limit !== undefined) {
    sql += ' LIMIT ?'
    params.push(filters.limit)
  }
  if (filters.offset) {
    sql += ' OFFSET ?'
    params.push(filters.offset)
  }
  const rows = db.prepare(sql).all(...params) as unknown as ItemRow[]
  return rows.map(toItem)
}

export function getItem(db: Db, id: string): Item | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM items WHERE id = ?`).get(id) as ItemRow | undefined
  return row ? toItem(row) : null
}

export function updateItem(db: Db, id: string, patch: UpdateItemData): Item | null {
  const existing = getItem(db, id)
  if (!existing) return null

  const next: Item = { ...existing }
  if (patch.title !== undefined) next.title = patch.title
  if (patch.body !== undefined) next.body = patch.body
  if (patch.url !== undefined) next.url = patch.url
  if (patch.type !== undefined) next.type = patch.type
  if (patch.status !== undefined) next.status = patch.status
  if (patch.priority !== undefined) next.priority = patch.priority
  if (patch.dueAt !== undefined) next.dueAt = patch.dueAt
  if (patch.reminderAt !== undefined) next.reminderAt = patch.reminderAt
  if (patch.reminderAt !== undefined) {
    next.reminderAt = patch.reminderAt
    next.remindedAt = null
  }
  if (patch.tags !== undefined) next.tags = patch.tags && patch.tags.length > 0 ? patch.tags : null

  if (patch.status !== undefined) {
    next.doneAt = patch.status === 'done' ? new Date().toISOString() : null
  }
  next.updatedAt = new Date().toISOString()

  db.prepare(
    `UPDATE items SET type = ?, status = ?, title = ?, body = ?, url = ?, due_at = ?,
      reminder_at = ?, reminded_at = ?, priority = ?, tags = ?, updated_at = ?, done_at = ? WHERE id = ?`,
  ).run(
    next.type,
    next.status,
    next.title,
    next.body ?? null,
    next.url ?? null,
    next.dueAt ?? null,
    next.reminderAt ?? null,
    next.remindedAt ?? null,
    next.priority ?? null,
    next.tags && next.tags.length > 0 ? JSON.stringify(next.tags) : null,
    next.updatedAt,
    next.doneAt ?? null,
    id,
  )
  return getItem(db, id)
}

export function listDueReminders(db: Db, nowIso: string): Item[] {
  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM items
       WHERE type = 'task' AND status NOT IN ('done', 'archived')
         AND reminder_at IS NOT NULL AND reminded_at IS NULL AND reminder_at <= ?
       ORDER BY reminder_at ASC`,
    )
    .all(nowIso) as unknown as ItemRow[]
  return rows.map(toItem)
}

export function claimReminder(db: Db, id: string, nowIso: string): boolean {
  const result = db
    .prepare('UPDATE items SET reminded_at = ? WHERE id = ? AND reminded_at IS NULL')
    .run(nowIso, id)
  return result.changes > 0
}

export function deleteItem(db: Db, id: string): boolean {
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(id)
  return result.changes > 0
}

export function countItems(db: Db): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM items').get() as { count: number }
  return Number(row.count)
}
