import { useCallback, useEffect, useRef, useState } from 'react'
import { useItems } from '@kosh/shared'
import type { Attachment } from '@kosh/shared'
import { errorMessage } from '@kosh/shared'
import { Icon } from './Icon'

const MAX_PREVIEW_BYTES = 5 * 1024 * 1024
const PREVIEW_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const PREVIEW_TEXT_TYPES = new Set(['text/plain', 'text/markdown'])

interface ItemAttachmentsProps {
  itemId: string
  getAttachmentUrl: (id: string) => string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ItemAttachments({ itemId, getAttachmentUrl }: ItemAttachmentsProps) {
  const { client } = useItems()
  const [attachments, setAttachments] = useState<Attachment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const list = await client.listAttachments(itemId)
      setAttachments(list)
    } catch (err) {
      setError(errorMessage(err, 'Could not load attachments'))
      setAttachments([])
    }
  }, [client, itemId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      setError('Please select a file.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const uploaded = await client.uploadAttachment(itemId, {
        blob: file,
        name: file.name,
        mime: file.type || 'application/octet-stream',
      })
      setAttachments((prev) => [...(prev ?? []), uploaded])
    } catch (err) {
      setError(errorMessage(err, 'Could not upload the attachment'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    try {
      await client.deleteAttachment(id)
      setAttachments((prev) => (prev ?? []).filter((a) => a.id !== id))
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the attachment'))
    }
  }

  const isImage = (a: Attachment) => PREVIEW_IMAGE_TYPES.has(a.mimeType)
  const isText = (a: Attachment) =>
    PREVIEW_TEXT_TYPES.has(a.mimeType) && a.sizeBytes <= MAX_PREVIEW_BYTES

  return (
    <div className="attachments-section">
      <div className="modal-label-row">
        <div className="modal-label">Attachments</div>
        <button
          type="button"
          className="btn-secondary attachments-add"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? 'Uploading…' : '+ Add'}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0])}
        aria-label="Add attachment"
      />

      {error ? <p className="modal-meta error-text">{error}</p> : null}

      {attachments === null ? (
        <p className="modal-meta">Loading…</p>
      ) : attachments.length === 0 ? (
        <p className="modal-meta">No attachments yet.</p>
      ) : (
        <ul className="attachment-list">
          {attachments.map((a) => (
            <li key={a.id} className="attachment-row">
              <Icon name={isImage(a) ? 'image' : 'paperclip'} size={14} />
              {isImage(a) ? (
                <a
                  className="attachment-thumb"
                  href={getAttachmentUrl(a.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${a.originalName}`}
                >
                  <img src={getAttachmentUrl(a.id)} alt={a.originalName} />
                </a>
              ) : null}
              <div className="attachment-meta">
                <span className="attachment-name" title={a.originalName}>
                  {a.originalName}
                </span>
                <span className="attachment-sub">
                  {formatSize(a.sizeBytes)} · {a.mimeType} · {formatDate(a.createdAt)}
                </span>
              </div>
              <a
                className="attachment-open"
                href={getAttachmentUrl(a.id)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${a.originalName}`}
              >
                {isText(a) ? 'View' : 'Open'}
              </a>
              <button
                type="button"
                className="attachment-delete"
                onClick={() => void handleDelete(a.id)}
                aria-label={`Delete ${a.originalName}`}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
