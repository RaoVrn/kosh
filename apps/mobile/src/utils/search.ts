import type { Item } from '@kosh/shared'

export function searchItems(items: Item[], query: string): Item[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return items
    .filter((item) => {
      const haystack = [item.title, item.body, item.url, ...(item.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
