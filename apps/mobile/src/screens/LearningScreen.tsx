import { useMemo } from 'react'
import { useItems } from '../state/ItemsContext'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'

export function LearningScreen() {
  const { items } = useItems()
  const { openItem } = useNav()

  const learning = useMemo(
    () =>
      items
        .filter((i) => i.type === 'learning')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader title="Learning" subtitle="Your backlog of things to learn." />
      {learning.length === 0 ? (
        <EmptyState
          icon="book-open"
          title="Nothing in your backlog"
          message="Add something you want to learn and Kosh will keep track."
        />
      ) : (
        learning.map((item) => (
          <ItemCard key={item.id} item={item} onPress={() => openItem(item.id)} />
        ))
      )}
    </Content>
  )
}
