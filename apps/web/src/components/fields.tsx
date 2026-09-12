import {
  formatDueAt,
  formatReminderAt,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@kosh/shared'

interface ChipProps {
  label: string
  active: boolean
  onPress: () => void
}

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <button type="button" className={`chip${active ? ' active' : ''}`} onClick={onPress}>
      {label}
    </button>
  )
}

interface DateTimeFieldProps {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  quick: { label: string; value: string | null }[]
  ariaLabel: string
}

export function DateTimeField({ label, value, onChange, quick, ariaLabel }: DateTimeFieldProps) {
  return (
    <div className="modal-section">
      <div className="modal-label">{label}</div>
      <div className="chip-row">
        {quick.map((q) => (
          <Chip
            key={q.label}
            label={q.label}
            active={value === q.value}
            onPress={() => onChange(q.value)}
          />
        ))}
      </div>
      <input
        type="datetime-local"
        className="datetime-input"
        value={value ? toDatetimeLocalValue(value) : ''}
        onChange={(e) => onChange(e.target.value ? fromDatetimeLocalValue(e.target.value) : null)}
        aria-label={ariaLabel}
      />
      {value ? (
        <p className="modal-meta">
          {label.toLowerCase()} {label === 'Due' ? formatDueAt(value) : formatReminderAt(value)}
        </p>
      ) : null}
    </div>
  )
}
