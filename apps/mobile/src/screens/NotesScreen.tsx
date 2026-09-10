import { useMemo } from 'react'
import { useItems } from '../state/ItemsContext'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'

export function NotesScreen() {
  const { items } = useItems()
  const { openItem } = useNav()

  const notes = useMemo(
    () =>
      items
        .filter((i) => i.type === 'note')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader title="Notes" subtitle="Thoughts worth keeping." />
      {notes.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No notes yet"
          message="Notes you keep will appear here."
        />
      ) : (
        notes.map((note) => (
          <ItemCard key={note.id} item={note} onPress={() => openItem(note.id)} />
        ))
      )}
    </Content>
  )
}
