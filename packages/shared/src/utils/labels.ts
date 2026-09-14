import type { ItemStatus, ItemType, Priority } from '../index'
import { WEEKDAY_SHORT } from './recurrence'
import type { Recurrence, RecurrenceFrequency } from './recurrence'

export const typeLabel: Record<ItemType, string> = {
  task: 'Task',
  note: 'Note',
  idea: 'Idea',
  learning: 'Learning',
  link: 'Link',
}

export const statusLabel: Record<ItemStatus, string> = {
  inbox: 'Inbox',
  active: 'Active',
  done: 'Done',
  archived: 'Archived',
}

export const learningStatusLabel: Record<ItemStatus, string> = {
  inbox: 'Not started',
  active: 'In progress',
  done: 'Completed',
  archived: 'Archived',
}

export const priorityLabel: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const recurrenceFrequencyLabel: Record<RecurrenceFrequency, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
}

export function recurrenceLabel(recurrence: Recurrence | null | undefined): string | null {
  if (!recurrence || recurrence.frequency === 'none') return null
  switch (recurrence.frequency) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      if (!recurrence.weekdays || recurrence.weekdays.length === 0) return 'Weekly'
      if (recurrence.weekdays.length === 1) {
        const first = recurrence.weekdays[0]
        return first === undefined ? 'Weekly' : `Every ${WEEKDAY_SHORT[first]}`
      }
      return recurrence.weekdays
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_SHORT[d])
        .join(', ')
    case 'monthly':
      return `Monthly on ${recurrence.dayOfMonth ?? 1}`
    default:
      return null
  }
}
