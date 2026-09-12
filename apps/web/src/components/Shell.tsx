import { useEffect, useState } from 'react'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ItemDetailModal } from './ItemDetailModal'
import { Icon } from './Icon'
import { InboxScreen } from '../screens/InboxScreen'
import { TodayScreen } from '../screens/TodayScreen'
import { TasksScreen } from '../screens/TasksScreen'
import { NotesScreen } from '../screens/NotesScreen'
import { IdeasScreen } from '../screens/IdeasScreen'
import { LearningScreen } from '../screens/LearningScreen'
import { LinksScreen } from '../screens/LinksScreen'
import { SearchScreen } from '../screens/SearchScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

function useIsCompact(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )
  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return compact
}

export function Shell() {
  const compact = useIsCompact()
  const { loading, error, refresh } = useItems()
  const { navigate, requestCaptureFocus } = useNav()

  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTyping(e.target)) return
      if (e.key === 'n' || e.key === 'N') {
        navigate('inbox')
        requestCaptureFocus()
      } else if (e.key === 't' || e.key === 'T') {
        navigate('tasks')
      } else if (e.key === '/') {
        e.preventDefault()
        navigate('search')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, requestCaptureFocus])

  return (
    <div className="shell">
      {compact ? <TopBar /> : <Sidebar />}
      <main className="main">
        {error ? (
          <div className="error-banner" role="alert">
            <span className="error-banner-text">{error}</span>
            <button type="button" className="btn-retry" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        ) : null}
        {loading ? <LoadingState /> : <ScreenRenderer />}
      </main>
      <ItemDetailModal />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="content">
      <div className="empty">
        <div className="empty-icon">
          <Icon name="inbox" size={22} />
        </div>
        <h3>Loading…</h3>
      </div>
    </div>
  )
}

function ScreenRenderer() {
  const { screen } = useNav()
  switch (screen) {
    case 'inbox':
      return <InboxScreen />
    case 'today':
      return <TodayScreen />
    case 'tasks':
      return <TasksScreen />
    case 'notes':
      return <NotesScreen />
    case 'ideas':
      return <IdeasScreen />
    case 'learning':
      return <LearningScreen />
    case 'links':
      return <LinksScreen />
    case 'search':
      return <SearchScreen />
    case 'notifications':
      return <NotificationsScreen />
    case 'settings':
      return <SettingsScreen />
  }
}
