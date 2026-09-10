import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Item, ItemType, Priority, ItemStatus } from '../index'
import { createMockItems } from '../mockData'
import { uid } from '../utils/id'

export interface ItemPatch {
  title?: string
  body?: string
  url?: string
  type?: ItemType
  status?: ItemStatus
  priority?: Priority | null
  dueAt?: string | null
  tags?: string[]
}

interface ItemsContextValue {
  items: Item[]
  getItem: (id: string) => Item | undefined
  addItem: (input: { title: string; body?: string; url?: string }) => Item
  updateItem: (id: string, patch: ItemPatch) => void
  toggleDone: (id: string) => void
  removeItem: (id: string) => void
}

const ItemsContext = createContext<ItemsContextValue | null>(null)

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>(() => createMockItems())

  const getItem = useCallback((id: string) => items.find((i) => i.id === id), [items])

  const addItem = useCallback((input: { title: string; body?: string; url?: string }) => {
    const now = new Date().toISOString()
    const item: Item = {
      id: uid(),
      type: 'note',
      status: 'inbox',
      title: input.title.trim(),
      body: input.body,
      url: input.url,
      priority: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
    }
    setItems((prev) => [item, ...prev])
    return item
  }, [])

  const updateItem = useCallback((id: string, patch: ItemPatch) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i)),
    )
  }, [])

  const toggleDone = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const done = i.status === 'done'
        return {
          ...i,
          status: done ? 'active' : 'done',
          doneAt: done ? null : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }),
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const value = useMemo(
    () => ({ items, getItem, addItem, updateItem, toggleDone, removeItem }),
    [items, getItem, addItem, updateItem, toggleDone, removeItem],
  )

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>
}

export function useItems(): ItemsContextValue {
  const ctx = useContext(ItemsContext)
  if (!ctx) throw new Error('useItems must be used within ItemsProvider')
  return ctx
}
