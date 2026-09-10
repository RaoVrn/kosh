import { useMemo, useState } from 'react'
import { searchItems } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'

export function SearchScreen() {
  const { items, toggleDone } = useItems()
  const { openItem } = useNav()
  const [query, setQuery] = useState('')

  const results = useMemo(() => searchItems(items, query), [items, query])

  return (
    <Content>
      <PageHeader title="Search" subtitle="Find anything you've captured." />

      <div className="search-bar">
        <Icon name="search" size={18} color="var(--text-faint)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks, notes, ideas…"
          aria-label="Search"
          autoFocus
        />
        {query.length > 0 ? (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <Icon name="x" size={18} />
          </button>
        ) : null}
      </div>

      {query.trim() === '' ? (
        <EmptyState
          icon="search"
          title="Search everything"
          message="Find tasks, notes, ideas, learning items and links."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No results"
          message={`Nothing matches "${query.trim()}".`}
        />
      ) : (
        results.map((result) => (
          <ItemCard
            key={result.id}
            item={result}
            onPress={() => openItem(result.id)}
            onToggleDone={result.type === 'task' ? () => toggleDone(result.id) : undefined}
          />
        ))
      )}
    </Content>
  )
}
