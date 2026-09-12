import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Db } from '../src/db.js'
import { createCaptureService } from '../src/ai/capture/service.js'
import { createTranscriptionService } from '../src/ai/transcription/service.js'
import { AiProviderError } from '../src/ai/types.js'
import type { AiProvider, TranscriptionProvider } from '../src/ai/types.js'

function fakeAiProvider(
  handler: (input: { text: string; timezone?: string; currentTime?: string }) => string,
): AiProvider {
  return {
    interpretCapture: async ({ text, timezone, currentTime }) => {
      return handler({ text, timezone, currentTime })
    },
  }
}

function fakeTranscriptionProvider(
  handler: (input: { mime: string }) => string,
): TranscriptionProvider {
  return {
    transcribe: async ({ audio, mime, filename }) => {
      void audio
      void filename
      return handler({ mime })
    },
  }
}

function withCapture(
  handler: (input: { text: string; timezone?: string; currentTime?: string }) => string,
) {
  const db = openDb(':memory:')
  migrate(db)
  const app = createApp(db, { capture: createCaptureService(fakeAiProvider(handler)) })
  return { db, app }
}

describe('POST /api/v1/capture/interpret', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  it('resolves a suggested project name to an existing active project', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({
        type: 'task',
        title: 'Fix Kosh mobile navigation',
        url: null,
        priority: 'high',
        dueAt: null,
        reminderAt: null,
        tags: ['mobile'],
        projectName: 'Kosh',
        recurrence: null,
        confidence: 'high',
      }),
    )
    const kosh = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Kosh' }),
    })
    const koshId = ((await kosh.json()) as { data: { id: string } }).data.id

    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Fix the Kosh mobile navigation' }),
    })
    expect(res.status).toBe(200)
    const { data } = (await res.json()) as {
      data: { projectName: string | null; projectId: string | null }
    }
    expect(data.projectName).toBe('Kosh')
    expect(data.projectId).toBe(koshId)
  })

  it('never creates a project for an unknown suggested name', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({
        type: 'task',
        title: 'Fix nav',
        url: null,
        priority: null,
        dueAt: null,
        reminderAt: null,
        tags: null,
        projectName: 'Unknown Project',
        recurrence: null,
        confidence: 'high',
      }),
    )
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'fix nav for the unknown project' }),
    })
    const { data } = (await res.json()) as { data: { projectId: string | null } }
    expect(data.projectId).toBeNull()

    const list = (await app.request('/api/v1/projects')).status
    expect(list).toBe(200)
    const projects = ((await (await app.request('/api/v1/projects')).json()) as { data: unknown[] })
      .data
    expect(projects).toHaveLength(0)
  })

  it('does not resolve to an archived project', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({
        type: 'task',
        title: 'Fix nav',
        url: null,
        priority: null,
        dueAt: null,
        reminderAt: null,
        tags: null,
        projectName: 'Old',
        recurrence: null,
        confidence: 'high',
      }),
    )
    const created = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Old' }),
    })
    const id = ((await created.json()) as { data: { id: string } }).data.id
    await app.request(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    })

    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'fix nav' }),
    })
    const { data } = (await res.json()) as { data: { projectId: string | null } }
    expect(data.projectId).toBeNull()
  })

  it('understands recurrence suggestions from the AI (daily/weekly/monthly)', async () => {
    const cases = [
      {
        text: 'Study DSA every day',
        ai: {
          type: 'task',
          title: 'Study DSA',
          url: null,
          priority: 'medium',
          dueAt: '2026-09-14T19:00:00.000Z',
          reminderAt: null,
          tags: [],
          recurrence: { frequency: 'daily', weekdays: null, dayOfMonth: null },
          confidence: 'high',
        },
        expected: { frequency: 'daily' },
      },
      {
        text: 'Review the project every Monday',
        ai: {
          type: 'task',
          title: 'Review the project',
          url: null,
          priority: 'medium',
          dueAt: '2026-09-21T10:00:00.000Z',
          reminderAt: null,
          tags: [],
          recurrence: { frequency: 'weekly', weekdays: [1], dayOfMonth: null },
          confidence: 'high',
        },
        expected: { frequency: 'weekly', weekdays: [1] },
      },
      {
        text: 'Gym Monday Wednesday Friday',
        ai: {
          type: 'task',
          title: 'Gym',
          url: null,
          priority: 'medium',
          dueAt: '2026-09-14T09:00:00.000Z',
          reminderAt: null,
          tags: [],
          recurrence: { frequency: 'weekly', weekdays: [1, 3, 5], dayOfMonth: null },
          confidence: 'high',
        },
        expected: { frequency: 'weekly', weekdays: [1, 3, 5] },
      },
      {
        text: 'Pay rent on the first of every month',
        ai: {
          type: 'task',
          title: 'Pay rent',
          url: null,
          priority: 'high',
          dueAt: '2026-10-01T09:00:00.000Z',
          reminderAt: null,
          tags: ['rent'],
          recurrence: { frequency: 'monthly', weekdays: null, dayOfMonth: 1 },
          confidence: 'high',
        },
        expected: { frequency: 'monthly', dayOfMonth: 1 },
      },
    ]

    for (const c of cases) {
      const { app } = withCapture(() => JSON.stringify(c.ai))
      const res = await app.request('/api/v1/capture/interpret', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: c.text }),
      })
      expect(res.status).toBe(200)
      const { data } = (await res.json()) as { data: { recurrence: unknown } }
      expect(data.recurrence).toEqual(c.expected)
    }
  })

  it('drops malformed AI recurrence and AI recurrence on non-tasks', async () => {
    const cases = [
      {
        ai: {
          type: 'task',
          title: 'bad weekdays',
          url: null,
          priority: null,
          dueAt: '2026-09-14T09:00:00.000Z',
          reminderAt: null,
          tags: null,
          recurrence: { frequency: 'weekly', weekdays: [9, 9] },
          confidence: 'high',
        },
      },
      {
        ai: {
          type: 'task',
          title: 'no due date',
          url: null,
          priority: null,
          dueAt: null,
          reminderAt: null,
          tags: null,
          recurrence: { frequency: 'monthly', dayOfMonth: 5 },
          confidence: 'high',
        },
      },
      {
        ai: {
          type: 'note',
          title: 'note with recurrence',
          url: null,
          priority: null,
          dueAt: null,
          reminderAt: null,
          tags: null,
          recurrence: { frequency: 'daily' },
          confidence: 'high',
        },
      },
      {
        ai: {
          type: 'task',
          title: 'no recurrence',
          url: null,
          priority: null,
          dueAt: '2026-09-14T09:00:00.000Z',
          reminderAt: null,
          tags: null,
          recurrence: null,
          confidence: 'high',
        },
      },
    ]

    for (const c of cases) {
      const { app } = withCapture(() => JSON.stringify(c.ai))
      const res = await app.request('/api/v1/capture/interpret', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'something' }),
      })
      expect(res.status).toBe(200)
      const { data } = (await res.json()) as { data: { recurrence: unknown } }
      expect(data.recurrence).toBeNull()
    }
  })

  it('persists a confirmed capture with recurrence through the items API', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({
        type: 'task',
        title: 'Study DSA',
        url: null,
        priority: 'high',
        dueAt: '2026-09-14T19:00:00.000Z',
        reminderAt: null,
        tags: ['dsa'],
        recurrence: { frequency: 'daily', weekdays: null, dayOfMonth: null },
        confidence: 'high',
      }),
    )

    const interpret = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Study DSA every day' }),
    })
    const { data } = (await interpret.json()) as { data: Record<string, unknown> }

    const create = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: data.type,
        title: data.title,
        status: 'active',
        dueAt: data.dueAt,
        priority: data.priority,
        tags: data.tags,
        recurrence: data.recurrence,
      }),
    })
    expect(create.status).toBe(201)
    const item = ((await create.json()) as { data: unknown }).data as {
      recurrence: unknown
      recurrenceId: string | null
      dueAt: string
    }
    expect(item.recurrence).toEqual({ frequency: 'daily' })
    expect(item.recurrenceId).toBeTruthy()
    expect(item.dueAt).toBe('2026-09-14T19:00:00.000Z')
  })

  it('interprets a task with due and reminder and does not create an item', async () => {
    const seen: string[] = []
    const { app } = withCapture((input) => {
      seen.push(input.text, input.timezone ?? '', input.currentTime ?? '')
      return JSON.stringify({
        type: 'task',
        title: 'Check API issue',
        body: 'Rahul asked me to check the API issue.',
        url: null,
        priority: 'medium',
        dueAt: '2026-09-15T18:00:00.000Z',
        reminderAt: '2026-09-15T10:00:00.000Z',
        tags: ['API'],
        confidence: 'high',
      })
    })

    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'Rahul asked me to check the API issue tomorrow and remind me at 10.',
        timezone: 'Asia/Kolkata',
        currentTime: '2026-09-14T09:00:00.000Z',
      }),
    })
    expect(res.status).toBe(200)
    const { data } = (await res.json()) as {
      data: { type: string; title: string; dueAt: string; reminderAt: string; confidence: string }
    }
    expect(data.type).toBe('task')
    expect(data.title).toBe('Check API issue')
    expect(data.dueAt).toBe('2026-09-15T18:00:00.000Z')
    expect(data.reminderAt).toBe('2026-09-15T10:00:00.000Z')
    expect(data.confidence).toBe('high')
    expect(seen).toEqual([
      'Rahul asked me to check the API issue tomorrow and remind me at 10.',
      'Asia/Kolkata',
      '2026-09-14T09:00:00.000Z',
    ])

    const count = db.prepare('SELECT COUNT(*) AS c FROM items').get() as { c: number }
    expect(Number(count.c)).toBe(0)
  })

  it('classifies idea, learning, note and link', async () => {
    const cases: { text: string; output: Record<string, unknown>; expectedType: string }[] = [
      {
        text: 'Idea: app that turns meeting recordings into tasks',
        output: { type: 'idea', title: 'Meeting-to-task app', confidence: 'high' },
        expectedType: 'idea',
      },
      {
        text: 'I need to learn Kubernetes networking',
        output: { type: 'learning', title: 'Kubernetes networking', confidence: 'high' },
        expectedType: 'learning',
      },
      {
        text: 'Remember staging API runs on port 8080',
        output: { type: 'note', title: 'Staging API port', confidence: 'high' },
        expectedType: 'note',
      },
      {
        text: 'Save this https://example.com/rag',
        output: {
          type: 'link',
          title: 'RAG article',
          url: 'https://example.com/rag',
          confidence: 'high',
        },
        expectedType: 'link',
      },
    ]
    for (const c of cases) {
      const { app } = withCapture(() => JSON.stringify(c.output))
      const res = await app.request('/api/v1/capture/interpret', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: c.text }),
      })
      expect(res.status).toBe(200)
      const { data } = (await res.json()) as { data: { type: string } }
      expect(data.type).toBe(c.expectedType)
    }
  })

  it('validates text input', async () => {
    const { app } = withCapture(() => '{}')
    expect(
      (await app.request('/api/v1/capture/interpret', { method: 'POST', body: '{}' })).status,
    ).toBe(400)
    expect(
      (
        await app.request('/api/v1/capture/interpret', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: '   ' }),
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await app.request('/api/v1/capture/interpret', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: 'x'.repeat(5000) }),
        })
      ).status,
    ).toBe(400)
  })

  it('handles malformed AI output with 422', async () => {
    const { app } = withCapture(() => 'this is not json')
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    })
    expect(res.status).toBe(422)
    expect((await res.json()) as { error: { message: string } }).toMatchObject({
      error: { message: expect.any(String) },
    })
  })

  it('handles provider failure with 502', async () => {
    const { app } = withCapture(() => {
      throw new AiProviderError('timeout')
    })
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    })
    expect(res.status).toBe(502)
  })

  it('returns 503 when AI is not configured', async () => {
    const app = createApp(db)
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    })
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: { message: string } }).error.message).toMatch(
      /isn't configured/,
    )
  })

  it('sanitizes invalid dates and reminder-after-due', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({
        type: 'task',
        title: 'Task',
        dueAt: 'not-a-date',
        reminderAt: '2026-09-15T10:00:00.000Z',
        confidence: 'high',
      }),
    )
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'task' }),
    })
    const { data } = (await res.json()) as {
      data: { dueAt: string | null; reminderAt: string | null }
    }
    expect(data.dueAt).toBeNull()

    const { app: app2 } = withCapture(() =>
      JSON.stringify({
        type: 'task',
        title: 'Task',
        dueAt: '2026-09-15T09:00:00.000Z',
        reminderAt: '2026-09-15T10:00:00.000Z',
        confidence: 'high',
      }),
    )
    const res2 = await app2.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'task' }),
    })
    const data2 = (await res2.json()) as { data: { reminderAt: string | null } }
    expect(data2.data.reminderAt).toBeNull()
  })

  it('extracts a URL from the text when the AI misses it for a link', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({ type: 'link', title: 'Article', url: null, confidence: 'high' }),
    )
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Save this https://example.com/rag' }),
    })
    const { data } = (await res.json()) as { data: { type: string; url: string } }
    expect(data.type).toBe('link')
    expect(data.url).toBe('https://example.com/rag')
  })

  it('downgrades a link with no URL to a note', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({ type: 'link', title: 'Article', url: null, confidence: 'high' }),
    )
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'no url here' }),
    })
    const { data } = (await res.json()) as { data: { type: string } }
    expect(data.type).toBe('note')
  })

  it('falls back to the original text as the title and caps tags', async () => {
    const { app } = withCapture(() =>
      JSON.stringify({
        type: 'bogus',
        title: '',
        tags: ['one', 'two', 'three', 'four', 'five', 'six', 42, ''],
        confidence: 'high',
      }),
    )
    const res = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'My original capture text' }),
    })
    const { data } = (await res.json()) as {
      data: { type: string; title: string; tags: string[] | null; confidence: string }
    }
    expect(data.type).toBe('note')
    expect(data.title).toBe('My original capture text')
    expect(data.tags?.length).toBe(5)
    expect(data.confidence).toBe('low')
  })
})

