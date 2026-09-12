import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import {
  getTodayCommandCenter,
  greetingForHour,
  relativeTime,
  useItems,
  useNotifications,
} from '@kosh/shared'
import type { ItemType } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateSheet } from '../components/ItemCreateSheet'

const QUICK_TYPES: { type: ItemType; label: string }[] = [
  { type: 'task', label: 'New task' },
  { type: 'note', label: 'New note' },
  { type: 'idea', label: 'New idea' },
  { type: 'learning', label: 'New learning' },
]

export function TodayScreen() {
  const { items, toggleDone } = useItems()
  const { notifications, markRead } = useNotifications()
  const { openItem, navigate, requestCaptureFocus } = useNav()
  const [creating, setCreating] = useState<ItemType | null>(null)

  const cc = useMemo(() => getTodayCommandCenter(items, notifications), [items, notifications])
  const greeting = greetingForHour(new Date().getHours())

  const isEmpty =
    cc.overdue.length === 0 &&
    cc.dueToday.length === 0 &&
    cc.upNext.length === 0 &&
    cc.reminders.length === 0 &&
    cc.recentCaptures.length === 0

  return (
    <Content>
      <PageHeader title="Today" subtitle={`${greeting}. What actually matters today?`} />

      <View style={styles.quickRow}>
        <Pressable
          onPress={() => {
            navigate('inbox')
            requestCaptureFocus()
          }}
          accessibilityRole="button"
          accessibilityLabel="New capture"
          style={({ pressed }) => [styles.quickPrimary, pressed && styles.pressed]}
        >
          <Text style={styles.quickPrimaryText}>New capture</Text>
        </Pressable>
        {QUICK_TYPES.map((q) => (
          <Pressable
            key={q.type}
            onPress={() => setCreating(q.type)}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
          >
            <Text style={styles.quickText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {isEmpty ? (
        <EmptyState
          icon="sun"
          title="You're clear for today."
          message="Capture something new or plan ahead."
        />
      ) : (
        <>
          {cc.overdue.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Overdue</Text>
              {cc.overdue.map((task) => (
                <TaskItem
                  key={task.id}
                  item={task}
                  onPress={() => openItem(task.id)}
                  onToggleDone={() => toggleDone(task.id)}
                />
              ))}
            </View>
          ) : null}

          {cc.dueToday.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Due today</Text>
              {cc.dueToday.map((task) => (
                <TaskItem
                  key={task.id}
                  item={task}
                  onPress={() => openItem(task.id)}
                  onToggleDone={() => toggleDone(task.id)}
                />
              ))}
            </View>
          ) : null}

          {cc.upNext.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Up next</Text>
              {cc.upNext.map((task) => (
                <TaskItem
                  key={task.id}
                  item={task}
                  onPress={() => openItem(task.id)}
                  onToggleDone={() => toggleDone(task.id)}
                />
              ))}
            </View>
          ) : null}

          {cc.reminders.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Reminders</Text>
              {cc.reminders.map((n) => {
                const linked = n.itemId && items.some((i) => i.id === n.itemId)
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => {
                      void markRead(n.id)
                      if (linked && n.itemId) openItem(n.itemId)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={n.title}
                    style={({ pressed }) => [styles.reminderCard, pressed && styles.pressed]}
                  >
                    <View style={styles.reminderRow}>
                      <Text style={styles.reminderTitle} numberOfLines={1}>
                        {n.title}
                      </Text>
                      <View style={styles.reminderDot} />
                    </View>
                    <Text style={styles.reminderTime}>{relativeTime(n.createdAt)}</Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}

          {cc.recentCaptures.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>Recently captured</Text>
              {cc.recentCaptures.map((item) => (
                <ItemCard key={item.id} item={item} onPress={() => openItem(item.id)} />
              ))}
            </View>
          ) : null}
        </>
      )}

      {creating ? <ItemCreateSheet type={creating} onClose={() => setCreating(null)} /> : null}
    </Content>
  )
}

const styles = StyleSheet.create({
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quick: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  quickPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickPrimaryText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  group: {
    marginBottom: spacing.xl,
  },
  groupTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  reminderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderTitle: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  reminderTime: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.xs,
  },
})
