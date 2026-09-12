import { Hono } from 'hono'
import type { Db } from '../db.js'
import * as repo from '../projects/repo.js'
import { ValidationError, parseId } from '../items/validation.js'

const MAX_NAME = 120
const MAX_DESCRIPTION = 2000

export class ProjectValidationError extends ValidationError {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new ProjectValidationError(message)
}

export function parseProjectInput(body: unknown): { name: string; description: string | null } {
  if (!isRecord(body)) fail('Request body must be a JSON object')
  if (typeof body.name !== 'string' || body.name.trim() === '') fail('name is required')
  const name = body.name.trim()
  if (name.length > MAX_NAME) fail('name is too long')

  let description: string | null = null
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') fail('description must be a string')
    const trimmed = body.description.trim()
    if (trimmed.length > MAX_DESCRIPTION) fail('description is too long')
    description = trimmed.length > 0 ? trimmed : null
  }
  return { name, description }
}

export function parseProjectPatch(body: unknown): {
  name?: string
  description?: string | null
  archivedAt?: string | null
} {
  if (!isRecord(body)) fail('Request body must be a JSON object')
  const patch: { name?: string; description?: string | null; archivedAt?: string | null } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '')
      fail('name must be a non-empty string')
    const name = body.name.trim()
    if (name.length > MAX_NAME) fail('name is too long')
    patch.name = name
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      fail('description must be a string')
    }
    const trimmed = body.description?.trim() ?? ''
    if (trimmed.length > MAX_DESCRIPTION) fail('description is too long')
    patch.description = trimmed.length > 0 ? trimmed : null
  }
  if (body.archivedAt !== undefined) {
    if (body.archivedAt === null) {
      patch.archivedAt = null
    } else if (typeof body.archivedAt === 'string' && !Number.isNaN(Date.parse(body.archivedAt))) {
      patch.archivedAt = new Date(body.archivedAt).toISOString()
    } else {
      fail('archivedAt must be a valid ISO-8601 date or null')
    }
  }
  if (Object.keys(patch).length === 0) fail('No fields to update')
  return patch
}

export function projectsRoutes(db: Db): Hono {
  const app = new Hono()

  app.get('/', (c) => {
    return c.json({ data: repo.listProjects(db) })
  })

  app.get('/:id', (c) => {
    const id = parseId(c.req.param('id'))
    const project = repo.getProject(db, id)
    if (!project) return c.json({ error: { message: 'Project not found' } }, 404)
    return c.json({ data: project })
  })

  app.post('/', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      throw new ProjectValidationError('Invalid JSON body')
    }
    const input = parseProjectInput(body)
    if (repo.findProjectByName(db, input.name)) {
      fail('A project with this name already exists')
    }
    const project = repo.createProject(db, input)
    return c.json({ data: project }, 201)
  })

  app.patch('/:id', async (c) => {
    const id = parseId(c.req.param('id'))
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      throw new ProjectValidationError('Invalid JSON body')
    }
    const patch = parseProjectPatch(body)
    if (patch.name !== undefined && patch.name !== null) {
      const existing = repo.findProjectByName(db, patch.name)
      if (existing && existing.id !== id) fail('A project with this name already exists')
    }
    const project = repo.updateProject(db, id, patch)
    if (!project) return c.json({ error: { message: 'Project not found' } }, 404)
    return c.json({ data: project })
  })

  app.delete('/:id', (c) => {
    const id = parseId(c.req.param('id'))
    const deleted = repo.deleteProject(db, id)
    if (!deleted) return c.json({ error: { message: 'Project not found' } }, 404)
    return c.body(null, 204)
  })

  return app
}
