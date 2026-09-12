import { useMemo, useState } from 'react'
import { getLearningGroups } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateModal } from '../components/ItemCreateModal'

export function LearningScreen() {
  const { items } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const groups = useMemo(() => getLearningGroups(items), [items])

  const sections: { key: string; title: string; items: (typeof groups.highPriority)[number][] }[] =
    [
      { key: 'high', title: 'High priority', items: groups.highPriority },
      { key: 'active', title: 'Active', items: groups.active },
      { key: 'inbox', title: 'Not started', items: groups.notStarted },
      { key: 'done', title: 'Completed', items: groups.completed },
    ]
  const isEmpty = sections.every((s) => s.items.length === 0)

  return (
    <Content>
      <PageHeader
        title="Learning"
        subtitle="Your backlog of things to learn."
        right={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            New learning
          </button>
        }
      />
      {isEmpty ? (
        <EmptyState
          icon="book-open"
          title="Nothing in your backlog"
          message="Add something you want to understand."
        />
      ) : (
        sections.map(
          (section) =>
            section.items.length > 0 && (
              <section key={section.key} className="group">
                <h2 className="section-title">{section.title}</h2>
                {section.items.map((item) => (
                  <ItemCard key={item.id} item={item} onPress={() => openItem(item.id)} />
                ))}
              </section>
            ),
        )
      )}
      {creating ? <ItemCreateModal type="learning" onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}
