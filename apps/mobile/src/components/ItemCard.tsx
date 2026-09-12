import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Item } from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import {
  domainFromUrl,
  learningStatusLabel,
  priorityColors,
  priorityLabel,
  recurrenceLabel,
  typeLabel,
} from '@kosh/shared'
import { formatDue, isOverdue, relativeTime } from '@kosh/shared'
import { Badge } from './Badge'
import { TypeBadge } from './TypeBadge'
import { Icon } from './Icon'

interface ItemCardProps {
  item: Item
  onPress: () => void
  onToggleDone?: () => void
  highlighted?: boolean
  onProcess?: () => void
  onArchive?: () => void
  onConvertToTask?: () => void
  onOpenLink?: () => void
}

export function ItemCard({
  item,
  onPress,
  onToggleDone,
  highlighted,
  onProcess,
  onArchive,
  onConvertToTask,
  onOpenLink,
}: ItemCardProps) {
  const done = item.status === 'done'
  const showCheck = item.type === 'task' && onToggleDone !== undefined
  const isLearning = item.type === 'learning'
  const isLink = item.type === 'link'
  const domain = isLink && item.url ? domainFromUrl(item.url) : null
  const showTags = item.type !== 'task' && (item.tags?.length ?? 0) > 0

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
        {isLink && domain ? (
          <Text style={styles.url} numberOfLines={1}>
            {domain}
          </Text>
        ) : item.url && !isLink ? (
          <Text style={styles.url} numberOfLines={1}>
            {item.url}
          </Text>
        ) : null}

        {showTags ? (
          <View style={styles.tagRow}>
            {(item.tags ?? []).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <TypeBadge type={item.type} />
          {isLearning && item.priority ? (
            <Badge label={priorityLabel[item.priority]} color={priorityColors[item.priority]} />
          ) : null}
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
          {item.type === 'task' && recurrenceLabel(item.recurrence) ? (
            <Badge label={`↻ ${recurrenceLabel(item.recurrence)}`} color={colors.textFaint} />
          ) : null}
          <View style={styles.spacer} />
          <Text style={styles.time}>{relativeTime(item.updatedAt)}</Text>
        </View>

        {onProcess || onArchive || onConvertToTask || onOpenLink ? (
          <View style={styles.actions}>
            {onOpenLink ? <ActionButton label="Open" primary={false} onPress={onOpenLink} /> : null}
            {onProcess ? <ActionButton label="Process" primary onPress={onProcess} /> : null}
            {onConvertToTask ? (
              <ActionButton label="Convert to task" primary={false} onPress={onConvertToTask} />
            ) : null}
            {onArchive ? (
              <ActionButton label="Archive" primary={false} onPress={onArchive} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

function ActionButton({
  label,
  primary,
  onPress,
}: {
  label: string
  primary: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
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
    color: colors.warning,
    fontSize: 12,
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionPrimary: {
    borderColor: colors.accent,
  },
  actionText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  actionTextPrimary: {
    color: colors.accent,
  },
})
