import type { Item } from '@kosh/shared'
import { formatDue, isOverdue, learningStatusLabel, relativeTime, typeLabel } from '@kosh/shared'
import { Badge } from './Badge'
import { TypeBadge } from './TypeBadge'
import { Icon } from './Icon'

interface ItemCardProps {
  item: Item
  onPress: () => void
  onToggleDone?: () => void
  highlighted?: boolean
}

export function ItemCard({ item, onPress, onToggleDone, highlighted }: ItemCardProps) {
  const done = item.status === 'done'
  const showCheck = item.type === 'task' && onToggleDone !== undefined
  const isLearning = item.type === 'learning'

  return (
    <article
      className={`card${highlighted ? ' highlighted' : ''}`}
      onClick={onPress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onPress()
        }
      }}
      aria-label={`${typeLabel[item.type]}: ${item.title}`}
    >
      {showCheck ? (
        <button
          type="button"
          className={`check${done ? ' done' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone?.()
          }}
          aria-label={done ? 'Mark as not done' : 'Mark as done'}
        >
          {done ? <Icon name="check" size={13} color="#0b0b0f" /> : null}
        </button>
      ) : null}

      <div className="card-body">
        <p className={`card-title${done ? ' done' : ''}`}>{item.title}</p>
        {item.body && item.body !== item.title ? <p className="card-preview">{item.body}</p> : null}
        {item.url ? <p className="card-url">{item.url}</p> : null}

        <div className="card-footer">
          <TypeBadge type={item.type} />
          {isLearning && item.status !== 'inbox' ? (
            <Badge label={learningStatusLabel[item.status]} />
          ) : null}
          {done && !isLearning ? <Badge label="Done" color="#4cd97b" /> : null}
          {item.dueAt ? (
            <Badge
              label={formatDue(item.dueAt)}
              color={isOverdue(item.dueAt) ? '#ff6b5e' : '#9a9aa5'}
            />
          ) : null}
          <span className="spacer" />
          <span className="card-time">{relativeTime(item.updatedAt)}</span>
        </div>
      </div>
    </article>
  )
}
