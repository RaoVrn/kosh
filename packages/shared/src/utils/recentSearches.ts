const KEY = 'kosh.recentSearches'
const MAX = 8

function readStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    // storage unavailable (e.g. private mode)
  }
  return null
}

const memoryStore = new Map<string, string>()

export function getRecentSearches(): string[] {
  const storage = readStorage()
  const raw = storage ? storage.getItem(KEY) : memoryStore.get(KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  } catch {
    return []
  }
}

export function addRecentSearch(query: string): string[] {
  const q = query.trim()
  if (!q) return getRecentSearches()
  const next = [q, ...getRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(
    0,
    MAX,
  )
  const storage = readStorage()
  const raw = JSON.stringify(next)
  if (storage) {
    try {
      storage.setItem(KEY, raw)
    } catch {
      memoryStore.set(KEY, raw)
    }
  } else {
    memoryStore.set(KEY, raw)
  }
  return next
}

export function clearRecentSearches(): void {
  const storage = readStorage()
  if (storage) {
    try {
      storage.removeItem(KEY)
    } catch {
      memoryStore.delete(KEY)
    }
  } else {
    memoryStore.delete(KEY)
  }
}
