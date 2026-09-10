import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Item } from '@kosh/shared'
import { colors, priorityColors, radius, spacing } from '../theme'
import { priorityLabel } from '@kosh/shared'
import { formatDue, isOverdue } from '@kosh/shared'
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
            <Badge
              label={formatDue(item.dueAt)}
              color={overdue ? colors.danger : colors.textMuted}
            />
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
    gap: 6,
    marginTop: 6,
  },
})
