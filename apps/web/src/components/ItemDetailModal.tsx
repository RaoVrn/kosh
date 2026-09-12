import {
  ITEM_STATUSES,
  ITEM_TYPES,
  PRIORITIES,
  atTimeOnDay,
  endOfDayFromNow,
  formatDue,
  formatDueAt,
  formatFull,
  formatReminderAt,
  fromDatetimeLocalValue,
  isOverdue,
  isSameDay,
  isToday,
  isTomorrow,
  priorityLabel,
  statusLabel,
  toDatetimeLocalValue,
  typeLabel,
  useItems,
} from '@kosh/shared'
import type { ItemPatch, Recurrence } from '@kosh/shared'
import { useCallback, useEffect } from 'react'
import { useNav } from '../state/NavContext'
import { TypeBadge } from './TypeBadge'
import { Icon } from './Icon'
import { TagInput } from './TagInput'
import { RecurrenceControl } from './RecurrenceControl'

export function ItemDetailModal() {
  const { selectedItemId, closeItem } = useNav()
  const { getItem, updateItem, toggleDone, removeItem } = useItems()

  const item = selectedItemId ? getItem(selectedItemId) : undefined

  useEffect(() => {
    if (!selectedItemId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeItem()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedItemId, closeItem])

  const save = useCallback(
    (patch: ItemPatch) => {
      if (!item) return
      const processPatch = item.status === 'inbox' ? { status: 'active' as const } : {}
      void updateItem(item.id, { ...patch, ...processPatch })
    },
    [item, updateItem],
  )

  if (!item) return null

  const done = item.status === 'done'
  const isTask = item.type === 'task'
  const reminderConflict =
    item.dueAt && item.reminderAt && new Date(item.reminderAt) > new Date(item.dueAt)

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeItem()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={item.title}>
        <div className="modal-header">
          <TypeBadge type={item.type} />
          <div className="modal-header-actions">
            {item.url ? (
              <a
                className="icon-btn"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open link"
              >
                <Icon name="external-link" size={18} />
              </a>
            ) : null}
            <button type="button" className="icon-btn" onClick={closeItem} aria-label="Close">
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>

        <textarea
          className="modal-title"
          value={item.title}
          onChange={(e) => save({ title: e.target.value })}
          rows={1}
          aria-label="Item title"
        />
        <textarea
          className="modal-body"
          value={item.body ?? ''}
          onChange={(e) => save({ body: e.target.value })}
          rows={3}
          placeholder="Add details…"
          aria-label="Item details"
        />

        {item.type !== 'task' ? (
          <div className="modal-section">
            <div className="modal-label">Link</div>
            <input
              className="modal-title-input"
              value={item.url ?? ''}
              onChange={(e) => save({ url: e.target.value })}
              placeholder="https://…"
              aria-label="URL"
            />
            {item.type === 'link' && !item.url ? (
              <p className="modal-meta warning">A valid http(s) URL is required for links.</p>
            ) : null}
          </div>
        ) : null}

        <div className="modal-section">
          <div className="modal-label">Tags</div>
          <TagInput tags={item.tags ?? []} onChange={(tags) => save({ tags })} ariaLabel="Tags" />
        </div>

        <div className="modal-section">
          <div className="modal-label">Type</div>
          <div className="chip-row">
            {ITEM_TYPES.map((t) => (
              <Chip
                key={t}
                label={typeLabel[t]}
                active={item.type === t}
                onPress={() => save({ type: t })}
              />
            ))}
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-label">Priority</div>
          <div className="chip-row">
            <Chip label="None" active={!item.priority} onPress={() => save({ priority: null })} />
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={priorityLabel[p]}
                active={item.priority === p}
                onPress={() => save({ priority: p })}
              />
            ))}
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-label">Status</div>
          <div className="chip-row">
            {ITEM_STATUSES.map((s) => (
              <Chip
                key={s}
                label={statusLabel[s]}
                active={item.status === s}
                onPress={() => updateItem(item.id, { status: s })}
              />
            ))}
          </div>
        </div>

        {isTask ? (
          <div className="modal-section">
            <div className="modal-label">Repeat</div>
            <RecurrenceControl
              value={item.recurrence ?? null}
              onChange={(recurrence: Recurrence | null) => save({ recurrence })}
            />
          </div>
        ) : null}

        <div className="modal-section">
          <div className="modal-label">Due</div>
          <div className="chip-row">
            <Chip label="None" active={!item.dueAt} onPress={() => save({ dueAt: null })} />
            <Chip
              label="Today"
              active={item.dueAt ? isToday(item.dueAt) : false}
              onPress={() => save({ dueAt: endOfDayFromNow(0) })}
            />
            <Chip
              label="Tomorrow"
              active={item.dueAt ? isTomorrow(item.dueAt) : false}
              onPress={() => save({ dueAt: endOfDayFromNow(1) })}
            />
            <Chip
              label="In a week"
              active={
                item.dueAt ? isSameDay(new Date(item.dueAt), new Date(endOfDayFromNow(7))) : false
              }
              onPress={() => save({ dueAt: endOfDayFromNow(7) })}
            />
          </div>
          <input
            type="datetime-local"
            className="datetime-input"
            value={item.dueAt ? toDatetimeLocalValue(item.dueAt) : ''}
            onChange={(e) =>
              save({
                dueAt: e.target.value ? fromDatetimeLocalValue(e.target.value) : null,
              })
            }
            aria-label="Due date and time"
          />
          {item.dueAt ? (
            <p className="modal-meta">
              Due {formatDue(item.dueAt)} · {formatDueAt(item.dueAt)}
              {isOverdue(item.dueAt) && !done ? ' · overdue' : ''}
            </p>
          ) : null}
        </div>

        {isTask ? (
          <div className="modal-section">
            <div className="modal-label">Reminder</div>
            <div className="chip-row">
              <Chip
                label="None"
                active={!item.reminderAt}
                onPress={() => save({ reminderAt: null })}
              />
              <Chip
                label="In 1 hour"
                active={false}
                onPress={() =>
                  save({
                    reminderAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                  })
                }
              />
              <Chip
                label="Today 9 AM"
                active={
                  item.reminderAt
                    ? isSameDay(new Date(item.reminderAt), new Date(atTimeOnDay(0, 9, 0)))
                    : false
                }
                onPress={() => save({ reminderAt: atTimeOnDay(0, 9, 0) })}
              />
              <Chip
                label="Tomorrow 9 AM"
                active={
                  item.reminderAt
                    ? isSameDay(new Date(item.reminderAt), new Date(atTimeOnDay(1, 9, 0)))
                    : false
                }
                onPress={() => save({ reminderAt: atTimeOnDay(1, 9, 0) })}
              />
            </div>
            <input
              type="datetime-local"
              className="datetime-input"
              value={item.reminderAt ? toDatetimeLocalValue(item.reminderAt) : ''}
              onChange={(e) =>
                save({
                  reminderAt: e.target.value ? fromDatetimeLocalValue(e.target.value) : null,
                })
              }
              aria-label="Reminder date and time"
            />
            {item.reminderAt ? (
              <p className="modal-meta">Reminder {formatReminderAt(item.reminderAt)}</p>
            ) : null}
            {reminderConflict ? (
              <p className="modal-meta warning">Reminder must not be after the due time.</p>
            ) : null}
          </div>
        ) : null}

        <p className="modal-meta">Created {formatFull(item.createdAt)}</p>
        {item.doneAt ? <p className="modal-meta">Completed {formatFull(item.doneAt)}</p> : null}

        <div className="modal-actions">
          <button type="button" className="action-row" onClick={() => toggleDone(item.id)}>
            <span className={`check${done ? ' done' : ''}`}>
              {done ? <Icon name="check" size={13} color="#0b0b0f" /> : null}
            </span>
            {done ? 'Mark as not done' : 'Mark as done'}
          </button>
          <button
            type="button"
            className="action-row danger"
            onClick={() => {
              removeItem(item.id)
              closeItem()
            }}
          >
            <Icon name="trash" size={16} color="#ff6b5e" />
            Delete
          </button>
        </div>
      </div>
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
