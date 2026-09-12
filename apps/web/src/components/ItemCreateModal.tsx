import { useState } from 'react'
import type { ItemStatus, ItemType, Priority } from '@kosh/shared'
import {
  ITEM_STATUSES,
  PRIORITIES,
  atTimeOnDay,
  endOfDayFromNow,
  errorMessage,
  formatDueAt,
  formatReminderAt,
  fromDatetimeLocalValue,
  isValidHttpUrl,
  priorityLabel,
  statusLabel,
  toDatetimeLocalValue,
  typeLabel,
  useItems,
} from '@kosh/shared'
import { Icon } from './Icon'
import { TagInput } from './TagInput'

interface ItemCreateModalProps {
  type: ItemType
  onClose: () => void
}

export function ItemCreateModal({ type, onClose }: ItemCreateModalProps) {
  const { addItem } = useItems()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>('medium')
  const [status, setStatus] = useState<ItemStatus>('inbox')
  const [dueAt, setDueAt] = useState<string | null>(null)
  const [reminderAt, setReminderAt] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTask = type === 'task'
  const isLearning = type === 'learning'
  const showUrl = type === 'idea' || type === 'learning' || type === 'link'
  const showBody = type === 'note' || type === 'idea' || type === 'learning' || type === 'link'
  const urlValid = type !== 'link' || isValidHttpUrl(url.trim())

  const titlePlaceholder =
    type === 'task'
      ? 'What needs to be done?'
      : type === 'link'
        ? 'Link title'
        : `${typeLabel[type]} title`
  const canCreate = title.trim().length > 0 && !submitting && urlValid
  const reminderConflict = dueAt && reminderAt && new Date(reminderAt) > new Date(dueAt)

  const handleCreate = async () => {
    if (!canCreate) return
    setSubmitting(true)
    setError(null)
    try {
      await addItem({
        title,
        body: showBody && body ? body : undefined,
        url: url.trim() || undefined,
        type,
        status: isLearning ? status : isTask ? undefined : 'active',
        priority: isTask || isLearning ? priority : undefined,
        dueAt: isTask ? dueAt : undefined,
        reminderAt: isTask ? reminderAt : undefined,
        tags: tags.length > 0 ? tags : null,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err, `Could not create the ${typeLabel[type].toLowerCase()}`))
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
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`New ${typeLabel[type].toLowerCase()}`}
      >
        <div className="modal-header">
          <h2 className="modal-title-header">New {typeLabel[type]}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <input
          className="modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={titlePlaceholder}
          aria-label="Title"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !showBody) void handleCreate()
          }}
        />

        {showBody ? (
          <div className="modal-section">
            <div className="modal-label">Content</div>
            <textarea
              className="modal-body-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Add details…"
              aria-label="Details"
            />
          </div>
        ) : null}

        {showUrl ? (
          <div className="modal-section">
            <div className="modal-label">Link</div>
            <input
              className="modal-title-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              aria-label="URL"
            />
            {type === 'link' && !urlValid ? (
              <p className="modal-meta warning">A valid http(s) URL is required.</p>
            ) : null}
          </div>
        ) : null}

        <div className="modal-section">
          <div className="modal-label">Tags</div>
          <TagInput tags={tags} onChange={setTags} ariaLabel="Tags" />
        </div>

        {isTask || isLearning ? (
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
        ) : null}

        {isLearning ? (
          <div className="modal-section">
            <div className="modal-label">Status</div>
            <div className="chip-row">
              {ITEM_STATUSES.filter((s) => s !== 'archived').map((s) => (
                <Chip
                  key={s}
                  label={statusLabel[s]}
                  active={status === s}
                  onPress={() => setStatus(s)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {isTask ? (
          <>
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
          </>
        ) : null}

        {error ? <p className="modal-meta error-text">{error}</p> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary btn-block"
            disabled={!canCreate}
            onClick={() => void handleCreate()}
          >
            Create {typeLabel[type]}
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
