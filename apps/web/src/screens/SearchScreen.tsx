import { useEffect, useMemo, useState } from 'react'
import {
  ITEM_TYPES,
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  typeLabel,
  useItems,
  useProjects,
  useServerSearch,
} from '@kosh/shared'
import type { ItemType, SearchTypeFilter } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'

type StatusFilter = 'all' | 'inbox' | 'active' | 'done' | 'archived'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

const TYPE_FILTERS: { value: SearchTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...ITEM_TYPES.map((t) => ({ value: t as SearchTypeFilter, label: typeLabel[t] })),
]

export function SearchScreen() {
  const { toggleDone } = useItems()
  const { openItem } = useNav()
  const { projects } = useProjects()
  const { items } = useItems()
  const [input, setInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [hasAttachmentFilter, setHasAttachmentFilter] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => getRecentSearches())

  const hook = useServerSearch()

  const effectiveQuery = useMemo(() => {
    const parts: string[] = []
    if (input.trim()) parts.push(input.trim())
    if (hook.filter !== 'all') parts.push(`type:${hook.filter}`)
    if (statusFilter !== 'all') parts.push(`status:${statusFilter}`)
    if (hasAttachmentFilter) parts.push('has:attachment')
    return parts.join(' ')
  }, [input, hook.filter, statusFilter, hasAttachmentFilter])

  useEffect(() => {
    hook.setQuery(effectiveQuery)
  }, [effectiveQuery])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const item of items) {
      for (const tag of item.tags ?? []) tags.add(tag)
    }
    return [...tags].sort((a, b) => a.localeCompare(b))
  }, [items])

  const suggestions = useMemo(() => {
    const q = input.trim()
    if (q.endsWith('project:')) {
      return projects.map((p) => ({ label: `project:"${p.name}"`, hint: p.name }))
    }
    if (q.endsWith('tag:')) {
      return allTags.slice(0, 12).map((t) => ({ label: `tag:${t}`, hint: t }))
    }
    if (q.endsWith('type:')) {
      return ITEM_TYPES.map((t) => ({ label: `type:${t}`, hint: typeLabel[t] }))
    }
    if (q.endsWith('status:')) {
      return ['inbox', 'active', 'done', 'archived'].map((s) => ({
        label: `status:${s}`,
        hint: s,
      }))
    }
    return []
  }, [input, projects, allTags])

  const commitSearch = (q: string) => {
    setInput(q)
    setRecent(addRecentSearch(q))
  }

  const handleToggleDone = (id: string) => {
    const current = hook.results.find((i) => i.id === id)
    if (!current) return
    const next = current.status === 'done' ? 'active' : 'done'
    hook.patchResult(id, {
      status: next,
      doneAt: next === 'done' ? new Date().toISOString() : null,
    })
    void toggleDone(id)
  }

  const handleOpen = (id: string) => {
    if (input.trim()) setRecent(addRecentSearch(effectiveQuery))
    openItem(id)
  }

  return (
    <Content>
      <PageHeader
        title="Search"
        subtitle="Find anything you've captured."
        right={
          hook.searched && !hook.loading && hook.results.length > 0 ? (
            <span className="card-time">
              {hook.total} result{hook.total === 1 ? '' : 's'}
            </span>
          ) : null
        }
      />

      <div className="search-bar">
        <Icon name="search" size={18} color="var(--text-faint)" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              setRecent(addRecentSearch(effectiveQuery))
            }
          }}
          placeholder='Search tasks, notes, ideas…  (try type:task, project:"Kosh", has:attachment)'
          aria-label="Search"
          autoFocus
        />
        {input ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              hook.clear()
              setInput('')
              setStatusFilter('all')
              setHasAttachmentFilter(false)
            }}
            aria-label="Clear search"
          >
            <Icon name="x" size={14} />
          </button>
        ) : null}
      </div>

      {suggestions.length > 0 ? (
        <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              className="search-suggestion"
              onClick={() =>
                commitSearch(
                  `${input.trim().replace(/:\s*$/, ':')}${s.label.slice(s.label.indexOf(':') + 1)}`,
                )
              }
            >
              {s.label}
              <span className="search-suggestion-hint">{s.hint}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="search-filters">
        <div className="chip-row" role="group" aria-label="Filter by type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`chip${hook.filter === f.value ? ' active' : ''}`}
              aria-pressed={hook.filter === f.value}
              onClick={() => hook.setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="chip-row" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`chip${statusFilter === f.value ? ' active' : ''}`}
              aria-pressed={statusFilter === f.value}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip${hasAttachmentFilter ? ' active' : ''}`}
            aria-pressed={hasAttachmentFilter}
            onClick={() => setHasAttachmentFilter((v) => !v)}
          >
            With attachments
          </button>
        </div>
      </div>

      {recent.length > 0 && !input ? (
        <div className="recent-searches">
          <span className="recent-label">Recent</span>
          {recent.map((r) => (
            <button key={r} type="button" className="chip" onClick={() => commitSearch(r)}>
              {r}
            </button>
          ))}
          <button
            type="button"
            className="recent-clear"
            onClick={() => {
              clearRecentSearches()
              setRecent([])
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

      {hook.loading ? (
        <div className="empty">
          <div className="empty-icon">
            <Icon name="search" size={22} />
          </div>
          <h3>Searching…</h3>
        </div>
      ) : hook.error ? (
        <div className="error-banner" role="alert">
          <span className="error-banner-text">{hook.error}</span>
        </div>
      ) : !hook.searched ? null : hook.results.length === 0 ? (
        <EmptyState
          icon="search"
          title={`No results for "${input.trim()}"`}
          message="Try fewer words, different spelling, or removing filters."
        />
      ) : (
        <>
          {hook.results.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onPress={() => handleOpen(item.id)}
              onToggleDone={item.type === 'task' ? () => handleToggleDone(item.id) : undefined}
            />
          ))}
          {hook.hasMore ? (
            <button
              type="button"
              className="btn-secondary btn-block"
              disabled={hook.loadingMore}
              onClick={hook.loadMore}
            >
              {hook.loadingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </>
      )}
    </Content>
  )
}
