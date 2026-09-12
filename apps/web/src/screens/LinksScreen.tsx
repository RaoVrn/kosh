import { useMemo, useState } from 'react'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateModal } from '../components/ItemCreateModal'

export function LinksScreen() {
  const { items } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const links = useMemo(
    () =>
      items
        .filter((i) => i.type === 'link')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader
        title="Links"
        subtitle="Useful things you want to keep."
        right={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            New link
          </button>
        }
      />
      {links.length === 0 ? (
        <EmptyState icon="link" title="No saved links yet" message="Save a link worth keeping." />
      ) : (
        links.map((link) => (
          <ItemCard key={link.id} item={link} onPress={() => openItem(link.id)} />
        ))
      )}
      {creating ? <ItemCreateModal type="link" onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}
