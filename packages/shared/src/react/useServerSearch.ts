import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item, ItemType } from '../index'
import { errorMessage } from '../api/itemsApi'
import { useItems } from './ItemsContext'

export type SearchTypeFilter = 'all' | ItemType

export const SEARCH_PAGE_SIZE = 25

export interface UseServerSearch {
  query: string
  setQuery: (q: string) => void
  filter: SearchTypeFilter
  setFilter: (f: SearchTypeFilter) => void
  results: Item[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  searched: boolean
  hasMore: boolean
  total: number
  loadMore: () => void
  clear: () => void
  patchResult: (id: string, patch: Partial<Item>) => void
}

export function useServerSearch(debounceMs = 300): UseServerSearch {
  const { search } = useItems()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchTypeFilter>('all')
  const [results, setResults] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const requestId = useRef(0)

  const runSearch = useCallback(
    async (q: string, offset: number) => {
      const response = await search({
        q,
        limit: SEARCH_PAGE_SIZE,
        offset,
      })
      return response
    },
    [search],
  )

  const clear = useCallback(() => {
    requestId.current += 1
    setQuery('')
    setFilter('all')
    setResults([])
    setLoading(false)
    setLoadingMore(false)
    setError(null)
    setSearched(false)
    setHasMore(false)
    setTotal(0)
  }, [])

  const patchResult = useCallback((id: string, patch: Partial<Item>) => {
    setResults((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      requestId.current += 1
      setResults([])
      setLoading(false)
      setLoadingMore(false)
      setError(null)
      setSearched(false)
      setHasMore(false)
      setTotal(0)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const id = ++requestId.current
      try {
        const { items, meta } = await runSearch(q, 0)
        if (id !== requestId.current) return
        setResults(items)
        setHasMore(meta.hasMore)
        setTotal(meta.total)
        setSearched(true)
        setError(null)
      } catch (err) {
        if (id !== requestId.current) return
        setError(errorMessage(err, 'Search failed'))
        setResults([])
        setHasMore(false)
        setSearched(true)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [query, filter, runSearch, debounceMs])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || !query.trim()) return
    const id = requestId.current
    setLoadingMore(true)
    void runSearch(query.trim(), results.length)
      .then(({ items, meta }) => {
        if (id !== requestId.current) return
        setResults((prev) => {
          const seen = new Set(prev.map((i) => i.id))
          return [...prev, ...items.filter((i) => !seen.has(i.id))]
        })
        setHasMore(meta.hasMore)
        setTotal(meta.total)
      })
      .catch((err) => {
        if (id !== requestId.current) return
        setError(errorMessage(err, 'Could not load more results'))
      })
      .finally(() => {
        if (id === requestId.current) setLoadingMore(false)
      })
  }, [loading, loadingMore, hasMore, query, results.length, runSearch])

  return {
    query,
    setQuery,
    filter,
    setFilter,
    results,
    loading,
    loadingMore,
    error,
    searched,
    hasMore,
    total,
    loadMore,
    clear,
    patchResult,
  }
}
