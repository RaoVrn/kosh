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
})
