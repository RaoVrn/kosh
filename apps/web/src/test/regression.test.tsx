import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '@kosh/shared'
import App from '../App'
import { createApiFetchMock } from './apiMock'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function task(overrides: Partial<Item> = {}): Item {
  return {
    id: 't1',
    type: 'task',
    status: 'active',
    title: 'Review the architecture',
    body: null,
    url: null,
    priority: 'high',
    dueAt: null,
    reminderAt: null,
    tags: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('regression: no nested interactive elements', () => {
  it('renders task and item cards without button-in-button or role=button wrappers', async () => {
    vi.stubGlobal(
      'fetch',
      createApiFetchMock([
        task({ id: 't1', title: 'Task card', status: 'inbox' }),
        { ...task({ id: 'n1', type: 'note', title: 'Note card' }), status: 'inbox' },
      ]),
    )
    render(<App />)

    await screen.findByText('Task card')
    await screen.findByText('Note card')

    // No real nested buttons anywhere in the DOM.
    expect(document.querySelectorAll('button button')).toHaveLength(0)
    expect(document.querySelectorAll('a button')).toHaveLength(0)
    expect(document.querySelectorAll('button a')).toHaveLength(0)
    // No role=button containers wrapping real buttons either.
    expect(document.querySelectorAll('[role="button"] button')).toHaveLength(0)
  })

  it('keeps the check toggle and open actions working after the refactor', async () => {
    const fetchMock = createApiFetchMock([task({ id: 't1', title: 'Toggle me', status: 'inbox' })])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText('Toggle me')
    fireEvent.click(screen.getByRole('button', { name: 'Task: Toggle me' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as done' }))
    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ status: 'done' })
    })
  })
})

describe('regression: attachment requests', () => {
  it('does not fetch attachment lists from list screens (no N+1)', async () => {
    const seed = [
      task({ id: 't1', title: 'First', status: 'inbox', attachmentCount: 2 }),
      task({ id: 't2', title: 'Second', status: 'inbox', attachmentCount: 1 }),
      task({ id: 't3', title: 'Third', status: 'inbox' }),
    ]
    const fetchMock = createApiFetchMock(seed)
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText('First')
    await screen.findByText('Second')
    await screen.findByText('Third')

    await new Promise((r) => setTimeout(r, 300))
    const attachmentCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/attachments'))
    expect(attachmentCalls).toHaveLength(0)
  })

  it('fetches attachments with the exact item-scoped URL when the detail modal opens', async () => {
    const fetchMock = createApiFetchMock([
      task({ id: 'abc123', title: 'Detail item', status: 'inbox' }),
    ])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Task: Detail item' }))
    await screen.findByRole('dialog')

    await waitFor(() => {
      const attachmentCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/attachments'))
      expect(String(attachmentCall?.[0])).toMatch(/\/api\/v1\/items\/abc123\/attachments$/)
    })
  })
})
