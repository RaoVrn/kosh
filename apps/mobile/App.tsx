import { ItemsProvider } from './src/state/ItemsContext'
import { NavProvider } from './src/state/NavContext'
import { AppShell } from './src/components/AppShell'

export default function App() {
  return (
    <ItemsProvider>
      <NavProvider>
        <AppShell />
      </NavProvider>
    </ItemsProvider>
  )
}
