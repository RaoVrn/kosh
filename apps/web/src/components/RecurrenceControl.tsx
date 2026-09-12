import { WEEKDAY_LETTERS, WEEKDAYS } from '@kosh/shared'
import type { Recurrence } from '@kosh/shared'
import { recurrenceFrequencyLabel } from '@kosh/shared'

const FREQUENCIES = ['none', 'daily', 'weekly', 'monthly'] as const

interface RecurrenceControlProps {
  value: Recurrence | null
  onChange: (recurrence: Recurrence | null) => void
}

export function RecurrenceControl({ value, onChange }: RecurrenceControlProps) {
  const frequency = value?.frequency ?? 'none'

  const setFrequency = (f: (typeof FREQUENCIES)[number]) => {
    if (f === 'none') onChange(null)
    else if (f === 'daily') onChange({ frequency: 'daily' })
    else if (f === 'weekly') {
      const weekdays = value?.frequency === 'weekly' && value.weekdays?.length ? value.weekdays : []
      onChange({ frequency: 'weekly', weekdays })
    } else {
      const dayOfMonth = value?.frequency === 'monthly' ? (value.dayOfMonth ?? 15) : 15
      onChange({ frequency: 'monthly', dayOfMonth })
    }
  }

  const toggleWeekday = (day: number) => {
    const current = value?.frequency === 'weekly' ? (value.weekdays ?? []) : []
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)
    onChange({ frequency: 'weekly', weekdays: next })
  }

  const setDayOfMonth = (raw: string) => {
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 31) return
    onChange({ frequency: 'monthly', dayOfMonth: n })
  }

  return (
    <div className="recurrence-control">
      <div className="chip-row">
        {FREQUENCIES.map((f) => (
          <button
            key={f}
            type="button"
            className={`chip${frequency === f ? ' active' : ''}`}
            aria-pressed={frequency === f}
            onClick={() => setFrequency(f)}
          >
            {recurrenceFrequencyLabel[f]}
          </button>
        ))}
      </div>

      {frequency === 'weekly' ? (
        <div className="weekday-row" role="group" aria-label="Repeat on weekdays">
          {WEEKDAYS.map((day) => {
            const selected = value?.weekdays?.includes(day) ?? false
            return (
              <button
                key={day}
                type="button"
                className={`weekday${selected ? ' selected' : ''}`}
                aria-pressed={selected}
                aria-label={`${day === 0 ? 'Sunday' : day === 1 ? 'Monday' : day === 2 ? 'Tuesday' : day === 3 ? 'Wednesday' : day === 4 ? 'Thursday' : day === 5 ? 'Friday' : 'Saturday'} ${selected ? '(selected)' : ''}`}
                onClick={() => toggleWeekday(day)}
              >
                {WEEKDAY_LETTERS[day]}
              </button>
            )
          })}
        </div>
      ) : null}

      {frequency === 'monthly' ? (
        <label className="monthly-day">
          Day of month:
          <input
            type="number"
            min={1}
            max={31}
            value={value?.frequency === 'monthly' ? String(value.dayOfMonth ?? 15) : '15'}
            onChange={(e) => setDayOfMonth(e.target.value)}
            aria-label="Day of month"
          />
        </label>
      ) : null}
    </div>
  )
}
