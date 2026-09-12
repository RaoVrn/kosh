import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Db } from '../src/db.js'
import * as repo from '../src/items/repo.js'

const json = (body: unknown) => ({
  method: 'POST' as const,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

describe('items API', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  it('POST creates an item persisted in SQLite', async () => {
    const app = createApp(db)
    const res = await app.request(
      '/api/v1/items',
      json({ title: 'Hello world', type: 'note', priority: 'high' }),
    )
    expect(res.status).toBe(201)
    const { data } = (await res.json()) as {
      data: { id: string; title: string; type: string; status: string; priority: string }
    }
    expect(data.title).toBe('Hello world')
    expect(data.type).toBe('note')
    expect(data.status).toBe('inbox')
    expect(data.priority).toBe('high')
    expect(data.id).toBeTruthy()

    const row = db.prepare('SELECT title, type, priority FROM items WHERE id = ?').get(data.id) as
      { title: string; type: string; priority: string } | undefined
    expect(row?.title).toBe('Hello world')
    expect(row?.type).toBe('note')
    expect(row?.priority).toBe('high')
  })

  it('POST rejects invalid items', async () => {
    const app = createApp(db)
    const noTitle = await app.request('/api/v1/items', json({ type: 'note' }))
    expect(noTitle.status).toBe(400)
    expect((await noTitle.json()) as { error: { message: string } }).toMatchObject({
      error: { message: expect.any(String) },
    })

    const badType = await app.request('/api/v1/items', json({ title: 'x', type: 'bogus' }))
    expect(badType.status).toBe(400)

    const badStatus = await app.request(
      '/api/v1/items',
      json({ title: 'x', type: 'note', status: 'bogus' }),
    )
    expect(badStatus.status).toBe(400)

    const badDate = await app.request(
      '/api/v1/items',
      json({ title: 'x', type: 'note', dueAt: 'not-a-date' }),
    )
    expect(badDate.status).toBe(400)

    const notJson = await app.request('/api/v1/items', { method: 'POST', body: '{oops' })
    expect(notJson.status).toBe(400)

    const missing = (await db.prepare('SELECT COUNT(*) AS c FROM items').get()) as { c: number }
    expect(Number(missing.c)).toBe(0)
  })

  it('GET lists items and supports type/status filters', async () => {
    const app = createApp(db)
    await app.request('/api/v1/items', json({ title: 'Task one', type: 'task' }))
    await app.request('/api/v1/items', json({ title: 'Task two', type: 'task', status: 'done' }))
    await app.request('/api/v1/items', json({ title: 'A note', type: 'note' }))

    const all = await app.request('/api/v1/items')
    expect(all.status).toBe(200)
    expect(((await all.json()) as { data: unknown[] }).data).toHaveLength(3)

    const tasks = await app.request('/api/v1/items?type=task')
    expect(((await tasks.json()) as { data: unknown[] }).data).toHaveLength(2)

    const done = await app.request('/api/v1/items?status=done')
    expect(((await done.json()) as { data: unknown[] }).data).toHaveLength(1)

    const badFilter = await app.request('/api/v1/items?type=bogus')
    expect(badFilter.status).toBe(400)
  })

  it('GET single item returns it or 404', async () => {
    const app = createApp(db)
    const created = await app.request('/api/v1/items', json({ title: 'Solo', type: 'idea' }))
    const { data } = (await created.json()) as { data: { id: string; title: string } }

    const res = await app.request(`/api/v1/items/${data.id}`)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { data: { title: string } }).data.title).toBe('Solo')

    const missing = await app.request('/api/v1/items/does-not-exist')
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({ error: { message: 'Item not found' } })
  })

  it('PATCH updates fields and updatedAt, and derives doneAt', async () => {
    const app = createApp(db)
    const created = await app.request('/api/v1/items', json({ title: 'Before', type: 'task' }))
    const before = (await created.json()) as {
      data: { id: string; title: string; status: string; updatedAt: string }
    }

    await new Promise((r) => setTimeout(r, 10))

    const patched = await app.request(`/api/v1/items/${before.data.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'After', priority: 'low', status: 'done' }),
    })
    expect(patched.status).toBe(200)
    const after = (await patched.json()) as {
      data: {
        title: string
        priority: string
        status: string
        updatedAt: string
        doneAt: string | null
      }
    }
    expect(after.data.title).toBe('After')
    expect(after.data.priority).toBe('low')
    expect(after.data.status).toBe('done')
    expect(after.data.doneAt).toBeTruthy()
    expect(after.data.updatedAt).not.toBe(before.data.updatedAt)

    const fetched = await app.request(`/api/v1/items/${before.data.id}`)
    expect(((await fetched.json()) as { data: { title: string } }).data.title).toBe('After')

    const reopened = await app.request(`/api/v1/items/${before.data.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    const reopenedData = (await reopened.json()) as {
      data: { status: string; doneAt: string | null }
    }
    expect(reopenedData.data.status).toBe('active')
    expect(reopenedData.data.doneAt).toBeNull()

    const emptyPatch = await app.request(`/api/v1/items/${before.data.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(emptyPatch.status).toBe(400)

    const missing = await app.request('/api/v1/items/nope', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    })
    expect(missing.status).toBe(404)
  })

  it('DELETE removes an item and 404s for missing items', async () => {
    const app = createApp(db)
    const created = await app.request('/api/v1/items', json({ title: 'Delete me', type: 'note' }))
    const { data } = (await created.json()) as { data: { id: string } }

    const del = await app.request(`/api/v1/items/${data.id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)

    const after = await app.request(`/api/v1/items/${data.id}`)
    expect(after.status).toBe(404)

    const delAgain = await app.request(`/api/v1/items/${data.id}`, { method: 'DELETE' })
    expect(delAgain.status).toBe(404)
  })

  it('migrations are tracked and safe to run repeatedly', () => {
    expect(() => migrate(db)).not.toThrow()
    const count = db.prepare('SELECT COUNT(*) AS c FROM schema_migrations').get() as { c: number }
    expect(Number(count.c)).toBe(7)
  })

  it('seed data round-trips through the repository into SQLite', () => {
    const item = {
      id: 'seed-1',
      type: 'task' as const,
      status: 'inbox' as const,
      title: 'Seeded task',
      body: null,
      url: null,
      dueAt: null,
      reminderAt: null,
      priority: 'high' as const,
      tags: ['work'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      doneAt: null,
    }
    repo.insertItem(db, item)
    const fetched = repo.getItem(db, 'seed-1')
    expect(fetched?.title).toBe('Seeded task')
    expect(fetched?.tags).toEqual(['work'])
    expect(repo.countItems(db)).toBe(1)
  })
})
