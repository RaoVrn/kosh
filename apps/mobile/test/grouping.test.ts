import { describe, expect, it } from 'vitest'
import type { Item } from '@kosh/shared'
import { compareTasks, getTaskGroups, getTodayGroups, sortPendingTasks } from '@kosh/shared'
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
