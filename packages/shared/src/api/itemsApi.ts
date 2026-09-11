import type { Item, ItemStatus, ItemType, KoshNotification, Priority } from '../index'

export interface ItemsListParams {
  q?: string
  type?: ItemType
  status?: ItemStatus
  limit?: number
  offset?: number
}

export interface CreateItemInput {
  title: string
  type: ItemType
  status?: ItemStatus
  priority?: Priority | null
  body?: string | null
  url?: string | null
  dueAt?: string | null
  reminderAt?: string | null
  tags?: string[] | null
}

export type UpdateItemInput = Partial<CreateItemInput>

export interface ItemsApiClient {
  getItems: (params?: ItemsListParams) => Promise<Item[]>
  getItem: (id: string) => Promise<Item>
  createItem: (input: CreateItemInput) => Promise<Item>
  updateItem: (id: string, patch: UpdateItemInput) => Promise<Item>
  deleteItem: (id: string) => Promise<void>
  getNotifications: (params?: { unread?: boolean }) => Promise<KoshNotification[]>
  markNotificationRead: (id: string) => Promise<KoshNotification>
}

export const DEFAULT_API_BASE_URL = 'http://localhost:3001'

export function createItemsApi(baseUrl: string = DEFAULT_API_BASE_URL): ItemsApiClient {
  return {
    getItems: (params) => {
      const query = new URLSearchParams()
      if (params?.q) query.set('q', params.q)
      if (params?.type) query.set('type', params.type)
      if (params?.status) query.set('status', params.status)
      if (params?.limit !== undefined) query.set('limit', String(params.limit))
      if (params?.offset !== undefined) query.set('offset', String(params.offset))
      const qs = query.toString()
      return request<Item[]>(baseUrl, `/api/v1/items${qs ? `?${qs}` : ''}`)
    },
    getItem: (id) => request<Item>(baseUrl, `/api/v1/items/${encodeURIComponent(id)}`),
    createItem: (input) =>
      request<Item>(baseUrl, '/api/v1/items', { method: 'POST', body: JSON.stringify(input) }),
    updateItem: (id, patch) =>
      request<Item>(baseUrl, `/api/v1/items/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    deleteItem: async (id) => {
      await request<undefined>(baseUrl, `/api/v1/items/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    },
    getNotifications: (params) => {
      const qs = params?.unread ? '?unread=true' : ''
      return request<KoshNotification[]>(baseUrl, `/api/v1/notifications${qs}`)
    },
    markNotificationRead: (id) =>
      request<KoshNotification>(baseUrl, `/api/v1/notifications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
  }
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new Error('Could not reach the Kosh API — is it running?')
  }

  if (res.status === 204) return undefined as T

  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error(`Unexpected response from the API (${res.status})`)
  }

  if (!res.ok) {
    const apiBody = body as { error?: { message?: unknown } } | null
    const message = typeof apiBody?.error?.message === 'string' ? apiBody.error.message : undefined
    throw new Error(message ?? `Request failed (${res.status})`)
  }

  const data = (body as { data?: T }).data
  if (data === undefined) throw new Error(`Unexpected response from the API (${res.status})`)
  return data
}
