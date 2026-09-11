import { useNotifications } from '@kosh/shared'
import { relativeTime } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

export function NotificationsScreen() {
  const { notifications, unreadCount, markRead } = useNotifications()
  const { items } = useItems()
  const { openItem } = useNav()

  return (
    <Content>
      <PageHeader title="Notifications" subtitle="Reminders that have fired." count={unreadCount} />
      {notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications"
          message="Set a reminder on a task and it will appear here when it fires."
        />
      ) : (
        notifications.map((n) => {
          const linked = n.itemId && items.some((i) => i.id === n.itemId)
          return (
            <button
              key={n.id}
              type="button"
              className={`card notif${n.readAt ? '' : ' unread'}`}
              onClick={() => {
                void markRead(n.id)
                if (linked && n.itemId) openItem(n.itemId)
              }}
            >
              <div className="card-body">
                <div className="notif-row">
                  <span className="notif-title">{n.title}</span>
                  {!n.readAt ? <span className="notif-dot" aria-label="unread" /> : null}
                </div>
                {n.body ? <p className="card-preview">{n.body}</p> : null}
                <div className="card-footer">
                  <span className="card-time">{relativeTime(n.createdAt)}</span>
                  <span className="spacer" />
                  {linked ? <span className="card-time">Tap to open task</span> : null}
                </div>
              </div>
            </button>
          )
        })
      )}
    </Content>
  )
}
