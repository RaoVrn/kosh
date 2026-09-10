import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { migrate, openDb } from './db.js'

const port = Number(process.env.PORT ?? 3001)
const dbPath = process.env.KOSH_DB_PATH ?? join(process.cwd(), 'data', 'kosh.db')

const db = openDb(dbPath)
migrate(db)
const app = createApp(db)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`kosh-api listening on http://localhost:${info.port}`)
})
