import { useMemo, useState } from 'react'
import { getTaskGroups } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateModal } from '../components/ItemCreateModal'

export function TasksScreen() {
  const { items, toggleDone } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const groups = useMemo(() => getTaskGroups(items), [items])
  const pendingCount = useMemo(
    () => items.filter((i) => i.type === 'task' && i.status !== 'done').length,
    [items],
  )

  const sections: { key: string; title: string; items: (typeof groups.completed)[number][] }[] = [
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
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            New task
          </button>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon="check-square"
          title="No active tasks."
          message="Capture something and convert it to a task, or add a new task."
        />
      ) : (
        sections.map(
          (section) =>
            section.items.length > 0 && (
              <section key={section.key} className="group">
                <h2 className="section-title">{section.title}</h2>
                {section.items.map((task) => (
                  <TaskItem
                    key={task.id}
                    item={task}
                    onPress={() => openItem(task.id)}
                    onToggleDone={() => toggleDone(task.id)}
                  />
                ))}
              </section>
            ),
        )
      )}

      {creating ? <ItemCreateModal type="task" onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}
