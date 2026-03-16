import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    apiKey: '',
    defaultProject: 'frontend',
    exportFormat: 'markdown'
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const savedSettings = localStorage.getItem('buggenie_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('buggenie_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your BugGenie AI preferences</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="settings-section">
          <h3 className="settings-title">AI Configuration</h3>
          <div className="form-group">
            <label className="form-label">Anthropic API Key</label>
            <input
              type="password"
              className="form-input"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="sk-ant-..."
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              Get your API key from{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">
                Anthropic Console
              </a>
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title">Defaults</h3>
          <div className="form-group">
            <label className="form-label">Default Project</label>
            <select
              className="form-select"
              value={settings.defaultProject}
              onChange={(e) => setSettings({ ...settings, defaultProject: e.target.value })}
            >
              <option value="frontend">Frontend App</option>
              <option value="backend">Backend API</option>
              <option value="mobile">Mobile App</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Export Format</label>
            <select
              className="form-select"
              value={settings.exportFormat}
              onChange={(e) => setSettings({ ...settings, exportFormat: e.target.value })}
            >
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
              <option value="clipboard">Copy to Clipboard</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-title">Account</h3>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Name:</strong> {user?.name}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
          {saved && (
            <span style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>
              ✓ Settings saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}