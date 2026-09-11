import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')

export type Db = DatabaseSync

export function openDb(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  return new DatabaseSync(path)
}

export function migrate(db: Db, options: { upTo?: string } = {}): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  )

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[]).map(
      (row) => row.name,
    ),
  )

  const insert = db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)')
  const now = new Date().toISOString()

  for (const file of files) {
    if (options.upTo !== undefined && file > options.upTo) break
    if (applied.has(file)) continue
    db.exec('BEGIN')
    try {
      db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
      insert.run(file, now)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }
}
