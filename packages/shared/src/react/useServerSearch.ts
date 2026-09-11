import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item, ItemType } from '../index'
import { errorMessage } from '../api/itemsApi'
import { useItems } from './ItemsContext'

export type SearchTypeFilter = 'all' | ItemType

export interface UseServerSearch {
  query: string
  setQuery: (q: string) => void
  filter: SearchTypeFilter
  setFilter: (f: SearchTypeFilter) => void
  results: Item[]
  loading: boolean
  error: string | null
  searched: boolean
  clear: () => void
  patchResult: (id: string, patch: Partial<Item>) => void
}

export function useServerSearch(debounceMs = 300): UseServerSearch {
  const { search } = useItems()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchTypeFilter>('all')
  const [results, setResults] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const requestId = useRef(0)

  const clear = useCallback(() => {
    requestId.current += 1
    setQuery('')
    setFilter('all')
    setResults([])
    setLoading(false)
    setError(null)
    setSearched(false)
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
      setError(null)
      setSearched(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const id = ++requestId.current
      try {
        const items = await search({ q, type: filter === 'all' ? undefined : filter })
        if (id !== requestId.current) return
        setResults(items)
        setSearched(true)
        setError(null)
      } catch (err) {
        if (id !== requestId.current) return
        setError(errorMessage(err, 'Search failed'))
        setResults([])
        setSearched(true)
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [query, filter, search, debounceMs])

  return {
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
  }
}
