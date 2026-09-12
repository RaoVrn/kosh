import { useEffect, useRef } from 'react'
import {
  ItemsProvider,
  NotificationsProvider,
  ProjectsProvider,
  useNotifications,
} from '@kosh/shared'
import { NavProvider } from './state/NavContext'
import { Shell } from './components/Shell'
import { API_BASE_URL } from './config'

export default function App() {
  return (
    <ItemsProvider baseUrl={API_BASE_URL}>
      <NotificationsProvider baseUrl={API_BASE_URL}>
        <ProjectsProvider baseUrl={API_BASE_URL}>
          <NavProvider>
            <Shell />
            <BrowserNotifications />
          </NavProvider>
        </ProjectsProvider>
      </NotificationsProvider>
    </ItemsProvider>
  )
}

function BrowserNotifications() {
  const { notifications } = useNotifications()
  const mountedAt = useRef(new Date().toISOString())
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('kosh.browserNotifications') !== '1'
    )
      return
    const fresh = notifications.filter(
      (n) => !n.readAt && !seen.current.has(n.id) && n.createdAt > mountedAt.current,
    )
    for (const n of fresh) {
      seen.current.add(n.id)
      new Notification(n.title, { body: n.body ?? undefined })
    }
  }, [notifications])

  return null
}
