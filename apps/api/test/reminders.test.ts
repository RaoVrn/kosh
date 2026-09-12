import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Db } from '../src/db.js'
import * as itemRepo from '../src/items/repo.js'
import * as notifRepo from '../src/notifications/repo.js'
import { persistNotificationService, processDueReminders } from '../src/reminders/scheduler.js'
import type { Clock, NotificationService } from '../src/reminders/scheduler.js'

const json = (method: 'POST' | 'PATCH', body: unknown) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

function fakeClock(nowIso: string): Clock {
  return { now: () => new Date(nowIso) }
}

async function createTask(
  app: ReturnType<typeof createApp>,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const res = await app.request(
    '/api/v1/items',
    json('POST', { type: 'task', title: 'A task', ...overrides }),
  )
  const body = (await res.json()) as { data: { id: string } }
  return body.data
}

describe('task + reminder API', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  it('creates a task persisting due, reminder and priority', async () => {
    const app = createApp(db)
    const res = await app.request(
      '/api/v1/items',
      json('POST', {
        type: 'task',
        title: 'Finish M22 review',
        priority: 'high',
        dueAt: '2026-09-14T18:00:00.000Z',
        reminderAt: '2026-09-14T10:00:00.000Z',
      }),
    )
    expect(res.status).toBe(201)
    const { data } = (await res.json()) as {
      data: {
        id: string
        type: string
        priority: string
        dueAt: string
        reminderAt: string
        remindedAt: null
      }
    }
    expect(data.type).toBe('task')
    expect(data.priority).toBe('high')
    expect(data.dueAt).toBe('2026-09-14T18:00:00.000Z')
    expect(data.reminderAt).toBe('2026-09-14T10:00:00.000Z')
    expect(data.remindedAt).toBeNull()

    const row = db
      .prepare('SELECT due_at, reminder_at, priority FROM items WHERE id = ?')
      .get(data.id)
    expect(row).toMatchObject({
      due_at: '2026-09-14T18:00:00.000Z',
      reminder_at: '2026-09-14T10:00:00.000Z',
      priority: 'high',
    })
  })

  it('rejects reminders after the due time and reminders on non-tasks', async () => {
    const app = createApp(db)
    const late = await app.request(
      '/api/v1/items',
      json('POST', {
        type: 'task',
        title: 'x',
        dueAt: '2026-09-14T18:00:00.000Z',
        reminderAt: '2026-09-14T19:00:00.000Z',
      }),
    )
    expect(late.status).toBe(400)
    expect(((await late.json()) as { error: { message: string } }).error.message).toMatch(
      /reminder must not be after the due time/,
    )

    const onNote = await app.request(
      '/api/v1/items',
      json('POST', {
        type: 'note',
        title: 'x',
        reminderAt: '2026-09-14T10:00:00.000Z',
      }),
    )
    expect(onNote.status).toBe(400)

    const badDate = await app.request(
      '/api/v1/items',
      json('POST', { type: 'task', title: 'x', dueAt: 'nope' }),
    )
    expect(badDate.status).toBe(400)
  })

  it('applies reminder rules on PATCH using the effective values', async () => {
    const app = createApp(db)
    const { id } = await createTask(app, { dueAt: '2026-09-14T18:00:00.000Z' })

    const tooLate = await app.request(
      `/api/v1/items/${id}`,
      json('PATCH', { reminderAt: '2026-09-15T09:00:00.000Z' }),
    )
    expect(tooLate.status).toBe(400)

    const ok = await app.request(
      `/api/v1/items/${id}`,
      json('PATCH', { reminderAt: '2026-09-14T09:00:00.000Z' }),
    )
    expect(ok.status).toBe(200)
    const { data } = (await ok.json()) as { data: { reminderAt: string; remindedAt: null } }
    expect(data.reminderAt).toBe('2026-09-14T09:00:00.000Z')
    expect(data.remindedAt).toBeNull()
  })

  it('updating due/reminder/priority persists; completion sets doneAt', async () => {
    const app = createApp(db)
    const { id } = await createTask(app)
    const patched = await app.request(
      `/api/v1/items/${id}`,
      json('PATCH', {
        dueAt: '2026-09-20T12:00:00.000Z',
        reminderAt: '2026-09-20T09:00:00.000Z',
        priority: 'low',
      }),
    )
    expect(patched.status).toBe(200)

    const done = await app.request(`/api/v1/items/${id}`, json('PATCH', { status: 'done' }))
    const doneData = (await done.json()) as { data: { status: string; doneAt: string | null } }
    expect(doneData.data.status).toBe('done')
    expect(doneData.data.doneAt).toBeTruthy()
  })
})

