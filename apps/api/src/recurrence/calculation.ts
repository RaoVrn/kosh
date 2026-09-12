import type { Recurrence } from '@kosh/shared'

export class RecurrenceCalculationError extends Error {}

/**
 * Computes the next occurrence's due time for a recurring task.
 * All arithmetic happens on the user's LOCAL calendar (via the local
 * components of the stored ISO timestamp), so "Monday" stays the local
 * Monday even across UTC boundary/DST changes. The time of day is preserved.
 */
export function nextOccurrenceDue(dueAtIso: string, recurrence: Recurrence): string {
  const due = new Date(dueAtIso)
  if (Number.isNaN(due.getTime())) {
    throw new RecurrenceCalculationError('Invalid due date for recurrence calculation')
  }

  const year = due.getFullYear()
  const month = due.getMonth()
  const day = due.getDate()
  const hour = due.getHours()
  const minute = due.getMinutes()
  const second = due.getSeconds()
  const ms = due.getMilliseconds()

  switch (recurrence.frequency) {
    case 'daily':
      return new Date(year, month, day + 1, hour, minute, second, ms).toISOString()

    case 'weekly': {
      const weekdays =
        recurrence.weekdays && recurrence.weekdays.length > 0 ? recurrence.weekdays : [due.getDay()]
      const today = due.getDay()
      let offset = 1
      while (offset <= 7) {
        if (weekdays.includes((today + offset) % 7)) break
        offset += 1
      }
      return new Date(year, month, day + offset, hour, minute, second, ms).toISOString()
    }

    case 'monthly': {
      // Clamp to the last valid day of the target month (e.g. Jan 31 → Feb
      // 28/29). The next completion recovers the original day-of-month
      // (Mar 31) because we always target the stored day.
      const target = recurrence.dayOfMonth ?? day
      const lastDayOfTargetMonth = new Date(year, month + 2, 0).getDate()
      const clamped = Math.min(target, lastDayOfTargetMonth)
      return new Date(year, month + 1, clamped, hour, minute, second, ms).toISOString()
    }

    case 'none':
      throw new RecurrenceCalculationError(
        'Cannot calculate a next occurrence for a non-recurring task',
      )
  }
}
