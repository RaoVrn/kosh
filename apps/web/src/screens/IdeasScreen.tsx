import { useMemo, useState } from 'react'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateModal } from '../components/ItemCreateModal'

export function IdeasScreen() {
  const { items } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const ideas = useMemo(
    () =>
      items
        .filter((i) => i.type === 'idea')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader
        title="Ideas"
        subtitle="Captured before they vanish."
        right={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            New idea
          </button>
        }
      />
      {ideas.length === 0 ? (
        <EmptyState icon="zap" title="No ideas yet" message="The next great idea can start here." />
      ) : (
        ideas.map((idea) => (
          <ItemCard key={idea.id} item={idea} onPress={() => openItem(idea.id)} />
        ))
      )}
      {creating ? <ItemCreateModal type="idea" onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}
