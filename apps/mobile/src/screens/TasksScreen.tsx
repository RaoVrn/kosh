import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { useItems } from '../state/ItemsContext'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'
import { sortPendingTasks } from '../utils/grouping'
import { isOverdue } from '../utils/time'

type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue'

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
]

export function TasksScreen() {
  const { items, toggleDone } = useItems()
  const { openItem } = useNav()
  const [filter, setFilter] = useState<TaskFilter>('all')

  const tasks = useMemo(() => sortPendingTasks(items), [items])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'pending':
        return tasks.filter((t) => t.status !== 'done')
      case 'completed':
        return tasks.filter((t) => t.status === 'done')
      case 'overdue':
        return tasks.filter((t) => t.status !== 'done' && t.dueAt && isOverdue(t.dueAt))
      default:
        return tasks
    }
  }, [tasks, filter])

  const pendingCount = useMemo(() => tasks.filter((t) => t.status !== 'done').length, [tasks])

  return (
    <Content>
      <PageHeader title="Tasks" subtitle="Everything you've committed to." count={pendingCount} />

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter: ${f.label}`}
              style={({ pressed }) => [
                styles.filter,
                active && styles.filterActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          )
        })}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="check-square"
          title="No tasks here"
          message="Tasks you add or capture will show up here."
        />
      ) : (
        filtered.map((task) => (
          <TaskItem
            key={task.id}
            item={task}
            onPress={() => openItem(task.id)}
            onToggleDone={() => toggleDone(task.id)}
          />
        ))
      )}
    </Content>
  )
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filter: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
})
