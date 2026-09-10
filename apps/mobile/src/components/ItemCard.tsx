import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Item } from '@kosh/shared'
import { colors, radius, spacing, typeColors } from '../theme'
import { learningStatusLabel, typeLabel } from '../utils/labels'
import { formatDue, isOverdue, relativeTime } from '../utils/time'
import { Badge } from './Badge'
import { TypeBadge } from './TypeBadge'
import { Icon } from './Icon'

interface ItemCardProps {
  item: Item
  onPress: () => void
  onToggleDone?: () => void
  highlighted?: boolean
}

export function ItemCard({ item, onPress, onToggleDone, highlighted }: ItemCardProps) {
  const done = item.status === 'done'
  const showCheck = item.type === 'task' && onToggleDone !== undefined
  const isLearning = item.type === 'learning'

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel[item.type]}: ${item.title}`}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.highlighted,
        pressed && styles.pressed,
      ]}
    >
      {showCheck ? (
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
      ) : null}

      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body && item.body !== item.title ? (
          <Text style={styles.preview} numberOfLines={1}>
            {item.body}
          </Text>
        ) : null}
        {item.url ? (
          <Text style={styles.url} numberOfLines={1}>
            {item.url}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <TypeBadge type={item.type} />
          {isLearning && item.status !== 'inbox' ? (
            <Badge label={learningStatusLabel[item.status]} />
          ) : null}
          {done && !isLearning ? <Badge label="Done" color={colors.success} /> : null}
          {item.dueAt ? (
            <Badge
              label={formatDue(item.dueAt)}
              color={isOverdue(item.dueAt) ? colors.danger : colors.textMuted}
            />
          ) : null}
          <View style={styles.spacer} />
          <Text style={styles.time}>{relativeTime(item.updatedAt)}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
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
  highlighted: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
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
  preview: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  url: {
    color: typeColors.link,
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  spacer: {
    flex: 1,
  },
  time: {
    color: colors.textFaint,
    fontSize: 12,
  },
})
