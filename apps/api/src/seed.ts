import { join } from 'node:path'
import { createMockItems } from '@kosh/shared'
import { loadEnv } from './env.js'
import { migrate, openDb } from './db.js'
import { countItems, insertItem } from './items/repo.js'

loadEnv()

const dbPath = process.env.KOSH_DB_PATH ?? join(process.cwd(), 'data', 'kosh.db')

const db = openDb(dbPath)
migrate(db)

const existing = countItems(db)
if (existing > 0) {
  console.log(`items table already has ${existing} items — nothing to seed.`)
  process.exit(0)
}

const items = createMockItems()
for (const item of items) {
  insertItem(db, item)
}

console.log(`Seeded ${items.length} mock items into ${dbPath}`)