describe('reminder scheduler', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  function insertTask(overrides: Partial<Parameters<typeof itemRepo.createItem>[1]> = {}) {
    return itemRepo.createItem(db, {
      title: 'Scheduled task',
      type: 'task',
      status: 'active',
      priority: null,
      reminderAt: '2026-09-11T10:00:00.000Z',
      ...overrides,
    })
  }

  it('processes a due reminder exactly once and creates a notification', () => {
    const { id } = insertTask({ reminderAt: '2026-09-11T10:00:00.000Z' })

    const atNine = processDueReminders(db, fakeClock('2026-09-11T09:59:00.000Z'))
    expect(atNine).toBe(0)

    const atTen = processDueReminders(db, fakeClock('2026-09-11T10:00:00.000Z'))
    expect(atTen).toBe(1)

    const item = itemRepo.getItem(db, id)
    expect(item?.remindedAt).toBe('2026-09-11T10:00:00.000Z')

    const notifs = notifRepo.listNotifications(db)
    expect(notifs).toHaveLength(1)
    expect(notifs[0]?.itemId).toBe(id)
    expect(notifs[0]?.type).toBe('reminder')
    expect(notifs[0]?.readAt).toBeNull()

    const atHalfPast = processDueReminders(db, fakeClock('2026-09-11T10:00:30.000Z'))
    expect(atHalfPast).toBe(0)
    expect(notifRepo.listNotifications(db)).toHaveLength(1)
  })

  it('does not re-process reminders after a restart (already marked)', () => {
    insertTask({ reminderAt: '2026-09-11T10:00:00.000Z' })
    processDueReminders(db, fakeClock('2026-09-11T10:01:00.000Z'))
    expect(notifRepo.listNotifications(db)).toHaveLength(1)

    const reopened = openDb(':memory:')
    migrate(reopened)
    const seeded = itemRepo.listItems(db)[0]
    if (seeded) itemRepo.insertItem(reopened, seeded)
    const count = processDueReminders(reopened, fakeClock('2026-09-11T10:05:00.000Z'))
    expect(count).toBe(0)
    expect(notifRepo.listNotifications(reopened)).toHaveLength(0)
  })

  it('ignores completed, archived and reminder-less tasks', () => {
    insertTask({ status: 'done', reminderAt: '2026-09-11T10:00:00.000Z' })
    insertTask({ status: 'archived', reminderAt: '2026-09-11T10:00:00.000Z' })
    insertTask({ reminderAt: null })
    insertTask({ reminderAt: '2026-09-11T11:00:00.000Z' })

    const count = processDueReminders(db, fakeClock('2026-09-11T10:30:00.000Z'))
    expect(count).toBe(0)
    expect(notifRepo.listNotifications(db)).toHaveLength(0)
  })

  it('re-arms a reminder when its time is changed', () => {
    const { id } = insertTask({ reminderAt: '2026-09-11T10:00:00.000Z' })
    processDueReminders(db, fakeClock('2026-09-11T10:01:00.000Z'))
    expect(itemRepo.getItem(db, id)?.remindedAt).toBeTruthy()

    itemRepo.updateItem(db, id, { reminderAt: '2026-09-11T14:00:00.000Z' })
    expect(itemRepo.getItem(db, id)?.remindedAt).toBeNull()

    const processed = processDueReminders(db, fakeClock('2026-09-11T14:00:00.000Z'))
    expect(processed).toBe(1)
    expect(notifRepo.listNotifications(db)).toHaveLength(2)
  })

  it('notifies through the injected notification service (abstraction)', () => {
    const delivered: string[] = []
    const spy: NotificationService = { deliver: (_, item) => delivered.push(item.id) }
    insertTask({ reminderAt: '2026-09-11T10:00:00.000Z' })

    processDueReminders(db, fakeClock('2026-09-11T10:00:00.000Z'), spy)
    const firstItem = itemRepo.listItems(db)[0]
    expect(delivered).toEqual([firstItem?.id])
    expect(notifRepo.listNotifications(db)).toHaveLength(0)

    processDueReminders(db, fakeClock('2026-09-11T10:01:00.000Z'), spy)
    expect(delivered).toHaveLength(1)
  })

  it('default notification service persists reminders for the item', () => {
    const { id } = insertTask({ reminderAt: '2026-09-11T10:00:00.000Z' })
    processDueReminders(db, fakeClock('2026-09-11T10:00:00.000Z'), persistNotificationService)
    const notif = notifRepo.listNotifications(db)[0]
    expect(notif?.itemId).toBe(id)
    expect(notif?.title).toBe('Scheduled task')
  })
})

describe('notifications API', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  it('lists, marks read and filters unread', async () => {
    const app = createApp(db)
    const a = notifRepo.createNotification(db, { itemId: 'i1', type: 'reminder', title: 'First' })
    const _b = notifRepo.createNotification(db, { itemId: 'i2', type: 'reminder', title: 'Second' })

    const list = await app.request('/api/v1/notifications')
    expect(list.status).toBe(200)
    expect(((await list.json()) as { data: unknown[] }).data).toHaveLength(2)

    const unread = await app.request('/api/v1/notifications?unread=true')
    expect(((await unread.json()) as { data: unknown[] }).data).toHaveLength(2)

    const marked = await app.request(`/api/v1/notifications/${a.id}`, json('PATCH', {}))
    expect(marked.status).toBe(200)
    const markedData = (await marked.json()) as { data: { readAt: string | null } }
    expect(markedData.data.readAt).toBeTruthy()

    const unreadAfter = await app.request('/api/v1/notifications?unread=true')
    expect(((await unreadAfter.json()) as { data: unknown[] }).data).toHaveLength(1)

    const missing = await app.request('/api/v1/notifications/nope', json('PATCH', {}))
    expect(missing.status).toBe(404)
  })

  it('clears read state when readAt is null', async () => {
    const app = createApp(db)
    const n = notifRepo.createNotification(db, { itemId: null, type: 'reminder', title: 'x' })
    await app.request(`/api/v1/notifications/${n.id}`, json('PATCH', {}))
    const reopened = await app.request(
      `/api/v1/notifications/${n.id}`,
      json('PATCH', { readAt: null }),
    )
    const data = (await reopened.json()) as { data: { readAt: string | null } }
    expect(data.data.readAt).toBeNull()
  })
})
