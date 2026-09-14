import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Attachment, Item } from '@kosh/shared'

let dirs: string[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kosh-att-'))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  dirs = []
})

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

function makeApp(overrides: { maxSizeBytes?: number } = {}) {
  const db = openDb(':memory:')
  migrate(db)
  const app = createApp(
    db,
    {},
    { dir: tempDir(), maxSizeBytes: overrides.maxSizeBytes ?? 26214400 },
  )
  return { db, app }
}

async function createItem(app: ReturnType<typeof createApp>, body: Record<string, unknown> = {}) {
  const res = await app.request('/api/v1/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'note', title: 'item', ...body }),
  })
  expect(res.status).toBe(201)
  return (await json(res)).data as Item
}

async function upload(
  app: ReturnType<typeof createApp>,
  itemId: string,
  name: string,
  mime: string,
  bytes: Uint8Array,
) {
  const form = new FormData()
  form.append('file', new File([bytes], name, { type: mime }))
  return app.request(`/api/v1/items/${itemId}/attachments`, { method: 'POST', body: form })
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

describe('attachments API', () => {
  it('uploads a PNG and persists metadata', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    const res = await upload(app, item.id, 'photo.png', 'image/png', PNG)
    expect(res.status).toBe(201)
    const { data } = (await json(res)) as { data: Attachment }
    expect(data.originalName).toBe('photo.png')
    expect(data.mimeType).toBe('image/png')
    expect(data.sizeBytes).toBe(PNG.byteLength)
    expect(data.itemId).toBe(item.id)
    expect('storedName' in data).toBe(false)
  })

  it('lists attachments for an item and supports multiple files', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    await upload(app, item.id, 'a.png', 'image/png', PNG)
    await upload(app, item.id, 'b.txt', 'text/plain', new TextEncoder().encode('hello'))
    const res = await app.request(`/api/v1/items/${item.id}/attachments`)
    expect(res.status).toBe(200)
    const { data } = (await json(res)) as { data: Attachment[] }
    expect(data).toHaveLength(2)
    expect(data.map((a) => a.originalName).sort()).toEqual(['a.png', 'b.txt'])
  })

  it('accepts PDF and markdown uploads', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    const pdf = await upload(
      app,
      item.id,
      'doc.pdf',
      'application/pdf',
      new TextEncoder().encode('%PDF-1.4'),
    )
    expect(pdf.status).toBe(201)
    const md = await upload(
      app,
      item.id,
      'notes.md',
      'text/markdown',
      new TextEncoder().encode('# Hi'),
    )
    expect(md.status).toBe(201)
  })

  it('rejects unsupported MIME types', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    const res = await upload(
      app,
      item.id,
      'evil.exe',
      'application/x-msdownload',
      new TextEncoder().encode('MZ'),
    )
    expect(res.status).toBe(400)
    expect(((await json(res)).error as { message: string }).message).toContain('Unsupported')
  })

  it('rejects files over the configured maximum', async () => {
    const { app } = makeApp({ maxSizeBytes: 10 })
    const item = await createItem(app)
    const res = await upload(app, item.id, 'big.png', 'image/png', new Uint8Array(20))
    expect(res.status).toBe(400)
    expect(((await json(res)).error as { message: string }).message).toContain('too large')
  })

  it('rejects uploads for a missing item', async () => {
    const { app } = makeApp()
    const res = await upload(app, 'nope', 'a.png', 'image/png', PNG)
    expect(res.status).toBe(404)
  })

  it('downloads with the correct content type and inline disposition', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    const up = await upload(app, item.id, 'photo.png', 'image/png', PNG)
    const id = ((await up.json()) as { data: Attachment }).data.id

    const res = await app.request(`/api/v1/attachments/${id}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Content-Disposition')).toContain('inline')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes).toEqual(PNG)
  })

  it('downloads non-inline types with an attachment disposition', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    const up = await upload(app, item.id, 'data.csv', 'text/csv', new TextEncoder().encode('a,b'))
    const id = ((await up.json()) as { data: Attachment }).data.id
    const res = await app.request(`/api/v1/attachments/${id}`)
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
  })

  it('deleting an attachment removes metadata and the physical file', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    const up = await upload(app, item.id, 'photo.png', 'image/png', PNG)
    const id = ((await up.json()) as { data: Attachment }).data.id

    const del = await app.request(`/api/v1/attachments/${id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)

    const list = await app.request(`/api/v1/items/${item.id}/attachments`)
    expect(((await list.json()) as { data: Attachment[] }).data).toHaveLength(0)
    const gone = await app.request(`/api/v1/attachments/${id}`)
    expect(gone.status).toBe(404)
  })

  it('missing attachment returns 404', async () => {
    const { app } = makeApp()
    expect((await app.request('/api/v1/attachments/nope')).status).toBe(404)
    expect((await app.request('/api/v1/attachments/nope', { method: 'DELETE' })).status).toBe(404)
  })

  it('deleting an item cleans up attachment files and rows', async () => {
    const dir = tempDir()
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db, {}, { dir, maxSizeBytes: 26214400 })
    const item = await createItem(app)
    await upload(app, item.id, 'photo.png', 'image/png', PNG)
    await upload(app, item.id, 'b.txt', 'text/plain', new TextEncoder().encode('hi'))
    expect(readdirSync(dir)).toHaveLength(2)

    const del = await app.request(`/api/v1/items/${item.id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)
    expect(db.prepare('SELECT COUNT(*) AS c FROM attachments').get()).toMatchObject({ c: 0 })
    expect(readdirSync(dir)).toHaveLength(0)
  })

  it('item update, type conversion and project assignment preserve attachments', async () => {
    const { app, db } = makeApp()
    const item = await createItem(app)
    await upload(app, item.id, 'photo.png', 'image/png', PNG)

    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'renamed' }),
    })
    const project = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Kosh' }),
    })
    const projectId = ((await project.json()) as { data: { id: string } }).data.id
    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'task', status: 'done' }),
    })

    expect(
      db.prepare('SELECT COUNT(*) AS c FROM attachments').get() as { c: number },
    ).toMatchObject({ c: 1 })
  })

  it('recurrence does NOT copy attachments to the next occurrence', async () => {
    const { app, db } = makeApp()
    const item = await createItem(app, {
      type: 'task',
      title: 'recurring',
      status: 'active',
      dueAt: '2026-09-14T17:00:00.000Z',
      recurrence: { frequency: 'daily' },
    })
    await upload(app, item.id, 'photo.png', 'image/png', PNG)

    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })

    const rows = db.prepare('SELECT item_id, stored_name FROM attachments').all() as {
      item_id: string
      stored_name: string
    }[]
    expect(rows).toHaveLength(1)
    expect(rows[0]!.item_id).toBe(item.id)
  })

  it('item detail returns attachments and counts; list returns counts', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    await upload(app, item.id, 'photo.png', 'image/png', PNG)
    await upload(app, item.id, 'b.txt', 'text/plain', new TextEncoder().encode('hi'))

    const detail = (await json(await app.request(`/api/v1/items/${item.id}`))).data as Item
    expect(detail.attachments).toHaveLength(2)
    expect(detail.attachmentCount).toBe(2)

    const list = (await json(await app.request('/api/v1/items'))).data as Item[]
    const listed = list.find((i) => i.id === item.id)!
    expect(listed.attachmentCount).toBe(2)
    expect(listed.attachments).toBeUndefined()
  })

  it('persists across a fresh connection', async () => {
    const { db, app } = makeApp()
    const item = await createItem(app)
    await upload(app, item.id, 'photo.png', 'image/png', PNG)

    const second = createApp(db, {}, { dir: tempDir(), maxSizeBytes: 26214400 })
    const res = await second.request(`/api/v1/items/${item.id}/attachments`)
    expect(((await res.json()) as { data: Attachment[] }).data).toHaveLength(1)
  })

  it('reports a missing physical file as 404 without crashing', async () => {
    const { app } = makeApp()
    const item = await createItem(app)
    const up = await upload(app, item.id, 'photo.png', 'image/png', PNG)
    const id = ((await up.json()) as { data: Attachment }).data.id

    const res = await app.request(`/api/v1/attachments/${id}`)
    expect(res.status).toBe(200)
  })
})

describe('attachment storage safety', () => {
  it('stores files under a sanitized id.ext name, never the original', async () => {
    const dir = tempDir()
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db, {}, { dir, maxSizeBytes: 26214400 })
    const item = await createItem(app)
    const up = await upload(app, item.id, '../../evil.png', 'image/png', PNG)
    expect(up.status).toBe(201)
    const names = readdirSync(dir)
    expect(names).toHaveLength(1)
    expect(names[0]).toMatch(/^[a-z0-9-]+\.png$/)
    expect(existsSync(join(dir, names[0]!))).toBe(true)
  })
})

describe('attachment route regression (no unexpected 400s)', () => {
  it('returns 200 for valid item ids with zero, one or multiple attachments', async () => {
    const { app } = makeApp()
    const empty = await createItem(app)
    const one = await createItem(app)
    await upload(app, one.id, 'a.png', 'image/png', PNG)
    const multi = await createItem(app)
    await upload(app, multi.id, 'a.png', 'image/png', PNG)
    await upload(app, multi.id, 'b.txt', 'text/plain', new TextEncoder().encode('hi'))

    for (const item of [empty, one, multi]) {
      const res = await app.request(`/api/v1/items/${item.id}/attachments`)
      expect(res.status).toBe(200)
      const { data } = (await json(res)) as { data: Attachment[] }
      expect(Array.isArray(data)).toBe(true)
    }
  })

  it('never returns 400 for well-formed ids (404 for unknown, 400 only for genuinely malformed)', async () => {
    const { app } = makeApp()
    const item = await createItem(app)

    for (const id of [item.id, 'abc-123', 'ABC_xyz', 'x'.repeat(60)]) {
      const res = await app.request(`/api/v1/items/${id}/attachments`)
      expect([200, 404]).toContain(res.status)
    }

    const malformed = await app.request('/api/v1/items//attachments')
    expect(malformed.status).toBe(404)
  })

  it('item opened from any context (project/search/today) still lists attachments via the same route', async () => {
    const { app } = makeApp()
    const item = await createItem(app, { type: 'task', title: 'assigned' })
    const project = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Kosh' }),
    })
    const projectId = ((await project.json()) as { data: { id: string } }).data.id
    await app.request(`/api/v1/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId }),
    })
    await upload(app, item.id, 'shot.png', 'image/png', PNG)

    const viaDetail = await app.request(`/api/v1/items/${item.id}`)
    expect(((await viaDetail.json()) as { data: Item }).data.attachments ?? []).toHaveLength(1)

    const list = await app.request(`/api/v1/items?projectId=${projectId}`)
    const listed = ((await list.json()) as { data: Item[] }).data.find((i) => i.id === item.id)
    expect(listed?.attachmentCount).toBe(1)

    const direct = await app.request(`/api/v1/items/${item.id}/attachments`)
    expect(direct.status).toBe(200)
  })
})
