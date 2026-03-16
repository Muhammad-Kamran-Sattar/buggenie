import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setEmail('demo@buggenie.ai')
    setPassword('demo123')
    setError('')
    setLoading(true)
    const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'
    try {
      await login('demo@buggenie.ai', 'demo123')
      navigate('/')
    } catch (err) {
      try {
        await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'demo@buggenie.ai', password: 'demo123', name: 'Demo User' })
        })
        await login('demo@buggenie.ai', 'demo123')
        navigate('/')
      } catch (e) {
        setError('Demo login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="sidebar-logo" style={{ justifyContent: 'center', border: 'none', padding: 0, marginBottom: 16 }}>
            <div className="sidebar-logo-icon">⚡</div>
            <h1>BugGenie AI</h1>
          </div>
          <p className="auth-title">Welcome back</p>
          <p className="auth-subtitle">Sign in to your account to continue</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={handleDemoLogin} style={{ width: '100%' }}>
            Try Demo Account
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  )
}