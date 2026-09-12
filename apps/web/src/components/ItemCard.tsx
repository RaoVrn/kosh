import type { Item } from '@kosh/shared'
import {
  domainFromUrl,
  formatDue,
  isOverdue,
  learningStatusLabel,
  priorityColors,
  priorityLabel,
  recurrenceLabel,
  relativeTime,
  typeLabel,
  useProjectName,
} from '@kosh/shared'
import { Badge } from './Badge'
import { TypeBadge } from './TypeBadge'
import { Icon } from './Icon'

interface ItemCardProps {
  item: Item
  onPress: () => void
  onToggleDone?: () => void
  highlighted?: boolean
  onProcess?: () => void
  onArchive?: () => void
  onConvertToTask?: () => void
  onOpenLink?: () => void
}

export function ItemCard({
  item,
  onPress,
  onToggleDone,
  highlighted,
  onProcess,
  onArchive,
  onConvertToTask,
  onOpenLink,
}: ItemCardProps) {
  const done = item.status === 'done'
  const showCheck = item.type === 'task' && onToggleDone !== undefined
  const isLearning = item.type === 'learning'
  const isLink = item.type === 'link'
  const domain = isLink && item.url ? domainFromUrl(item.url) : null
  const showTags = item.type !== 'task' && (item.tags?.length ?? 0) > 0
  const hasActions = Boolean(onProcess || onArchive || onConvertToTask || onOpenLink)
  const projectName = useProjectName(item.projectId)

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
        {isLink && domain ? (
          <p className="card-url">{domain}</p>
        ) : item.url && !isLink ? (
          <p className="card-url">{item.url}</p>
        ) : null}

        {showTags ? (
          <div className="card-tags">
            {(item.tags ?? []).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="card-footer">
          <TypeBadge type={item.type} />
          {isLearning && item.priority ? (
            <Badge label={priorityLabel[item.priority]} color={priorityColors[item.priority]} />
          ) : null}
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
          {item.type === 'task' && recurrenceLabel(item.recurrence) ? (
            <Badge label={`↻ ${recurrenceLabel(item.recurrence)}`} color="#8b8b96" />
          ) : null}
          {projectName ? <span className="project-chip">↳ {projectName}</span> : null}
          <span className="spacer" />
          <span className="card-time">{relativeTime(item.updatedAt)}</span>
        </div>

        {hasActions ? (
          <div className="card-actions">
            {onOpenLink ? (
              <button
                type="button"
                className="card-action"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenLink()
                }}
              >
                Open
              </button>
            ) : null}
            {onProcess ? (
              <button
                type="button"
                className="card-action card-action-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onProcess()
                }}
              >
                Process
              </button>
            ) : null}
            {onConvertToTask ? (
              <button
                type="button"
                className="card-action"
                onClick={(e) => {
                  e.stopPropagation()
                  onConvertToTask()
                }}
              >
                Convert to task
              </button>
            ) : null}
            {onArchive ? (
              <button
                type="button"
                className="card-action"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive()
                }}
              >
                Archive
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
