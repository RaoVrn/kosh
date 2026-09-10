import { describe, expect, it } from 'vitest'
import type { Item } from '@kosh/shared'
import { searchItems } from '@kosh/shared'

function item(overrides: Partial<Item> & Pick<Item, 'id' | 'title'>): Item {
  return {
    type: 'note',
    status: 'inbox',
    body: null,
    url: null,
    dueAt: null,
    reminderAt: null,
    priority: null,
    tags: [],
    doneAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('searchItems', () => {
  it('matches title, body, url and tags case-insensitively', () => {
    const items: Item[] = [
      item({ id: 't', title: 'Learn Docker networking', tags: ['backend'] }),
      item({ id: 'b', title: 'Note', body: 'RAG retrieval guide' }),
      item({ id: 'u', title: 'Article', url: 'https://example.com/rag' }),
      item({ id: 'tag', title: 'Idea', tags: ['kubernetes'] }),
    ]
    expect(searchItems(items, 'docker').map((i) => i.id)).toEqual(['t'])
    expect(searchItems(items, 'rag').map((i) => i.id)).toEqual(['b', 'u'])
    expect(searchItems(items, 'KUBERNETES').map((i) => i.id)).toEqual(['tag'])
  })

  it('returns empty for blank queries and no matches', () => {
    const items: Item[] = [item({ id: 't', title: 'hello' })]
    expect(searchItems(items, '')).toEqual([])
    expect(searchItems(items, '   ')).toEqual([])
    expect(searchItems(items, 'nope')).toEqual([])
  })

  it('sorts results by newest created first', () => {
    const items: Item[] = [
      item({ id: 'old', title: 'docker', createdAt: '2026-01-01T00:00:00.000Z' }),
      item({ id: 'new', title: 'docker', createdAt: '2026-09-01T00:00:00.000Z' }),
    ]
    expect(searchItems(items, 'docker').map((i) => i.id)).toEqual(['new', 'old'])
  })
})
