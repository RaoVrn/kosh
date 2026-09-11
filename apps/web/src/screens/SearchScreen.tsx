import { ITEM_TYPES, typeLabel, useItems, useServerSearch } from '@kosh/shared'
import type { SearchTypeFilter } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'

const FILTERS: SearchTypeFilter[] = ['all', ...ITEM_TYPES]

export function SearchScreen() {
  const { toggleDone } = useItems()
  const { openItem } = useNav()
  const {
    query,
    setQuery,
    filter,
    setFilter,
    results,
    loading,
    error,
    searched,
    clear,
    patchResult,
  } = useServerSearch()

  const handleToggleDone = (id: string) => {
    const current = results.find((i) => i.id === id)
    if (!current) return
    const next = current.status === 'done' ? 'active' : 'done'
    patchResult(id, {
      status: next,
      doneAt: next === 'done' ? new Date().toISOString() : null,
    })
    void toggleDone(id)
  }

  return (
    <Content>
      <PageHeader
        title="Search"
        subtitle="Find anything you've captured."
        right={
          results.length > 0 && !loading ? (
            <span className="card-time">
              {results.length} result{results.length === 1 ? '' : 's'}
            </span>
          ) : null
        }
      />

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
          <button type="button" className="icon-btn" onClick={clear} aria-label="Clear search">
            <Icon name="x" size={18} />
          </button>
        ) : null}
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => {
          const active = filter === f
          const label = f === 'all' ? 'All' : typeLabel[f]
          return (
            <button
              key={f}
              type="button"
              className={`chip${active ? ' active' : ''}`}
              onClick={() => setFilter(f)}
              aria-label={`Filter by ${label}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {query.trim() === '' ? (
        <EmptyState
          icon="search"
          title="Search Kosh"
          message="Search your tasks, notes, ideas, and everything you've captured."
        />
      ) : error ? (
        <EmptyState icon="search" title="Search failed" message={error} />
      ) : loading && results.length === 0 ? (
        <EmptyState icon="search" title="Searching…" message="" />
      ) : searched && results.length === 0 ? (
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
            onToggleDone={result.type === 'task' ? () => handleToggleDone(result.id) : undefined}
          />
        ))
      )}
    </Content>
  )
}
