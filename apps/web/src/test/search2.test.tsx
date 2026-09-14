import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '@kosh/shared'
import App from '../App'
import { createApiFetchMock } from './apiMock'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'note',
    status: 'inbox',
    title: 'Architecture review',
    body: 'The architecture requirements were reviewed before Friday.',
    url: null,
    priority: null,
    tags: ['ai'],
    projectId: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

async function openSearch() {
  render(<App />)
  await screen.findByRole('heading', { name: 'Inbox', level: 1 })
  fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0]!)
  await screen.findByRole('heading', { name: 'Search', level: 1 })
}

describe('Search 2.0 (web)', () => {
  it('debounces typing and shows result counts', async () => {
    const fetchMock = createApiFetchMock([item()])
    vi.stubGlobal('fetch', fetchMock)
    await openSearch()

    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.change(input, { target: { value: 'ar' } })
    fireEvent.change(input, { target: { value: 'arch' } })
    fireEvent.change(input, { target: { value: 'architecture' } })

    expect(await screen.findByText('Architecture review')).toBeTruthy()
    expect(screen.getByText('1 result')).toBeTruthy()
  })

  it('renders the snippet with highlighting', async () => {
    vi.stubGlobal(
      'fetch',
      createApiFetchMock([
        item({
          body: 'The architecture requirements were reviewed before Friday.',
          snippet: 'The <mark>architecture</mark> requirements were re…',
        }),
      ]),
    )
    await openSearch()

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'architecture' } })
    const mark = await screen.findByText('architecture', { selector: 'mark' })
    expect(mark.className).toBe('snippet-mark')
  })

  it('shows a useful no-results state', async () => {
    vi.stubGlobal('fetch', createApiFetchMock([item()]))
    await openSearch()

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzz' } })
    expect(await screen.findByText(/No results for "zzz"/)).toBeTruthy()
    expect(screen.getByText(/Try fewer words/)).toBeTruthy()
  })

  it('applies type and status filters as operators', async () => {
    const fetchMock = createApiFetchMock([
      item({ id: 't1', type: 'task', title: 'python task', tags: ['python'] }),
      item({ id: 'l1', type: 'learning', title: 'python course', tags: ['python'] }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    await openSearch()

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'python' } })
    await screen.findByText('python task')

    fireEvent.click(
      screen.getByRole('group', { name: /Filter by type/ }).querySelectorAll('button')[4]!,
    )
    expect(await screen.findByText('python course')).toBeTruthy()
    expect(screen.queryByText('python task')).toBeNull()

    fireEvent.click(
      screen.getByRole('group', { name: /Filter by status/ }).querySelectorAll('button')[3]!,
    )
    await waitFor(() => {
      const qCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('q='))
      const last = qCalls[qCalls.length - 1]
      expect(decodeURIComponent(String(last?.[0]))).toContain('type:learning')
      expect(decodeURIComponent(String(last?.[0]))).toContain('status:done')
    })
  })

  it('loads more results when hasMore is true', async () => {
    const seed: Item[] = []
    for (let i = 0; i < 30; i++) {
      seed.push(item({ id: `i${i}`, title: `paged item ${i}` }))
    }
    const fetchMock = createApiFetchMock(seed)
    vi.stubGlobal('fetch', fetchMock)
    await openSearch()

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'paged' } })
    expect(await screen.findByText('paged item 0')).toBeTruthy()

    const loadMore = await screen.findByRole('button', { name: /Load more/ })
    fireEvent.click(loadMore)
    expect(await screen.findByText('paged item 25')).toBeTruthy()

    await waitFor(() => {
      const moreCalls = fetchMock.mock.calls.filter(
        ([u]) => String(u).includes('q=paged') && String(u).includes('offset=25'),
      )
      expect(moreCalls.length).toBeGreaterThan(0)
    })
  })

  it('remembers recent searches and can clear them', async () => {
    vi.stubGlobal('fetch', createApiFetchMock([item()]))
    await openSearch()

    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'architecture' } })
    await screen.findByText('Architecture review')
    fireEvent.keyDown(input, { key: 'Enter' })

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(await screen.findByText('Recent')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'architecture' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.queryByRole('button', { name: 'architecture' })).toBeNull()
  })

  it('suggests project names when typing project:', async () => {
    vi.stubGlobal(
      'fetch',
      createApiFetchMock([], [], {}, [
        {
          id: 'p1',
          name: 'Kosh',
          description: null,
          createdAt: 'x',
          updatedAt: 'x',
          archivedAt: null,
        },
      ]),
    )
    await openSearch()

    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'project:' } })
    expect(await screen.findByRole('button', { name: /project:"Kosh"/ })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /project:"Kosh"/ }))
    await waitFor(() => {
      expect((screen.getByLabelText('Search') as HTMLInputElement).value).toBe('project:"Kosh"')
    })
  })

  it('opening a result opens the item detail and keeps the query', async () => {
    vi.stubGlobal('fetch', createApiFetchMock([item()]))
    await openSearch()

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'architecture' } })
    fireEvent.click(await screen.findByText('Architecture review'))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect((screen.getByLabelText('Search') as HTMLInputElement).value).toBe('architecture')
  })
})
