import type { Db } from '../db.js'
import type { Item } from '@kosh/shared'
import { formatReminderAt } from '@kosh/shared'
import * as itemRepo from '../items/repo.js'
import * as notifRepo from '../notifications/repo.js'

export interface Clock {
  now: () => Date
}

export const systemClock: Clock = { now: () => new Date() }

export interface NotificationService {
  deliver: (db: Db, item: Item) => void
}

export const persistNotificationService: NotificationService = {
  deliver: (db, item) => {
    notifRepo.createNotification(db, {
      itemId: item.id,
      type: 'reminder',
      title: item.title,
      body: item.reminderAt
        ? `Reminder — ${formatReminderAt(item.reminderAt)}`
        : 'Your reminder is due.',
    })
  },
}

export function processDueReminders(
  db: Db,
  clock: Clock = systemClock,
  notifier: NotificationService = persistNotificationService,
): number {
  const now = clock.now()
  const due = itemRepo.listDueReminders(db, now.toISOString())
  let processed = 0
  for (const item of due) {
    if (itemRepo.claimReminder(db, item.id, now.toISOString())) {
      notifier.deliver(db, item)
      processed++
    }
  }
  return processed
}
