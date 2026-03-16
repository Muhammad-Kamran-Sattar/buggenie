
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, creditsUsed: 0 })
  const [recentReports, setRecentReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'
      const res = await fetch(`${API_BASE}/reports`)
      const data = await res.json()
      if (data.reports) {
        setRecentReports(data.reports.slice(0, 5))
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const thisWeek = data.reports.filter(r => new Date(r.created_at) > weekAgo).length
        setStats({
          total: data.reports.length,
          thisWeek,
          creditsUsed: data.reports.length * 5
        })
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityClass = (severity) => {
    const map = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }
    return map[severity?.toLowerCase()] || 'badge-medium'
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 100, marginBottom: 24 }}></div>
        <div className="skeleton" style={{ height: 200 }}></div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your bug reports</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Reports</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week</div>
          <div className="stat-value accent">{stats.thisWeek}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">AI Credits Used</div>
          <div className="stat-value">{stats.creditsUsed}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>Recent Reports</h2>
        <Link to="/new" className="btn btn-primary">
          ✦ New Report
        </Link>
      </div>

      {recentReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">No reports yet</h3>
          <p className="empty-state-text">Create your first AI-powered bug report</p>
          <Link to="/new" className="btn btn-primary btn-large">
            Generate First Report
          </Link>
        </div>
      ) : (
        <div className="reports-list">
          {recentReports.map(report => (
            <Link key={report.id} to={`/report/${report.id}`} className="report-card">
              <div className="report-card-header">
                <div>
                  <div className="report-card-title">{report.generated_title || 'Untitled Report'}</div>
                  <div className="report-card-date">
                    {new Date(report.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <span className={`badge ${getSeverityClass(report.severity)}`}>
                  {report.severity || 'Medium'}
                </span>
              </div>
              <p className="report-card-preview">{report.generated_summary}</p>
              {report.ai_confidence && (
                <div className="confidence-score">
                  <span>AI Confidence:</span>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${report.ai_confidence}%` }}></div>
                  </div>
                  <span>{report.ai_confidence}%</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {recentReports.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/history" className="btn btn-secondary">View All Reports</Link>
        </div>
      )}
    </div>
  )
}