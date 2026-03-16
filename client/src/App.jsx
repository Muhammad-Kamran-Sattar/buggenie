import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import NewReport from './pages/NewReport'
import ReportHistory from './pages/ReportHistory'
import Settings from './pages/Settings'
import ReportDetail from './pages/ReportDetail'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-container"><div className="loading-dots"><div className="loading-dot"></div><div className="loading-dot"></div><div className="loading-dot"></div></div></div>
  }

  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="new" element={<NewReport />} />
        <Route path="history" element={<ReportHistory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="report/:id" element={<ReportDetail />} />
      </Route>
    </Routes>
  )
}