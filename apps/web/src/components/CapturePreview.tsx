import { useState } from 'react'
import type { CaptureResult, ItemType, Priority, Recurrence } from '@kosh/shared'
import {
  ITEM_TYPES,
  PRIORITIES,
  atTimeOnDay,
  endOfDayFromNow,
  errorMessage,
  isValidHttpUrl,
  priorityLabel,
  recurrenceLabel,
  typeLabel,
  useItems,
} from '@kosh/shared'
import { Icon } from './Icon'
import { TagInput } from './TagInput'
import { Chip, DateTimeField } from './fields'
import { RecurrenceControl } from './RecurrenceControl'
import { ProjectSelector } from './ProjectSelector'

interface CapturePreviewProps {
  result: CaptureResult
  originalText: string
  onSave: () => void
  onCancel: () => void
  onInbox: () => void
}

export function CapturePreview({
  result,
  originalText,
  onSave,
  onCancel,
  onInbox,
}: CapturePreviewProps) {
  const { addItem } = useItems()
  const [type, setType] = useState<ItemType>(result.type)
  const [title, setTitle] = useState(result.title)
  const [body, setBody] = useState(result.body ?? '')
  const [url, setUrl] = useState(result.url ?? '')
  const [priority, setPriority] = useState<Priority | null>(result.priority)
  const [dueAt, setDueAt] = useState<string | null>(result.dueAt)
  const [reminderAt, setReminderAt] = useState<string | null>(result.reminderAt)
  const [tags, setTags] = useState<string[]>(result.tags ?? [])
  const [recurrence, setRecurrence] = useState<Recurrence | null>(result.recurrence ?? null)
  const [projectId, setProjectId] = useState<string | null>(result.projectId ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isTask = type === 'task'
  const isLearning = type === 'learning'
  const urlValid = type !== 'link' || isValidHttpUrl(url.trim())
  const reminderConflict = dueAt && reminderAt && new Date(reminderAt) > new Date(dueAt)
  const canSave = title.trim().length > 0 && urlValid && !reminderConflict && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await addItem({
        title,
        type,
        body: body || undefined,
        url: url.trim() || undefined,
        priority: isTask || isLearning ? priority : undefined,
        dueAt: isTask ? dueAt : undefined,
        reminderAt: isTask ? reminderAt : undefined,
        tags: tags.length > 0 ? tags : null,
        recurrence: isTask ? recurrence : null,
        projectId,
      })
      onSave()
    } catch (err) {
      setError(errorMessage(err, 'Could not save the item'))
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-header">
        <div className="preview-heading">
          <span className="preview-kicked">Kosh understood this as</span>
          <span className={`badge confidence confidence-${result.confidence}`}>
            Confidence: {result.confidence}
          </span>
        </div>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Close">
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="modal-section">
        <div className="modal-label">Type</div>
        <div className="chip-row">
          {ITEM_TYPES.map((t) => (
            <Chip key={t} label={typeLabel[t]} active={type === t} onPress={() => setType(t)} />
          ))}
        </div>
      </div>

      <input
        className="modal-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Title"
      />

      <div className="modal-section">
        <div className="modal-label">Content</div>
        <textarea
          className="modal-body-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add details…"
          aria-label="Details"
        />
      </div>

      {type !== 'task' ? (
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
            <p className="modal-meta warning">A valid http(s) URL is required for links.</p>
          ) : null}
        </div>
      ) : null}

      <div className="modal-section">
        <div className="modal-label">Tags</div>
        <TagInput tags={tags} onChange={setTags} ariaLabel="Tags" />
      </div>

      <div className="modal-section">
        <div className="modal-label">Project</div>
        <ProjectSelector value={projectId} onChange={setProjectId} />
      </div>

      {isTask || isLearning ? (
        <div className="modal-section">
          <div className="modal-label">Priority</div>
          <div className="chip-row">
            <Chip label="None" active={!priority} onPress={() => setPriority(null)} />
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

          {recurrence && recurrence.frequency !== 'none' ? (
            <p className="modal-meta repeat-note">Repeat: {recurrenceLabel(recurrence)}</p>
          ) : null}

          <div className="modal-section">
            <div className="modal-label">Repeat</div>
            <RecurrenceControl value={recurrence} onChange={setRecurrence} />
          </div>
        </>
      ) : null}

      {error ? <p className="modal-meta error-text">{error}</p> : null}

      <div className="modal-actions">
        <button
          type="button"
          className="btn-primary btn-block"
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          Save
        </button>
        <div className="modal-actions-row">
          <button type="button" className="btn-secondary" onClick={onInbox}>
            Save to Inbox
          </button>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
      <p className="modal-meta original-note">Original: {originalText}</p>
    </>
  )
}
