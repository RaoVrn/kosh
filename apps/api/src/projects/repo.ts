import type { Db } from '../db.js'
import type { Project, ProjectInput, ProjectUpdate } from '@kosh/shared'
import { uid } from '@kosh/shared'

const COLUMNS = 'id, name, description, created_at, updated_at, archived_at'

export interface ProjectRow {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  }
}

export function listProjects(db: Db): Project[] {
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM projects ORDER BY lower(name) ASC`)
    .all() as unknown as ProjectRow[]
  return rows.map(toProject)
}

export function getProject(db: Db, id: string): Project | null {
  const row = db.prepare(`SELECT ${COLUMNS} FROM projects WHERE id = ?`).get(id) as
    ProjectRow | undefined
  return row ? toProject(row) : null
}

export function findProjectByName(db: Db, name: string): Project | null {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM projects WHERE lower(name) = lower(?)`)
    .get(name) as ProjectRow | undefined
  return row ? toProject(row) : null
}

export function createProject(db: Db, input: ProjectInput): Project {
  const now = new Date().toISOString()
  const project: Project = {
    id: uid(),
    name: input.name,
    description: input.description ?? null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  }
  db.prepare(`INSERT INTO projects (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?)`).run(
    project.id,
    project.name,
    project.description ?? null,
    project.createdAt,
    project.updatedAt,
    null,
  )
  return project
}

export function updateProject(db: Db, id: string, patch: ProjectUpdate): Project | null {
  const existing = getProject(db, id)
  if (!existing) return null

  const next: Project = { ...existing }
  if (patch.name !== undefined) next.name = patch.name
  if (patch.description !== undefined) next.description = patch.description
  if (patch.archivedAt !== undefined) next.archivedAt = patch.archivedAt
  next.updatedAt = new Date().toISOString()

  db.prepare(
    `UPDATE projects SET name = ?, description = ?, updated_at = ?, archived_at = ? WHERE id = ?`,
  ).run(next.name, next.description ?? null, next.updatedAt, next.archivedAt ?? null, id)
  return getProject(db, id)
}

export function deleteProject(db: Db, id: string): boolean {
  db.prepare('UPDATE items SET project_id = NULL WHERE project_id = ?').run(id)
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  return result.changes > 0
}
