import { useEffect, useState } from 'react'
import { useNav } from '../state/NavContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ItemDetailModal } from './ItemDetailModal'
import { InboxScreen } from '../screens/InboxScreen'
import { TodayScreen } from '../screens/TodayScreen'
import { TasksScreen } from '../screens/TasksScreen'
import { NotesScreen } from '../screens/NotesScreen'
import { IdeasScreen } from '../screens/IdeasScreen'
import { LearningScreen } from '../screens/LearningScreen'
import { SearchScreen } from '../screens/SearchScreen'
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

  return (
    <div className="shell">
      {compact ? <TopBar /> : <Sidebar />}
      <main className="main">
        <ScreenRenderer />
      </main>
      <ItemDetailModal />
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
    case 'search':
      return <SearchScreen />
    case 'settings':
      return <SettingsScreen />
  }
}
