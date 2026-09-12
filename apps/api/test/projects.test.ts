import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Item, Project } from '@kosh/shared'

function iso(y: number, mo: number, d: number, h = 9): string {
  return new Date(y, mo - 1, d, h, 0, 0).toISOString()
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

async function createProject(app: ReturnType<typeof createApp>, name: string) {
  const res = await app.request('/api/v1/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, description: `${name} description` }),
  })
  expect(res.status).toBe(201)
  return (await json(res)).data as Project
}

async function createItem(app: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  const res = await app.request('/api/v1/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(201)
  return (await json(res)).data as Item
}

describe('projects API', () => {
  it('creates, lists, gets, updates and archives a project', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)

    const kosh = await createProject(app, 'Kosh')
    expect(kosh.name).toBe('Kosh')
    expect(kosh.archivedAt).toBeNull()

    const list = (await json(await app.request('/api/v1/projects'))).data as Project[]
    expect(list).toHaveLength(1)

    const got = (await json(await app.request(`/api/v1/projects/${kosh.id}`))).data as Project
    expect(got.name).toBe('Kosh')

    const updated = (
      await json(
        await app.request(`/api/v1/projects/${kosh.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Kosh 2', description: 'updated' }),
        }),
      )
    ).data as Project
    expect(updated.name).toBe('Kosh 2')
    expect(updated.description).toBe('updated')

    const archived = (
      await json(
        await app.request(`/api/v1/projects/${kosh.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ archivedAt: new Date().toISOString() }),
        }),
      )
    ).data as Project
    expect(archived.archivedAt).toBeTruthy()

    const restored = (
      await json(
        await app.request(`/api/v1/projects/${kosh.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ archivedAt: null }),
        }),
      )
    ).data as Project
    expect(restored.archivedAt).toBeNull()
  })

  it('enforces case-insensitive unique project names', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')
    const dup = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'kosh' }),
    })
    expect(dup.status).toBe(400)

    const other = await createProject(app, 'Other')
    const renamed = await app.request(`/api/v1/projects/${other.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'KOSH' }),
    })
    expect(renamed.status).toBe(400)

    const sameId = await app.request(`/api/v1/projects/${kosh.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'KOSH' }),
    })
    expect(sameId.status).toBe(200)
  })

  it('rejects invalid project input', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    expect(
      (
        await app.request('/api/v1/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: '  ' }),
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await app.request('/api/v1/projects', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
      ).status,
    ).toBe(400)
  })

  it('deleting a project keeps items but clears their projectId', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')
    const item = await createItem(app, {
      type: 'task',
      title: 'Fix nav',
      status: 'active',
      projectId: kosh.id,
    })
    expect(item.projectId).toBe(kosh.id)

    const del = await app.request(`/api/v1/projects/${kosh.id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)

    const after = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(after.projectId).toBeNull()
    expect(after.title).toBe('Fix nav')

    const list = (await json(await app.request('/api/v1/projects'))).data as Project[]
    expect(list).toHaveLength(0)
  })

  it('archiving a project does not touch item associations', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')
    const item = await createItem(app, { type: 'note', title: 'note', projectId: kosh.id })

    await app.request(`/api/v1/projects/${kosh.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    })
    const after = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(after.projectId).toBe(kosh.id)
  })

  it('rejects assigning an item to an archived project or unknown project', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')
    await app.request(`/api/v1/projects/${kosh.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    })

    const bad = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'task', title: 'x', projectId: kosh.id }),
    })
    expect(bad.status).toBe(400)

    const unknown = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'task', title: 'x', projectId: 'nope' }),
    })
    expect(unknown.status).toBe(400)

    const item = await createItem(app, { type: 'task', title: 'y' })
    const patch = await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId: kosh.id }),
    })
    expect(patch.status).toBe(400)
  })
})

