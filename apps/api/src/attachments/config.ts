import { join } from 'node:path'

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024

export interface AttachmentConfig {
  dir: string
  maxSizeBytes: number
}

export function getAttachmentConfig(): AttachmentConfig {
  return {
    dir: process.env.KOSH_ATTACHMENT_DIR ?? join(process.cwd(), 'data', 'attachments'),
    maxSizeBytes: Number(process.env.KOSH_MAX_ATTACHMENT_SIZE_BYTES ?? DEFAULT_MAX_BYTES),
  }
}

export const ALLOWED_ATTACHMENT_MIMES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
}
