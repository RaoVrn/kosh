import { describe, expect, it } from 'vitest'
import type { Item, KoshNotification } from '@kosh/shared'
import {
  compareTasks,
  getLearningGroups,
  getTaskGroups,
  getTodayCommandCenter,
  getTodayGroups,
  isPendingTask,
  sortPendingTasks,
} from '@kosh/shared'
import { atTimeOnDay, daysFromNow } from '@kosh/shared'

const REF = new Date(2026, 8, 11, 12, 0, 0)

function iso(y: number, mo: number, d: number, h = 0, mi = 0): string {
  return new Date(y, mo - 1, d, h, mi, 0).toISOString()
}

function task(overrides: Partial<Item> & Pick<Item, 'id'>): Item {
  return {
    type: 'task',
    status: 'active',
    title: 't',
    body: null,
    url: null,
    dueAt: null,
    reminderAt: null,
    priority: null,
    tags: [],
    doneAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('getTodayGroups', () => {
  it('groups overdue, today, upcoming and completed-today without duplicates', () => {
    const items: Item[] = [
      task({ id: 'overdue', dueAt: iso(2026, 9, 10, 18, 0) }),
      task({ id: 'overdue-today', dueAt: iso(2026, 9, 11, 9, 0) }),
      task({ id: 'today', dueAt: iso(2026, 9, 11, 18, 0) }),
      task({ id: 'upcoming', dueAt: iso(2026, 9, 14, 9, 0) }),
      task({ id: 'nodue', priority: 'high' }),
      task({ id: 'done', status: 'done', dueAt: iso(2026, 9, 11, 9, 0) }),
      task({ id: 'done-today', status: 'done', doneAt: iso(2026, 9, 11, 8, 0) }),
    ]

    const groups = getTodayGroups(items, REF)
    const keys = groups.map((g) => g.key)
    expect(keys).toEqual(['overdue', 'today', 'upcoming', 'completed'])

    const ids = groups.flatMap((g) => g.items.map((i) => i.id))
    expect(ids).toContain('overdue')
    expect(ids).toContain('overdue-today')
    expect(ids).toContain('today')
    expect(ids).toContain('upcoming')
    expect(ids).toContain('done-today')
    expect(ids).not.toContain('nodue')
    expect(ids).not.toContain('done')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('puts a task due earlier today into overdue, not today', () => {
    const items: Item[] = [task({ id: 'a', dueAt: iso(2026, 9, 11, 9, 0) })]
    const groups = getTodayGroups(items, REF)
    expect(groups.map((g) => g.key)).toEqual(['overdue'])
    expect(groups[0].items.map((i) => i.id)).toEqual(['a'])
  })

  it('returns empty groups when nothing needs attention', () => {
    const items: Item[] = [task({ id: 'nodue' }), task({ id: 'done', status: 'done' })]
    expect(getTodayGroups(items, REF)).toEqual([])
  })

  it('caps upcoming at eight items, sorted by due date', () => {
    const items: Item[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
      task({ id: `u${n}`, dueAt: iso(2026, 9, 12 + n, 9, 0) }),
    )
    const groups = getTodayGroups(items, REF)
    const upcoming = groups.find((g) => g.key === 'upcoming')
    expect(upcoming?.items.length).toBe(8)
    expect(upcoming?.items[0].id).toBe('u1')
  })
})

describe('getTaskGroups', () => {
  it('sorts overdue and today by priority then due time', () => {
    const items: Item[] = [
      task({ id: 'low-today', priority: 'low', dueAt: iso(2026, 9, 11, 17, 0) }),
      task({ id: 'high-today', priority: 'high', dueAt: iso(2026, 9, 11, 18, 0) }),
      task({ id: 'med-overdue', priority: 'medium', dueAt: iso(2026, 9, 9, 9, 0) }),
      task({ id: 'high-overdue', priority: 'high', dueAt: iso(2026, 9, 8, 9, 0) }),
    ]
    const { overdue, today } = getTaskGroups(items, REF)
    expect(overdue.map((i) => i.id)).toEqual(['high-overdue', 'med-overdue'])
    expect(today.map((i) => i.id)).toEqual(['high-today', 'low-today'])
  })

  it('includes all completed tasks', () => {
    const items: Item[] = [
      task({ id: 'c1', status: 'done', doneAt: iso(2026, 9, 10, 9, 0) }),
      task({ id: 'c2', status: 'done', doneAt: iso(2026, 9, 11, 9, 0) }),
      task({ id: 'open' }),
    ]
    const { completed } = getTaskGroups(items, REF)
    expect(completed.map((i) => i.id)).toEqual(['c2', 'c1'])
  })
})

describe('compareTasks', () => {
  it('orders by priority, then due time', () => {
    const a = task({ id: 'a', priority: 'medium', dueAt: daysFromNow(1, REF) })
    const b = task({ id: 'b', priority: 'high', dueAt: daysFromNow(5, REF) })
    const c = task({ id: 'c', priority: 'medium', dueAt: daysFromNow(2, REF) })
    const sorted = [a, b, c].sort(compareTasks).map((i) => i.id)
    expect(sorted).toEqual(['b', 'a', 'c'])
  })
})

describe('sortPendingTasks', () => {
  it('puts pending before done, then by due date', () => {
    const items: Item[] = [
      task({ id: 'done-later', status: 'done', dueAt: daysFromNow(0, REF) }),
      task({ id: 'pending-later', dueAt: daysFromNow(5, REF) }),
      task({ id: 'pending-soon', dueAt: daysFromNow(1, REF) }),
    ]
    const sorted = sortPendingTasks(items).map((i) => i.id)
    expect(sorted).toEqual(['pending-soon', 'pending-later', 'done-later'])
  })
})

describe('getLearningGroups', () => {
  it('groups learning items by priority and status', () => {
    const items: Item[] = [
      task({ id: 'high', type: 'learning', priority: 'high', status: 'inbox' }),
      task({ id: 'active', type: 'learning', status: 'active' }),
      task({ id: 'notstarted', type: 'learning', status: 'inbox' }),
      task({ id: 'done', type: 'learning', status: 'done' }),
      task({ id: 'highdone', type: 'learning', priority: 'high', status: 'done' }),
      task({ id: 'note', type: 'note', status: 'active' }),
    ]
    const groups = getLearningGroups(items)
    expect(groups.highPriority.map((i) => i.id)).toEqual(['high'])
    expect(groups.active.map((i) => i.id)).toEqual(['active'])
    expect(groups.notStarted.map((i) => i.id)).toEqual(['notstarted'])
    expect(groups.completed.map((i) => i.id)).toEqual(['done', 'highdone'])
  })

  it('sorts by priority within groups', () => {
    const items: Item[] = [
      task({ id: 'low', type: 'learning', priority: 'low', status: 'active' }),
      task({ id: 'high', type: 'learning', priority: 'high', status: 'active' }),
      task({ id: 'med', type: 'learning', priority: 'medium', status: 'active' }),
    ]
    const groups = getLearningGroups(items)
    expect(groups.highPriority.map((i) => i.id)).toEqual(['high'])
    expect(groups.active.map((i) => i.id)).toEqual(['med', 'low'])
  })
})

describe('getTodayCommandCenter', () => {
  const REF = new Date(2026, 8, 11, 12, 0, 0)

  function notification(
    overrides: Partial<KoshNotification> & Pick<KoshNotification, 'id'>,
  ): KoshNotification {
    return {
      itemId: null,
      type: 'reminder',
      title: 'n',
      body: null,
      createdAt: '2026-09-11T09:00:00.000Z',
      readAt: null,
      ...overrides,
    }
  }

  it('applies precedence overdue → due today → up next without duplicates', () => {
    const items: Item[] = [
      task({ id: 'overdue', dueAt: iso(2026, 9, 10, 18, 0) }),
      task({ id: 'dueToday', dueAt: iso(2026, 9, 11, 18, 0) }),
      task({ id: 'overdueHigh', priority: 'high', dueAt: iso(2026, 9, 9, 9, 0) }),
      task({ id: 'upNextHigh', priority: 'high' }),
      task({ id: 'upNextFuture', dueAt: iso(2026, 9, 15, 9, 0) }),
    ]
    const cc = getTodayCommandCenter(items, [], REF)

    expect(cc.overdue.map((i) => i.id).sort()).toEqual(['overdue', 'overdueHigh'])
    expect(cc.dueToday.map((i) => i.id)).toEqual(['dueToday'])
    const upNextIds = cc.upNext.map((i) => i.id)
    expect(upNextIds).toContain('upNextHigh')
    expect(upNextIds).toContain('upNextFuture')

    const all = [...cc.overdue, ...cc.dueToday, ...cc.upNext].map((i) => i.id)
    expect(new Set(all).size).toBe(all.length)
  })

  it('excludes done and archived tasks from active sections', () => {
    const items: Item[] = [
      task({ id: 'done', status: 'done', dueAt: iso(2026, 9, 10, 18, 0) }),
      task({ id: 'archived', status: 'archived', dueAt: iso(2026, 9, 10, 18, 0) }),
      task({ id: 'open', dueAt: iso(2026, 9, 10, 18, 0) }),
    ]
    const cc = getTodayCommandCenter(items, [], REF)
    expect(cc.overdue.map((i) => i.id)).toEqual(['open'])
    expect(cc.upNext).toHaveLength(0)
  })

  it('includes only unread reminders, newest first', () => {
    const notifications: KoshNotification[] = [
      notification({ id: 'n1', createdAt: '2026-09-11T10:00:00.000Z' }),
      notification({ id: 'n2', createdAt: '2026-09-11T11:00:00.000Z' }),
      notification({
        id: 'n3',
        createdAt: '2026-09-11T09:00:00.000Z',
        readAt: '2026-09-11T12:00:00.000Z',
      }),
    ]
    const cc = getTodayCommandCenter([], notifications, REF)
    expect(cc.reminders.map((n) => n.id)).toEqual(['n2', 'n1'])
  })

  it('includes only inbox items in recent captures, capped and newest first', () => {
    const items: Item[] = [
      task({ id: 'c1', status: 'inbox', createdAt: '2026-09-11T08:00:00.000Z' }),
      task({ id: 'c2', status: 'inbox', createdAt: '2026-09-11T09:00:00.000Z' }),
      task({ id: 'c3', status: 'inbox', createdAt: '2026-09-11T10:00:00.000Z' }),
      task({ id: 'c4', status: 'inbox', createdAt: '2026-09-11T11:00:00.000Z' }),
      task({ id: 'active', status: 'active', createdAt: '2026-09-11T11:30:00.000Z' }),
    ]
    const cc = getTodayCommandCenter(items, [], REF, { upNext: 5, reminders: 3, recentCaptures: 3 })
    expect(cc.recentCaptures.map((i) => i.id)).toEqual(['c4', 'c3', 'c2'])
  })

  it('limits up next and keeps priority ordering', () => {
    const items: Item[] = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      task({
        id: `u${n}`,
        priority: n % 2 === 0 ? 'high' : 'low',
        dueAt: iso(2026, 9, 12 + n, 9, 0),
      }),
    )
    const cc = getTodayCommandCenter(items, [], REF, { upNext: 5, reminders: 3, recentCaptures: 3 })
    expect(cc.upNext).toHaveLength(5)
    expect(cc.upNext[0].id).toBe('u2')
  })
})

describe('isPendingTask', () => {
  const base = task({ id: 't1' })

  it('is pending for inbox and active tasks only', () => {
    expect(isPendingTask({ ...base, status: 'inbox' })).toBe(true)
    expect(isPendingTask({ ...base, status: 'active' })).toBe(true)
    expect(isPendingTask({ ...base, status: 'done' })).toBe(false)
    expect(isPendingTask({ ...base, status: 'archived' })).toBe(false)
  })

  it('is never pending for non-task items', () => {
    for (const type of ['note', 'idea', 'learning', 'link'] as const) {
      expect(isPendingTask({ ...base, type })).toBe(false)
    }
  })
})

describe('time helpers used by tasks', () => {
  it('atTimeOnDay produces the requested local time on a future day', () => {
    expect(isAtLocalTime(atTimeOnDay(0, 18, 0, REF), 18, 0)).toBe(true)
    expect(isAtLocalTime(atTimeOnDay(1, 9, 30, REF), 9, 30)).toBe(true)
  })
})

function isAtLocalTime(iso: string, h: number, m: number): boolean {
  const d = new Date(iso)
  return d.getHours() === h && d.getMinutes() === m
}
