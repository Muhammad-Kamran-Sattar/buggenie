import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/', icon: '◉', label: 'Dashboard', end: true },
    { to: '/new', icon: '✦', label: 'New Report' },
    { to: '/history', icon: '☰', label: 'History' },
    { to: '/settings', icon: '⚙', label: 'Settings' }
  ]

  return (
    <div className="app-layout">
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <span style={{ fontWeight: 600 }}>BugGenie AI</span>
        <div style={{ width: 40 }}></div>
      </div>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <h1>BugGenie AI</h1>
        </div>

        <nav className="nav-items">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="btn btn-icon" onClick={handleLogout} title="Logout">
            ⎋
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}