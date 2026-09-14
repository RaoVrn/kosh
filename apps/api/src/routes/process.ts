import { Hono } from 'hono'
import type { Db } from '../db.js'
import type {
  InboxProcessingAcceptInput,
  InboxProcessingResult,
  InboxProcessingSuggestion,
} from '@kosh/shared'
import { getItem } from '../items/repo.js'
import * as repo from '../items/repo.js'
import { findProjectByName, getProject } from '../projects/repo.js'
import { parseCreateBody } from '../items/validation.js'
import { ValidationError } from '../items/validation.js'
import { AiProviderError, CaptureValidationError } from '../ai/types.js'
import type { ProcessingService } from '../ai/process/service.js'

const MAX_SUGGESTIONS = 5
const MAX_SOURCE_LENGTH = 4000

export class ProcessingValidationError extends ValidationError {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseProcessedSuggestion(
  value: unknown,
): Omit<InboxProcessingSuggestion, 'sourceText' | 'confidence' | 'category'> {
  if (!isRecord(value)) throw new ProcessingValidationError('Invalid suggestion')
  const suggestion = value as Record<string, unknown>

  const title = typeof suggestion.title === 'string' ? suggestion.title.trim() : ''
  if (!title) throw new ProcessingValidationError('Suggestion title is required')

  const type = typeof suggestion.type === 'string' ? suggestion.type : 'note'
  const priority = typeof suggestion.priority === 'string' ? suggestion.priority : null
  const dueAt = typeof suggestion.dueAt === 'string' ? suggestion.dueAt : null
  const reminderAt = typeof suggestion.reminderAt === 'string' ? suggestion.reminderAt : null
  const tags = Array.isArray(suggestion.tags) ? suggestion.tags : null
  const recurrence = suggestion.recurrence ?? null
  const projectName = typeof suggestion.projectName === 'string' ? suggestion.projectName : null
  const projectId = typeof suggestion.projectId === 'string' ? suggestion.projectId : null

  return {
    title,
    body: typeof suggestion.body === 'string' ? suggestion.body : null,
    type: type as InboxProcessingSuggestion['type'],
    priority: priority as InboxProcessingSuggestion['priority'],
    projectName,
    projectId,
    dueAt,
    reminderAt,
    tags: tags as string[] | null,
    recurrence: recurrence as InboxProcessingSuggestion['recurrence'],
  }
}

function assertProjectAssignable(db: Db, projectId: string | null): void {
  if (!projectId) return
  const project = getProject(db, projectId)
  if (!project) throw new ProcessingValidationError('projectId must reference an existing project')
  if (project.archivedAt) {
    throw new ProcessingValidationError('Cannot assign an item to an archived project')
  }
}

function findDuplicateTitle(db: Db, title: string): boolean {
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM items WHERE lower(title) = lower(?)')
    .get(title) as { c: number }
  return Number(row.c) > 0
}

export function processRoutes(db: Db, service: ProcessingService | undefined): Hono {
  const app = new Hono()

  app.post('/items/:id/process', async (c) => {
    if (!service) {
      return c.json({ error: { message: "Inbox processing isn't configured." } }, 503)
    }

    const id = (c.req.param('id') ?? '').trim()
    if (!id) return c.json({ error: { message: 'A valid item id is required' } }, 400)

    const item = getItem(db, id)
    if (!item) return c.json({ error: { message: 'Item not found' } }, 404)
    if (item.status === 'done' || item.status === 'archived') {
      return c.json({ error: { message: 'Only inbox or active items can be processed' } }, 400)
    }

    const sourceText = [item.title, item.body]
      .filter(Boolean)
      .join('\n')
      .slice(0, MAX_SOURCE_LENGTH)

    let result: InboxProcessingResult
    try {
      result = await service.process({
        text: sourceText,
        timezone: typeof c.req.query('timezone') === 'string' ? c.req.query('timezone') : undefined,
      })
    } catch (err) {
      if (err instanceof AiProviderError || err instanceof CaptureValidationError) {
        return c.json(
          { error: { message: "Couldn't process this capture. Your original item is safe." } },
          502,
        )
      }
      console.error('[process] AI provider failure', err)
      return c.json(
        { error: { message: "Couldn't process this capture. Your original item is safe." } },
        502,
      )
    }

    for (const suggestion of result.suggestions) {
      if (suggestion.projectName) {
        const project = findProjectByName(db, suggestion.projectName)
        if (project && !project.archivedAt) suggestion.projectId = project.id
      }
    }

    return c.json({ data: result })
  })

  app.post('/items/:id/process/accept', async (c) => {
    const id = (c.req.param('id') ?? '').trim()
    if (!id) return c.json({ error: { message: 'A valid item id is required' } }, 400)

    const source = getItem(db, id)
    if (!source) return c.json({ error: { message: 'Item not found' } }, 404)

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { message: 'Invalid JSON body' } }, 400)
    }
    if (!isRecord(body))
      return c.json({ error: { message: 'Request body must be a JSON object' } }, 400)

    const rawSuggestions = Array.isArray(body.suggestions) ? body.suggestions : []
    if (rawSuggestions.length === 0) {
      return c.json({ error: { message: 'No suggestions to accept' } }, 400)
    }
    if (rawSuggestions.length > MAX_SUGGESTIONS) {
      return c.json(
        { error: { message: `At most ${MAX_SUGGESTIONS} suggestions can be accepted` } },
        400,
      )
    }

    const markSourceProcessed = body.markSourceProcessed === true
    const skipTitles = new Set(
      Array.isArray(body.skipDuplicateTitles)
        ? body.skipDuplicateTitles
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.toLowerCase())
        : [],
    )

    const suggestions = rawSuggestions.map(parseProcessedSuggestion)

    const created = []
    const skippedDuplicates: string[] = []
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const suggestion of suggestions) {
        assertProjectAssignable(db, suggestion.projectId ?? null)

        const createData = parseCreateBody({
          title: suggestion.title,
          type: suggestion.type,
          status: 'active',
          priority: suggestion.priority,
          body: suggestion.body,
          dueAt: suggestion.dueAt,
          reminderAt: suggestion.reminderAt,
          tags: suggestion.tags,
          recurrence: suggestion.recurrence,
          projectId: suggestion.projectId,
        })
        assertProjectAssignable(db, createData.projectId ?? null)

        if (findDuplicateTitle(db, createData.title)) {
          if (skipTitles.has(createData.title.toLowerCase())) {
            skippedDuplicates.push(createData.title)
            continue
          }
        }

        created.push(repo.createItem(db, createData))
      }

      let archivedSource = source
      if (markSourceProcessed && created.length > 0) {
        archivedSource = repo.updateItem(db, source.id, { status: 'archived' }) ?? source
      }

      db.exec('COMMIT')
      return c.json({
        data: {
          created,
          source: archivedSource,
          skippedDuplicates,
        },
      })
    } catch (err) {
      db.exec('ROLLBACK')
      if (err instanceof ValidationError) {
        return c.json({ error: { message: err.message } }, 400)
      }
      throw err
    }
  })

  return app
}