describe('item ↔ project association', () => {
  it('persists projectId for all five item types and supports removal/reassignment', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')
    const other = await createProject(app, 'Other')

    for (const type of ['task', 'note', 'idea', 'learning', 'link'] as const) {
      const item = await createItem(app, {
        type,
        title: `${type} in Kosh`,
        ...(type === 'link' ? { url: 'https://example.com' } : {}),
        projectId: kosh.id,
      })
      expect(item.projectId).toBe(kosh.id)
    }

    const task = await createItem(app, { type: 'task', title: 'movable', projectId: kosh.id })
    const moved = (
      await json(
        await app.request(`/api/v1/items/${task.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ projectId: other.id }),
        }),
      )
    ).data as Item
    expect(moved.projectId).toBe(other.id)

    const removed = (
      await json(
        await app.request(`/api/v1/items/${task.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ projectId: null }),
        }),
      )
    ).data as Item
    expect(removed.projectId).toBeNull()
  })

  it('filters items by projectId alone and combined with type/status/q', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')
    const other = await createProject(app, 'Other')

    await createItem(app, {
      type: 'task',
      title: 'Kosh task',
      status: 'active',
      projectId: kosh.id,
    })
    await createItem(app, {
      type: 'note',
      title: 'Kosh note',
      status: 'active',
      projectId: kosh.id,
    })
    await createItem(app, {
      type: 'task',
      title: 'Other task',
      status: 'active',
      projectId: other.id,
    })
    await createItem(app, { type: 'task', title: 'No project task', status: 'active' })

    const all = (await json(await app.request(`/api/v1/items?projectId=${kosh.id}`))).data as Item[]
    expect(all.map((i) => i.title).sort()).toEqual(['Kosh note', 'Kosh task'])

    const tasks = (await json(await app.request(`/api/v1/items?projectId=${kosh.id}&type=task`)))
      .data as Item[]
    expect(tasks.map((i) => i.title)).toEqual(['Kosh task'])

    const active = (
      await json(await app.request(`/api/v1/items?projectId=${kosh.id}&status=active&type=note`))
    ).data as Item[]
    expect(active.map((i) => i.title)).toEqual(['Kosh note'])

    const q = (await json(await app.request(`/api/v1/items?projectId=${kosh.id}&q=note`)))
      .data as Item[]
    expect(q.map((i) => i.title)).toEqual(['Kosh note'])
  })

  it('preserves projectId across type conversions', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')

    const idea = await createItem(app, { type: 'idea', title: 'idea', projectId: kosh.id })
    const asTask = (
      await json(
        await app.request(`/api/v1/items/${idea.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'task' }),
        }),
      )
    ).data as Item
    expect(asTask.projectId).toBe(kosh.id)
    expect(asTask.id).toBe(idea.id)

    const recurring = await createItem(app, {
      type: 'task',
      title: 'recurring',
      status: 'active',
      dueAt: iso(2026, 9, 14, 17),
      recurrence: { frequency: 'daily' },
      projectId: kosh.id,
    })
    const asNote = (
      await json(
        await app.request(`/api/v1/items/${recurring.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'note' }),
        }),
      )
    ).data as Item
    expect(asNote.projectId).toBe(kosh.id)
    expect(asNote.recurrence).toBeNull()
  })

  it('copies projectId to the generated next occurrence', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')

    const task = await createItem(app, {
      type: 'task',
      title: 'Review Kosh weekly',
      status: 'active',
      dueAt: iso(2026, 9, 14, 17),
      reminderAt: iso(2026, 9, 14, 16),
      recurrence: { frequency: 'weekly', weekdays: [1] },
      projectId: kosh.id,
    })

    const done = await app.request(`/api/v1/items/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(done.status).toBe(200)

    const list = (await json(await app.request('/api/v1/items'))).data as Item[]
    const next = list.find((i) => i.id !== task.id)!
    expect(next.projectId).toBe(kosh.id)
    expect(next.recurrence).toEqual({ frequency: 'weekly', weekdays: [1] })
    expect(next.dueAt).toBe(iso(2026, 9, 21, 17))
    expect(next.reminderAt).toBe(iso(2026, 9, 21, 16))
    expect(next.status).toBe('active')
    expect(list.filter((i) => i.recurrenceId === task.recurrenceId)).toHaveLength(2)
  })

  it('inbox processing preserves project association', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')

    const inbox = await createItem(app, {
      type: 'task',
      title: 'Fix Kosh mobile navigation',
      projectId: kosh.id,
    })
    expect(inbox.status).toBe('inbox')

    const processed = (
      await json(
        await app.request(`/api/v1/items/${inbox.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        }),
      )
    ).data as Item
    expect(processed.status).toBe('active')
    expect(processed.projectId).toBe(kosh.id)

    const archived = (
      await json(
        await app.request(`/api/v1/items/${inbox.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'archived' }),
        }),
      )
    ).data as Item
    expect(archived.projectId).toBe(kosh.id)
  })

  it('survives an API restart (fresh connection, persisted file)', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const kosh = await createProject(app, 'Kosh')
    await createItem(app, { type: 'note', title: 'persisted', projectId: kosh.id })

    const second = createApp(db)
    const projects = (await json(await second.request('/api/v1/projects'))).data as Project[]
    const items = (await json(await second.request('/api/v1/items'))).data as Item[]
    expect(projects.map((p) => p.name)).toContain('Kosh')
    expect(items[0]!.projectId).toBe(kosh.id)
  })
})
