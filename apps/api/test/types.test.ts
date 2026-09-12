import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Db } from '../src/db.js'

const json = (method: 'POST' | 'PATCH', body: unknown) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

async function post(app: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  const res = await app.request('/api/v1/items', json('POST', body))
  expect(res.status).toBe(201)
  return (
    (await res.json()) as { data: { id: string; title: string; type: string; updatedAt: string } }
  ).data
}

describe('content types (notes, ideas, learning, links)', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  it('creates, updates, deletes and persists a note', async () => {
    const app = createApp(db)
    const note = await post(app, {
      type: 'note',
      title: 'RAG architecture notes',
      body: 'Chunking, retrieval, reranking.',
      tags: ['rag', 'ai'],
    })

    const row = db.prepare('SELECT type, body, tags FROM items WHERE id = ?').get(note.id) as
      { type: string; body: string; tags: string } | undefined
    expect(row?.type).toBe('note')
    expect(row?.body).toBe('Chunking, retrieval, reranking.')
    expect(row?.tags).toContain('rag')

    const patched = await app.request(
      `/api/v1/items/${note.id}`,
      json('PATCH', { title: 'RAG notes v2', tags: ['rag'] }),
    )
    expect(patched.status).toBe(200)
    const patchedData = (await patched.json()) as { data: { title: string; tags: string[] } }
    expect(patchedData.data.title).toBe('RAG notes v2')
    expect(patchedData.data.tags).toEqual(['rag'])

    const deleted = await app.request(`/api/v1/items/${note.id}`, { method: 'DELETE' })
    expect(deleted.status).toBe(204)
    expect(db.prepare('SELECT COUNT(*) AS c FROM items WHERE id = ?').get(note.id)).toMatchObject({
      c: 0,
    })
  })

  it('creates, updates and deletes an idea', async () => {
    const app = createApp(db)
    const idea = await post(app, {
      type: 'idea',
      title: 'Build an AI meeting assistant',
      body: 'Transcript to follow-ups.',
    })
    expect(idea.type).toBe('idea')

    const patched = await app.request(
      `/api/v1/items/${idea.id}`,
      json('PATCH', { body: 'Transcript to tasks with owners.' }),
    )
    expect(patched.status).toBe(200)

    expect((await app.request(`/api/v1/items/${idea.id}`, { method: 'DELETE' })).status).toBe(204)
  })

  it('creates, updates, marks done and archives a learning item', async () => {
    const app = createApp(db)
    const item = await post(app, {
      type: 'learning',
      title: 'Docker networking',
      priority: 'high',
      url: 'https://docs.docker.com/network/',
    })

    const markedActive = await app.request(
      `/api/v1/items/${item.id}`,
      json('PATCH', { status: 'active' }),
    )
    expect(markedActive.status).toBe(200)

    const done = await app.request(`/api/v1/items/${item.id}`, json('PATCH', { status: 'done' }))
    const doneData = (await done.json()) as { data: { status: string; doneAt: string | null } }
    expect(doneData.data.status).toBe('done')
    expect(doneData.data.doneAt).toBeTruthy()

    const archived = await app.request(
      `/api/v1/items/${item.id}`,
      json('PATCH', { status: 'archived' }),
    )
    expect(archived.status).toBe(200)
  })

  it('creates, updates and deletes a link with a valid URL', async () => {
    const app = createApp(db)
    const link = await post(app, {
      type: 'link',
      title: 'Practical RAG guide',
      url: 'https://example.com/rag-guide',
      tags: ['rag'],
    })
    expect(link.type).toBe('link')

    const patched = await app.request(
      `/api/v1/items/${link.id}`,
      json('PATCH', { url: 'https://example.com/rag-guide-v2' }),
    )
    expect(patched.status).toBe(200)

    expect((await app.request(`/api/v1/items/${link.id}`, { method: 'DELETE' })).status).toBe(204)
  })

  it('rejects links without a URL and invalid URLs', async () => {
    const app = createApp(db)
    const noUrl = await app.request(
      '/api/v1/items',
      json('POST', { type: 'link', title: 'Broken' }),
    )
    expect(noUrl.status).toBe(400)
    expect(((await noUrl.json()) as { error: { message: string } }).error.message).toMatch(
      /url is required/,
    )

    const badUrl = await app.request(
      '/api/v1/items',
      json('POST', { type: 'link', title: 'Broken', url: 'not-a-url' }),
    )
    expect(badUrl.status).toBe(400)

    const badScheme = await app.request(
      '/api/v1/items',
      json('POST', { type: 'link', title: 'Broken', url: 'ftp://example.com/x' }),
    )
    expect(badScheme.status).toBe(400)

    const good = await app.request(
      '/api/v1/items',
      json('POST', { type: 'link', title: 'Ok', url: 'https://example.com' }),
    )
    expect(good.status).toBe(201)
  })

  it('rejects invalid type, status and priority', async () => {
    const app = createApp(db)
    expect(
      (await app.request('/api/v1/items', json('POST', { type: 'bogus', title: 'x' }))).status,
    ).toBe(400)
    expect(
      (
        await app.request(
          '/api/v1/items',
          json('POST', { type: 'note', title: 'x', status: 'bogus' }),
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await app.request(
          '/api/v1/items',
          json('POST', { type: 'note', title: 'x', priority: 'bogus' }),
        )
      ).status,
    ).toBe(400)
  })

  it('allows optional fields on any type (does not over-reject)', async () => {
    const app = createApp(db)
    const noteWithPriority = await app.request(
      '/api/v1/items',
      json('POST', { type: 'note', title: 'x', priority: 'high', dueAt: null }),
    )
    expect(noteWithPriority.status).toBe(201)
    const ideaWithUrl = await app.request(
      '/api/v1/items',
      json('POST', { type: 'idea', title: 'y', url: 'https://example.com' }),
    )
    expect(ideaWithUrl.status).toBe(201)
  })

  it('converts types in place: same id, content preserved, updatedAt changes', async () => {
    const app = createApp(db)
    const note = await post(app, {
      type: 'note',
      title: 'Convert me',
      body: 'original body',
      tags: ['a'],
    })
    const before = note.updatedAt

    await new Promise((r) => setTimeout(r, 10))

    const converted = await app.request(`/api/v1/items/${note.id}`, json('PATCH', { type: 'idea' }))
    expect(converted.status).toBe(200)
    const data = (await converted.json()) as {
      data: {
        id: string
        type: string
        title: string
        body: string
        tags: string[]
        updatedAt: string
      }
    }
    expect(data.data.id).toBe(note.id)
    expect(data.data.type).toBe('idea')
    expect(data.data.title).toBe('Convert me')
    expect(data.data.body).toBe('original body')
    expect(data.data.tags).toEqual(['a'])
    expect(data.data.updatedAt).not.toBe(before)

    const notesAfter = await app.request('/api/v1/items?type=note')
    expect(((await notesAfter.json()) as { data: unknown[] }).data).toHaveLength(0)

    const noDuplicates = await app.request('/api/v1/items?type=idea')
    expect(((await noDuplicates.json()) as { data: unknown[] }).data).toHaveLength(1)
  })

  it('requires a URL when converting an item to a link', async () => {
    const app = createApp(db)
    const note = await post(app, { type: 'note', title: 'Inbox note' })

    const toLink = await app.request(`/api/v1/items/${note.id}`, json('PATCH', { type: 'link' }))
    expect(toLink.status).toBe(400)

    const toLinkWithUrl = await app.request(
      `/api/v1/items/${note.id}`,
      json('PATCH', { type: 'link', url: 'https://example.com/x' }),
    )
    expect(toLinkWithUrl.status).toBe(200)
    const data = (await toLinkWithUrl.json()) as {
      data: { type: string; url: string; title: string }
    }
    expect(data.data.type).toBe('link')
    expect(data.data.url).toBe('https://example.com/x')
    expect(data.data.title).toBe('Inbox note')
  })

  it('indexes the new content types in FTS5 including tags and URLs', async () => {
    const app = createApp(db)
    await post(app, { type: 'note', title: 'Notes on RAG', tags: ['rag', 'ai'] })
    await post(app, { type: 'idea', title: 'AI coding assistant idea' })
    await post(app, { type: 'learning', title: 'Docker networking' })
    await post(app, {
      type: 'link',
      title: 'Practical guide',
      url: 'https://example.com/rag-guide',
    })

    const byTag = await app.request('/api/v1/items?q=rag')
    const tagTitles = ((await byTag.json()) as { data: { title: string }[] }).data.map(
      (i) => i.title,
    )
    expect(tagTitles).toContain('Notes on RAG')

    const byUrl = await app.request('/api/v1/items?q=rag-guide')
    expect(
      ((await byUrl.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('Practical guide')

    const byBody = await app.request('/api/v1/items?q=embeddings')
    expect(byBody.status).toBe(200)
  })
})
