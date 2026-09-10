import { useMemo } from 'react'
import { useItems } from '../state/ItemsContext'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'

export function IdeasScreen() {
  const { items } = useItems()
  const { openItem } = useNav()

  const ideas = useMemo(
    () =>
      items
        .filter((i) => i.type === 'idea')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader title="Ideas" subtitle="Captured before they vanish." />
      {ideas.length === 0 ? (
        <EmptyState
          icon="zap"
          title="No ideas yet"
          message="Capture a thought and it may just become an idea."
        />
      ) : (
        ideas.map((idea) => (
          <ItemCard key={idea.id} item={idea} onPress={() => openItem(idea.id)} />
        ))
      )}
    </Content>
  )
}
