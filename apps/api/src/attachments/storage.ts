import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { AttachmentConfig } from './config.js'
import { ALLOWED_ATTACHMENT_MIMES } from './config.js'

export class AttachmentStorageError extends Error {}

const SAFE_FILENAME = /^[a-z0-9-]+(\.[a-z0-9]+)?$/i

export function sanitizeExtension(mime: string, originalName: string | null): string {
  const fromMime = ALLOWED_ATTACHMENT_MIMES[mime]
  if (fromMime) return fromMime
  if (originalName) {
    const ext = originalName.split('.').pop()?.toLowerCase() ?? ''
    if (ext && Object.values(ALLOWED_ATTACHMENT_MIMES).includes(ext)) return ext
  }
  throw new AttachmentStorageError(`Unsupported file type: ${mime}`)
}

export function storedName(attachmentId: string, ext: string): string {
  return `${attachmentId}.${ext}`
}

export function ensureAttachmentDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

export function attachmentPath(config: AttachmentConfig, storedName: string): string {
  if (!SAFE_FILENAME.test(basename(storedName))) {
    throw new AttachmentStorageError('Invalid stored file name')
  }
  return join(config.dir, storedName)
}

export function writeAttachmentFile(
  config: AttachmentConfig,
  stored: string,
  bytes: Uint8Array,
): void {
  ensureAttachmentDir(config.dir)
  writeFileSync(attachmentPath(config, stored), bytes)
}

export function readAttachmentFile(config: AttachmentConfig, stored: string): Buffer {
  return readFileSync(attachmentPath(config, stored))
}

export function deleteAttachmentFile(config: AttachmentConfig, stored: string): void {
  unlinkSync(attachmentPath(config, stored))
}
