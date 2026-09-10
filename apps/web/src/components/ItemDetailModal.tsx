import {
  ITEM_TYPES,
  PRIORITIES,
  daysFromNow,
  formatDue,
  formatFull,
  formatShortDate,
  isSameDay,
  isToday,
  isTomorrow,
  priorityLabel,
  typeLabel,
} from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { TypeBadge } from './TypeBadge'
import { Icon } from './Icon'

export function ItemDetailModal() {
  const { selectedItemId, closeItem } = useNav()
  const { getItem, updateItem, toggleDone, removeItem } = useItems()

  const item = selectedItemId ? getItem(selectedItemId) : undefined
  if (!item) return null

  const done = item.status === 'done'

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
          <button type="button" className="icon-btn" onClick={closeItem} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        </div>

        <textarea
          className="modal-title"
          value={item.title}
          onChange={(e) => updateItem(item.id, { title: e.target.value })}
          rows={1}
          aria-label="Item title"
        />
        <textarea
          className="modal-body"
          value={item.body ?? ''}
          onChange={(e) => updateItem(item.id, { body: e.target.value })}
          rows={3}
          placeholder="Add details…"
          aria-label="Item details"
        />
        {item.url ? <p className="card-url">{item.url}</p> : null}

        <div className="modal-section">
          <div className="modal-label">Type</div>
          <div className="chip-row">
            {ITEM_TYPES.map((t) => (
              <Chip
                key={t}
                label={typeLabel[t]}
                active={item.type === t}
                onPress={() => updateItem(item.id, { type: t })}
              />
            ))}
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-label">Priority</div>
          <div className="chip-row">
            <Chip
              label="None"
              active={!item.priority}
              onPress={() => updateItem(item.id, { priority: null })}
            />
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={priorityLabel[p]}
                active={item.priority === p}
                onPress={() => updateItem(item.id, { priority: p })}
              />
            ))}
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-label">Due date</div>
          <div className="chip-row">
            <Chip
              label="None"
              active={!item.dueAt}
              onPress={() => updateItem(item.id, { dueAt: null })}
            />
            <Chip
              label="Today"
              active={item.dueAt ? isToday(item.dueAt) : false}
              onPress={() => updateItem(item.id, { dueAt: daysFromNow(0) })}
            />
            <Chip
              label="Tomorrow"
              active={item.dueAt ? isTomorrow(item.dueAt) : false}
              onPress={() => updateItem(item.id, { dueAt: daysFromNow(1) })}
            />
            <Chip
              label="In a week"
              active={
                item.dueAt ? isSameDay(new Date(item.dueAt), new Date(daysFromNow(7))) : false
              }
              onPress={() => updateItem(item.id, { dueAt: daysFromNow(7) })}
            />
          </div>
          {item.dueAt ? (
            <p className="modal-meta">
              Due {formatDue(item.dueAt)} · {formatShortDate(item.dueAt)}
            </p>
          ) : null}
        </div>

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
