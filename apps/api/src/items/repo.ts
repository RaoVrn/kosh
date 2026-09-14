import type { Db } from '../db.js'
import type { Item, ItemStatus, ItemType, Priority, Recurrence } from '@kosh/shared'
import { uid } from '@kosh/shared'
import { listAttachmentsByItem } from '../attachments/repo.js'

const COLUMNS =
  'id, type, status, title, body, url, due_at, reminder_at, reminded_at, priority, tags, ' +
  'recurrence_frequency, recurrence_weekdays, recurrence_month_day, recurrence_id, project_id, ' +
  'created_at, updated_at, done_at'

function readColumns(prefix = ''): string {
  const cols = COLUMNS.split(', ')
    .map((c) => (prefix ? `${prefix}.${c}` : c))
    .join(', ')
  return `${cols}, (SELECT COUNT(*) FROM attachments a WHERE a.item_id = items.id) AS attachment_count`
}

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
  recurrence_frequency: string | null
  recurrence_weekdays: string | null
  recurrence_month_day: number | null
  recurrence_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  done_at: string | null
  attachment_count: number
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
  recurrence?: Recurrence | null
  recurrenceId?: string | null
  projectId?: string | null
}

export type UpdateItemData = Partial<CreateItemData>

export interface ListFilters {
  type?: string
  status?: string
  projectId?: string
  limit?: number
  offset?: number
}

export interface SearchItemFilters {
  type?: string
  status?: string
  projectId?: string
  projectName?: string
  tags?: string[]
  before?: string
  after?: string
  hasAttachment?: boolean
  query: string | null
  limit?: number
  offset?: number
}

