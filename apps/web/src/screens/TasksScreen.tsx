import { useMemo, useState } from 'react'
import { isOverdue, sortPendingTasks } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'

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

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              className={`chip${active ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          )
        })}
      </div>

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
