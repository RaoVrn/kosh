import { useCallback, useEffect, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { useItems } from '@kosh/shared'
import { errorMessage } from '@kosh/shared'
import type { Attachment } from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

interface ItemAttachmentsProps {
  itemId: string
  getAttachmentUrl: (id: string) => string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ItemAttachments({ itemId, getAttachmentUrl }: ItemAttachmentsProps) {
  const { client } = useItems()
  const [attachments, setAttachments] = useState<Attachment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

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

  const handlePick = async () => {
    setError(null)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'text/plain',
          'text/markdown',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      })
      if (result.canceled || result.assets.length === 0) return
      const asset = result.assets[0]
      setUploading(true)
      try {
        // On web the picker exposes a real browser File (asset.file); on
        // native it exposes a URI descriptor. Sending the real File on web is
        // required — a plain {uri,name,type} object appended to a browser
        // FormData serializes to "[object Object]" and the server rejects it.
        const uploaded = await client.uploadAttachment(
          itemId,
          asset.file
            ? { blob: asset.file, name: asset.file.name, mime: asset.file.type }
            : {
                uri: asset.uri,
                name: asset.name,
                mime: asset.mimeType ?? 'application/octet-stream',
              },
        )
        setAttachments((prev) => [...(prev ?? []), uploaded])
      } catch (err) {
        setError(errorMessage(err, 'Could not upload the attachment'))
      } finally {
        setUploading(false)
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not pick a file'))
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

  const handleOpen = async (id: string) => {
    try {
      const supported = await Linking.canOpenURL(getAttachmentUrl(id))
      if (!supported) {
        setError("This device can't open that attachment.")
        return
      }
      await Linking.openURL(getAttachmentUrl(id))
    } catch {
      setError("Couldn't open this attachment.")
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Attachments</Text>
        <Pressable
          onPress={() => void handlePick()}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={uploading ? 'Uploading attachment' : 'Add attachment'}
          style={[styles.addButton, uploading && styles.disabled]}
        >
          <Text style={styles.addText}>{uploading ? 'Uploading…' : '+ Add'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.errorText, styles.error]}>{error}</Text> : null}

      {attachments === null ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : attachments.length === 0 ? (
        <Text style={styles.muted}>No attachments yet.</Text>
      ) : (
        attachments.map((a) => (
          <View key={a.id} style={styles.row}>
            <Icon name={IMAGE_TYPES.has(a.mimeType) ? 'image' : 'paperclip'} size={15} />
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={1}>
                {a.originalName}
              </Text>
              <Text style={styles.sub}>
                {formatSize(a.sizeBytes)} · {a.mimeType}
              </Text>
            </View>
            <Pressable
              onPress={() => void handleOpen(a.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Open ${a.originalName}`}
              style={styles.openButton}
            >
              <Text style={styles.openText}>Open</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleDelete(a.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${a.originalName}`}
              style={styles.deleteButton}
            >
              <Icon name="trash" size={15} color={colors.warning} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  muted: {
    color: colors.textFaint,
    fontSize: 13,
  },
  error: {
    color: colors.warning,
  },
  errorText: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  sub: {
    color: colors.textFaint,
    fontSize: 11,
  },
  openButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  openText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
})