describe('POST /api/v1/transcribe', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  function transcribeApp(handler?: (input: { mime: string }) => string) {
    return createApp(db, {
      transcribe: createTranscriptionService(
        fakeTranscriptionProvider(
          handler ?? (() => 'Rahul asked me to check the API issue tomorrow.'),
        ),
      ),
    })
  }

  function audioForm(mime: string, bytes: number, name = 'rec.mp3') {
    const form = new FormData()
    form.append('audio', new Blob([new Uint8Array(bytes)], { type: mime }), name)
    return form
  }

  it('transcribes a valid audio upload', async () => {
    const app = transcribeApp()
    const res = await app.request('/api/v1/transcribe', {
      method: 'POST',
      body: audioForm('audio/mpeg', 512),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { text: string } }
    expect(body.data.text).toContain('API issue')
  })

  it('rejects unsupported MIME types and empty files', async () => {
    const app = transcribeApp()
    expect(
      (
        await app.request('/api/v1/transcribe', {
          method: 'POST',
          body: audioForm('text/plain', 512),
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await app.request('/api/v1/transcribe', {
          method: 'POST',
          body: audioForm('audio/mpeg', 0),
        })
      ).status,
    ).toBe(400)
    const noFile = await app.request('/api/v1/transcribe', { method: 'POST', body: new FormData() })
    expect(noFile.status).toBe(400)
  })

  it('rejects oversized audio', async () => {
    const app = transcribeApp()
    const big = new FormData()
    big.append(
      'audio',
      new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'audio/mpeg' }),
      'big.mp3',
    )
    const res = await app.request('/api/v1/transcribe', { method: 'POST', body: big })
    expect(res.status).toBe(413)
  })

  it('handles provider failure and unconfigured state', async () => {
    const app = transcribeApp(() => {
      throw new AiProviderError('nope')
    })
    const res = await app.request('/api/v1/transcribe', {
      method: 'POST',
      body: audioForm('audio/mpeg', 256),
    })
    expect(res.status).toBe(502)

    const unconfigured = createApp(db)
    const res2 = await unconfigured.request('/api/v1/transcribe', {
      method: 'POST',
      body: audioForm('audio/mpeg', 256),
    })
    expect(res2.status).toBe(503)
  })

  it('rejects empty transcripts', async () => {
    const app = transcribeApp(() => '   ')
    const res = await app.request('/api/v1/transcribe', {
      method: 'POST',
      body: audioForm('audio/mpeg', 256),
    })
    expect(res.status).toBe(422)
  })
})

