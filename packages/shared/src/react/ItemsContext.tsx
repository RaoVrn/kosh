import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CaptureResult, Item, ItemType, Priority, ItemStatus, Recurrence } from '../index'
import type { TranscribeFileInput } from '../api/itemsApi'
import { errorMessage } from '../api/itemsApi'
import { createItemsApi, DEFAULT_API_BASE_URL } from '../api/itemsApi'
import type { ItemsApiClient } from '../api/itemsApi'

export interface ItemPatch {
  title?: string
  body?: string
  url?: string
  type?: ItemType
  status?: ItemStatus
  priority?: Priority | null
  dueAt?: string | null
  reminderAt?: string | null
  tags?: string[]
  recurrence?: Recurrence | null
  projectId?: string | null
}

export interface ItemInput {
  title: string
  body?: string
  url?: string
  type?: ItemType
  status?: ItemStatus
  priority?: Priority | null
  dueAt?: string | null
  reminderAt?: string | null
  tags?: string[] | null
  recurrence?: Recurrence | null
  projectId?: string | null
}

export interface SearchQuery {
  q: string
  type?: ItemType
  status?: ItemStatus
}

interface ItemsContextValue {
  items: Item[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getItem: (id: string) => Item | undefined
  addItem: (input: ItemInput) => Promise<Item>
  updateItem: (id: string, patch: ItemPatch) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  removeItem: (id: string) => Promise<void>
  search: (params: SearchQuery) => Promise<Item[]>
  interpret: (text: string, timezone?: string, currentTime?: string) => Promise<CaptureResult>
  transcribe: (file: TranscribeFileInput) => Promise<string>
}

interface ItemsProviderProps {
  children: ReactNode
  baseUrl?: string
  api?: ItemsApiClient
}

const ItemsContext = createContext<ItemsContextValue | null>(null)

export function ItemsProvider({ children, baseUrl, api }: ItemsProviderProps) {
  const client = useMemo(
    () => api ?? createItemsApi(baseUrl ?? DEFAULT_API_BASE_URL),
    [api, baseUrl],
  )

  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const list = await client.getItems()
      setItems(list)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load items'))
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const getItem = useCallback((id: string) => items.find((i) => i.id === id), [items])

  const addItem = useCallback(
    async (input: ItemInput) => {
      setError(null)
      try {
        const item = await client.createItem({
          title: input.title.trim(),
          body: input.body,
          url: input.url,
          type: input.type ?? 'note',
          status: input.status ?? 'inbox',
          priority: input.priority ?? null,
          dueAt: input.dueAt ?? null,
          reminderAt: input.reminderAt ?? null,
          tags: input.tags ?? null,
          recurrence: input.recurrence ?? null,
          projectId: input.projectId ?? null,
        })
        setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)])
        return item
      } catch (err) {
        setError(errorMessage(err, 'Could not add the item'))
        throw err
      }
    },
    [client],
  )

  const updateItem = useCallback(
    async (id: string, patch: ItemPatch) => {
      setError(null)
      try {
        const current = items.find((i) => i.id === id)
        const completesRecurring =
          patch.status === 'done' &&
          current !== undefined &&
          current.recurrence !== null &&
          current.recurrence !== undefined &&
          current.recurrence.frequency !== 'none'
        const item = await client.updateItem(id, patch)
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)))
        if (completesRecurring) void refresh()
      } catch (err) {
        setError(errorMessage(err, 'Could not update the item'))
      }
    },
    [client, items, refresh],
  )

  const toggleDone = useCallback(
    async (id: string) => {
      const current = items.find((i) => i.id === id)
      if (!current) return
      const next = current.status === 'done' ? 'active' : 'done'
      setError(null)
      try {
        const item = await client.updateItem(id, { status: next })
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)))
        if (
          next === 'done' &&
          current.recurrence !== null &&
          current.recurrence !== undefined &&
          current.recurrence.frequency !== 'none'
        ) {
          void refresh()
        }
      } catch (err) {
        setError(errorMessage(err, 'Could not update the task'))
      }
    },
    [client, items, refresh],
  )

  const removeItem = useCallback(
    async (id: string) => {
      setError(null)
      try {
        await client.deleteItem(id)
        setItems((prev) => prev.filter((i) => i.id !== id))
      } catch (err) {
        setError(errorMessage(err, 'Could not delete the item'))
      }
    },
    [client],
  )

  const search = useCallback(
    async (params: SearchQuery) => {
      return client.getItems({ q: params.q, type: params.type, status: params.status })
    },
    [client],
  )

  const interpret = useCallback(
    async (text: string, timezone?: string, currentTime?: string) => {
      return client.interpretCapture({ text, timezone, currentTime })
    },
    [client],
  )

  const transcribe = useCallback(
    async (file: TranscribeFileInput) => {
      return client.transcribeAudio(file)
    },
    [client],
  )

  const value = useMemo(
    () => ({
      items,
      loading,
      error,
      refresh,
      getItem,
      addItem,
      updateItem,
      toggleDone,
      removeItem,
      search,
      interpret,
      transcribe,
    }),
    [
      items,
      loading,
      error,
      refresh,
      getItem,
      addItem,
      updateItem,
      toggleDone,
      removeItem,
      search,
      interpret,
      transcribe,
    ],
  )

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>
}

export function useItems(): ItemsContextValue {
  const ctx = useContext(ItemsContext)
  if (!ctx) throw new Error('useItems must be used within ItemsProvider')
  return ctx
}
