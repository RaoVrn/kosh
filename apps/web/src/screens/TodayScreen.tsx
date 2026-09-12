import { useMemo, useState } from 'react'
import { getTodayCommandCenter, greetingForHour, useItems, useNotifications } from '@kosh/shared'
import type { ItemType } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateModal } from '../components/ItemCreateModal'

const QUICK_TYPES: { type: ItemType; label: string }[] = [
  { type: 'task', label: 'New task' },
  { type: 'note', label: 'New note' },
  { type: 'idea', label: 'New idea' },
  { type: 'learning', label: 'New learning' },
]

export function TodayScreen() {
  const { items, toggleDone } = useItems()
  const { notifications, markRead } = useNotifications()
  const { openItem, navigate, requestCaptureFocus } = useNav()
  const [creating, setCreating] = useState<ItemType | null>(null)

  const cc = useMemo(() => getTodayCommandCenter(items, notifications), [items, notifications])
  const greeting = greetingForHour(new Date().getHours())

  const isEmpty =
    cc.overdue.length === 0 &&
    cc.dueToday.length === 0 &&
    cc.upNext.length === 0 &&
    cc.reminders.length === 0 &&
    cc.recentCaptures.length === 0

  return (
    <Content>
      <PageHeader title="Today" subtitle={`${greeting}. What actually matters today?`} />

      <div className="today-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            navigate('inbox')
            requestCaptureFocus()
          }}
        >
          New capture
        </button>
        {QUICK_TYPES.map((q) => (
          <button
            key={q.type}
            type="button"
            className="btn-secondary"
            onClick={() => setCreating(q.type)}
          >
            {q.label}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <EmptyState
          icon="sun"
          title="You're clear for today."
          message="Capture something new or plan ahead."
        />
      ) : (
        <>
          {cc.overdue.length > 0 ? (
            <section className="group">
              <h2 className="section-title">Overdue</h2>
              {cc.overdue.map((task) => (
                <TaskItem
                  key={task.id}
                  item={task}
                  onPress={() => openItem(task.id)}
                  onToggleDone={() => toggleDone(task.id)}
                />
              ))}
            </section>
          ) : null}

          {cc.dueToday.length > 0 ? (
            <section className="group">
              <h2 className="section-title">Due today</h2>
              {cc.dueToday.map((task) => (
                <TaskItem
                  key={task.id}
                  item={task}
                  onPress={() => openItem(task.id)}
                  onToggleDone={() => toggleDone(task.id)}
                />
              ))}
            </section>
          ) : null}

          {cc.upNext.length > 0 ? (
            <section className="group">
              <h2 className="section-title">Up next</h2>
              {cc.upNext.map((task) => (
                <TaskItem
                  key={task.id}
                  item={task}
                  onPress={() => openItem(task.id)}
                  onToggleDone={() => toggleDone(task.id)}
                />
              ))}
            </section>
          ) : null}

          {cc.reminders.length > 0 ? (
            <section className="group">
              <h2 className="section-title">Reminders</h2>
              {cc.reminders.map((n) => {
                const linked = n.itemId && items.some((i) => i.id === n.itemId)
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="card notif unread"
                    onClick={() => {
                      void markRead(n.id)
                      if (linked && n.itemId) openItem(n.itemId)
                    }}
                  >
                    <div className="card-body">
                      <div className="notif-row">
                        <span className="notif-title">{n.title}</span>
                        <span className="notif-dot" aria-label="unread" />
                      </div>
                      {n.body ? <p className="card-preview">{n.body}</p> : null}
                    </div>
                  </button>
                )
              })}
            </section>
          ) : null}

          {cc.recentCaptures.length > 0 ? (
            <section className="group">
              <h2 className="section-title">Recently captured</h2>
              {cc.recentCaptures.map((item) => (
                <ItemCard key={item.id} item={item} onPress={() => openItem(item.id)} />
              ))}
            </section>
          ) : null}
        </>
      )}

      {creating ? <ItemCreateModal type={creating} onClose={() => setCreating(null)} /> : null}
    </Content>
  )
}
