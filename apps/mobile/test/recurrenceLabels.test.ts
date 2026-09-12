import { describe, expect, it } from 'vitest'
import { recurrenceFrequencyLabel, recurrenceLabel } from '@kosh/shared'
import type { Recurrence } from '@kosh/shared'

describe('recurrenceLabel', () => {
  it('returns null for none/missing recurrence', () => {
    expect(recurrenceLabel(null)).toBeNull()
    expect(recurrenceLabel(undefined)).toBeNull()
    expect(recurrenceLabel({ frequency: 'none' })).toBeNull()
  })

  it('labels daily recurrence', () => {
    expect(recurrenceLabel({ frequency: 'daily' })).toBe('Daily')
  })

  it('labels weekly recurrence with one day', () => {
    expect(recurrenceLabel({ frequency: 'weekly', weekdays: [1] })).toBe('Every Mon')
  })

  it('labels weekly recurrence with multiple days', () => {
    expect(recurrenceLabel({ frequency: 'weekly', weekdays: [1, 3, 5] })).toBe('Mon, Wed, Fri')
  })

  it('labels monthly recurrence', () => {
    expect(recurrenceLabel({ frequency: 'monthly', dayOfMonth: 15 })).toBe('Monthly on 15')
  })

  it('provides frequency labels for the control', () => {
    const labels: Record<string, string> = recurrenceFrequencyLabel
    expect(labels.none).toBe('Does not repeat')
    expect(labels.daily).toBe('Every day')
    expect(labels.weekly).toBe('Every week')
    expect(labels.monthly).toBe('Every month')
  })
})

describe('recurrence values are well-formed', () => {
  it('samples used in UIs validate against the Recurrence type', () => {
    const samples: Recurrence[] = [
      { frequency: 'daily' },
      { frequency: 'weekly', weekdays: [1] },
      { frequency: 'weekly', weekdays: [1, 3, 5] },
      { frequency: 'monthly', dayOfMonth: 15 },
    ]
    expect(samples).toHaveLength(4)
    for (const s of samples) expect(recurrenceLabel(s)).toBeTruthy()
  })
})
