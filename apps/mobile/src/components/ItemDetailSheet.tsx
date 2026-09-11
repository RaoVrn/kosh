import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { ITEM_TYPES, PRIORITIES } from '@kosh/shared'
import { colors, layout, radius, spacing, typeColors } from '../theme'
import { priorityLabel, typeLabel } from '@kosh/shared'
import {
  atTimeOnDay,
  endOfDayFromNow,
  formatDue,
  formatDueAt,
  formatFull,
  formatReminderAt,
  isSameDay,
  isToday,
  isTomorrow,
} from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { TypeBadge } from './TypeBadge'
import { Icon } from './Icon'

export function ItemDetailSheet() {
  const { selectedItemId, closeItem } = useNav()
  const { getItem, updateItem, toggleDone, removeItem } = useItems()
  const { width } = useWindowDimensions()
  const isDesktop = width >= layout.desktopBreakpoint

  const item = selectedItemId ? getItem(selectedItemId) : undefined
  if (!item) return null

  const done = item.status === 'done'

  return (
    <Modal visible transparent animationType="slide" onRequestClose={closeItem}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeItem}
          accessibilityLabel="Close item details"
        />
        <View style={[styles.sheet, isDesktop && styles.sheetDesktop]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetContent}
          >
            <View style={styles.headerRow}>
              <TypeBadge type={item.type} />
              <Pressable
                onPress={closeItem}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.close}
              >
                <Icon name="x" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <TextInput
              value={item.title}
              onChangeText={(t) => updateItem(item.id, { title: t })}
              style={styles.titleInput}
              multiline
              placeholder="Title"
              placeholderTextColor={colors.textFaint}
              accessibilityLabel="Item title"
            />

            <TextInput
              value={item.body ?? ''}
              onChangeText={(b) => updateItem(item.id, { body: b })}
              style={styles.bodyInput}
              multiline
              placeholder="Add details…"
              placeholderTextColor={colors.textFaint}
              accessibilityLabel="Item details"
            />

            {item.url ? (
              <Text style={styles.url} numberOfLines={1}>
                {item.url}
              </Text>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Type</Text>
              <View style={styles.chipRow}>
                {ITEM_TYPES.map((t) => (
                  <Chip
                    key={t}
                    label={typeLabel[t]}
                    active={item.type === t}
                    onPress={() => updateItem(item.id, { type: t })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Priority</Text>
              <View style={styles.chipRow}>
                <Chip
                  label="None"
                  active={!item.priority}
                  onPress={() => updateItem(item.id, { priority: null })}
                />
                {PRIORITIES.map((p) => (
                  <Chip
                    key={p}
                    label={priorityLabel[p]}
                    active={item.priority === p}
                    onPress={() => updateItem(item.id, { priority: p })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Due</Text>
              <View style={styles.chipRow}>
                <Chip
                  label="None"
                  active={!item.dueAt}
                  onPress={() => updateItem(item.id, { dueAt: null })}
                />
                <Chip
                  label="Today"
                  active={item.dueAt ? isToday(item.dueAt) : false}
                  onPress={() => updateItem(item.id, { dueAt: endOfDayFromNow(0) })}
                />
                <Chip
                  label="Tomorrow"
                  active={item.dueAt ? isTomorrow(item.dueAt) : false}
                  onPress={() => updateItem(item.id, { dueAt: endOfDayFromNow(1) })}
                />
                <Chip
                  label="In a week"
                  active={
                    item.dueAt
                      ? isSameDay(new Date(item.dueAt), new Date(endOfDayFromNow(7)))
                      : false
                  }
                  onPress={() => updateItem(item.id, { dueAt: endOfDayFromNow(7) })}
                />
              </View>
              {item.dueAt ? (
                <Text style={styles.meta}>
                  Due {formatDue(item.dueAt)} · {formatDueAt(item.dueAt)}
                </Text>
              ) : null}
            </View>

            {item.type === 'task' ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Reminder</Text>
                <View style={styles.chipRow}>
                  <Chip
                    label="None"
                    active={!item.reminderAt}
                    onPress={() => updateItem(item.id, { reminderAt: null })}
                  />
                  <Chip
                    label="In 1 hour"
                    active={false}
                    onPress={() =>
                      updateItem(item.id, {
                        reminderAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                      })
                    }
                  />
                  <Chip
                    label="Today 9 AM"
                    active={
                      item.reminderAt
                        ? isSameDay(new Date(item.reminderAt), new Date(atTimeOnDay(0, 9, 0)))
                        : false
                    }
                    onPress={() => updateItem(item.id, { reminderAt: atTimeOnDay(0, 9, 0) })}
                  />
                  <Chip
                    label="Tomorrow 9 AM"
                    active={
                      item.reminderAt
                        ? isSameDay(new Date(item.reminderAt), new Date(atTimeOnDay(1, 9, 0)))
                        : false
                    }
                    onPress={() => updateItem(item.id, { reminderAt: atTimeOnDay(1, 9, 0) })}
                  />
                </View>
                {item.reminderAt ? (
                  <Text style={styles.meta}>Reminder {formatReminderAt(item.reminderAt)}</Text>
                ) : null}
                {item.dueAt &&
                item.reminderAt &&
                new Date(item.reminderAt) > new Date(item.dueAt) ? (
                  <Text style={[styles.meta, styles.warning]}>
                    Reminder must not be after the due time.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.meta}>Created {formatFull(item.createdAt)}</Text>
            {item.doneAt ? (
              <Text style={styles.meta}>Completed {formatFull(item.doneAt)}</Text>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                onPress={() => toggleDone(item.id)}
                accessibilityRole="button"
                accessibilityLabel={done ? 'Mark as not done' : 'Mark as done'}
                style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
              >
                <View style={[styles.actionCheck, done && styles.actionCheckDone]}>
                  {done ? <Icon name="check" size={13} color={colors.background} /> : null}
                </View>
                <Text style={styles.actionText}>{done ? 'Mark as not done' : 'Mark as done'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  removeItem(item.id)
                  closeItem()
                }}
                accessibilityRole="button"
                accessibilityLabel="Delete item"
                style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
              >
                <Icon name="trash-2" size={16} color={colors.danger} />
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
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
  sheetDesktop: {
    width: 560,
    maxHeight: '80%',
    alignSelf: 'center',
    borderRadius: radius.xl,
    marginBottom: 24,
  },
  sheetContent: {
    padding: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  bodyInput: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    minHeight: 44,
  },
  url: {
    color: typeColors.link,
    fontSize: 13,
    marginTop: spacing.md,
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
  actions: {
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  actionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCheckDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
})