export interface SearchPage {
  items: Item[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

function parseRecurrence(row: ItemRow): Recurrence | null {
  const frequency = row.recurrence_frequency
  if (!frequency || frequency === 'none') return null
  if (frequency === 'daily') return { frequency: 'daily' }
  if (frequency === 'monthly') {
    return { frequency: 'monthly', dayOfMonth: row.recurrence_month_day ?? 1 }
  }
  let weekdays: number[] = []
  if (row.recurrence_weekdays) {
    try {
      const parsed: unknown = JSON.parse(row.recurrence_weekdays)
      if (Array.isArray(parsed)) {
        weekdays = parsed.filter((d): d is number => typeof d === 'number')
      }
    } catch {
      weekdays = []
    }
  }
  return { frequency: 'weekly', weekdays }
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
    recurrence: parseRecurrence(row),
    recurrenceId: row.recurrence_id,
    projectId: row.project_id,
    attachmentCount: Number(row.attachment_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    doneAt: row.done_at,
  }
}

function recurrenceColumns(item: Item): {
  frequency: string
  weekdays: string | null
  monthDay: number | null
  id: string | null
} {
  const rec = item.recurrence
  if (!rec || rec.frequency === 'none') {
    return { frequency: 'none', weekdays: null, monthDay: null, id: item.recurrenceId ?? null }
  }
  return {
    frequency: rec.frequency,
    weekdays:
      rec.frequency === 'weekly' && rec.weekdays && rec.weekdays.length > 0
        ? JSON.stringify(rec.weekdays)
        : null,
    monthDay: rec.frequency === 'monthly' ? (rec.dayOfMonth ?? 1) : null,
    id: item.recurrenceId ?? null,
  }
}

function rowValues(item: Item): (string | number | null)[] {
  const rec = recurrenceColumns(item)
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
    rec.frequency,
    rec.weekdays,
    rec.monthDay,
    rec.id,
    item.projectId ?? null,
    item.createdAt,
    item.updatedAt,
    item.doneAt ?? null,
  ]
}

export function insertItem(db: Db, item: Item): Item {
  db.prepare(
    `INSERT INTO items (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(...rowValues(item))
  return item
}

export function createItem(db: Db, data: CreateItemData): Item {
  const now = new Date().toISOString()
  const recurrence = data.recurrence ?? null
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
    recurrence,
    recurrenceId:
      recurrence && recurrence.frequency !== 'none' ? uid() : (data.recurrenceId ?? null),
    projectId: data.projectId ?? null,
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
  if (filters.projectId) {
    where.push('project_id = ?')
    params.push(filters.projectId)
  }
  let sql =
    `SELECT ${readColumns()} FROM items` +
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

export function searchItems(db: Db, filters: SearchItemFilters): SearchPage {
  const where: string[] = []
  const params: (string | number)[] = []
  const useFts = filters.query !== null

  if (useFts) {
    where.push('items_fts MATCH ?')
    params.push(filters.query as string)
  }

  if (filters.type) {
    where.push('items.type = ?')
    params.push(filters.type)
  }
  if (filters.status) {
    where.push('items.status = ?')
    params.push(filters.status)
  }
  if (filters.projectId) {
    where.push('items.project_id = ?')
    params.push(filters.projectId)
  }
  if (filters.projectName) {
    where.push('items.project_id IN (SELECT id FROM projects WHERE lower(name) = lower(?))')
    params.push(filters.projectName)
  }
  for (const tag of filters.tags ?? []) {
    where.push(
      'EXISTS (SELECT 1 FROM json_each(items.tags) WHERE lower(json_each.value) = lower(?))',
    )
    params.push(tag)
  }
  if (filters.before) {
    where.push('items.created_at < ?')
    params.push(filters.before)
  }
  if (filters.after) {
    where.push('items.created_at > ?')
    params.push(filters.after)
  }
  if (filters.hasAttachment) {
    where.push('(SELECT COUNT(*) FROM attachments a WHERE a.item_id = items.id) > 0')
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const joinSql = useFts ? ' JOIN items_fts ON items_fts.rowid = items.rowid' : ''
  const limit = filters.limit ?? 25
  const offset = filters.offset ?? 0

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM items${joinSql} ${whereSql}`)
    .get(...params) as { total: number }
  const total = Number(totalRow.total)

  const selectSnippet = useFts
    ? ", snippet(items_fts, -1, '<mark>', '</mark>', '…', 14) AS snippet"
    : ''
  const rows = db
    .prepare(
      `SELECT ${readColumns('items')}${selectSnippet},
        ${useFts ? 'bm25(items_fts, -2.0, 0.0, 0.0, -1.0, 0.0)' : '0'} AS rank
       FROM items${joinSql}
       ${whereSql}
       ORDER BY rank
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as (ItemRow & { snippet: string | null })[]

  const items = rows.map((row) => {
    const item = toItem(row)
    item.snippet = row.snippet
    return item
  })

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  }
}

export function getItem(db: Db, id: string): Item | null {
  const row = db.prepare(`SELECT ${readColumns()} FROM items WHERE id = ?`).get(id) as
    ItemRow | undefined
  if (!row) return null
  const item = toItem(row)
  item.attachments = listAttachmentsByItem(db, id)
  return item
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
  if (patch.reminderAt !== undefined) {
    next.reminderAt = patch.reminderAt
    next.remindedAt = null
  }
  if (patch.tags !== undefined) next.tags = patch.tags && patch.tags.length > 0 ? patch.tags : null
  if (patch.recurrence !== undefined) {
    next.recurrence = patch.recurrence
    if (patch.recurrence && patch.recurrence.frequency !== 'none') {
      next.recurrenceId = next.recurrenceId ?? uid()
    }
  }

  if (next.type !== 'task') {
    next.recurrence = null
    next.recurrenceId = null
  }
  if (patch.projectId !== undefined) next.projectId = patch.projectId

  if (patch.status !== undefined) {
    next.doneAt = patch.status === 'done' ? new Date().toISOString() : null
  }
  next.updatedAt = new Date().toISOString()

  const rec = recurrenceColumns(next)
  db.prepare(
    `UPDATE items SET type = ?, status = ?, title = ?, body = ?, url = ?, due_at = ?,
      reminder_at = ?, reminded_at = ?, priority = ?, tags = ?,
      recurrence_frequency = ?, recurrence_weekdays = ?, recurrence_month_day = ?, recurrence_id = ?,
      project_id = ?, updated_at = ?, done_at = ? WHERE id = ?`,
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
    rec.frequency,
    rec.weekdays,
    rec.monthDay,
    rec.id,
    next.projectId ?? null,
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
