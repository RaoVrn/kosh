import type { Recurrence, RecurrenceFrequency } from '@kosh/shared'
import { RECURRENCE_FREQUENCIES } from '@kosh/shared'
import { ValidationError } from '../items/validation.js'

function fail(message: string): never {
  throw new ValidationError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isRecurrenceFrequency(value: unknown): value is RecurrenceFrequency {
  return typeof value === 'string' && (RECURRENCE_FREQUENCIES as readonly string[]).includes(value)
}

function parseWeekdays(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) fail('weekly recurrence requires weekdays')
  const seen = new Set<number>()
  const weekdays: number[] = []
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > 6) {
      fail('weekdays must be integers between 0 (Sunday) and 6 (Saturday)')
    }
    if (seen.has(item)) fail('weekdays must not contain duplicates')
    seen.add(item)
    weekdays.push(item)
  }
  return weekdays.sort((a, b) => a - b)
}

function parseDayOfMonth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 31) {
    fail('dayOfMonth must be an integer between 1 and 31')
  }
  return value
}

/**
 * Parses and validates a recurrence value.
 * - undefined → undefined (field not provided; PATCH leaves it unchanged)
 * - null → null (recurrence cleared)
 * - { frequency: 'none' } → null (normalized)
 * - invalid → throws ValidationError
 */
export function parseRecurrence(value: unknown): Recurrence | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!isRecord(value)) fail('recurrence must be an object')
  if (!isRecurrenceFrequency(value.frequency)) {
    fail(`recurrence.frequency must be one of: ${RECURRENCE_FREQUENCIES.join(', ')}`)
  }

  switch (value.frequency) {
    case 'none':
      return null
    case 'daily':
      return { frequency: 'daily' }
    case 'weekly':
      return { frequency: 'weekly', weekdays: parseWeekdays(value.weekdays) }
    case 'monthly':
      return { frequency: 'monthly', dayOfMonth: parseDayOfMonth(value.dayOfMonth) }
  }
}

export function assertRecurrenceRules(
  type: string,
  recurrence: Recurrence | null | undefined,
): void {
  if (!recurrence) return
  if (type !== 'task') fail('recurrence is only supported on tasks')
}

export function recurrenceRequiresDueDate(recurrence: Recurrence | null | undefined): boolean {
  return !!recurrence && recurrence.frequency !== 'none'
}
