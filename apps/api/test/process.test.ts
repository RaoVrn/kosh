import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import { createProcessingService } from '../src/ai/process/service.js'
import type { Item, InboxProcessingResult } from '@kosh/shared'

function fakeAiProvider(handler: (input: { text: string; systemPrompt: string }) => string) {
  return {
    interpretCapture: async (input: { text: string; systemPrompt: string }) => handler(input),
  }
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

async function postItem(app: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  const res = await app.request('/api/v1/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(201)
  return (await json(res)).data as Item
}

function appWith(handler: (input: { text: string; systemPrompt: string }) => string) {
  const db = openDb(':memory:')
  migrate(db)
  return {
    db,
    app: createApp(db, { process: createProcessingService(fakeAiProvider(handler)) }),
  }
}

const RESULT: InboxProcessingResult = {
  summary: 'Two actions.',
  suggestions: [
    {
      title: 'Call Rahul about API review',
      body: null,
      type: 'task',
      priority: 'medium',
      projectName: null,
      projectId: null,
      dueAt: '2026-09-15T09:00:00.000Z',
      reminderAt: null,
      tags: ['api'],
      recurrence: null,
      sourceText: 'Call Rahul tomorrow about the API review.',
      confidence: 'high',
      category: 'follow-up',
    },
    {
      title: 'Update architecture notes',
      body: null,
      type: 'note',
      priority: null,
      projectName: null,
      projectId: null,
      dueAt: null,
      reminderAt: null,
      tags: ['architecture'],
      recurrence: null,
      sourceText: 'Call Rahul tomorrow about the API review.',
      confidence: 'high',
      category: 'action',
    },
  ],
}

describe('POST /api/v1/items/:id/process', () => {
  it('returns structured suggestions without modifying the source item', async () => {
    const { app } = appWith(() => JSON.stringify(RESULT))
    const item = await postItem(app, {
      type: 'note',
      title: 'Call Rahul tomorrow about the API review.',
    })

    const res = await app.request(`/api/v1/items/${item.id}/process`, { method: 'POST' })
    expect(res.status).toBe(200)
    const { data } = (await json(res)) as { data: InboxProcessingResult }
    expect(data.suggestions).toHaveLength(2)
    expect(data.suggestions[0]!.title).toBe('Call Rahul about API review')
    expect(data.suggestions[0]!.dueAt).toBe('2026-09-15T09:00:00.000Z')

    const after = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(after.status).toBe('inbox')
    expect(after.title).toBe('Call Rahul tomorrow about the API review.')
  })

  it('returns 404 for a missing item', async () => {
    const { app } = appWith(() => JSON.stringify(RESULT))
    const res = await app.request('/api/v1/items/nope/process', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('rejects done/archived items', async () => {
    const { app } = appWith(() => JSON.stringify(RESULT))
    const item = await postItem(app, { type: 'note', title: 'x' })
    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    const res = await app.request(`/api/v1/items/${item.id}/process`, { method: 'POST' })
    expect(res.status).toBe(400)
  })

  it('keeps the source untouched on AI failure', async () => {
    const { AiProviderError } = await import('../src/ai/types.js')
    const { app } = appWith(() => {
      throw new AiProviderError('provider exploded')
    })
    const item = await postItem(app, { type: 'note', title: 'fragile capture', body: 'body text' })

    const res = await app.request(`/api/v1/items/${item.id}/process`, { method: 'POST' })
    expect(res.status).toBe(502)

    const after = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(after.status).toBe('inbox')
    expect(after.title).toBe('fragile capture')
    expect(after.body).toBe('body text')
  })

  it('handles malformed AI output safely', async () => {
    const { app } = appWith(() => 'not json at all')
    const item = await postItem(app, { type: 'note', title: 'capture' })
    const res = await app.request(`/api/v1/items/${item.id}/process`, { method: 'POST' })
    expect(res.status).toBe(502)
    const after = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(after.status).toBe('inbox')
  })

  it('validates AI output: invalid types fall back to note, six suggestions truncated to five', async () => {
    const { app } = appWith(() =>
      JSON.stringify({
        summary: null,
        suggestions: [0, 1, 2, 3, 4, 5].map((n) => ({
          title: `suggestion ${n}`,
          type: 'bogus',
          priority: 'urgent',
          dueAt: 'not-a-date',
          tags: ['a', 'a', 'b'],
        })),
      }),
    )
    const item = await postItem(app, { type: 'note', title: 'capture' })
    const res = await app.request(`/api/v1/items/${item.id}/process`, { method: 'POST' })
    expect(res.status).toBe(200)
    const { data } = (await json(res)) as { data: InboxProcessingResult }
    expect(data.suggestions).toHaveLength(5)
    for (const s of data.suggestions) {
      expect(s.type).toBe('note')
      expect(s.priority).toBeNull()
      expect(s.dueAt).toBeNull()
      expect(s.tags).toEqual(['a', 'b'])
    }
  })

  it('resolves project names to active projects only', async () => {
    const { app } = appWith(() =>
      JSON.stringify({
        summary: null,
        suggestions: [
          { ...RESULT.suggestions[0], projectName: 'Kosh' },
          {
            ...RESULT.suggestions[1],
            title: 'Archived project note',
            projectName: 'Archived Proj',
          },
          { ...RESULT.suggestions[1], title: 'Unknown project note', projectName: 'Unknown Proj' },
        ],
      }),
    )
    const kosh = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Kosh' }),
    })
    const koshId = ((await kosh.json()) as { data: { id: string } }).data.id
    const archived = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Archived Proj' }),
    })
    const archivedId = ((await archived.json()) as { data: { id: string } }).data.id
    await app.request(`/api/v1/projects/${archivedId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    })

    const item = await postItem(app, { type: 'note', title: 'capture' })
    const res = await app.request(`/api/v1/items/${item.id}/process`, { method: 'POST' })
    const { data } = (await json(res)) as { data: InboxProcessingResult }
    expect(data.suggestions[0]!.projectId).toBe(koshId)
    expect(data.suggestions[1]!.projectId).toBeNull()
    expect(data.suggestions[2]!.projectId).toBeNull()
  })

  it('is not configured without a service', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'capture' })
    const res = await app.request(`/api/v1/items/${item.id}/process`, { method: 'POST' })
    expect(res.status).toBe(503)
  })
})

describe('POST /api/v1/items/:id/process/accept', () => {
  it('creates accepted suggestions atomically with correct fields', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'messy capture' })

    const res = await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [
          {
            title: 'Call Rahul',
            type: 'task',
            priority: 'high',
            dueAt: '2026-09-15T09:00:00.000Z',
            reminderAt: '2026-09-15T08:00:00.000Z',
            tags: ['api'],
            recurrence: { frequency: 'daily' },
            projectId: null,
          },
          { title: 'Update architecture notes', type: 'note', tags: ['architecture'] },
        ],
        markSourceProcessed: true,
      }),
    })
    expect(res.status).toBe(200)
    const { data } = (await json(res)) as {
      data: { created: Item[]; source: Item; skippedDuplicates: string[] }
    }
    expect(data.created).toHaveLength(2)
    expect(data.created[0]!.title).toBe('Call Rahul')
    expect(data.created[0]!.status).toBe('active')
    expect(data.created[0]!.priority).toBe('high')
    expect(data.created[0]!.dueAt).toBe('2026-09-15T09:00:00.000Z')
    expect(data.created[0]!.reminderAt).toBe('2026-09-15T08:00:00.000Z')
    expect(data.created[0]!.tags).toEqual(['api'])
    expect(data.created[0]!.recurrence).toEqual({ frequency: 'daily' })
    expect(data.source.status).toBe('archived')
    expect(data.skippedDuplicates).toEqual([])
  })

  it('full acceptance archives the source; original capture remains in DB', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'original capture text' })

    await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [{ title: 'Created item', type: 'note' }],
        markSourceProcessed: true,
      }),
    })

    const after = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(after.status).toBe('archived')
    expect(after.title).toBe('original capture text')
  })

  it('partial acceptance keeps the source in inbox', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'partial capture' })

    await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [{ title: 'One item', type: 'task' }],
        markSourceProcessed: false,
      }),
    })

    const after = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(after.status).toBe('inbox')

    const list = (await json(await app.request('/api/v1/items'))).data as Item[]
    expect(list.filter((i) => i.title === 'One item')).toHaveLength(1)
  })

  it('rejected suggestions are never persisted', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'capture' })

    await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [{ title: 'Kept one', type: 'note' }],
        markSourceProcessed: false,
      }),
    })

    const list = (await json(await app.request('/api/v1/items'))).data as Item[]
    expect(list.filter((i) => i.title === 'Kept one')).toHaveLength(1)
    expect(list.filter((i) => i.title === 'Discarded one')).toHaveLength(0)
  })

  it('skips duplicates deterministically and reports them', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'capture' })
    await postItem(app, { type: 'note', title: 'Same Title' })

    const res = await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [{ title: 'same title', type: 'note' }],
        markSourceProcessed: true,
        skipDuplicateTitles: ['same title'],
      }),
    })
    const { data } = (await json(res)) as {
      data: { created: Item[]; skippedDuplicates: string[] }
    }
    expect(data.created).toHaveLength(0)
    expect(data.skippedDuplicates).toEqual(['same title'])

    const withoutSkip = await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [{ title: 'same title', type: 'note' }],
        markSourceProcessed: true,
      }),
    })
    const data2 = (await json(withoutSkip)) as { data: { created: Item[] } }
    expect(data2.data.created).toHaveLength(1)
  })

  it('validates suggestion fields like item creation', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'capture' })

    const badReminder = await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [
          {
            title: 'x',
            type: 'task',
            dueAt: '2026-09-15T09:00:00.000Z',
            reminderAt: '2026-09-16T09:00:00.000Z',
          },
        ],
      }),
    })
    expect(badReminder.status).toBe(400)

    const badProject = await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [{ title: 'x', type: 'note', projectId: 'nope' }],
      }),
    })
    expect(badProject.status).toBe(400)

    const badRecurrence = await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [{ title: 'x', type: 'note', recurrence: { frequency: 'daily' } }],
      }),
    })
    expect(badRecurrence.status).toBe(400)
  })

  it('rolls back the whole batch on failure', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'capture' })

    const res = await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        suggestions: [
          { title: 'Good one', type: 'note' },
          { title: 'Bad one', type: 'note', projectId: 'does-not-exist' },
        ],
      }),
    })
    expect(res.status).toBe(400)

    const list = (await json(await app.request('/api/v1/items'))).data as Item[]
    expect(list.filter((i) => i.title === 'Good one')).toHaveLength(0)
  })

  it('persists created items across a fresh connection', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const item = await postItem(app, { type: 'note', title: 'capture' })
    await app.request(`/api/v1/items/${item.id}/process/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ suggestions: [{ title: 'Persisted', type: 'task' }] }),
    })

    const second = createApp(db)
    const list = (await json(await second.request('/api/v1/items'))).data as Item[]
    expect(list.filter((i) => i.title === 'Persisted')).toHaveLength(1)
  })
})
