import { useMemo } from 'react'
import { getTodayGroups } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'

export function TodayScreen() {
  const { items, toggleDone } = useItems()
  const { openItem } = useNav()
  const groups = useMemo(() => getTodayGroups(items), [items])

  return (
    <Content>
      <PageHeader title="Today" subtitle="What do I need to do?" />
      {groups.length === 0 ? (
        <EmptyState
          icon="sun"
          title="All clear"
          message="Nothing needs your attention today. Take a breath."
        />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="group">
            <h2 className="section-title">{group.title}</h2>
            {group.items.map((task) => (
              <TaskItem
                key={task.id}
                item={task}
                onPress={() => openItem(task.id)}
                onToggleDone={() => toggleDone(task.id)}
              />
            ))}
          </section>
        ))
      )}
    </Content>
  )
}
