import type { Item } from '@kosh/shared'
import {
  formatDueAt,
  formatReminderAt,
  isOverdue,
  priorityColors,
  priorityLabel,
} from '@kosh/shared'
import { Badge } from './Badge'
import { recurrenceLabel, useProjectName } from '@kosh/shared'
import { Icon } from './Icon'

interface TaskItemProps {
  item: Item
  onPress: () => void
  onToggleDone: () => void
}

export function TaskItem({ item, onPress, onToggleDone }: TaskItemProps) {
  const done = item.status === 'done'
  const overdue = item.dueAt ? isOverdue(item.dueAt) : false
  const projectName = useProjectName(item.projectId)

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
            <span className={`due-chip${overdue ? ' overdue' : ''}`}>
              {formatDueAt(item.dueAt)}
            </span>
          ) : null}
          {item.reminderAt && !done ? (
            <span className="reminder-chip">
              <Icon name="bell" size={11} />
              {formatReminderAt(item.reminderAt)}
            </span>
          ) : null}
          {recurrenceLabel(item.recurrence) ? (
            <span className="repeat-chip">
              <Icon name="repeat" size={11} />
              {recurrenceLabel(item.recurrence)}
            </span>
          ) : null}
          {projectName ? (
            <span className="project-chip">
              <Icon name="folder" size={11} />
              {projectName}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
