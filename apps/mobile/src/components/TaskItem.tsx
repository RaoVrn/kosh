import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Item } from '@kosh/shared'
import { colors, priorityColors, radius, spacing } from '../theme'
import { priorityLabel } from '@kosh/shared'
import { formatDueAt, formatReminderAt, isOverdue } from '@kosh/shared'
import { Badge } from './Badge'
import { Icon } from './Icon'

interface TaskItemProps {
  item: Item
  onPress: () => void
  onToggleDone: () => void
}

export function TaskItem({ item, onPress, onToggleDone }: TaskItemProps) {
  const done = item.status === 'done'
  const overdue = item.dueAt ? isOverdue(item.dueAt) : false

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Pressable
        onPress={onToggleDone}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Mark as not done' : 'Mark as done'}
        style={[styles.check, done && styles.checkDone]}
      >
        {done ? <Icon name="check" size={13} color={colors.background} /> : null}
      </Pressable>

      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.meta}>
          {item.priority ? (
            <Badge label={priorityLabel[item.priority]} color={priorityColors[item.priority]} />
          ) : null}
          {item.dueAt ? (
            <Text style={[styles.dueChip, overdue && styles.dueOverdue]}>
              {formatDueAt(item.dueAt)}
            </Text>
          ) : null}
          {item.reminderAt && !done ? (
            <View style={styles.reminderChip}>
              <Icon name="bell" size={11} color={colors.accent} />
              <Text style={styles.reminderText}>{formatReminderAt(item.reminderAt)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  body: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  titleDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dueChip: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(154, 154, 165, 0.14)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  dueOverdue: {
    color: colors.danger,
    backgroundColor: 'rgba(255, 107, 94, 0.14)',
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reminderText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
})
