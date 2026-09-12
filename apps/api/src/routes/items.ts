import { Hono } from 'hono'
import type { Db } from '../db.js'
import * as repo from '../items/repo.js'
import { buildFtsQuery } from '../items/search.js'
import { completeTask } from '../recurrence/service.js'
import {
  ValidationError,
  assertRecurrenceRules,
  assertReminderRules,
  assertTypeRules,
  isItemStatus,
  isItemType,
  parseCreateBody,
  parseId,
  parsePatchBody,
} from '../items/validation.js'

const MAX_LIMIT = 1000
const LIST_DEFAULT_LIMIT = 1000
const SEARCH_DEFAULT_LIMIT = 50

async function readJson(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    throw new BadJsonError()
  }
}

export class BadJsonError extends Error {
  constructor() {
    super('Invalid JSON body')
    this.name = 'BadJsonError'
  }
}

function parseOptionalInt(
  value: string | undefined,
  min: number,
  max: number,
  name: string,
): number | undefined {
  if (value === undefined) return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`${name} must be an integer between ${min} and ${max}`)
  }
  return n
}

export function itemsRoutes(db: Db): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const type = c.req.query('type')
    const status = c.req.query('status')
    if (type !== undefined && !isItemType(type)) {
      return c.json({ error: { message: 'Invalid type filter' } }, 400)
    }
    if (status !== undefined && !isItemStatus(status)) {
      return c.json({ error: { message: 'Invalid status filter' } }, 400)
    }

    const q = (c.req.query('q') ?? '').trim()
    const limit = parseOptionalInt(c.req.query('limit'), 1, MAX_LIMIT, 'limit')
    const offset = parseOptionalInt(c.req.query('offset'), 0, 100_000, 'offset')

    if (q) {
      const ftsQuery = buildFtsQuery(q)
      if (!ftsQuery) return c.json({ data: [] })
      const items = repo.searchItems(db, {
        type,
        status,
        query: ftsQuery,
        limit: limit ?? SEARCH_DEFAULT_LIMIT,
        offset: offset ?? 0,
      })
      return c.json({ data: items })
    }

    const items = repo.listItems(db, {
      type,
      status,
      limit: limit ?? LIST_DEFAULT_LIMIT,
      offset: offset ?? 0,
    })
    return c.json({ data: items })
  })

  app.get('/:id', (c) => {
    const id = parseId(c.req.param('id'))
    const item = repo.getItem(db, id)
    if (!item) return c.json({ error: { message: 'Item not found' } }, 404)
    return c.json({ data: item })
  })

  app.post('/', async (c) => {
    const body = await readJson(c)
    const item = repo.createItem(db, parseCreateBody(body))
    return c.json({ data: item }, 201)
  })

  app.patch('/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    const body = await readJson(c)
    const existing = repo.getItem(db, id)
    if (!existing) return c.json({ error: { message: 'Item not found' } }, 404)

    const patch = parsePatchBody(body)
    const effectiveType = patch.type ?? existing.type
    const effectiveDue = patch.dueAt !== undefined ? patch.dueAt : existing.dueAt
    const effectiveReminder =
      patch.reminderAt !== undefined ? patch.reminderAt : existing.reminderAt
    const effectiveUrl = patch.url !== undefined ? patch.url : existing.url
    const effectiveRecurrence =
      patch.recurrence !== undefined
        ? patch.recurrence
        : patch.type !== undefined && patch.type !== 'task'
          ? null
          : existing.recurrence
    assertReminderRules(effectiveType, effectiveDue, effectiveReminder)
    assertTypeRules(effectiveType, effectiveUrl)
    assertRecurrenceRules(effectiveType, effectiveRecurrence ?? null, effectiveDue ?? null)

    if (
      patch.status === 'done' &&
      existing.type === 'task' &&
      existing.status !== 'done' &&
      existing.status !== 'archived' &&
      existing.recurrence !== null &&
      existing.recurrence !== undefined &&
      existing.recurrence.frequency !== 'none'
    ) {
      const result = completeTask(db, existing)
      return c.json({ data: result.completed })
    }

    const item = repo.updateItem(db, id, patch)
    if (!item) return c.json({ error: { message: 'Item not found' } }, 404)
    return c.json({ data: item })
  })

  app.delete('/:id', (c) => {
    const id = parseId(c.req.param('id'))
    const deleted = repo.deleteItem(db, id)
    if (!deleted) return c.json({ error: { message: 'Item not found' } }, 404)
    return c.body(null, 204)
  })

  return app
}
