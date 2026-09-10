import type { WebIconName } from './Icon'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon: WebIconName
  title: string
  message: string
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
