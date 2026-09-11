import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { useItems } from '@kosh/shared'
import { getTaskGroups } from '@kosh/shared'
import type { Item } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'
import { TaskCreateSheet } from '../components/TaskCreateSheet'
import { Icon } from '../components/Icon'

export function TasksScreen() {
  const { items, toggleDone } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const groups = useMemo(() => getTaskGroups(items), [items])
  const pendingCount = useMemo(
    () => items.filter((i) => i.type === 'task' && i.status !== 'done').length,
    [items],
  )

  const sections: { key: string; title: string; items: Item[] }[] = [
    { key: 'overdue', title: 'Overdue', items: groups.overdue },
    { key: 'today', title: 'Today', items: groups.today },
    { key: 'upcoming', title: 'Upcoming', items: groups.upcoming },
    { key: 'nodue', title: 'No due date', items: groups.nodue },
    { key: 'completed', title: 'Completed', items: groups.completed },
  ]
  const isEmpty = sections.every((s) => s.items.length === 0)

  return (
    <Content>
      <PageHeader
        title="Tasks"
        subtitle="Everything you've committed to."
        count={pendingCount}
        right={
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="New task"
            style={({ pressed }) => [styles.newTask, pressed && styles.pressed]}
          >
            <Icon name="plus" size={16} color={colors.background} />
            <Text style={styles.newTaskText}>New task</Text>
          </Pressable>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon="check-square"
          title="No tasks yet"
          message="Capture something and convert it to a task, or add a new task."
        />
      ) : (
        sections.map(
          (section) =>
            section.items.length > 0 && (
              <View key={section.key} style={styles.group}>
                <Text style={styles.groupTitle}>{section.title}</Text>
                {section.items.map((task) => (
                  <TaskItem
                    key={task.id}
                    item={task}
                    onPress={() => openItem(task.id)}
                    onToggleDone={() => toggleDone(task.id)}
                  />
                ))}
              </View>
            ),
        )
      )}

      {creating ? <TaskCreateSheet onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}

const styles = StyleSheet.create({
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
  newTask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newTaskText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
})
