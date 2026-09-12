// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Item, ItemsApiClient, ItemsListParams } from '../src/index'
import { ItemsProvider } from '../src/react/ItemsContext'
import { useServerSearch } from '../src/react/useServerSearch'

function item(id: string, title: string): Item {
  return {
    id,
    type: 'note',
    status: 'inbox',
    title,
    priority: null,
    tags: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

function fakeApi(getItems: ItemsApiClient['getItems']): ItemsApiClient {
  return {
    getItems,
    getItem: async () => {
      throw new Error('unused')
    },
    createItem: async () => {
      throw new Error('unused')
    },
    updateItem: async () => {
      throw new Error('unused')
    },
    deleteItem: async () => {},
    getNotifications: async () => [],
    markNotificationRead: async () => {
      throw new Error('unused')
    },
    interpretCapture: async () => {
      throw new Error('unused')
    },
    transcribeAudio: async () => {
      throw new Error('unused')
    },
    listProjects: async () => [],
    getProject: async () => {
      throw new Error('unused')
    },
    createProject: async () => {
      throw new Error('unused')
    },
    updateProject: async () => {
      throw new Error('unused')
    },
    deleteProject: async () => {
      throw new Error('unused')
    },
  }
}

function wrapperFor(getItems: ItemsApiClient['getItems']) {
  return ({ children }: { children: ReactNode }) => (
    <ItemsProvider api={fakeApi(getItems)}>{children}</ItemsProvider>
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useServerSearch', () => {
  it('debounces rapid keystrokes into a single request and renders results', async () => {
    const getItems = vi.fn(async (params?: ItemsListParams) =>
      params?.q ? [item('1', `match ${params.q}`)] : [],
    )
    const { result } = renderHook(() => useServerSearch(10), {
      wrapper: wrapperFor(getItems),
    })

    act(() => result.current.setQuery('d'))
    act(() => result.current.setQuery('do'))
    act(() => result.current.setQuery('doc'))

    await waitFor(() => {
      expect(getItems.mock.calls.filter(([p]) => p?.q).length).toBe(1)
    })
    expect(getItems.mock.calls.find(([p]) => p?.q)?.[0]?.q).toBe('doc')
    await waitFor(() => expect(result.current.results[0]?.title).toBe('match doc'))
  })

  it('surfaces errors from the API', async () => {
    const getItems = vi.fn(async (params?: ItemsListParams) => {
      if (params?.q) throw new Error('Search exploded')
      return []
    })
    const { result } = renderHook(() => useServerSearch(5), {
      wrapper: wrapperFor(getItems),
    })

    act(() => result.current.setQuery('docker'))
    await waitFor(() => expect(result.current.error).toBe('Search exploded'))
    expect(result.current.searched).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('clears results and query', async () => {
    const getItems = vi.fn(async (params?: ItemsListParams) =>
      params?.q ? [item('1', 'found')] : [],
    )
    const { result } = renderHook(() => useServerSearch(5), {
      wrapper: wrapperFor(getItems),
    })

    act(() => result.current.setQuery('docker'))
    await waitFor(() => expect(result.current.results.length).toBe(1))

    act(() => result.current.clear())
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.searched).toBe(false)
  })

  it('ignores stale responses from earlier queries', async () => {
    let resolveFirst: (v: Item[]) => void = () => {}
    const getItems = vi.fn((params?: ItemsListParams) => {
      if (params?.q === 'first') {
        return new Promise<Item[]>((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve([item('2', 'second result')])
    })
    const { result } = renderHook(() => useServerSearch(5), {
      wrapper: wrapperFor(getItems),
    })

    act(() => result.current.setQuery('first'))
    act(() => result.current.setQuery('second'))
    await waitFor(() => expect(result.current.results[0]?.title).toBe('second result'))

    act(() => {
      resolveFirst([item('1', 'stale first result')])
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(result.current.results[0]?.title).toBe('second result')
  })
})
