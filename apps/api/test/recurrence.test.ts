import { describe, expect, it } from 'vitest'
import type { Item } from '@kosh/shared'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import { nextOccurrenceDue } from '../src/recurrence/calculation.js'
import { parseRecurrence } from '../src/recurrence/validation.js'
import { ValidationError } from '../src/items/validation.js'

function iso(y: number, mo: number, d: number, h = 10, mi = 0, s = 0): string {
  return new Date(y, mo - 1, d, h, mi, s).toISOString()
}

describe('nextOccurrenceDue', () => {
  it('daily: next day, same local time', () => {
    expect(nextOccurrenceDue(iso(2026, 9, 12, 10, 30), { frequency: 'daily' })).toBe(
      iso(2026, 9, 13, 10, 30),
    )
  })

  it('daily across a month boundary', () => {
    expect(nextOccurrenceDue(iso(2026, 9, 30, 8, 0), { frequency: 'daily' })).toBe(
      iso(2026, 10, 1, 8, 0),
    )
  })

  it('weekly: same weekday next week', () => {
    const monday = iso(2026, 9, 14, 17, 0) // 2026-09-14 is a Monday
    expect(new Date(monday).getDay()).toBe(1)
    expect(nextOccurrenceDue(monday, { frequency: 'weekly', weekdays: [1] })).toBe(
      iso(2026, 9, 21, 17, 0),
    )
  })

  it('weekly: skips to the next selected weekday', () => {
    const monday = iso(2026, 9, 14, 17, 0)
    expect(nextOccurrenceDue(monday, { frequency: 'weekly', weekdays: [3] })).toBe(
      iso(2026, 9, 16, 17, 0),
    )
  })

  it('weekly multiple days: Monday → Wednesday → Friday → next Monday', () => {
    const mon = iso(2026, 9, 14, 9, 0)
    const wed = nextOccurrenceDue(mon, { frequency: 'weekly', weekdays: [1, 3, 5] })
    const fri = nextOccurrenceDue(wed, { frequency: 'weekly', weekdays: [1, 3, 5] })
    const nextMon = nextOccurrenceDue(fri, { frequency: 'weekly', weekdays: [1, 3, 5] })
    expect(wed).toBe(iso(2026, 9, 16, 9, 0))
    expect(fri).toBe(iso(2026, 9, 18, 9, 0))
    expect(nextMon).toBe(iso(2026, 9, 21, 9, 0))
  })

  it('weekly: never returns the same day (strictly after)', () => {
    const sunday = iso(2026, 9, 13, 9, 0) // Sunday
    expect(new Date(sunday).getDay()).toBe(0)
    expect(nextOccurrenceDue(sunday, { frequency: 'weekly', weekdays: [0] })).toBe(
      iso(2026, 9, 20, 9, 0),
    )
  })

  it('monthly: same day next month', () => {
    expect(
      nextOccurrenceDue(iso(2026, 9, 15, 8, 30), { frequency: 'monthly', dayOfMonth: 15 }),
    ).toBe(iso(2026, 10, 15, 8, 30))
  })

  it('monthly day 31 in a short month: clamps to the last valid day', () => {
    expect(
      nextOccurrenceDue(iso(2026, 1, 31, 9, 0), { frequency: 'monthly', dayOfMonth: 31 }),
    ).toBe(iso(2026, 2, 28, 9, 0))
  })

  it('monthly day 31 recovers the target day afterwards', () => {
    expect(
      nextOccurrenceDue(iso(2026, 2, 28, 9, 0), { frequency: 'monthly', dayOfMonth: 31 }),
    ).toBe(iso(2026, 3, 31, 9, 0))
  })

  it('monthly across December → January', () => {
    expect(nextOccurrenceDue(iso(2026, 12, 1, 9, 0), { frequency: 'monthly', dayOfMonth: 1 })).toBe(
      iso(2027, 1, 1, 9, 0),
    )
  })

  it('leap year: February 29 is reachable and preserved', () => {
    expect(
      nextOccurrenceDue(iso(2028, 1, 29, 9, 0), { frequency: 'monthly', dayOfMonth: 29 }),
    ).toBe(iso(2028, 2, 29, 9, 0))
  })

  it('leap year: Feb 29 → next month on day 29', () => {
    expect(
      nextOccurrenceDue(iso(2028, 2, 29, 9, 0), { frequency: 'monthly', dayOfMonth: 29 }),
    ).toBe(iso(2028, 3, 29, 9, 0))
  })

  it('preserves time of day across all frequencies', () => {
    expect(nextOccurrenceDue(iso(2026, 9, 12, 23, 59), { frequency: 'daily' })).toBe(
      iso(2026, 9, 13, 23, 59),
    )
    expect(nextOccurrenceDue(iso(2026, 9, 14, 17, 5), { frequency: 'weekly', weekdays: [1] })).toBe(
      iso(2026, 9, 21, 17, 5),
    )
  })

  it('rejects a non-recurring configuration', () => {
    expect(() => nextOccurrenceDue(iso(2026, 9, 12), { frequency: 'none' })).toThrow()
  })
})

