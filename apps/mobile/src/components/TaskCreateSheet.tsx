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
import type { Priority } from '@kosh/shared'
import {
  PRIORITIES,
  atTimeOnDay,
  endOfDayFromNow,
  errorMessage,
  formatDueAt,
  formatReminderAt,
  priorityLabel,
  useItems,
} from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'

interface TaskCreateSheetProps {
  onClose: () => void
}

export function TaskCreateSheet({ onClose }: TaskCreateSheetProps) {
  const { addItem } = useItems()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueAt, setDueAt] = useState<string | null>(null)
  const [reminderAt, setReminderAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canCreate = title.trim().length > 0
  const reminderConflict =
    !!dueAt && !!reminderAt && new Date(reminderAt).getTime() > new Date(dueAt).getTime()

  const handleCreate = async () => {
    if (!canCreate || reminderConflict) return
    setError(null)
    try {
      await addItem({ title, type: 'task', priority, dueAt, reminderAt })
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Could not create the task'))
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
              <Text style={styles.heading}>New Task</Text>
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
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textFaint}
              accessibilityLabel="Task title"
              autoFocus
            />

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
                  onPress={() => setReminderAt(new Date(Date.now() + 60 * 60 * 1000).toISOString())}
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
            {error ? <Text style={[styles.meta, styles.error]}>{error}</Text> : null}

            <Pressable
              onPress={() => void handleCreate()}
              disabled={!canCreate || reminderConflict}
              accessibilityRole="button"
              accessibilityLabel="Create Task"
              style={[styles.create, (!canCreate || reminderConflict) && styles.createDisabled]}
            >
              <Text style={styles.createText}>Create Task</Text>
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
