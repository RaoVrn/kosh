import type { Db } from '../db.js'
import type { Attachment } from '@kosh/shared'

const COLUMNS =
  'id, item_id, original_name, stored_name, mime_type, size_bytes, created_at, updated_at'

export interface AttachmentRow {
  id: string
  item_id: string
  original_name: string
  stored_name: string
  mime_type: string
  size_bytes: number
  created_at: string
  updated_at: string
}

export function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    itemId: row.item_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface AttachmentWithStored {
  attachment: Attachment
  storedName: string
}

function getAttachmentRow(db: Db, id: string): AttachmentRow | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM attachments WHERE id = ?`).get(id) as
    AttachmentRow | undefined
  return row ?? null
}

export function getAttachment(db: Db, id: string): Attachment | null {
  const row = getAttachmentRow(db, id)
  return row ? toAttachment(row) : null
}

export function getAttachmentWithStored(db: Db, id: string): AttachmentWithStored | null {
  const row = getAttachmentRow(db, id)
  if (!row) return null
  return { attachment: toAttachment(row), storedName: row.stored_name }
}

export function deleteAttachment(db: Db, id: string): AttachmentWithStored | null {
  const existing = getAttachmentWithStored(db, id)
  if (!existing) return null
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
  return existing
}

export interface CreateAttachmentData {
  id: string
  itemId: string
  originalName: string
  storedName: string
  mimeType: string
  sizeBytes: number
}

export function createAttachment(db: Db, data: CreateAttachmentData): Attachment {
  const now = new Date().toISOString()
  const attachment: Attachment = {
    id: data.id,
    itemId: data.itemId,
    originalName: data.originalName,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    createdAt: now,
    updatedAt: now,
  }
  db.prepare(`INSERT INTO attachments (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    attachment.id,
    attachment.itemId,
    attachment.originalName,
    data.storedName,
    attachment.mimeType,
    attachment.sizeBytes,
    attachment.createdAt,
    attachment.updatedAt,
  )
  return attachment
}

export function listAttachmentsByItem(db: Db, itemId: string): Attachment[] {
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM attachments WHERE item_id = ? ORDER BY created_at ASC`)
    .all(itemId) as unknown as AttachmentRow[]
  return rows.map(toAttachment)
}

/** Deletes attachment rows for an item and returns their stored file names. */
export function deleteAttachmentsForItem(db: Db, itemId: string): string[] {
  const rows = db
    .prepare('SELECT stored_name FROM attachments WHERE item_id = ?')
    .all(itemId) as unknown as { stored_name: string }[]
  db.prepare('DELETE FROM attachments WHERE item_id = ?').run(itemId)
  return rows.map((r) => r.stored_name)
}

export function countAttachmentsForItem(db: Db, itemId: string): number {
  const row = db.prepare('SELECT COUNT(*) AS c FROM attachments WHERE item_id = ?').get(itemId) as {
    c: number
  }
  return Number(row.c)
}
