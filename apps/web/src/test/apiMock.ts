import { vi } from 'vitest'
import type { CaptureResult, Item, KoshNotification, Project } from '@kosh/shared'

export interface SmartCaptureMockOptions {
  interpretResult?: CaptureResult
  interpretError?: { status: number; message: string }
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
        const needle = q.toLowerCase()
        result = result.filter((i) =>
          [i.title, i.body, i.url, ...(i.tags ?? [])]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(needle),
        )
      }
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? result.length)
      return respond(200, { data: result.slice(offset, offset + limit) })
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
