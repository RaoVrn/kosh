import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'

export function SettingsScreen() {
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
        <h2 className="section-title">Coming soon</h2>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-label">Notifications</span>
            <span className="settings-value muted">Soon</span>
          </div>
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
