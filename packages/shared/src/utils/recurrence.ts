export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly'

export const RECURRENCE_FREQUENCIES: readonly RecurrenceFrequency[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
]

export const WEEKDAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6]

export const WEEKDAY_SHORT: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const WEEKDAY_LETTERS: readonly string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export interface Recurrence {
  frequency: RecurrenceFrequency
  weekdays?: number[]
  dayOfMonth?: number
}
