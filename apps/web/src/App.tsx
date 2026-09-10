import { ItemsProvider } from '@kosh/shared'
import { NavProvider } from './state/NavContext'
import { Shell } from './components/Shell'

export default function App() {
  return (
    <ItemsProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </ItemsProvider>
  )
}
