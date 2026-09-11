import type { Item } from '@kosh/shared'
import { formatDueAt } from '@kosh/shared'

export interface ScheduledReminderPlan {
  itemId: string
  title: string
  body: string
  at: Date
}

export function planTaskReminders(items: Item[], now: Date = new Date()): ScheduledReminderPlan[] {
  return items
    .filter(
      (i) =>
        i.type === 'task' &&
        i.status !== 'done' &&
        i.status !== 'archived' &&
        Boolean(i.reminderAt),
    )
    .map((i) => ({
      itemId: i.id,
      title: i.title,
      body: i.dueAt ? `Due ${formatDueAt(i.dueAt)}` : 'Your reminder is due.',
      at: new Date(i.reminderAt as string),
    }))
    .filter((p) => p.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}
