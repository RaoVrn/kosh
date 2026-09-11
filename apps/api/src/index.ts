import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { migrate, openDb } from './db.js'
import { processDueReminders, systemClock } from './reminders/scheduler.js'

const port = Number(process.env.PORT ?? 3001)
const dbPath = process.env.KOSH_DB_PATH ?? join(process.cwd(), 'data', 'kosh.db')
const reminderIntervalMs = Number(process.env.KOSH_REMINDER_INTERVAL_MS ?? 30_000)

const db = openDb(dbPath)
migrate(db)
const app = createApp(db)

const runReminders = () => {
  try {
    const processed = processDueReminders(db, systemClock)
    if (processed > 0) console.log(`[reminders] processed ${processed} due reminder(s)`)
  } catch (err) {
    console.error('[reminders] scheduler error', err)
  }
}

runReminders()
const reminderTimer = setInterval(runReminders, reminderIntervalMs)

function shutdown(): void {
  clearInterval(reminderTimer)
  try {
    db.close()
  } catch {
    // already closed
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`kosh-api listening on http://localhost:${info.port}`)
})
