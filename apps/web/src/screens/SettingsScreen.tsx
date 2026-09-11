import { useState } from 'react'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'

const STORAGE_KEY = 'kosh.browserNotifications'

export function SettingsScreen() {
  const [enabled, setEnabled] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1',
  )
  const [permission, setPermission] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )
  const [notice, setNotice] = useState<string | null>(null)

  const toggleBrowserNotifications = async () => {
    if (enabled) {
      localStorage.removeItem(STORAGE_KEY)
      setEnabled(false)
      setNotice('Browser notifications disabled.')
      return
    }
    if (typeof Notification === 'undefined') {
      setNotice('This browser does not support notifications.')
      return
    }
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      localStorage.setItem(STORAGE_KEY, '1')
      setEnabled(true)
      setNotice('Browser notifications enabled.')
    } else {
      setNotice('Notification permission was not granted.')
    }
  }

  return (
    <Content>
      <PageHeader title="Settings" subtitle="Kosh, tuned to you." />

      <section className="section">
        <h2 className="section-title">App</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Version</span>
            <span className="settings-value">0.1.0 · MVP</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Theme</span>
            <span className="settings-value">Dark</span>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Notifications</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">In-app notifications</span>
            <span className="settings-value">On</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Browser notifications</span>
            <span className="settings-value">
              {permission === 'denied' ? 'Blocked' : enabled ? 'On' : 'Off'}
            </span>
          </div>
          <div className="settings-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void toggleBrowserNotifications()}
            >
              {enabled ? 'Disable browser notifications' : 'Enable browser notifications'}
            </button>
          </div>
          {notice ? <p className="settings-note">{notice}</p> : null}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Coming soon</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Voice capture</span>
            <span className="settings-value muted">Soon</span>
          </div>
          <div className="settings-row">
            <span className="settings-label">Data & backup</span>
            <span className="settings-value muted">Soon</span>
          </div>
        </div>
      </section>

      <div className="about">Capture everything. Forget nothing. Do what matters.</div>
    </Content>
  )
}
