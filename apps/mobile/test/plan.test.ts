import { describe, expect, it } from 'vitest'
import type { Item } from '@kosh/shared'
import { planTaskReminders } from '../src/notifications/plan'

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

describe('planTaskReminders', () => {
  it('plans future reminders for open tasks, sorted by time', () => {
    const items: Item[] = [
      task({ id: 'later', reminderAt: '2026-09-11T15:00:00.000Z' }),
      task({ id: 'sooner', reminderAt: '2026-09-11T13:00:00.000Z' }),
      task({ id: 'past', reminderAt: '2026-09-11T11:00:00.000Z' }),
    ]
    const plans = planTaskReminders(items, REF)
    expect(plans.map((p) => p.itemId)).toEqual(['sooner', 'later'])
  })

  it('excludes done, archived and reminder-less tasks', () => {
    const items: Item[] = [
      task({ id: 'done', status: 'done', reminderAt: '2026-09-11T13:00:00.000Z' }),
      task({ id: 'archived', status: 'archived', reminderAt: '2026-09-11T13:00:00.000Z' }),
      task({ id: 'none', reminderAt: null }),
      task({ id: 'ok', reminderAt: '2026-09-11T13:00:00.000Z' }),
    ]
    expect(planTaskReminders(items, REF).map((p) => p.itemId)).toEqual(['ok'])
  })

  it('carries the task title and due info into the plan', () => {
    const items: Item[] = [
      task({
        id: 'x',
        title: 'Finish report',
        dueAt: '2026-09-14T18:00:00.000Z',
        reminderAt: '2026-09-14T10:00:00.000Z',
      }),
    ]
    const [plan] = planTaskReminders(items, REF)
    expect(plan.title).toBe('Finish report')
    expect(plan.at.toISOString()).toBe('2026-09-14T10:00:00.000Z')
    expect(plan.body).toMatch(/^Due /)
  })
})
