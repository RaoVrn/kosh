import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from '../src/utils/recentSearches'

class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
}

describe('recentSearches', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage())
    clearRecentSearches()
  })

  it('stores searches newest first without duplicates', () => {
    addRecentSearch('type:task python')
    addRecentSearch('project:"Kosh"')
    addRecentSearch('type:task python')
    const list = getRecentSearches()
    expect(list).toEqual(['type:task python', 'project:"Kosh"'])
  })

  it('caps the list at 8 entries', () => {
    for (let i = 0; i < 12; i++) addRecentSearch(`search ${i}`)
    expect(getRecentSearches()).toHaveLength(8)
    expect(getRecentSearches()[0]).toBe('search 11')
  })

  it('ignores empty searches and clears', () => {
    addRecentSearch('   ')
    expect(getRecentSearches()).toHaveLength(0)
    addRecentSearch('architecture')
    clearRecentSearches()
    expect(getRecentSearches()).toHaveLength(0)
  })

  it('deduplicates case-insensitively', () => {
    addRecentSearch('KOSH')
    addRecentSearch('kosh')
    expect(getRecentSearches()).toEqual(['kosh'])
  })
})