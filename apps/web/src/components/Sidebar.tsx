import type { ScreenName } from '@kosh/shared'
import { PRIMARY_SECTIONS, SCREEN_TITLES } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Icon, WEB_SCREEN_ICONS } from './Icon'

export function Sidebar() {
  const { screen, navigate, requestCaptureFocus } = useNav()
  const { items } = useItems()
  const inboxCount = items.filter((i) => i.status === 'inbox').length

  return (
    <aside className="sidebar">
      <div className="brand">Kosh</div>
      <button
        type="button"
        className="btn-new"
        onClick={() => {
          navigate('inbox')
          requestCaptureFocus()
        }}
      >
        <Icon name="plus" size={16} color="var(--bg)" />
        New capture
      </button>

      <nav className="nav-group">
        {PRIMARY_SECTIONS.map((section) => (
          <NavRow
            key={section}
            screen={section}
            active={screen === section}
            onPress={() => navigate(section)}
            count={section === 'inbox' && inboxCount > 0 ? inboxCount : undefined}
          />
        ))}
      </nav>

      <div className="nav-divider" />

      <nav className="nav-group">
        <NavRow screen="search" active={screen === 'search'} onPress={() => navigate('search')} />
        <NavRow
          screen="settings"
          active={screen === 'settings'}
          onPress={() => navigate('settings')}
        />
      </nav>
    </aside>
  )
}

interface NavRowProps {
  screen: ScreenName
  active: boolean
  onPress: () => void
  count?: number
}

export function NavRow({ screen, active, onPress, count }: NavRowProps) {
  return (
    <button
      type="button"
      className={`nav-row${active ? ' active' : ''}`}
      onClick={onPress}
      aria-current={active ? 'page' : undefined}
    >
      <Icon name={WEB_SCREEN_ICONS[screen]} size={17} />
      {SCREEN_TITLES[screen]}
      {typeof count === 'number' ? <span className="count">{count}</span> : null}
    </button>
  )
}
