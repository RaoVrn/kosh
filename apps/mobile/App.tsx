import { ItemsProvider, NotificationsProvider, ProjectsProvider } from '@kosh/shared'
import { NavProvider } from './src/state/NavContext'
import { AppShell } from './src/components/AppShell'
import { API_URL } from './src/config'

export default function App() {
  return (
    <ItemsProvider baseUrl={API_URL}>
      <NotificationsProvider baseUrl={API_URL}>
        <ProjectsProvider baseUrl={API_URL}>
          <NavProvider>
            <AppShell />
          </NavProvider>
        </ProjectsProvider>
      </NotificationsProvider>
    </ItemsProvider>
  )
}
