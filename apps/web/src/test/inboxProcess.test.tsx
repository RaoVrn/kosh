import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item } from '@kosh/shared'
import App from '../App'
import { createApiFetchMock } from './apiMock'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function inboxItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'note',
    status: 'inbox',
    title: 'Call Rahul tomorrow about the API review, then update architecture notes.',
    body: null,
    url: null,
    priority: null,
    tags: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

const PROCESS_RESULT = {
  summary: 'Two actions.',
  suggestions: [
    {
      title: 'Call Rahul about API review',
      body: null,
      type: 'task' as const,
      priority: 'medium' as const,
      projectName: null,
      projectId: null,
      dueAt: '2026-09-15T09:00:00.000Z',
      reminderAt: null,
      tags: ['api'],
      recurrence: null,
      sourceText: 'Call Rahul tomorrow about the API review, then update architecture notes.',
      confidence: 'high' as const,
      category: 'follow-up',
    },
    {
      title: 'Update architecture notes',
      body: null,
      type: 'note' as const,
      priority: null,
      projectName: null,
      projectId: null,
      dueAt: null,
      reminderAt: null,
      tags: ['architecture'],
      recurrence: null,
      sourceText: 'Call Rahul tomorrow about the API review, then update architecture notes.',
      confidence: 'medium' as const,
      category: 'action',
    },
  ],
}

describe('Inbox processing (web)', () => {
  it('shows loading then suggestions after clicking Process', async () => {
    const fetchMock = createApiFetchMock([inboxItem()], [], { processResult: PROCESS_RESULT })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))

    expect(screen.getByText('Kosh is reviewing this capture…')).toBeTruthy()
    expect(await screen.findByText('Call Rahul about API review')).toBeTruthy()
    expect(screen.getByText('Update architecture notes')).toBeTruthy()
    expect(screen.getByText('Suggested actions (2)')).toBeTruthy()
  })

  it('shows the original capture and keeps it unchanged during review', async () => {
    vi.stubGlobal(
      'fetch',
      createApiFetchMock([inboxItem({ body: 'original body' })], [], {
        processResult: PROCESS_RESULT,
      }),
    )
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    expect(await screen.findByText('Call Rahul about API review')).toBeTruthy()

    expect(screen.getByText('Original capture')).toBeTruthy()
    expect(screen.getAllByText(/Call Rahul tomorrow about the API review/).length).toBeGreaterThan(
      0,
    )
  })

  it('accepts all suggestions and archives the source', async () => {
    const fetchMock = createApiFetchMock([inboxItem()], [], { processResult: PROCESS_RESULT })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    await screen.findByText('Call Rahul about API review')

    fireEvent.click(screen.getByRole('button', { name: /Accept selected \(2 of 2\)/ }))

    expect(await screen.findByText('2 items created')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    const acceptCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/process/accept'))
    expect(acceptCall).toBeTruthy()
    const acceptBody = JSON.parse(String(acceptCall?.[1]?.body)) as {
      suggestions: unknown[]
      markSourceProcessed: boolean
    }
    expect(acceptBody.suggestions).toHaveLength(2)
    expect(acceptBody.markSourceProcessed).toBe(true)
    expect(screen.queryByText(/Call Rahul tomorrow about the API review/)).toBeNull()
  })

  it('accepts a partial selection and keeps the source in inbox', async () => {
    const fetchMock = createApiFetchMock([inboxItem()], [], { processResult: PROCESS_RESULT })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    await screen.findByText('Call Rahul about API review')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Update architecture notes' }))
    fireEvent.click(screen.getByRole('button', { name: /Accept selected \(1 of 2\)/ }))

    await screen.findByText('1 item created')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    const acceptCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/process/accept'))
    const acceptBody = JSON.parse(String(acceptCall?.[1]?.body)) as {
      suggestions: { title: string }[]
      markSourceProcessed: boolean
    }
    expect(acceptBody.suggestions).toHaveLength(1)
    expect(acceptBody.suggestions[0]!.title).toBe('Call Rahul about API review')
    expect(acceptBody.markSourceProcessed).toBe(false)
    await waitFor(() => {
      expect(
        screen.getAllByText(/Call Rahul tomorrow about the API review/).length,
      ).toBeGreaterThan(0)
    })
  })

  it('removes a suggestion before accepting', async () => {
    const fetchMock = createApiFetchMock([inboxItem()], [], { processResult: PROCESS_RESULT })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    await screen.findByText('Call Rahul about API review')

    fireEvent.click(screen.getByRole('button', { name: 'Remove Update architecture notes' }))
    expect(screen.queryByText('Update architecture notes')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Accept selected \(1 of 1\)/ }))
    const acceptCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/process/accept'))
    const acceptBody = JSON.parse(String(acceptCall?.[1]?.body)) as { suggestions: unknown[] }
    expect(acceptBody.suggestions).toHaveLength(1)
  })

  it('edits a suggestion title before accepting', async () => {
    const fetchMock = createApiFetchMock([inboxItem()], [], { processResult: PROCESS_RESULT })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    await screen.findByText('Call Rahul about API review')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Call Rahul about API review' }))
    const titleInput = await screen.findByLabelText('Suggestion title')
    fireEvent.change(titleInput, { target: { value: 'Call Rahul urgently' } })
    fireEvent.click(screen.getByRole('button', { name: /Accept selected \(2 of 2\)/ }))

    const acceptCall = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/process/accept'))
    const acceptBody = JSON.parse(String(acceptCall?.[1]?.body)) as {
      suggestions: { title: string }[]
    }
    expect(acceptBody.suggestions[0]!.title).toBe('Call Rahul urgently')
  })

  it('shows a duplicate warning when a similar item already exists', async () => {
    const fetchMock = createApiFetchMock(
      [
        inboxItem(),
        inboxItem({ id: 'i2', title: 'Call Rahul about API review', status: 'active' }),
      ],
      [],
      { processResult: PROCESS_RESULT },
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    expect(await screen.findByText('Similar item already exists.')).toBeTruthy()
  })

  it('keeps the source unchanged when AI processing fails', async () => {
    const fetchMock = createApiFetchMock([inboxItem()], [], {
      processError: {
        status: 502,
        message: "Couldn't process this capture. Your original item is safe.",
      },
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))

    expect(await screen.findByText("Couldn't process this capture.")).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getAllByText(/Call Rahul tomorrow about the API review/).length).toBeGreaterThan(
      0,
    )
  })

  it('shows the attachment count on the source during processing', async () => {
    vi.stubGlobal(
      'fetch',
      createApiFetchMock([inboxItem({ attachmentCount: 2 })], [], {
        processResult: PROCESS_RESULT,
      }),
    )
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    expect(await screen.findByText(/2 attachments — kept on this capture/)).toBeTruthy()
  })

  it('cancels without creating anything', async () => {
    const fetchMock = createApiFetchMock([inboxItem()], [], { processResult: PROCESS_RESULT })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText(/Call Rahul tomorrow/)
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    await screen.findByText('Call Rahul about API review')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => {
      const acceptCalls = fetchMock.mock.calls.filter(([u]) =>
        String(u).endsWith('/process/accept'),
      )
      expect(acceptCalls).toHaveLength(0)
    })
    expect(screen.getAllByText(/Call Rahul tomorrow about the API review/).length).toBeGreaterThan(
      0,
    )
  })
})
