import { Hono } from 'hono'
import type { Db } from '../db.js'
import * as repo from '../items/repo.js'
import * as attachmentRepo from '../attachments/repo.js'
import * as attachmentStorage from '../attachments/storage.js'
import type { AttachmentConfig } from '../attachments/config.js'
import { getProject } from '../projects/repo.js'
import { buildFtsTextQuery } from '../items/search.js'
import { hasStructuredFilters, parseSearchQuery } from '../search/queryParser.js'
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

function assertProjectAssignable(db: Db, projectId: string | null | undefined): void {
  if (!projectId) return
  const project = getProject(db, projectId)
  if (!project) throw new ValidationError('projectId must reference an existing project')
  if (project.archivedAt) {
    throw new ValidationError('Cannot assign an item to an archived project')
  }
}

export function itemsRoutes(db: Db, attachmentConfig?: AttachmentConfig): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    const type = c.req.query('type')
    const status = c.req.query('status')
    const projectId = c.req.query('projectId')
    if (type !== undefined && !isItemType(type)) {
      return c.json({ error: { message: 'Invalid type filter' } }, 400)
    }
    if (status !== undefined && !isItemStatus(status)) {
      return c.json({ error: { message: 'Invalid status filter' } }, 400)
    }
    if (projectId !== undefined && projectId.trim() === '') {
      return c.json({ error: { message: 'Invalid projectId filter' } }, 400)
    }

    const q = (c.req.query('q') ?? '').trim()
    const limit = parseOptionalInt(c.req.query('limit'), 1, MAX_LIMIT, 'limit')
    const offset = parseOptionalInt(c.req.query('offset'), 0, 100_000, 'offset')

    if (q) {
      const parsed = parseSearchQuery(q)

      if (type !== undefined && parsed.type !== undefined && type !== parsed.type) {
        throw new ValidationError(
          `Conflicting type filters: ?type=${type} and q=type:${parsed.type}`,
        )
      }
      if (status !== undefined && parsed.status !== undefined && status !== parsed.status) {
        throw new ValidationError(
          `Conflicting status filters: ?status=${status} and q=status:${parsed.status}`,
        )
      }
      if (projectId !== undefined && parsed.project !== undefined) {
        const matched = getProject(db, projectId)
        if (!matched || matched.name.toLowerCase() !== parsed.project.toLowerCase()) {
          throw new ValidationError('Conflicting project filters between ?projectId and q=project:')
        }
      }

      const ftsQuery = buildFtsTextQuery(parsed.textTerms, parsed.phrases)
      if (!ftsQuery && !hasStructuredFilters(parsed)) {
        return c.json({
          data: [],
          meta: {
            limit: limit ?? SEARCH_DEFAULT_LIMIT,
            offset: offset ?? 0,
            total: 0,
            hasMore: false,
          },
        })
      }

      const page = repo.searchItems(db, {
        type: parsed.type ?? type,
        status: parsed.status ?? status,
        projectId,
        projectName: parsed.project,
        tags: parsed.tags,
        before: parsed.before,
        after: parsed.after,
        hasAttachment: parsed.hasAttachment,
        query: ftsQuery ?? null,
        limit: limit ?? SEARCH_DEFAULT_LIMIT,
        offset: offset ?? 0,
      })
      return c.json({
        data: page.items,
        meta: {
          limit: page.limit,
          offset: page.offset,
          total: page.total,
          hasMore: page.hasMore,
        },
      })
    }

    const items = repo.listItems(db, {
      type,
      status,
      projectId,
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
    const createData = parseCreateBody(body)
    assertProjectAssignable(db, createData.projectId ?? null)
    const item = repo.createItem(db, createData)
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
    assertProjectAssignable(db, patch.projectId)

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
    if (!repo.getItem(db, id)) return c.json({ error: { message: 'Item not found' } }, 404)

    const stored = attachmentRepo.deleteAttachmentsForItem(db, id)
    const deleted = repo.deleteItem(db, id)
    if (!deleted) return c.json({ error: { message: 'Item not found' } }, 404)

    if (attachmentConfig) {
      for (const name of stored) {
        try {
          attachmentStorage.deleteAttachmentFile(attachmentConfig, name)
        } catch {
          // best-effort physical cleanup; DB rows are already gone
        }
      }
    }
    return c.body(null, 204)
  })

  return app
}
