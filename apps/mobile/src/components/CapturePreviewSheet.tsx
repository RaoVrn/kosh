import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { CaptureResult, ItemType, Priority, Recurrence } from '@kosh/shared'
import {
  ITEM_TYPES,
  PRIORITIES,
  atTimeOnDay,
  endOfDayFromNow,
  errorMessage,
  isValidHttpUrl,
  priorityLabel,
  typeLabel,
  useItems,
} from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { TagInput } from './TagInput'
import { RecurrenceControl } from './RecurrenceControl'

interface CapturePreviewSheetProps {
  result: CaptureResult
  originalText: string
  onSave: () => void
  onCancel: () => void
  onInbox: () => void
}

export function CapturePreviewSheet({
  result,
  originalText,
  onSave,
  onCancel,
  onInbox,
}: CapturePreviewSheetProps) {
  const { addItem } = useItems()
  const [type, setType] = useState<ItemType>(result.type)
  const [title, setTitle] = useState(result.title)
  const [body, setBody] = useState(result.body ?? '')
  const [url, setUrl] = useState(result.url ?? '')
  const [priority, setPriority] = useState<Priority | null>(result.priority)
  const [dueAt, setDueAt] = useState<string | null>(result.dueAt)
  const [reminderAt, setReminderAt] = useState<string | null>(result.reminderAt)
  const [tags, setTags] = useState<string[]>(result.tags ?? [])
  const [recurrence, setRecurrence] = useState<Recurrence | null>(result.recurrence ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTask = type === 'task'
  const isLearning = type === 'learning'
  const urlValid = type !== 'link' || isValidHttpUrl(url.trim())
  const reminderConflict = !!dueAt && !!reminderAt && new Date(reminderAt) > new Date(dueAt)
  const canSave = title.trim().length > 0 && urlValid && !reminderConflict && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await addItem({
        title,
        type,
        body: body || undefined,
        url: url.trim() || undefined,
        priority: isTask || isLearning ? priority : undefined,
        dueAt: isTask ? dueAt : undefined,
        reminderAt: isTask ? reminderAt : undefined,
        tags: tags.length > 0 ? tags : null,
        recurrence: isTask ? recurrence : null,
      })
      onSave()
    } catch (err) {
      setError(errorMessage(err, 'Could not save the item'))
      setSaving(false)
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.heading}>Kosh understood this as</Text>
                <Text style={styles.confidence}>Confidence: {result.confidence}</Text>
              </View>
              <Pressable
                onPress={onCancel}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.close}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Type</Text>
              <View style={styles.chipRow}>
                {ITEM_TYPES.map((t) => (
                  <Chip
                    key={t}
                    label={typeLabel[t]}
                    active={type === t}
                    onPress={() => setType(t)}
                  />
                ))}
              </View>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
              placeholder="Title"
              placeholderTextColor={colors.textFaint}
              accessibilityLabel="Title"
            />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Content</Text>
              <TextInput
                value={body}
                onChangeText={setBody}
                style={styles.bodyInput}
                multiline
                placeholder="Add details…"
                placeholderTextColor={colors.textFaint}
                accessibilityLabel="Details"
              />
            </View>

            {type !== 'task' ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Link</Text>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  style={styles.titleInput}
                  placeholder="https://…"
                  placeholderTextColor={colors.textFaint}
                  accessibilityLabel="URL"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {type === 'link' && !urlValid ? (
                  <Text style={[styles.meta, styles.warning]}>
                    A valid http(s) URL is required for links.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tags</Text>
              <TagInput tags={tags} onChange={setTags} accessibilityLabel="Tags" />
            </View>

            {isTask || isLearning ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Priority</Text>
                <View style={styles.chipRow}>
                  <Chip label="None" active={!priority} onPress={() => setPriority(null)} />
                  {PRIORITIES.map((p) => (
                    <Chip
                      key={p}
                      label={priorityLabel[p]}
                      active={priority === p}
                      onPress={() => setPriority(p)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {isTask ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Due</Text>
                  <View style={styles.chipRow}>
                    <Chip label="None" active={!dueAt} onPress={() => setDueAt(null)} />
                    <Chip
                      label="Today"
                      active={dueAt === endOfDayFromNow(0)}
                      onPress={() => setDueAt(endOfDayFromNow(0))}
                    />
                    <Chip
                      label="Tomorrow"
                      active={dueAt === endOfDayFromNow(1)}
                      onPress={() => setDueAt(endOfDayFromNow(1))}
                    />
                  </View>
                  <Text style={styles.sectionLabel}>Reminder</Text>
                  <View style={styles.chipRow}>
                    <Chip label="None" active={!reminderAt} onPress={() => setReminderAt(null)} />
                    <Chip
                      label="In 1 hour"
                      active={false}
                      onPress={() => setReminderAt(new Date(Date.now() + 3600_000).toISOString())}
                    />
                    <Chip
                      label="Today 9 AM"
                      active={reminderAt === atTimeOnDay(0, 9, 0)}
                      onPress={() => setReminderAt(atTimeOnDay(0, 9, 0))}
                    />
                  </View>
                  {reminderConflict ? (
                    <Text style={[styles.meta, styles.warning]}>
                      Reminder must not be after the due time.
                    </Text>
                  ) : null}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Repeat</Text>
                  <RecurrenceControl value={recurrence} onChange={setRecurrence} />
                </View>
              </>
            ) : null}

            {error ? <Text style={[styles.meta, styles.error]}>{error}</Text> : null}

            <Pressable
              onPress={() => void handleSave()}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="Save"
              style={[styles.save, !canSave && styles.saveDisabled]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
            <View style={styles.row}>
              <Pressable
                onPress={onInbox}
                accessibilityRole="button"
                accessibilityLabel="Save to Inbox"
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Save to Inbox</Text>
              </Pressable>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
            <Text style={[styles.meta, styles.original]} numberOfLines={3}>
              Original: {originalText}
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

interface ChipProps {
  label: string
  active: boolean
  onPress: () => void
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  confidence: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  titleInput: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bodyInput: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  meta: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  warning: {
    color: colors.warning,
  },
  error: {
    color: colors.danger,
  },
  original: {
    fontStyle: 'italic',
    marginTop: spacing.lg,
  },
  save: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
})
