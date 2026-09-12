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

async function postItem(app: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  const res = await app.request('/api/v1/items', json(body))
  return ((await res.json()) as { data: { id: string; title: string } }).data
}

describe('FTS5 search', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  it('indexes items that existed before the FTS migration (backfill)', () => {
    const pre = openDb(':memory:')
    migrate(pre, { upTo: '004_create_notifications.sql' })
    const now = new Date().toISOString()
    pre
      .prepare(
        `INSERT INTO items (id, type, status, title, body, url, due_at, reminder_at, reminded_at,
          priority, tags, created_at, updated_at, done_at)
         VALUES (?, 'task', 'inbox', 'Learn Docker networking', NULL, NULL, NULL, NULL, NULL,
          NULL, NULL, ?, ?, NULL)`,
      )
      .run('pre-docker', now, now)
    pre
      .prepare(
        `INSERT INTO items (id, type, status, title, body, url, due_at, reminder_at, reminded_at,
          priority, tags, created_at, updated_at, done_at)
         VALUES (?, 'link', 'inbox', 'RAG article', NULL, 'https://example.com/rag',
          NULL, NULL, NULL, NULL, '["rag"]', ?, ?, NULL)`,
      )
      .run('pre-rag', now, now)

    migrate(pre)
    const docker = repo.searchItems(pre, { query: '"docker"' })
    const rag = repo.searchItems(pre, { query: '"rag"' })
    expect(docker.map((i) => i.title)).toContain('Learn Docker networking')
    expect(rag.map((i) => i.title)).toContain('RAG article')
  })

  it('searches title, body, url and tags after creation', async () => {
    const app = createApp(db)
    await postItem(app, { title: 'Learn Docker networking', type: 'learning' })
    await postItem(app, { title: 'Some note', type: 'note', body: 'Notes about RAG retrieval' })
    await postItem(app, { title: 'Link item', type: 'link', url: 'https://example.com/kubernetes' })
    await postItem(app, { title: 'Tagged thing', type: 'note', tags: ['embeddings'] })

    const docker = await app.request('/api/v1/items?q=docker')
    expect(
      ((await docker.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('Learn Docker networking')

    const rag = await app.request('/api/v1/items?q=RAG')
    expect(
      ((await rag.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('Some note')

    const kube = await app.request('/api/v1/items?q=kubernetes')
    expect(
      ((await kube.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('Link item')

    const embed = await app.request('/api/v1/items?q=embeddings')
    expect(
      ((await embed.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('Tagged thing')
  })

  it('matches multiple terms with AND', async () => {
    const app = createApp(db)
    await postItem(app, { title: 'Learn Docker networking', type: 'learning' })
    await postItem(app, { title: 'Docker basics', type: 'learning' })

    const res = await app.request('/api/v1/items?q=docker%20networking')
    expect(res.status).toBe(200)
    const titles = ((await res.json()) as { data: { title: string }[] }).data.map((i) => i.title)
    expect(titles).toContain('Learn Docker networking')
    expect(titles).not.toContain('Docker basics')
  })

  it('ranks a title match above a body-only match', async () => {
    const app = createApp(db)
    await postItem(app, {
      title: 'Notes about things',
      type: 'note',
      body: 'Docker networking deep dive here',
    })
    await postItem(app, { title: 'Learn Docker networking', type: 'learning' })

    const res = await app.request('/api/v1/items?q=docker')
    const data = ((await res.json()) as { data: { title: string }[] }).data
    expect(data[0]?.title).toBe('Learn Docker networking')
  })

  it('combines search with type and status filters', async () => {
    const app = createApp(db)
    await postItem(app, { title: 'Learn Docker networking', type: 'learning', status: 'active' })
    await postItem(app, { title: 'Docker deploy checklist', type: 'task', status: 'inbox' })
    await postItem(app, { title: 'Docker done', type: 'task', status: 'done' })

    const byType = await app.request('/api/v1/items?q=docker&type=learning')
    const typeTitles = ((await byType.json()) as { data: { title: string }[] }).data.map(
      (i) => i.title,
    )
    expect(typeTitles).toEqual(['Learn Docker networking'])

    const byStatus = await app.request('/api/v1/items?q=docker&status=active')
    const statusTitles = ((await byStatus.json()) as { data: { title: string }[] }).data.map(
      (i) => i.title,
    )
    expect(statusTitles).toEqual(['Learn Docker networking'])

    const both = await app.request('/api/v1/items?q=docker&type=task&status=done')
    const bothTitles = ((await both.json()) as { data: { title: string }[] }).data.map(
      (i) => i.title,
    )
    expect(bothTitles).toEqual(['Docker done'])
  })

  it('keeps updates and deletes in sync with the index', async () => {
    const app = createApp(db)
    const { id } = await postItem(app, { title: 'Old title about X', type: 'note' })

    const before = await app.request('/api/v1/items?q=title')
    expect(((await before.json()) as { data: unknown[] }).data).toHaveLength(1)

    const patchRes = await app.request(`/api/v1/items/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'New content about Y',
        body: null,
        url: null,
        tags: ['zebra'],
      }),
    })
    expect(patchRes.status).toBe(200)
    const after = await app.request('/api/v1/items?q=content')
    expect(
      ((await after.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('New content about Y')
    const gone = await app.request('/api/v1/items?q=title')
    expect(((await gone.json()) as { data: unknown[] }).data).toHaveLength(0)

    await app.request(`/api/v1/items/${id}`, { method: 'DELETE' })
    const deleted = await app.request('/api/v1/items?q=content')
    expect(((await deleted.json()) as { data: unknown[] }).data).toHaveLength(0)
  })

  it('applies limit and offset to search results', async () => {
    const app = createApp(db)
    for (let i = 0; i < 5; i++) {
      await postItem(app, { title: `Searchable note ${i}`, type: 'note' })
    }
    const all = await app.request('/api/v1/items?q=searchable')
    expect(((await all.json()) as { data: unknown[] }).data).toHaveLength(5)

    const page = await app.request('/api/v1/items?q=searchable&limit=2&offset=2')
    expect(((await page.json()) as { data: unknown[] }).data).toHaveLength(2)
  })

  it('rejects invalid pagination and filter values', async () => {
    const app = createApp(db)
    expect((await app.request('/api/v1/items?limit=abc')).status).toBe(400)
    expect((await app.request('/api/v1/items?q=x&limit=0')).status).toBe(400)
    expect((await app.request('/api/v1/items?q=x&offset=-1')).status).toBe(400)
    expect((await app.request('/api/v1/items?q=x&type=bogus')).status).toBe(400)
  })

  it('handles unusual search text without errors', async () => {
    const app = createApp(db)
    await postItem(app, { title: 'Learn Docker networking', type: 'learning' })
    await postItem(app, { title: 'RAG embeddings article', type: 'note' })
    await postItem(app, { title: 'M22 requirement review', type: 'task' })

    for (const q of [
      '',
      '   ',
      'docker networking',
      '"something"',
      "Rahul's API issue",
      'C++',
      'RAG',
      'M22',
      '-',
      ':',
      '*',
      'note AND title',
    ]) {
      const res = await app.request(`/api/v1/items?q=${encodeURIComponent(q)}`)
      expect(res.status).toBe(200)
    }

    const rag = await app.request('/api/v1/items?q=RAG')
    expect(
      ((await rag.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('RAG embeddings article')
    const m22 = await app.request('/api/v1/items?q=M22')
    expect(
      ((await m22.json()) as { data: { title: string }[] }).data.map((i) => i.title),
    ).toContain('M22 requirement review')
  })

  it('returns the full list when q is omitted', async () => {
    const app = createApp(db)
    await postItem(app, { title: 'One', type: 'note' })
    await postItem(app, { title: 'Two', type: 'note' })
    const res = await app.request('/api/v1/items')
    expect(res.status).toBe(200)
    expect(((await res.json()) as { data: unknown[] }).data).toHaveLength(2)
  })
})
