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
    title: 'Architecture document',
    body: null,
    url: null,
    priority: null,
    tags: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function uploadFile(fileInput: HTMLElement, name: string, mime: string, bytes: number) {
  const file = new File([new Uint8Array(bytes)], name, { type: mime })
  fireEvent.change(fileInput, { target: { files: [file] } })
  return file
}

describe('Attachments (web)', () => {
  it('shows the attachments section with an empty state in the detail modal', async () => {
    vi.stubGlobal('fetch', createApiFetchMock([item()]))
    render(<App />)
    await screen.findByText('Architecture document')
    fireEvent.click(screen.getByText('Architecture document'))

    expect(await screen.findByText('Attachments')).toBeTruthy()
    expect(screen.getByText('No attachments yet.')).toBeTruthy()
  })

  it('uploads an attachment and renders its metadata', async () => {
    const fetchMock = createApiFetchMock([item()])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByText('Architecture document')
    fireEvent.click(screen.getByText('Architecture document'))
    await screen.findByText('Attachments')

    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))
    const input = screen.getByLabelText('Add attachment')
    uploadFile(input, 'diagram.png', 'image/png', 128)

    expect(await screen.findByText('diagram.png')).toBeTruthy()
    expect(screen.getByText(/128 B/)).toBeTruthy()
    expect(screen.queryByText('No attachments yet.')).toBeNull()
    expect(screen.queryByText(/A file is required/)).toBeNull()

    // The upload request must be multipart FormData WITHOUT a forced JSON
    // Content-Type, otherwise the browser cannot add the multipart boundary
    // and the server returns "A file is required".
    const uploadCall = fetchMock.mock.calls.find(
      ([u, init]) => init?.method === 'POST' && String(u).endsWith('/attachments'),
    )
    expect(uploadCall).toBeTruthy()
    expect(uploadCall?.[1]?.body).toBeInstanceOf(FormData)
    const headerText = JSON.stringify(uploadCall?.[1]?.headers ?? {}).toLowerCase()
    expect(headerText).not.toContain('application/json')
  })

  it('does not send a request or show an error when the picker is cancelled', async () => {
    const fetchMock = createApiFetchMock([item()])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByText('Architecture document')
    fireEvent.click(screen.getByText('Architecture document'))
    await screen.findByText('Attachments')

    // Opening the picker and cancelling (no change event) must do nothing.
    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))

    expect(screen.queryByText(/A file is required/)).toBeNull()
    expect(screen.queryByText('Please select a file.')).toBeNull()
    const uploadCalls = fetchMock.mock.calls.filter(
      ([u, init]) => init?.method === 'POST' && String(u).endsWith('/attachments'),
    )
    expect(uploadCalls).toHaveLength(0)
  })

  it('deletes an attachment and updates the list', async () => {
    const fetchMock = createApiFetchMock([item()])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByText('Architecture document')
    fireEvent.click(screen.getByText('Architecture document'))
    await screen.findByText('Attachments')

    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))
    uploadFile(screen.getByLabelText('Add attachment'), 'diagram.png', 'image/png', 128)
    await screen.findByText('diagram.png')

    fireEvent.click(screen.getByRole('button', { name: 'Delete diagram.png' }))
    await waitFor(() => {
      expect(screen.queryByText('diagram.png')).toBeNull()
    })
    expect(screen.getByText('No attachments yet.')).toBeTruthy()
  })

  it('shows an error when the upload fails', async () => {
    const fetchMock = createApiFetchMock([item()])
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input))
      if (init?.method === 'POST' && url.pathname.endsWith('/attachments')) {
        return new Response(
          JSON.stringify({ error: { message: 'Unsupported file type: text/html' } }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      const real = createApiFetchMock([item()])
      return real.getMockImplementation()!(input, init)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByText('Architecture document')
    fireEvent.click(screen.getByText('Architecture document'))
    await screen.findByText('Attachments')

    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))
    uploadFile(screen.getByLabelText('Add attachment'), 'page.html', 'text/html', 10)
    expect(await screen.findByText(/Unsupported file type/)).toBeTruthy()
  })

  it('shows a subtle attachment count on item cards', async () => {
    vi.stubGlobal('fetch', createApiFetchMock([item({ attachmentCount: 2 })]))
    render(<App />)
    expect(await screen.findByText('Architecture document')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('keeps pending attachments local until the capture is confirmed', async () => {
    const fetchMock = createApiFetchMock([], [], {
      interpretResult: {
        type: 'note',
        title: 'Architecture doc',
        body: null,
        url: null,
        priority: null,
        dueAt: null,
        reminderAt: null,
        tags: null,
        recurrence: null,
        projectId: null,
        confidence: 'high',
      },
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.change(screen.getByLabelText('Capture text'), {
      target: { value: 'Remember to review this architecture document.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Smart capture' }))
    await screen.findByText('Kosh understood this as')

    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))
    uploadFile(screen.getByLabelText('Add pending attachment'), 'doc.pdf', 'application/pdf', 64)
    expect(await screen.findByText('doc.pdf')).toBeTruthy()

    const uploadsBeforeSave = fetchMock.mock.calls.filter(
      ([u, init]) => init?.method === 'POST' && String(u).endsWith('/attachments'),
    )
    expect(uploadsBeforeSave).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      const uploads = fetchMock.mock.calls.filter(
        ([u, init]) => init?.method === 'POST' && String(u).endsWith('/attachments'),
      )
      expect(uploads).toHaveLength(1)
    })
    const itemPost = fetchMock.mock.calls.find(
      ([u, init]) => init?.method === 'POST' && String(u).endsWith('/api/v1/items'),
    )
    expect(itemPost).toBeTruthy()
  })

  it('keeps the created item when an attachment upload fails after confirmation', async () => {
    const fetchMock = createApiFetchMock([], [], {
      interpretResult: {
        type: 'note',
        title: 'Architecture doc',
        body: null,
        url: null,
        priority: null,
        dueAt: null,
        reminderAt: null,
        tags: null,
        recurrence: null,
        projectId: null,
        confidence: 'high',
      },
    })
    const realImpl = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input))
      if (init?.method === 'POST' && url.pathname.endsWith('/attachments')) {
        return new Response(JSON.stringify({ error: { message: 'File too large' } }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return realImpl(input, init)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    fireEvent.change(screen.getByLabelText('Capture text'), {
      target: { value: 'Remember to review this architecture document.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Smart capture' }))
    await screen.findByText('Kosh understood this as')

    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))
    uploadFile(screen.getByLabelText('Add pending attachment'), 'doc.pdf', 'application/pdf', 64)
    await screen.findByText('doc.pdf')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/the item was saved/)).toBeTruthy()

    const itemPost = fetchMock.mock.calls.find(
      ([u, init]) => init?.method === 'POST' && String(u).endsWith('/api/v1/items'),
    )
    expect(itemPost).toBeTruthy()
    expect(screen.getByText('doc.pdf')).toBeTruthy()
  })
})
