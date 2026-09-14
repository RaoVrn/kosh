import type {
  Attachment,
  CaptureInterpretRequest,
  CaptureResult,
  InboxProcessingAcceptInput,
  InboxProcessingAcceptResponse,
  InboxProcessingResult,
  Item,
  ItemStatus,
  ItemType,
  KoshNotification,
  Priority,
  Project,
  ProjectInput,
  ProjectUpdate,
  Recurrence,
  SearchMeta,
  SearchResponse,
} from '../index'

export interface TranscribeFileInput {
  uri?: string
  blob?: Blob
  name: string
  mime: string
}

export interface AttachmentFileInput {
  uri?: string
  blob?: Blob
  name: string
  mime: string
}

export interface ItemsListParams {
  q?: string
  type?: ItemType
  status?: ItemStatus
  projectId?: string
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
  recurrence?: Recurrence | null
  projectId?: string | null
}

export type UpdateItemInput = Partial<CreateItemInput>

export interface ItemsApiClient {
  getItems: (params?: ItemsListParams) => Promise<Item[]>
  getItem: (id: string) => Promise<Item>
  createItem: (input: CreateItemInput) => Promise<Item>
  updateItem: (id: string, patch: UpdateItemInput) => Promise<Item>
  deleteItem: (id: string) => Promise<void>
  searchItems: (params: { q: string; limit?: number; offset?: number }) => Promise<SearchResponse>
  getNotifications: (params?: { unread?: boolean }) => Promise<KoshNotification[]>
  markNotificationRead: (id: string) => Promise<KoshNotification>
  interpretCapture: (input: CaptureInterpretRequest) => Promise<CaptureResult>
  transcribeAudio: (file: TranscribeFileInput) => Promise<string>
  listProjects: () => Promise<Project[]>
  getProject: (id: string) => Promise<Project>
  createProject: (input: ProjectInput) => Promise<Project>
  updateProject: (id: string, patch: ProjectUpdate) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  listAttachments: (itemId: string) => Promise<Attachment[]>
  uploadAttachment: (itemId: string, file: AttachmentFileInput) => Promise<Attachment>
  deleteAttachment: (attachmentId: string) => Promise<void>
  getAttachmentUrl: (attachmentId: string) => string
  processInboxItem: (itemId: string) => Promise<InboxProcessingResult>
  acceptProcessedSuggestions: (
    itemId: string,
    input: InboxProcessingAcceptInput,
  ) => Promise<InboxProcessingAcceptResponse>
}

export const DEFAULT_API_BASE_URL = 'http://localhost:3001'

export function createItemsApi(baseUrl: string = DEFAULT_API_BASE_URL): ItemsApiClient {
  return {
    getItems: (params) => {
      const query = new URLSearchParams()
      if (params?.q) query.set('q', params.q)
      if (params?.type) query.set('type', params.type)
      if (params?.status) query.set('status', params.status)
      if (params?.projectId) query.set('projectId', params.projectId)
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
    searchItems: async (params) => {
      const query = new URLSearchParams()
      query.set('q', params.q)
      if (params.limit !== undefined) query.set('limit', String(params.limit))
      if (params.offset !== undefined) query.set('offset', String(params.offset))
      let res: Response
      try {
        res = await fetch(`${baseUrl}/api/v1/items?${query.toString()}`)
      } catch {
        throw new Error('Could not reach the Kosh API — is it running?')
      }
      if (!res.ok) {
        let message: string | undefined
        try {
          const body = (await res.json()) as { error?: { message?: unknown } }
          if (typeof body.error?.message === 'string') message = body.error.message
        } catch {
          // fall through to status message
        }
        throw new Error(message ?? `Request failed (${res.status})`)
      }
      const body = (await res.json()) as { data?: Item[]; meta?: SearchMeta }
      if (!Array.isArray(body.data) || !body.meta) {
        throw new Error(`Unexpected response from the API (${res.status})`)
      }
      return { items: body.data, meta: body.meta }
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
    interpretCapture: (input) =>
      request<CaptureResult>(baseUrl, '/api/v1/capture/interpret', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    transcribeAudio: async (file) => {
      const form = new FormData()
      if (file.blob) {
        form.append('audio', file.blob, file.name)
      } else if (file.uri) {
        form.append('audio', { uri: file.uri, name: file.name, type: file.mime } as unknown as Blob)
      } else {
        throw new Error('No audio file provided')
      }
      let res: Response
      try {
        res = await fetch(`${baseUrl}/api/v1/transcribe`, { method: 'POST', body: form })
      } catch {
        throw new Error('Could not reach the Kosh API — is it running?')
      }
      if (!res.ok) {
        let message: string | undefined
        try {
          const body = (await res.json()) as { error?: { message?: unknown } }
          if (typeof body.error?.message === 'string') message = body.error.message
        } catch {
          // fall through to status message
        }
        throw new Error(message ?? `Request failed (${res.status})`)
      }
      const body = (await res.json()) as { data?: { text?: string } }
      if (!body.data?.text) throw new Error(`Unexpected response from the API (${res.status})`)
      return body.data.text
    },
    listProjects: () => request<Project[]>(baseUrl, '/api/v1/projects'),
    getProject: (id) => request<Project>(baseUrl, `/api/v1/projects/${encodeURIComponent(id)}`),
    createProject: (input) =>
      request<Project>(baseUrl, '/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateProject: (id, patch) =>
      request<Project>(baseUrl, `/api/v1/projects/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    deleteProject: async (id) => {
      await request<undefined>(baseUrl, `/api/v1/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    },
    listAttachments: (itemId) =>
      request<Attachment[]>(baseUrl, `/api/v1/items/${encodeURIComponent(itemId)}/attachments`),
    uploadAttachment: async (itemId, file) => {
      const form = new FormData()
      if (file.blob) {
        form.append('file', file.blob, file.name)
      } else if (file.uri) {
        form.append('file', { uri: file.uri, name: file.name, type: file.mime } as unknown as Blob)
      } else {
        throw new Error('No file provided')
      }
      return request<Attachment>(
        baseUrl,
        `/api/v1/items/${encodeURIComponent(itemId)}/attachments`,
        { method: 'POST', body: form },
      )
    },
    deleteAttachment: async (attachmentId) => {
      await request<undefined>(baseUrl, `/api/v1/attachments/${encodeURIComponent(attachmentId)}`, {
        method: 'DELETE',
      })
    },
    getAttachmentUrl: (attachmentId) =>
      `${baseUrl}/api/v1/attachments/${encodeURIComponent(attachmentId)}`,
    processInboxItem: (itemId) =>
      request<InboxProcessingResult>(
        baseUrl,
        `/api/v1/items/${encodeURIComponent(itemId)}/process`,
        { method: 'POST' },
      ),
    acceptProcessedSuggestions: (itemId, input) =>
      request<InboxProcessingAcceptResponse>(
        baseUrl,
        `/api/v1/items/${encodeURIComponent(itemId)}/process/accept`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
  }
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

async function request<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    const isFormData = init?.body instanceof FormData
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: isFormData
        ? { ...init.headers }
        : { 'Content-Type': 'application/json', ...init?.headers },
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
