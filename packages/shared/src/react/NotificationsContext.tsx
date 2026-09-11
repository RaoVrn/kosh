import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { KoshNotification } from '../index'
import { errorMessage } from '../api/itemsApi'
import { createItemsApi, DEFAULT_API_BASE_URL } from '../api/itemsApi'
import type { ItemsApiClient } from '../api/itemsApi'

interface NotificationsContextValue {
  notifications: KoshNotification[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  unreadCount: number
}

interface NotificationsProviderProps {
  children: ReactNode
  baseUrl?: string
  api?: ItemsApiClient
  pollMs?: number
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({
  children,
  baseUrl,
  api,
  pollMs = 30_000,
}: NotificationsProviderProps) {
  const client = useMemo(
    () => api ?? createItemsApi(baseUrl ?? DEFAULT_API_BASE_URL),
    [api, baseUrl],
  )

  const [notifications, setNotifications] = useState<KoshNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const list = await client.getNotifications()
      setNotifications(list)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load notifications'))
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), pollMs)
    return () => clearInterval(timer)
  }, [refresh, pollMs])

  const markRead = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const updated = await client.markNotificationRead(id)
        setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))
      } catch (err) {
        setError(errorMessage(err, 'Could not update the notification'))
      }
    },
    [client],
  )

  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications])

  const value = useMemo(
    () => ({ notifications, loading, error, refresh, markRead, unreadCount }),
    [notifications, loading, error, refresh, markRead, unreadCount],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