describe('parseRecurrence', () => {
  it('accepts none/daily/weekly/monthly shapes', () => {
    expect(parseRecurrence(null)).toBeNull()
    expect(parseRecurrence({ frequency: 'none' })).toBeNull()
    expect(parseRecurrence(undefined)).toBeUndefined()
    expect(parseRecurrence({ frequency: 'daily' })).toEqual({ frequency: 'daily' })
    expect(parseRecurrence({ frequency: 'weekly', weekdays: [1, 3] })).toEqual({
      frequency: 'weekly',
      weekdays: [1, 3],
    })
    expect(parseRecurrence({ frequency: 'monthly', dayOfMonth: 15 })).toEqual({
      frequency: 'monthly',
      dayOfMonth: 15,
    })
  })

  it('sorts and de-duplicates implicitly-valid weekday input', () => {
    expect(parseRecurrence({ frequency: 'weekly', weekdays: [3, 1] })).toEqual({
      frequency: 'weekly',
      weekdays: [1, 3],
    })
  })

  it('rejects malformed recurrence', () => {
    expect(() => parseRecurrence('daily')).toThrow(ValidationError)
    expect(() => parseRecurrence({})).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'yearly' })).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'weekly' })).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'weekly', weekdays: [] })).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'weekly', weekdays: [7] })).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'weekly', weekdays: [1, 1] })).toThrow(
      ValidationError,
    )
    expect(() => parseRecurrence({ frequency: 'weekly', weekdays: ['mon'] })).toThrow(
      ValidationError,
    )
    expect(() => parseRecurrence({ frequency: 'monthly' })).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'monthly', dayOfMonth: 0 })).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'monthly', dayOfMonth: 32 })).toThrow(ValidationError)
    expect(() => parseRecurrence({ frequency: 'monthly', dayOfMonth: 1.5 })).toThrow(
      ValidationError,
    )
  })
})

