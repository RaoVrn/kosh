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
import type { ItemStatus, ItemType, Priority } from '@kosh/shared'
import {
  ITEM_STATUSES,
  PRIORITIES,
  atTimeOnDay,
  endOfDayFromNow,
  errorMessage,
  formatDueAt,
  formatReminderAt,
  isValidHttpUrl,
  priorityLabel,
  statusLabel,
  typeLabel,
  useItems,
} from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'
import { TagInput } from './TagInput'

interface ItemCreateSheetProps {
  type: ItemType
  onClose: () => void
}

export function ItemCreateSheet({ type, onClose }: ItemCreateSheetProps) {
  const { addItem } = useItems()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>('medium')
  const [status, setStatus] = useState<ItemStatus>('inbox')
  const [dueAt, setDueAt] = useState<string | null>(null)
  const [reminderAt, setReminderAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isTask = type === 'task'
  const isLearning = type === 'learning'
  const showUrl = type === 'idea' || type === 'learning' || type === 'link'
  const showBody = type === 'note' || type === 'idea' || type === 'learning' || type === 'link'
  const urlValid = type !== 'link' || isValidHttpUrl(url.trim())
  const titlePlaceholder =
    type === 'task'
      ? 'What needs to be done?'
      : type === 'link'
        ? 'Link title'
        : `${typeLabel[type]} title`
  const canCreate = title.trim().length > 0 && urlValid
  const reminderConflict =
    !!dueAt && !!reminderAt && new Date(reminderAt).getTime() > new Date(dueAt).getTime()

  const handleCreate = async () => {
    if (!canCreate || reminderConflict) return
    setError(null)
    try {
      await addItem({
        title,
        body: showBody && body ? body : undefined,
        url: url.trim() || undefined,
        type,
        status: isLearning ? status : isTask ? undefined : 'active',
        priority: isTask || isLearning ? priority : undefined,
        dueAt: isTask ? dueAt : undefined,
        reminderAt: isTask ? reminderAt : undefined,
        tags: tags.length > 0 ? tags : null,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err, `Could not create the ${typeLabel[type].toLowerCase()}`))
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>New {typeLabel[type]}</Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.close}
              >
                <Icon name="x" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
              placeholder={titlePlaceholder}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel="Title"
              autoFocus
            />

            {showBody ? (
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
            ) : null}

            {showUrl ? (
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
                    A valid http(s) URL is required.
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

            {isLearning ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Status</Text>
                <View style={styles.chipRow}>
                  {ITEM_STATUSES.filter((s) => s !== 'archived').map((s) => (
                    <Chip
                      key={s}
                      label={statusLabel[s]}
                      active={status === s}
                      onPress={() => setStatus(s)}
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
                    <Chip
                      label="In a week"
                      active={dueAt === endOfDayFromNow(7)}
                      onPress={() => setDueAt(endOfDayFromNow(7))}
                    />
                  </View>
                  {dueAt ? <Text style={styles.meta}>Due {formatDueAt(dueAt)}</Text> : null}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Reminder</Text>
                  <View style={styles.chipRow}>
                    <Chip label="None" active={!reminderAt} onPress={() => setReminderAt(null)} />
                    <Chip
                      label="In 1 hour"
                      active={false}
                      onPress={() =>
                        setReminderAt(new Date(Date.now() + 60 * 60 * 1000).toISOString())
                      }
                    />
                    <Chip
                      label="Today 9 AM"
                      active={reminderAt === atTimeOnDay(0, 9, 0)}
                      onPress={() => setReminderAt(atTimeOnDay(0, 9, 0))}
                    />
                    <Chip
                      label="Tomorrow 9 AM"
                      active={reminderAt === atTimeOnDay(1, 9, 0)}
                      onPress={() => setReminderAt(atTimeOnDay(1, 9, 0))}
                    />
                  </View>
                  {reminderAt ? (
                    <Text style={styles.meta}>Reminder {formatReminderAt(reminderAt)}</Text>
                  ) : null}
                </View>

                {reminderConflict ? (
                  <Text style={[styles.meta, styles.warning]}>
                    Reminder must not be after the due time.
                  </Text>
                ) : null}
              </>
            ) : null}

            {error ? <Text style={[styles.meta, styles.error]}>{error}</Text> : null}

            <Pressable
              onPress={() => void handleCreate()}
              disabled={!canCreate || reminderConflict}
              accessibilityRole="button"
              accessibilityLabel={`Create ${typeLabel[type]}`}
              style={[styles.create, (!canCreate || reminderConflict) && styles.createDisabled]}
            >
              <Text style={styles.createText}>Create {typeLabel[type]}</Text>
            </Pressable>
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
    maxHeight: '85%',
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
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 100,
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
  create: {
    marginTop: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createDisabled: {
    opacity: 0.5,
  },
  createText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
})
