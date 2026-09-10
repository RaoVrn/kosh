import type { Item } from '@kosh/shared'
import { formatDue, isOverdue, priorityColors, priorityLabel } from '@kosh/shared'
import { Badge } from './Badge'
import { Icon } from './Icon'

interface TaskItemProps {
  item: Item
  onPress: () => void
  onToggleDone: () => void
}

export function TaskItem({ item, onPress, onToggleDone }: TaskItemProps) {
  const done = item.status === 'done'
  const overdue = item.dueAt ? isOverdue(item.dueAt) : false

  return (
    <article
      className="card"
      onClick={onPress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPress()
        }
      }}
      aria-label={item.title}
    >
      <button
        type="button"
        className={`check${done ? ' done' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onToggleDone()
        }}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done ? <Icon name="check" size={13} color="#0b0b0f" /> : null}
      </button>

      <div className="card-body">
        <p className={`task-title${done ? ' done' : ''}`}>{item.title}</p>
        <div className="task-meta">
          {item.priority ? (
            <Badge label={priorityLabel[item.priority]} color={priorityColors[item.priority]} />
          ) : null}
          {item.dueAt ? (
            <Badge label={formatDue(item.dueAt)} color={overdue ? '#ff6b5e' : '#9a9aa5'} />
          ) : null}
        </div>
      </div>
    </article>
  )
}