describe('recurring task completion (API)', () => {
  async function createRecurringTask(
    app: ReturnType<typeof createApp>,
    overrides: Record<string, unknown> = {},
  ) {
    const res = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'task',
        title: 'Study DSA',
        status: 'active',
        dueAt: iso(2026, 9, 14, 17, 0),
        priority: 'high',
        tags: ['dsa'],
        recurrence: { frequency: 'daily' },
        ...overrides,
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: Item }
    return body.data
  }

  it('completing a recurring task creates exactly one next occurrence', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app)

    const doneRes = await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(doneRes.status).toBe(200)
    const doneBody = (await doneRes.json()) as { data: Item }
    const completed = doneBody.data
    expect(completed.status).toBe('done')
    expect(completed.doneAt).toBeTruthy()

    const list = await repo(db)
    const series = list.filter((i) => i.recurrenceId === current.recurrenceId)
    expect(series).toHaveLength(2)
    const next = series.find((i) => i.id !== current.id)!
    expect(next.status).toBe('active')
    expect(next.title).toBe('Study DSA')
    expect(next.body).toBe(current.body)
    expect(next.priority).toBe('high')
    expect(next.tags).toEqual(['dsa'])
    expect(next.recurrence).toEqual({ frequency: 'daily' })
    expect(next.recurrenceId).toBe(current.recurrenceId)
    expect(next.dueAt).toBe(iso(2026, 9, 15, 17, 0))
    expect(next.doneAt).toBeNull()
    expect(next.remindedAt).toBeNull()
  })

  it('completing the same occurrence twice creates no duplicate', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app)

    for (let i = 0; i < 2; i++) {
      const res = await app.request(`/api/v1/items/${current.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      expect(res.status).toBe(200)
    }

    const list = await repo(db)
    const series = list.filter((i) => i.recurrenceId === current.recurrenceId)
    expect(series).toHaveLength(2)
    expect(series.filter((i) => i.status === 'done')).toHaveLength(1)
    expect(series.filter((i) => i.status === 'active')).toHaveLength(1)
  })

  it('preserves the reminder offset on the next occurrence', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app, {
      dueAt: iso(2026, 9, 14, 17, 0),
      reminderAt: iso(2026, 9, 14, 16, 0),
    })

    const res = await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(res.status).toBe(200)

    const list = await repo(db)
    const next = list.find((i) => i.id !== current.id)!
    expect(next.dueAt).toBe(iso(2026, 9, 15, 17, 0))
    expect(next.reminderAt).toBe(iso(2026, 9, 15, 16, 0))
    expect(next.remindedAt).toBeNull()
  })

  it('a recurring task without a reminder gets none on the next occurrence', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app, { reminderAt: null })

    await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    const list = await repo(db)
    const next = list.find((i) => i.id !== current.id)!
    expect(next.reminderAt).toBeNull()
  })

  it('completing a non-recurring task creates no occurrence', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app, { recurrence: null })

    await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(await repo(db)).toHaveLength(1)
  })

  it('archiving a recurring task creates no occurrence', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app)

    const res = await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    expect(res.status).toBe(200)
    expect(await repo(db)).toHaveLength(1)

    const again = await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(again.status).toBe(200)
    expect(await repo(db)).toHaveLength(1)
  })

  it('deleting a recurring occurrence creates no replacement', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app)

    const res = await app.request(`/api/v1/items/${current.id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(await repo(db)).toHaveLength(0)
  })

  it('removing recurrence stops generation on completion', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app)

    const clear = await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recurrence: null }),
    })
    expect(clear.status).toBe(200)
    const cleared = (await clear.json()) as { data: Item }
    expect(cleared.data.recurrence).toBeNull()

    await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    expect(await repo(db)).toHaveLength(1)
  })

  it('completing the generated next occurrence chains the series', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app)

    await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    const list1 = await repo(db)
    const next = list1.find((i) => i.id !== current.id)!

    await app.request(`/api/v1/items/${next.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    })
    const list2 = await repo(db)
    const series = list2.filter((i) => i.recurrenceId === current.recurrenceId)
    expect(series).toHaveLength(3)
    const third = series.find((i) => i.id !== current.id && i.id !== next.id)!
    expect(third.dueAt).toBe(iso(2026, 9, 16, 17, 0))
  })

  it('rejects recurrence on non-task items', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const res = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'nope',
        recurrence: { frequency: 'daily' },
      }),
    })
    expect(res.status).toBe(400)

    const note = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'note', title: 'ok' }),
    })
    const noteBody = ((await note.json()) as { data: Item }).data
    const patch = await app.request(`/api/v1/items/${noteBody.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recurrence: { frequency: 'weekly', weekdays: [1] } }),
    })
    expect(patch.status).toBe(400)
  })

  it('rejects recurrence without a due date', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const res = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'task',
        title: 'no due',
        status: 'active',
        recurrence: { frequency: 'daily' },
      }),
    })
    expect(res.status).toBe(400)
  })

  it('clears recurrence when a task is converted to a non-task type', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const current = await createRecurringTask(app)

    const res = await app.request(`/api/v1/items/${current.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'note' }),
    })
    expect(res.status).toBe(200)
    const converted = ((await res.json()) as { data: Item }).data
    expect(converted.recurrence).toBeNull()
    expect(converted.recurrenceId).toBeNull()
  })

  it('converting a non-task to task keeps recurrence none', async () => {
    const db = openDb(':memory:')
    migrate(db)
    const app = createApp(db)
    const note = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'note', title: 'note' }),
    })
    const noteBody = ((await note.json()) as { data: Item }).data
    const res = await app.request(`/api/v1/items/${noteBody.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'task' }),
    })
    expect(res.status).toBe(200)
    const converted = ((await res.json()) as { data: Item }).data
    expect(converted.recurrence).toBeNull()
    expect(converted.recurrenceId).toBeNull()
  })
})

async function repo(db: ReturnType<typeof openDb>): Promise<Item[]> {
  const app = createApp(db)
  const res = await app.request('/api/v1/items')
  const body = (await res.json()) as { data: Item[] }
  return body.data
}
