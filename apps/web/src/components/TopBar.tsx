import { SCREEN_NAMES } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Icon } from './Icon'
import { NavRow } from './Sidebar'

export function TopBar() {
  const { navigate, screen, requestCaptureFocus } = useNav()

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="brand">Kosh</div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            navigate('inbox')
            requestCaptureFocus()
          }}
          aria-label="New capture"
        >
          <Icon name="plus" size={22} />
        </button>
      </div>
      <nav className="topnav">
        {SCREEN_NAMES.map((name) => (
          <NavRow
            key={name}
            screen={name}
            active={screen === name}
            onPress={() => navigate(name)}
          />
        ))}
      </nav>
    </header>
  )
}
