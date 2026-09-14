import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createItemsApi, DEFAULT_API_BASE_URL } from '../src/api/itemsApi'

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createItemsApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getItems parses the data array and sends filters as query params', async () => {
    const items = [{ id: '1', title: 'a' }]
    fetchMock.mockResolvedValue(jsonResponse(200, { data: items }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.getItems({ type: 'task', status: 'inbox' })

    expect(result).toEqual(items)
    const call = fetchMock.mock.calls[0]
    const url = call?.[0]
    const init = call?.[1]
    expect(url).toBe('http://localhost:3001/api/v1/items?type=task&status=inbox')
    expect(init?.method ?? 'GET').toBe('GET')
  })

  it('encodes search query, filters and pagination into the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await api.getItems({
      q: 'docker networking',
      type: 'learning',
      status: 'active',
      limit: 25,
      offset: 50,
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('q=docker+networking')
    expect(url).toContain('type=learning')
    expect(url).toContain('status=active')
    expect(url).toContain('limit=25')
    expect(url).toContain('offset=50')
  })

  it('encodes special characters in the search query', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await api.getItems({ q: "Rahul's API issue" })

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('q=Rahul%27s+API+issue')
  })

  it('createItem POSTs JSON and returns the created item', async () => {
    const created = { id: '42', title: 'New', type: 'note', status: 'inbox' }
    fetchMock.mockResolvedValue(jsonResponse(201, { data: created }))

    const api = createItemsApi('http://test:3001')
    const result = await api.createItem({ title: 'New', type: 'note' })

    expect(result).toEqual(created)
    const call = fetchMock.mock.calls[0]
    const url = call?.[0]
    const init = call?.[1]
    expect(url).toBe('http://test:3001/api/v1/items')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ title: 'New', type: 'note' })
  })

  it('throws the server error message on a 404 for getItem', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: { message: 'Item not found' } }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(api.getItem('nope')).rejects.toThrow('Item not found')
  })

  it('throws on malformed (non-JSON) responses', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(api.getItems()).rejects.toThrow(/Unexpected response/)
  })

  it('throws a friendly error on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(api.getItems()).rejects.toThrow(/Could not reach the Kosh API/)
  })

  it('deleteItem resolves on 204 and throws on 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(api.deleteItem('x')).resolves.toBeUndefined()

    fetchMock.mockResolvedValue(jsonResponse(404, { error: { message: 'Item not found' } }))
    await expect(api.deleteItem('x')).rejects.toThrow('Item not found')
  })

  it('updateItem PATCHes the id and returns the item', async () => {
    const updated = { id: '7', title: 'Edited' }
    fetchMock.mockResolvedValue(jsonResponse(200, { data: updated }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.updateItem('7', { title: 'Edited' })

    expect(result).toEqual(updated)
    const call = fetchMock.mock.calls[0]
    const url = call?.[0]
    const init = call?.[1]
    expect(url).toBe('http://localhost:3001/api/v1/items/7')
    expect(init?.method).toBe('PATCH')
  })

  it('getNotifications lists notifications with unread filter', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(200, { data: [{ id: 'n1' }] })))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.getNotifications()
    expect(result).toEqual([{ id: 'n1' }])
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/v1/notifications')

    await api.getNotifications({ unread: true })
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://localhost:3001/api/v1/notifications?unread=true',
    )
  })

  it('markNotificationRead PATCHes the notification', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: { id: 'n1', readAt: '2026-09-11T10:00:00.000Z' } }),
    )

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.markNotificationRead('n1')
    expect(result.readAt).toBeTruthy()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/v1/notifications/n1')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH')
  })

  it('interpretCapture POSTs the text and returns the capture result', async () => {
    const result = { type: 'task', title: 'Check API issue', confidence: 'high' }
    fetchMock.mockResolvedValue(jsonResponse(200, { data: result }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const capture = await api.interpretCapture({
      text: 'check the API issue tomorrow',
      timezone: 'Asia/Kolkata',
    })

    expect(capture).toEqual(result)
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe('http://localhost:3001/api/v1/capture/interpret')
    expect(call?.[1]?.method).toBe('POST')
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      text: 'check the API issue tomorrow',
      timezone: 'Asia/Kolkata',
    })
  })

  it('interpretCapture surfaces server errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(503, { error: { message: "Smart capture isn't configured." } }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(api.interpretCapture({ text: 'x' })).rejects.toThrow(/isn't configured/)
  })

  it('transcribeAudio POSTs a FormData body and parses the transcript', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { text: 'hello world' } }))

    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const text = await api.transcribeAudio({
      blob: new Blob(['x'], { type: 'audio/mpeg' }),
      name: 'rec.mp3',
      mime: 'audio/mpeg',
    })

    expect(text).toBe('hello world')
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe('http://localhost:3001/api/v1/transcribe')
    expect(call?.[1]?.method).toBe('POST')
    expect(call?.[1]?.body).toBeInstanceOf(FormData)
    expect(String(call?.[1]?.headers ?? '')).not.toContain('application/json')
  })

  it('transcribeAudio throws the server message on failure', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(413, { error: { message: 'Audio file is too large' } }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(
      api.transcribeAudio({ blob: new Blob(['x']), name: 'a.mp3', mime: 'audio/mpeg' }),
    ).rejects.toThrow(/too large/)
  })

  it('listAttachments GETs the item attachment list', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { data: [{ id: 'att-1', itemId: 'i1', originalName: 'a.png' }] }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.listAttachments('i1')
    expect(result).toEqual([{ id: 'att-1', itemId: 'i1', originalName: 'a.png' }])
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/v1/items/i1/attachments')
  })

  it('uploadAttachment POSTs multipart with a "file" field', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, { data: { id: 'att-1', itemId: 'i1', originalName: 'photo.png' } }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const file = new File(['png'], 'photo.png', { type: 'image/png' })
    const result = await api.uploadAttachment('i1', {
      blob: file,
      name: file.name,
      mime: file.type,
    })
    expect(result.id).toBe('att-1')
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe('http://localhost:3001/api/v1/items/i1/attachments')
    expect(call?.[1]?.method).toBe('POST')
    const form = call?.[1]?.body as FormData
    expect(form).toBeInstanceOf(FormData)
    const filePart = form.get('file')
    // The actual browser File must reach FormData, not a serialized string.
    expect(filePart).toBeInstanceOf(File)
    if (filePart instanceof File) {
      expect(filePart.name).toBe('photo.png')
      expect(filePart.type).toBe('image/png')
    }
    // The browser must set the multipart boundary: the client MUST NOT force
    // application/json (or any manual multipart Content-Type) on FormData.
    const headers = call?.[1]?.headers as Record<string, string> | undefined
    const headerText = headers ? JSON.stringify(headers).toLowerCase() : ''
    expect(headerText).not.toContain('application/json')
    expect(headerText).not.toContain('multipart/form-data')
  })

  it('a plain {uri,name,type} object must never be sent as the file on a browser FormData', () => {
    // On React Native, FormData understands a {uri,name,type} descriptor.
    // On the browser (Expo Web), appending a plain object to FormData
    // serializes it to the string "[object Object]", which the API rejects
    // with "A file is required". Web callers must pass a real File/Blob.
    const form = new FormData()
    form.append('file', {
      uri: 'blob:http://localhost/x',
      name: 'x.png',
      type: 'image/png',
    } as unknown as Blob)
    const value = form.get('file')
    expect(value).not.toBeInstanceOf(Blob)
    expect(String(value)).toBe('[object Object]')
  })

  it('uploadAttachment (uri path) still sends FormData without a JSON Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { data: { id: 'att-2' } }))
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await api.uploadAttachment('i1', {
      uri: 'file:///tmp/x.png',
      name: 'x.png',
      mime: 'image/png',
    })
    const call = fetchMock.mock.calls[0]
    const form = call?.[1]?.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('file')).toBeTruthy()
    const headers = call?.[1]?.headers as Record<string, string> | undefined
    const headerText = headers ? JSON.stringify(headers).toLowerCase() : ''
    expect(headerText).not.toContain('application/json')
  })

  it('deleteAttachment DELETEs the attachment id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204))
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await api.deleteAttachment('att-1')
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe('http://localhost:3001/api/v1/attachments/att-1')
    expect(call?.[1]?.method).toBe('DELETE')
  })

  it('getAttachmentUrl points at the attachment endpoint', () => {
    const api = createItemsApi('http://example.test')
    expect(api.getAttachmentUrl('att-1')).toBe('http://example.test/api/v1/attachments/att-1')
  })

  it('searchItems requests the q/limit/offset and returns items + meta', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: [{ id: 'i1', title: 'match' }],
        meta: { limit: 25, offset: 0, total: 40, hasMore: true },
      }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.searchItems({ q: 'type:task python', limit: 25, offset: 25 })
    expect(result.items).toEqual([{ id: 'i1', title: 'match' }])
    expect(result.meta.hasMore).toBe(true)
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.searchParams.get('q')).toBe('type:task python')
    expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.get('offset')).toBe('25')
  })

  it('searchItems surfaces server errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: { message: 'Invalid type filter: bogus' } }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(api.searchItems({ q: 'type:bogus' })).rejects.toThrow(/Invalid type filter/)
  })

  it('processInboxItem POSTs to the item process endpoint', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: {
          summary: 'Two actions.',
          suggestions: [{ title: 'Call Rahul', type: 'task', confidence: 'high' }],
        },
      }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.processInboxItem('i1')
    expect(result.suggestions).toHaveLength(1)
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe('http://localhost:3001/api/v1/items/i1/process')
    expect(call?.[1]?.method).toBe('POST')
  })

  it('acceptProcessedSuggestions POSTs the batch and returns created items', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        data: {
          created: [{ id: 'c1', title: 'Call Rahul' }],
          source: { id: 'i1', status: 'archived' },
          skippedDuplicates: [],
        },
      }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    const result = await api.acceptProcessedSuggestions('i1', {
      suggestions: [
        {
          title: 'Call Rahul',
          type: 'task',
          body: null,
          priority: null,
          projectName: null,
          projectId: null,
          dueAt: null,
          reminderAt: null,
          tags: null,
          recurrence: null,
        },
      ],
      markSourceProcessed: true,
    })
    expect(result.created).toHaveLength(1)
    expect(result.source.status).toBe('archived')
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe('http://localhost:3001/api/v1/items/i1/process/accept')
    expect(call?.[1]?.method).toBe('POST')
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({
      suggestions: [
        {
          title: 'Call Rahul',
          type: 'task',
          body: null,
          priority: null,
          projectName: null,
          projectId: null,
          dueAt: null,
          reminderAt: null,
          tags: null,
          recurrence: null,
        },
      ],
      markSourceProcessed: true,
    })
  })

  it('acceptProcessedSuggestions surfaces server errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, { error: { message: 'No suggestions to accept' } }),
    )
    const api = createItemsApi(DEFAULT_API_BASE_URL)
    await expect(api.acceptProcessedSuggestions('i1', { suggestions: [] })).rejects.toThrow(
      /No suggestions to accept/,
    )
  })
})
