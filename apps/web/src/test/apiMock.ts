import { vi } from 'vitest'
import type {
  Attachment,
  CaptureResult,
  InboxProcessingResult,
  Item,
  KoshNotification,
  Project,
} from '@kosh/shared'

export interface SmartCaptureMockOptions {
  interpretResult?: CaptureResult
  interpretError?: { status: number; message: string }
  processResult?: InboxProcessingResult
  processError?: { status: number; message: string }
}

export function createApiFetchMock(
  seed: Item[] = [],
  seedNotifications: KoshNotification[] = [],
  options: SmartCaptureMockOptions = {},
  seedProjects: Project[] = [],
) {
  let store = [...seed]
  let notifStore = [...seedNotifications]
  let projectStore = [...seedProjects]
  let attachmentStore: Attachment[] = []
  let nextId = 0

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = (init?.method ?? 'GET').toUpperCase()
    const body: Record<string, unknown> | undefined =
      init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined

    const respond = (status: number, data?: unknown) =>
      new Response(data === undefined ? null : JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })

    const itemsPath = '/api/v1/items'
    const notificationsPath = '/api/v1/notifications'
    const projectsPath = '/api/v1/projects'
    const attachmentsPath = '/api/v1/attachments'

    if (method === 'GET' && (url.pathname === itemsPath || url.pathname === `${itemsPath}/`)) {
      let result = store
      const type = url.searchParams.get('type')
      const status = url.searchParams.get('status')
      const projectId = url.searchParams.get('projectId')
      const q = url.searchParams.get('q')
      if (type) result = result.filter((i) => i.type === type)
      if (status) result = result.filter((i) => i.status === status)
      if (projectId) result = result.filter((i) => i.projectId === projectId)
      if (q) {
        const tokens = q.match(/(?:project:"([^"]*)")|(\S+)/g) ?? []
        const needleWords: string[] = []
        let qType: string | null = null
        let qStatus: string | null = null
        let qHasAttachment = false
        const qTags: string[] = []
        for (const token of tokens) {
          const lower = token.toLowerCase()
          if (lower === 'has:attachment') {
            qHasAttachment = true
          } else if (lower.startsWith('type:')) {
            qType = lower.slice(5)
          } else if (lower.startsWith('status:')) {
            qStatus = lower.slice(7)
          } else if (lower.startsWith('tag:')) {
            qTags.push(lower.slice(4))
          } else if (lower.startsWith('project:')) {
            const name = lower.slice(8).replace(/"/g, '')
            result = result.filter((i) => {
              const p = projectStore.find((pr) => pr.id === i.projectId)
              return p !== undefined && p.name.toLowerCase() === name
            })
          } else {
            needleWords.push(
              ...lower
                .replace(/[^a-z0-9]+/g, ' ')
                .split(' ')
                .filter(Boolean),
            )
          }
        }
        if (qType) result = result.filter((i) => i.type === qType)
        if (qStatus) result = result.filter((i) => i.status === qStatus)
        if (qHasAttachment) {
          result = result.filter((i) => (i.attachmentCount ?? 0) > 0)
        }
        for (const tag of qTags) {
          result = result.filter((i) => (i.tags ?? []).some((t) => t.toLowerCase() === tag))
        }
        if (needleWords.length > 0) {
          result = result.filter((i) =>
            needleWords.every((word) =>
              [i.title, i.body, i.url, ...(i.tags ?? [])]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(word),
            ),
          )
        }
      }
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? result.length)
      const page = result.slice(offset, offset + limit)
      if (q) {
        return respond(200, {
          data: page,
          meta: {
            limit,
            offset,
            total: result.length,
            hasMore: offset + page.length < result.length,
          },
        })
      }
      return respond(200, { data: page })
    }

    if (method === 'GET' && url.pathname.startsWith(`${itemsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(itemsPath.length + 1))
      const item = store.find((i) => i.id === id)
      return item
        ? respond(200, { data: item })
        : respond(404, { error: { message: 'Item not found' } })
    }

    if (method === 'POST' && url.pathname === itemsPath) {
      const now = new Date().toISOString()
      const item: Item = {
        id: `mock-${++nextId}`,
        type: 'note',
        status: 'inbox',
        title: 'Untitled',
        priority: null,
        tags: null,
        createdAt: now,
        updatedAt: now,
        ...body,
      }
      store = [item, ...store]
      return respond(201, { data: item })
    }

    if (method === 'PATCH' && url.pathname.startsWith(`${itemsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(itemsPath.length + 1))
      const current = store.find((i) => i.id === id)
      if (!current) return respond(404, { error: { message: 'Item not found' } })
      const updated: Item = { ...current, ...body, updatedAt: new Date().toISOString() }
      store = store.map((i) => (i.id === id ? updated : i))
      return respond(200, { data: updated })
    }

    if (method === 'DELETE' && url.pathname.startsWith(`${itemsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(itemsPath.length + 1))
      if (!store.some((i) => i.id === id))
        return respond(404, { error: { message: 'Item not found' } })
      store = store.filter((i) => i.id !== id)
      return respond(204)
    }

    if (
      method === 'GET' &&
      (url.pathname === notificationsPath || url.pathname === `${notificationsPath}/`)
    ) {
      const unread = url.searchParams.get('unread') === 'true'
      const list = unread ? notifStore.filter((n) => !n.readAt) : notifStore
      return respond(200, { data: list })
    }

    if (method === 'PATCH' && url.pathname.startsWith(`${notificationsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(notificationsPath.length + 1))
      const current = notifStore.find((n) => n.id === id)
      if (!current) return respond(404, { error: { message: 'Notification not found' } })
      const updated: KoshNotification = { ...current, readAt: new Date().toISOString() }
      notifStore = notifStore.map((n) => (n.id === id ? updated : n))
      return respond(200, { data: updated })
    }

    if (method === 'POST' && url.pathname === '/api/v1/capture/interpret') {
      if (options.interpretError) {
        return respond(options.interpretError.status, {
          error: { message: options.interpretError.message },
        })
      }
      return respond(200, {
        data: options.interpretResult ?? {
          type: 'task',
          title: 'Check API issue',
          body: 'Rahul asked me to check the API issue.',
          url: null,
          priority: 'medium',
          dueAt: null,
          reminderAt: null,
          tags: ['API'],
          confidence: 'high',
        },
      })
    }

    const processMatch = url.pathname.match(/^\/api\/v1\/items\/([^/]+)\/process(?:\/(accept))?$/)
    if (processMatch) {
      const itemId = decodeURIComponent(processMatch[1]!)
      const isAccept = processMatch[2] === 'accept'
      const item = store.find((i) => i.id === itemId)
      if (!item) return respond(404, { error: { message: 'Item not found' } })

      if (!isAccept) {
        if (options.processError) {
          return respond(options.processError.status, {
            error: { message: options.processError.message },
          })
        }
        return respond(200, {
          data: options.processResult ?? {
            summary: null,
            suggestions: [],
          },
        })
      }

      const acceptBody = body as {
        suggestions?: Array<{
          title: string
          type: string
          dueAt?: string | null
          projectId?: string | null
          priority?: string | null
          tags?: string[] | null
          reminderAt?: string | null
        }>
        markSourceProcessed?: boolean
        skipDuplicateTitles?: string[]
      }
      const now = new Date().toISOString()
      const created: Item[] = []
      const skippedDuplicates: string[] = []
      const skipTitles = new Set((acceptBody.skipDuplicateTitles ?? []).map((t) => t.toLowerCase()))
      for (const s of acceptBody.suggestions ?? []) {
        if (store.some((i) => i.title.trim().toLowerCase() === s.title.trim().toLowerCase())) {
          if (skipTitles.has(s.title.toLowerCase())) {
            skippedDuplicates.push(s.title)
            continue
          }
        }
        const createdItem: Item = {
          id: `mock-${++nextId}`,
          type: (s.type as Item['type']) ?? 'note',
          status: 'active',
          title: s.title,
          priority: s.priority as Item['priority'],
          tags: s.tags ?? null,
          dueAt: s.dueAt ?? null,
          reminderAt: s.reminderAt ?? null,
          projectId: s.projectId ?? null,
          createdAt: now,
          updatedAt: now,
        }
        created.push(createdItem)
        store = [createdItem, ...store]
      }
      let source = item
      if (acceptBody.markSourceProcessed && created.length > 0) {
        source = { ...item, status: 'archived', updatedAt: now }
        store = store.map((i) => (i.id === itemId ? source : i))
      }
      return respond(200, { data: { created, source, skippedDuplicates } })
    }

    if (method === 'POST' && url.pathname === '/api/v1/transcribe') {
      return respond(200, { data: { text: 'Rahul asked me to check the API issue tomorrow.' } })
    }

    if (
      method === 'GET' &&
      (url.pathname === projectsPath || url.pathname === `${projectsPath}/`)
    ) {
      return respond(200, { data: projectStore })
    }

    if (method === 'GET' && url.pathname.startsWith(`${projectsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(projectsPath.length + 1))
      const project = projectStore.find((p) => p.id === id)
      return project
        ? respond(200, { data: project })
        : respond(404, { error: { message: 'Project not found' } })
    }

    if (method === 'POST' && url.pathname === projectsPath) {
      const now = new Date().toISOString()
      const project: Project = {
        id: `proj-${++nextId}`,
        name: 'Untitled',
        description: null,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
        ...body,
      }
      projectStore = [...projectStore, project]
      return respond(201, { data: project })
    }

    if (method === 'PATCH' && url.pathname.startsWith(`${projectsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(projectsPath.length + 1))
      const current = projectStore.find((p) => p.id === id)
      if (!current) return respond(404, { error: { message: 'Project not found' } })
      const updated: Project = { ...current, ...body, updatedAt: new Date().toISOString() }
      projectStore = projectStore.map((p) => (p.id === id ? updated : p))
      return respond(200, { data: updated })
    }

    if (method === 'DELETE' && url.pathname.startsWith(`${projectsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(projectsPath.length + 1))
      if (!projectStore.some((p) => p.id === id))
        return respond(404, { error: { message: 'Project not found' } })
      projectStore = projectStore.filter((p) => p.id !== id)
      store = store.map((i) => (i.projectId === id ? { ...i, projectId: null } : i))
      return respond(204)
    }

    const itemAttachmentsMatch = url.pathname.match(/^\/api\/v1\/items\/([^/]+)\/attachments$/)
    if (itemAttachmentsMatch) {
      const itemId = decodeURIComponent(itemAttachmentsMatch[1]!)
      const item = store.find((i) => i.id === itemId)
      if (!item) return respond(404, { error: { message: 'Item not found' } })
      if (method === 'GET') {
        return respond(200, {
          data: attachmentStore.filter((a) => a.itemId === itemId),
        })
      }
      if (method === 'POST') {
        const file = (init?.body as FormData | undefined)?.get('file') as File | undefined
        if (!file) return respond(400, { error: { message: 'A file is required' } })
        const now = new Date().toISOString()
        const attachment: Attachment = {
          id: `att-${++nextId}`,
          itemId,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          createdAt: now,
          updatedAt: now,
        }
        attachmentStore = [...attachmentStore, attachment]
        return respond(201, { data: attachment })
      }
    }

    if (method === 'GET' && url.pathname.startsWith(`${attachmentsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(attachmentsPath.length + 1))
      const attachment = attachmentStore.find((a) => a.id === id)
      if (!attachment) return respond(404, { error: { message: 'Attachment not found' } })
      return new Response('mock-bytes', {
        status: 200,
        headers: { 'Content-Type': attachment.mimeType },
      })
    }

    if (method === 'DELETE' && url.pathname.startsWith(`${attachmentsPath}/`)) {
      const id = decodeURIComponent(url.pathname.slice(attachmentsPath.length + 1))
      if (!attachmentStore.some((a) => a.id === id))
        return respond(404, { error: { message: 'Attachment not found' } })
      attachmentStore = attachmentStore.filter((a) => a.id !== id)
      return respond(204)
    }

    return respond(404, { error: { message: 'Not found' } })
  })

  return fetchMock
}

export function createFailingPostFetchMock() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    if ((init?.method ?? 'GET').toUpperCase() === 'POST' && url.pathname === '/api/v1/items') {
      return new Response(JSON.stringify({ error: { message: 'Server exploded' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

export function createEmptyFetchMock() {
  return vi.fn(
    async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
}
