import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Item } from '@kosh/shared'

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

async function postItem(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
): Promise<Item> {
  const res = await app.request('/api/v1/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(201)
  return (await json(res)).data as Item
}

async function postProject(app: ReturnType<typeof createApp>, name: string) {
  const res = await app.request('/api/v1/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return (await json(res)).data as { id: string; name: string }
}

async function search(app: ReturnType<typeof createApp>, q: string) {
  const res = await app.request(`/api/v1/items?q=${encodeURIComponent(q)}`)
  expect(res.status).toBe(200)
  const body = (await json(res)) as {
    data: Item[]
    meta: { limit: number; offset: number; total: number; hasMore: boolean }
  }
  return body
}

function setup() {
  const db = openDb(':memory:')
  migrate(db)
  return { db, app: createApp(db) }
}

describe('global search 2.0', () => {
  it('searches project names and finds project-associated items', async () => {
    const { app } = setup()
    const kosh = await postProject(app, 'Kosh')
    await postItem(app, { type: 'note', title: 'Architecture review', projectId: kosh.id })
    await postItem(app, { type: 'note', title: 'Unrelated note' })

    const result = await search(app, 'Kosh')
    expect(result.data.map((i) => i.title)).toContain('Architecture review')
    expect(result.data.some((i) => i.title === 'Unrelated note')).toBe(false)
  })

  it('project rename updates searchable text', async () => {
    const { app } = setup()
    const kosh = await postProject(app, 'Kosh')
    await postItem(app, { type: 'task', title: 'Fix nav', projectId: kosh.id })

    expect((await search(app, 'Kosh')).data).toHaveLength(1)
    await app.request(`/api/v1/projects/${kosh.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Zenith' }),
    })
    expect((await search(app, 'Zenith')).data).toHaveLength(1)
    expect((await search(app, 'Kosh')).data).toHaveLength(0)
  })

  it('project assignment and removal update search results', async () => {
    const { app } = setup()
    const kosh = await postProject(app, 'DSA')
    const item = await postItem(app, { type: 'task', title: 'Study arrays' })

    expect((await search(app, 'DSA')).data).toHaveLength(0)
    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: kosh.id }),
    })
    expect((await search(app, 'DSA')).data).toHaveLength(1)

    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: null }),
    })
    expect((await search(app, 'DSA')).data).toHaveLength(0)
  })

  it('archived projects remain searchable', async () => {
    const { app } = setup()
    const old = await postProject(app, 'Old Project')
    await postItem(app, { type: 'note', title: 'Legacy note', projectId: old.id })
    await app.request(`/api/v1/projects/${old.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    })
    expect((await search(app, 'Legacy note')).data).toHaveLength(1)
  })

  it('filters by type, status and tag', async () => {
    const { app } = setup()
    await postItem(app, { type: 'task', title: 'python task', tags: ['python', 'ai'] })
    await postItem(app, { type: 'learning', title: 'python course', tags: ['python'] })

    const typed = await search(app, 'type:task python')
    expect(typed.data.map((i) => i.title)).toEqual(['python task'])

    const tagged = await search(app, 'tag:python tag:ai python')
    expect(tagged.data.map((i) => i.title)).toEqual(['python task'])

    const statused = await search(app, 'status:inbox type:learning python')
    expect(statused.data.map((i) => i.title)).toEqual(['python course'])
  })

  it('filters by created date boundaries', async () => {
    const { app } = setup()
    const old = await postItem(app, { type: 'note', title: 'old note' })
    const newer = await postItem(app, { type: 'note', title: 'newer note' })
    void old

    const createdDay = newer.createdAt.slice(0, 10)
    const after = await search(app, `after:${createdDay}`)
    expect(after.data.some((i) => i.title === 'newer note')).toBe(true)
    expect(after.data.some((i) => i.title === 'old note')).toBe(true)

    const before = await search(app, `before:${createdDay}`)
    expect(before.data).toHaveLength(0)

    const farBefore = await search(app, `before:${new Date().getFullYear() + 1}-01-01`)
    expect(farBefore.data.some((i) => i.title === 'old note')).toBe(true)
  })

  it('filters has:attachment without loading binaries', async () => {
    const { app } = setup()
    const item = await postItem(app, { type: 'note', title: 'with a file' })
    await postItem(app, { type: 'note', title: 'without a file' })

    const form = new FormData()
    form.append('file', new File([new Uint8Array([1, 2, 3])], 'x.png', { type: 'image/png' }))
    await app.request(`/api/v1/items/${item.id}/attachments`, { method: 'POST', body: form })

    const result = await search(app, 'has:attachment')
    expect(result.data.map((i) => i.title)).toEqual(['with a file'])
    expect(result.data[0]?.attachmentCount).toBe(1)
  })

  it('supports quoted project names with spaces', async () => {
    const { app } = setup()
    const project = await postProject(app, 'Requirement Review Agent')
    await postItem(app, { type: 'task', title: 'M26 report', projectId: project.id })

    const result = await search(app, 'project:"Requirement Review Agent"')
    expect(result.data.map((i) => i.title)).toEqual(['M26 report'])
  })

  it('returns empty results for an unknown project without creating it', async () => {
    const { app } = setup()
    await postItem(app, { type: 'note', title: 'anything' })
    const result = await search(app, 'project:"No Such Project"')
    expect(result.data).toHaveLength(0)
    const projects = (await json(await app.request('/api/v1/projects'))).data as unknown[]
    expect(projects).toHaveLength(0)
  })

  it('combines multiple filters', async () => {
    const { app } = setup()
    const kosh = await postProject(app, 'Kosh')
    await postItem(app, {
      type: 'task',
      title: 'Fix mobile nav',
      status: 'active',
      tags: ['mobile'],
      projectId: kosh.id,
    })
    await postItem(app, {
      type: 'note',
      title: 'nav architecture',
      status: 'inbox',
      tags: ['mobile'],
      projectId: kosh.id,
    })

    const result = await search(app, 'project:Kosh tag:mobile type:task')
    expect(result.data.map((i) => i.title)).toEqual(['Fix mobile nav'])
  })

  it('ranks title matches above body matches', async () => {
    const { app } = setup()
    await postItem(app, { type: 'note', title: 'Zebra survival guide', body: 'about zebras' })
    await postItem(app, { type: 'note', title: 'Unrelated', body: 'zebra facts inside the body' })

    const result = await search(app, 'zebra')
    expect(result.data[0]?.title).toBe('Zebra survival guide')
  })

  it('provides snippets with mark highlighting', async () => {
    const { app } = setup()
    await postItem(app, {
      type: 'note',
      title: 'Meeting notes',
      body: 'We reviewed the architecture requirements before Friday.',
    })

    const result = await search(app, 'architecture')
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.snippet).toBeTruthy()
    expect(result.data[0]?.snippet).toContain('<mark>architecture</mark>')
  })

  it('paginates with limit/offset and hasMore', async () => {
    const { app } = setup()
    for (let i = 0; i < 6; i++) {
      await postItem(app, { type: 'note', title: `paged note ${i}` })
    }

    const page1 = await search(app, 'paged')
    expect(page1.data).toHaveLength(6)
    expect(page1.meta.total).toBe(6)
    expect(page1.meta.hasMore).toBe(false)

    const limited = (await json(await app.request('/api/v1/items?q=paged&limit=2&offset=0'))) as {
      data: Item[]
      meta: { hasMore: boolean; total: number }
    }
    expect(limited.data).toHaveLength(2)
    expect(limited.meta.hasMore).toBe(true)

    const page2 = (await json(await app.request('/api/v1/items?q=paged&limit=2&offset=2'))) as {
      data: Item[]
    }
    expect(page2.data).toHaveLength(2)
    expect(limited.data[1]!.id).not.toBe(page2.data[0]!.id)
  })

  it('rejects contradictory explicit params and operators', async () => {
    const { app } = setup()
    const res = await app.request('/api/v1/items?type=task&q=type%3Anote')
    expect(res.status).toBe(400)

    const statusRes = await app.request('/api/v1/items?status=done&q=status%3Aactive')
    expect(statusRes.status).toBe(400)

    const project = await postProject(app, 'Kosh')
    const ok = await app.request(
      '/api/v1/items?projectId=' + project.id + '&q=project%3A%22Kosh%22',
    )
    expect(ok.status).toBe(200)
  })

  it('searches inbox and archived items', async () => {
    const { app } = setup()
    const inbox = await postItem(app, { type: 'note', title: 'fresh capture' })
    const archived = await postItem(app, { type: 'note', title: 'old capture' })
    await app.request(`/api/v1/items/${archived.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    void inbox

    expect((await search(app, 'status:inbox capture')).data).toHaveLength(1)
    expect((await search(app, 'status:archived capture')).data).toHaveLength(1)
  })

  it('searches recurring task occurrences', async () => {
    const { app } = setup()
    const task = await postItem(app, {
      type: 'task',
      title: 'Review Kosh weekly',
      status: 'active',
      dueAt: '2026-09-14T17:00:00.000Z',
      recurrence: { frequency: 'weekly', weekdays: [1] },
    })
    await app.request(`/api/v1/items/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })

    const result = await search(app, 'Review Kosh weekly')
    expect(result.data).toHaveLength(2)
    expect(result.data.some((i) => i.status === 'done')).toBe(true)
    expect(result.data.some((i) => i.status === 'active')).toBe(true)
  })

  it('rejects invalid operators with 400 and does not leak SQL errors', async () => {
    const { app } = setup()
    expect((await app.request('/api/v1/items?q=type%3Abogus')).status).toBe(400)
    expect((await app.request('/api/v1/items?q=before%3Anope')).status).toBe(400)
    const body = (await json(await app.request('/api/v1/items?q=type%3Abogus'))) as {
      error: { message: string }
    }
    expect(body.error.message).not.toContain('SQL')
  })

  it('persists search behavior across a fresh connection', async () => {
    const { db } = setup()
    const project = await postProject(createApp(db), 'Persist')
    await postItem(createApp(db), {
      type: 'note',
      title: 'persisted search',
      projectId: project.id,
    })

    const second = createApp(db)
    const result = await search(second, 'Persist')
    expect(result.data).toHaveLength(1)
  })

  it('search results include projectId and attachmentCount metadata', async () => {
    const { app } = setup()
    const kosh = await postProject(app, 'Kosh')
    const item = await postItem(app, { type: 'task', title: 'meta check', projectId: kosh.id })
    const form = new FormData()
    form.append('file', new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    await app.request(`/api/v1/items/${item.id}/attachments`, { method: 'POST', body: form })

    const result = await search(app, 'meta check')
    const found = result.data[0]!
    expect(found.projectId).toBe(kosh.id)
    expect(found.attachmentCount).toBe(1)
    expect(found.attachments).toBeUndefined()
  })
})
