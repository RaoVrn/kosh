import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { migrate, openDb } from '../src/db.js'
import type { Db } from '../src/db.js'

describe('health route', () => {
  let db: Db

  beforeEach(() => {
    db = openDb(':memory:')
    migrate(db)
  })

  it('reports ok with a working database', async () => {
    const app = createApp(db)
    const res = await app.request('/api/v1/health')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', db: 'ok' })
  })

  it('applies migrations on startup', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'items'")
      .get()
    expect(row).toBeTruthy()
  })
})