describe('integration: capture → confirm → item → search', () => {
  it('creates a searchable item from an interpreted capture', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db, {
      capture: createCaptureService(
        fakeAiProvider(() =>
          JSON.stringify({
            type: 'learning',
            title: 'Kubernetes networking',
            body: null,
            url: null,
            priority: 'high',
            dueAt: null,
            reminderAt: null,
            tags: ['kubernetes'],
            confidence: 'high',
          }),
        ),
      ),
    })

    const interpreted = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'I need to learn Kubernetes networking.' }),
    })
    const { data: result } = (await interpreted.json()) as {
      data: { type: string; title: string; priority: string; tags: string[] }
    }
    expect(result.type).toBe('learning')

    const created = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: result.type,
        title: result.title,
        priority: result.priority,
        tags: result.tags,
      }),
    })
    expect(created.status).toBe(201)

    const search = await app.request('/api/v1/items?q=kubernetes')
    const titles = ((await search.json()) as { data: { title: string }[] }).data.map((i) => i.title)
    expect(titles).toContain('Kubernetes networking')
  })

  it('runs the voice path: fake transcription → interpret → item', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db, {
      capture: createCaptureService(
        fakeAiProvider(() =>
          JSON.stringify({ type: 'task', title: 'Check API issue', confidence: 'high' }),
        ),
      ),
      transcribe: createTranscriptionService(
        fakeTranscriptionProvider(() => 'Rahul asked me to check the API issue tomorrow.'),
      ),
    })

    const transcribed = await app.request('/api/v1/transcribe', {
      method: 'POST',
      body: (() => {
        const form = new FormData()
        form.append('audio', new Blob([new Uint8Array(256)], { type: 'audio/mp4' }), 'rec.m4a')
        return form
      })(),
    })
    const text = ((await transcribed.json()) as { data: { text: string } }).data.text

    const interpreted = await app.request('/api/v1/capture/interpret', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    expect(((await interpreted.json()) as { data: { title: string } }).data.title).toBe(
      'Check API issue',
    )
  })
})
