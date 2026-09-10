import { describe, expect, it } from 'vitest'
import type { Item } from '@kosh/shared'
import { getTodayGroups, sortPendingTasks } from '../src/utils/grouping'
import { daysFromNow } from '../src/utils/time'

const REF = new Date('2026-09-11T12:00:00.000Z')

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
  it('splits tasks into overdue, important, today and upcoming without duplicates', () => {
    const items: Item[] = [
      task({ id: 'overdue', dueAt: daysFromNow(-2, REF) }),
      task({ id: 'important', priority: 'high', dueAt: daysFromNow(1, REF) }),
      task({ id: 'today', dueAt: daysFromNow(0, REF) }),
      task({ id: 'upcoming', dueAt: daysFromNow(3, REF) }),
      task({ id: 'nodue', priority: 'medium' }),
      task({ id: 'done', status: 'done', dueAt: daysFromNow(0, REF) }),
    ]

    const groups = getTodayGroups(items, REF)
    const keys = groups.map((g) => g.key)
    expect(keys).toEqual(['overdue', 'important', 'today', 'upcoming'])

    const ids = groups.flatMap((g) => g.items.map((i) => i.id))
    expect(ids).toContain('overdue')
    expect(ids).toContain('important')
    expect(ids).toContain('today')
    expect(ids).toContain('upcoming')
    expect(ids).not.toContain('nodue')
    expect(ids).not.toContain('done')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('a high-priority task due today lands in important, not today', () => {
    const items: Item[] = [task({ id: 'a', priority: 'high', dueAt: daysFromNow(0, REF) })]
    const groups = getTodayGroups(items, REF)
    expect(groups.map((g) => g.key)).toEqual(['important'])
    expect(groups[0].items.map((i) => i.id)).toEqual(['a'])
  })

  it('returns empty groups when nothing needs attention', () => {
    const items: Item[] = [task({ id: 'nodue' }), task({ id: 'done', status: 'done' })]
    expect(getTodayGroups(items, REF)).toEqual([])
  })

  it('caps upcoming at four items, sorted by due date', () => {
    const items: Item[] = [1, 2, 3, 4, 5].map((n) =>
      task({ id: `u${n}`, dueAt: daysFromNow(n, REF) }),
    )
    const groups = getTodayGroups(items, REF)
    const upcoming = groups.find((g) => g.key === 'upcoming')
    expect(upcoming?.items.length).toBe(4)
    expect(upcoming?.items[0].id).toBe('u1')
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
