import { useState } from 'react'
import type { Priority } from '@kosh/shared'
import {
  PRIORITIES,
  atTimeOnDay,
  endOfDayFromNow,
  errorMessage,
  formatDueAt,
  formatReminderAt,
  fromDatetimeLocalValue,
  priorityLabel,
  toDatetimeLocalValue,
  useItems,
} from '@kosh/shared'
import { Icon } from './Icon'

interface TaskCreateModalProps {
  onClose: () => void
}

export function TaskCreateModal({ onClose }: TaskCreateModalProps) {
  const { addItem } = useItems()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueAt, setDueAt] = useState<string | null>(null)
  const [reminderAt, setReminderAt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = title.trim().length > 0 && !submitting
  const reminderConflict = dueAt && reminderAt && new Date(reminderAt) > new Date(dueAt)

  const handleCreate = async () => {
    if (!canCreate) return
    setSubmitting(true)
    setError(null)
    try {
      await addItem({
        title,
        type: 'task',
        priority,
        dueAt,
        reminderAt,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Could not create the task'))
      setSubmitting(false)
    }
  }

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="New task">
        <div className="modal-header">
          <h2 className="modal-title-header">New Task</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <input
          className="modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          aria-label="Task title"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleCreate()
          }}
        />

        <div className="modal-section">
          <div className="modal-label">Priority</div>
          <div className="chip-row">
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={priorityLabel[p]}
                active={priority === p}
                onPress={() => setPriority(p)}
              />
            ))}
          </div>
        </div>

        <DateTimeField
          label="Due"
          value={dueAt}
          onChange={setDueAt}
          quick={[
            { label: 'None', value: null },
            { label: 'Today', value: endOfDayFromNow(0) },
            { label: 'Tomorrow', value: endOfDayFromNow(1) },
            { label: 'In a week', value: endOfDayFromNow(7) },
          ]}
          ariaLabel="Due date and time"
        />

        <DateTimeField
          label="Reminder"
          value={reminderAt}
          onChange={setReminderAt}
          quick={[
            { label: 'None', value: null },
            { label: 'In 1 hour', value: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
            { label: 'Today 9 AM', value: atTimeOnDay(0, 9, 0) },
            { label: 'Tomorrow 9 AM', value: atTimeOnDay(1, 9, 0) },
          ]}
          ariaLabel="Reminder date and time"
        />
        {reminderConflict ? (
          <p className="modal-meta warning">Reminder must not be after the due time.</p>
        ) : null}
        {error ? <p className="modal-meta error-text">{error}</p> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary btn-block"
            disabled={!canCreate}
            onClick={() => void handleCreate()}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}

interface DateTimeFieldProps {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  quick: { label: string; value: string | null }[]
  ariaLabel: string
}

function DateTimeField({ label, value, onChange, quick, ariaLabel }: DateTimeFieldProps) {
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

interface ChipProps {
  label: string
  active: boolean
  onPress: () => void
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <button type="button" className={`chip${active ? ' active' : ''}`} onClick={onPress}>
      {label}
    </button>
  )
}
