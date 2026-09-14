import { existsSync } from 'node:fs'
import { Hono } from 'hono'
import type { Db } from '../db.js'
import type { Attachment } from '@kosh/shared'
import type { AttachmentConfig } from '../attachments/config.js'
import { ALLOWED_ATTACHMENT_MIMES } from '../attachments/config.js'
import * as storage from '../attachments/storage.js'
import * as repo from '../attachments/repo.js'
import { uid } from '@kosh/shared'
import { ValidationError, parseId } from '../items/validation.js'
import { getItem } from '../items/repo.js'

const INLINE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
])

export class AttachmentValidationError extends ValidationError {}

export function attachmentsRoutes(db: Db, config: AttachmentConfig): Hono {
  const app = new Hono()

  app.get('/items/:itemId/attachments', (c) => {
    const itemId = parseId(c.req.param('itemId'))
    if (!getItem(db, itemId)) {
      return c.json({ error: { message: 'Item not found' } }, 404)
    }
    return c.json({ data: repo.listAttachmentsByItem(db, itemId) })
  })

  app.post('/items/:itemId/attachments', async (c) => {
    const itemId = parseId(c.req.param('itemId'))
    if (!getItem(db, itemId)) {
      return c.json({ error: { message: 'Item not found' } }, 404)
    }

    const body = await c.req.parseBody()
    const file = body['file']
    if (!file || typeof file === 'string') {
      return c.json({ error: { message: 'A file is required (multipart field "file")' } }, 400)
    }

    const mime = file.type || 'application/octet-stream'
    if (!(mime in ALLOWED_ATTACHMENT_MIMES)) {
      return c.json({ error: { message: `Unsupported file type: ${mime}` } }, 400)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes.byteLength === 0) {
      return c.json({ error: { message: 'Empty file' } }, 400)
    }
    if (bytes.byteLength > config.maxSizeBytes) {
      return c.json(
        {
          error: {
            message: `File is too large (max ${Math.round(config.maxSizeBytes / (1024 * 1024))} MB)`,
          },
        },
        400,
      )
    }

    const ext = storage.sanitizeExtension(mime, file.name ?? null)
    const attachmentId = uid()
    const storedName = storage.storedName(attachmentId, ext)
    storage.writeAttachmentFile(config, storedName, bytes)
    let attachment: Attachment
    try {
      attachment = repo.createAttachment(db, {
        id: attachmentId,
        itemId,
        originalName: file.name || 'attachment',
        storedName,
        mimeType: mime,
        sizeBytes: bytes.byteLength,
      })
    } catch (err) {
      try {
        storage.deleteAttachmentFile(config, storedName)
      } catch {
        // best-effort cleanup
      }
      throw err
    }

    return c.json({ data: attachment }, 201)
  })

  app.get('/attachments/:id', (c) => {
    const id = parseId(c.req.param('id'))
    const found = repo.getAttachmentWithStored(db, id)
    if (!found) return c.json({ error: { message: 'Attachment not found' } }, 404)

    const path = storage.attachmentPath(config, found.storedName)
    if (!existsSync(path)) {
      return c.json({ error: { message: 'Attachment file is missing' } }, 404)
    }

    const { attachment } = found
    const isInline = INLINE_MIMES.has(attachment.mimeType)
    const disposition = isInline
      ? `inline; filename="${encodeRFC5987(attachment.originalName)}"`
      : `attachment; filename="${encodeRFC5987(attachment.originalName)}"`
    const buffer = storage.readAttachmentFile(config, found.storedName)
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': disposition,
      },
    })
  })

  app.delete('/attachments/:id', (c) => {
    const id = parseId(c.req.param('id'))
    const found = repo.deleteAttachment(db, id)
    if (!found) return c.json({ error: { message: 'Attachment not found' } }, 404)

    try {
      storage.deleteAttachmentFile(config, found.storedName)
    } catch {
      // physical file may already be gone — the DB row is the source of truth
    }
    return c.body(null, 204)
  })

  return app
}

function encodeRFC5987(value: string): string {
  return value
    .replace(/"/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/\\/g, '/')
}
