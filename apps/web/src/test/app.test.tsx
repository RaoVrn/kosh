import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMockItems } from '@kosh/shared'
import type { Item } from '@kosh/shared'
import App from '../App'
import { createApiFetchMock, createEmptyFetchMock, createFailingPostFetchMock } from './apiMock'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Kosh web app', () => {
  it('loads persisted items from the API', async () => {
    const seed: Item[] = [
      {
        id: 'p1',
        type: 'note',
        status: 'inbox',
        title: 'Persisted task from the database',
        priority: null,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]
    vi.stubGlobal('fetch', createApiFetchMock(seed))
    render(<App />)

    expect(await screen.findByText('Persisted task from the database')).toBeTruthy()
  })

  it('renders the inbox with capture once loaded', async () => {
    vi.stubGlobal('fetch', createEmptyFetchMock())
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Inbox', level: 1 })).toBeTruthy()
    expect(screen.getByPlaceholderText("What's on your mind?")).toBeTruthy()
  })

  it('creates an item through the API and shows it', async () => {
    const fetchMock = createApiFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByPlaceholderText("What's on your mind?")
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
      target: { value: 'Test capture item' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add to inbox' }))

    expect(await screen.findByText('Test capture item')).toBeTruthy()
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(postCall).toBeTruthy()
  })

  it('preserves input and shows an error when creation fails', async () => {
    vi.stubGlobal('fetch', createFailingPostFetchMock())
    render(<App />)

    await screen.findByPlaceholderText("What's on your mind?")
    const input = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.change(input, { target: { value: 'Keep me' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add to inbox' }))

    expect((await screen.findAllByText('Server exploded')).length).toBeGreaterThan(0)
    expect((input as HTMLInputElement).value).toBe('Keep me')
  })

  it('navigates to every section via the sidebar', async () => {
    vi.stubGlobal('fetch', createEmptyFetchMock())
    render(<App />)

    for (const title of ['Today', 'Tasks', 'Notes', 'Ideas', 'Learning', 'Search', 'Settings']) {
      fireEvent.click(screen.getByRole('button', { name: title }))
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeTruthy()
    }
  })

  it('searches across items via the API', async () => {
    const fetchMock = createApiFetchMock(createMockItems())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'docker' } })

    expect(await screen.findByText('Learn Docker networking')).toBeTruthy()
    expect(screen.getByText('Docker')).toBeTruthy()
    const searchCall = fetchMock.mock.calls.find(([url]) => String(url).includes('q='))
    expect(String(searchCall?.[0])).toContain('q=docker')
  })

  it('debounces search requests while typing', async () => {
    const fetchMock = createApiFetchMock(createMockItems())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    const input = screen.getByLabelText('Search')
    fireEvent.change(input, { target: { value: 'd' } })
    fireEvent.change(input, { target: { value: 'do' } })
    fireEvent.change(input, { target: { value: 'doc' } })
    fireEvent.change(input, { target: { value: 'docker' } })

    await waitFor(() => {
      const qCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('q='))
      expect(qCalls.length).toBe(1)
      expect(String(qCalls[0]?.[0])).toContain('q=docker')
    })
  })

  it('shows an empty state when search has no matches', async () => {
    vi.stubGlobal('fetch', createApiFetchMock(createMockItems()))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'zzznotfound' } })

    expect(await screen.findByText('No results')).toBeTruthy()
  })

  it('shows an error state when search fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.pathname === '/api/v1/items' && url.searchParams.get('q')) {
        return new Response(JSON.stringify({ error: { message: 'Search exploded' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'docker' } })

    expect(await screen.findByText('Search exploded')).toBeTruthy()
  })

  it('clears search results', async () => {
    vi.stubGlobal('fetch', createApiFetchMock(createMockItems()))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'docker' } })
    expect(await screen.findByText('Learn Docker networking')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(await screen.findByText('Search Kosh')).toBeTruthy()
    expect(screen.queryByText('Learn Docker networking')).toBeNull()
  })

  it('combines search with a type filter server-side', async () => {
    const seed = [
      {
        id: 't1',
        type: 'task' as const,
        status: 'active' as const,
        title: 'Docker deploy guide',
        priority: 'medium' as const,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'l1',
        type: 'learning' as const,
        status: 'active' as const,
        title: 'Docker networking',
        priority: 'medium' as const,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]
    const fetchMock = createApiFetchMock(seed)
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'docker' } })
    await screen.findByText('Docker deploy guide')

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Learning' }))
    await waitFor(() => {
      const qCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('q='))
      const last = qCalls[qCalls.length - 1]
      expect(String(last?.[0])).toContain('type=learning')
    })
    expect(await screen.findByText('Docker networking')).toBeTruthy()
    expect(screen.queryByText('Docker deploy guide')).toBeNull()
  })

  it('completes a task through the API', async () => {
    const fetchMock = createApiFetchMock(createMockItems())
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }))
    await screen.findByRole('heading', { name: 'Tasks', level: 1 })

    const before = screen.getAllByRole('button', { name: 'Mark as not done' }).length
    const doneButton = screen.getAllByRole('button', { name: 'Mark as done' })[0]
    expect(doneButton).toBeTruthy()
    fireEvent.click(doneButton!)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Mark as not done' }).length).toBe(before + 1)
    })
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(patchCall).toBeTruthy()
  })

  it('deletes an item through the API', async () => {
    const fetchMock = createApiFetchMock([
      {
        id: 'd1',
        type: 'note',
        status: 'inbox',
        title: 'Delete me please',
        priority: null,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    const item = await screen.findByText('Delete me please')
    fireEvent.click(item)
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Delete me please')).toBeNull()
    })
    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')
    expect(deleteCall).toBeTruthy()
  })

  it('creates a task with due and reminder through the New Task modal', async () => {
    const fetchMock = createApiFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }))
    await screen.findByRole('heading', { name: 'Tasks', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'New task' }))
    await screen.findByRole('dialog', { name: 'New task' })

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Write report' } })
    fireEvent.change(screen.getByLabelText('Due date and time'), {
      target: { value: '2026-09-14T18:00' },
    })
    fireEvent.change(screen.getByLabelText('Reminder date and time'), {
      target: { value: '2026-09-14T10:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }))

    expect(await screen.findByText('Write report')).toBeTruthy()
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const posted = JSON.parse(String(postCall?.[1]?.body)) as {
      type: string
      dueAt: string
      reminderAt: string
    }
    expect(posted.type).toBe('task')
    expect(posted.dueAt).toBeTruthy()
    expect(posted.reminderAt).toBeTruthy()
  })

  it('shows overdue and today groups on the Today screen', async () => {
    const now = Date.now()
    const seed = [
      {
        id: 'ov',
        type: 'task' as const,
        status: 'active' as const,
        title: 'Overdue report',
        dueAt: new Date(now - 86_400_000).toISOString(),
        priority: 'high' as const,
        tags: null,
        createdAt: new Date(now - 172_800_000).toISOString(),
        updatedAt: new Date(now - 172_800_000).toISOString(),
      },
      {
        id: 'td',
        type: 'task' as const,
        status: 'active' as const,
        title: 'Due later today',
        dueAt: new Date(now + 3_600_000).toISOString(),
        priority: 'medium' as const,
        tags: null,
        createdAt: new Date(now - 86_400_000).toISOString(),
        updatedAt: new Date(now - 86_400_000).toISOString(),
      },
    ]
    vi.stubGlobal('fetch', createApiFetchMock(seed))
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))

    expect(await screen.findByRole('heading', { name: 'Overdue', level: 2 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Today', level: 2 })).toBeTruthy()
    expect(screen.getByText('Overdue report')).toBeTruthy()
    expect(screen.getByText('Due later today')).toBeTruthy()
  })

  it('shows notifications and marks them read through the API', async () => {
    const now = Date.now()
    const fetchMock = createApiFetchMock(
      [],
      [
        {
          id: 'n1',
          itemId: null,
          type: 'reminder',
          title: 'Finish the report',
          body: 'Your reminder is due.',
          createdAt: new Date(now - 60_000).toISOString(),
          readAt: null,
        },
      ],
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByText('Finish the report')).toBeTruthy()

    fireEvent.click(screen.getByText('Finish the report'))
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([url, init]) => init?.method === 'PATCH' && String(url).includes('/api/v1/notifications/'),
      )
      expect(patchCall).toBeTruthy()
    })
  })

  it('creates a note with tags through the Notes screen', async () => {
    const fetchMock = createApiFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    await screen.findByRole('heading', { name: 'Notes', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    await screen.findByRole('dialog', { name: 'New note' })

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'RAG architecture notes' },
    })
    fireEvent.change(screen.getByLabelText('Details'), {
      target: { value: 'Chunking, retrieval, reranking.' },
    })
    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'rag' } })
    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: 'Create Note' }))

    expect(await screen.findByText('RAG architecture notes')).toBeTruthy()
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const posted = JSON.parse(String(postCall?.[1]?.body)) as {
      type: string
      status: string
      tags: string[]
    }
    expect(posted.type).toBe('note')
    expect(posted.status).toBe('active')
    expect(posted.tags).toEqual(['rag'])
  })

  it('creates a link with a URL and requires one', async () => {
    const fetchMock = createApiFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Links' }))
    await screen.findByRole('heading', { name: 'Links', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'New link' }))
    await screen.findByRole('dialog', { name: 'New link' })

    const title = screen.getByLabelText('Title')
    fireEvent.change(title, { target: { value: 'Practical RAG guide' } })
    const create = screen.getByRole('button', { name: 'Create Link' })
    expect((create as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'https://example.com/rag' } })
    expect((create as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(create)

    expect(await screen.findByText('Practical RAG guide')).toBeTruthy()
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const posted = JSON.parse(String(postCall?.[1]?.body)) as { type: string; url: string }
    expect(posted.type).toBe('link')
    expect(posted.url).toBe('https://example.com/rag')
  })

  it('converts an item type in place through the detail dialog', async () => {
    const fetchMock = createApiFetchMock([
      {
        id: 'c1',
        type: 'note' as const,
        status: 'inbox' as const,
        title: 'Convertible note',
        priority: null,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    const card = await screen.findByText('Convertible note')
    fireEvent.click(card)
    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Idea' }))
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
      const patched = JSON.parse(String(patchCall?.[1]?.body)) as { type: string }
      expect(patched.type).toBe('idea')
    })
  })

  it('edits tags on an item through the detail dialog', async () => {
    const fetchMock = createApiFetchMock([
      {
        id: 't1',
        type: 'note' as const,
        status: 'active' as const,
        title: 'Tagged note',
        priority: null,
        tags: ['ai'],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    const card = await screen.findByText('Tagged note')
    fireEvent.click(card)
    expect(screen.getByRole('dialog')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Tags'), { target: { value: 'rag' } })
    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Enter' })

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
      const patched = JSON.parse(String(patchCall?.[1]?.body)) as { tags: string[] }
      expect(patched.tags).toContain('rag')
    })
  })

  it('shows learning backlog groups', async () => {
    const seed = [
      {
        id: 'lh',
        type: 'learning' as const,
        status: 'inbox' as const,
        title: 'Kubernetes',
        priority: 'high' as const,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'la',
        type: 'learning' as const,
        status: 'active' as const,
        title: 'Docker',
        priority: 'medium' as const,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'ld',
        type: 'learning' as const,
        status: 'done' as const,
        title: 'Python generators',
        priority: null,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'ln',
        type: 'learning' as const,
        status: 'inbox' as const,
        title: 'Async Python',
        priority: 'low' as const,
        tags: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]
    vi.stubGlobal('fetch', createApiFetchMock(seed))
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Learning' }))

    expect(await screen.findByRole('heading', { name: 'High priority', level: 2 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Active', level: 2 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Not started', level: 2 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Completed', level: 2 })).toBeTruthy()
    expect(screen.getByText('Kubernetes')).toBeTruthy()
  })

  it('smart capture interprets, previews and saves an item', async () => {
    const fetchMock = createApiFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.change(screen.getByLabelText('Capture text'), {
      target: { value: 'Rahul asked me to check the API issue tomorrow.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Smart capture' }))

    expect(await screen.findByText('Kosh understood this as')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Smart capture' })).toBeTruthy()
    expect(screen.getByDisplayValue('Check API issue')).toBeTruthy()
    expect(screen.getByText('Confidence: high')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Check API issue v2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Check API issue v2')).toBeTruthy()
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/api/v1/items'),
    )
    const posted = JSON.parse(String(postCall?.[1]?.body)) as { type: string; title: string }
    expect(posted.type).toBe('task')
    expect(posted.title).toBe('Check API issue v2')
  })

  it('smart capture cancel does not create an item', async () => {
    const fetchMock = createApiFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.change(screen.getByLabelText('Capture text'), { target: { value: 'Something' } })
    fireEvent.click(screen.getByRole('button', { name: 'Smart capture' }))
    await screen.findByText('Kosh understood this as')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      const itemPosts = fetchMock.mock.calls.filter(
        ([url, init]) => init?.method === 'POST' && String(url).includes('/api/v1/items'),
      )
      expect(itemPosts.length).toBe(0)
    })
  })

  it('smart capture failure preserves the original text with an inbox fallback', async () => {
    const fetchMock = createApiFetchMock([], [], {
      interpretError: {
        status: 502,
        message: "Kosh couldn't interpret this right now. Your capture is safe.",
      },
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.change(screen.getByLabelText('Capture text'), {
      target: { value: 'My precious capture text' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Smart capture' }))

    expect(await screen.findByText("Couldn't interpret this right now.")).toBeTruthy()
    expect(screen.getByText('"My precious capture text"')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Save to Inbox' }))
    expect(await screen.findByText('My precious capture text')).toBeTruthy()
    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => init?.method === 'POST' && String(url).includes('/api/v1/items'),
    )
    const posted = JSON.parse(String(postCall?.[1]?.body)) as { type: string; title: string }
    expect(posted.type).toBe('note')
    expect(posted.title).toBe('My precious capture text')
  })

  it('voice capture shows an honest limitation on unsupported browsers', async () => {
    vi.stubGlobal('fetch', createApiFetchMock())
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Voice capture' }))

    expect(await screen.findByText("Voice capture isn't supported in this browser.")).toBeTruthy()
  })
})
