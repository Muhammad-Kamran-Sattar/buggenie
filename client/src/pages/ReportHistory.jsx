import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'

export default function ReportHistory() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ severity: '', project: '', search: '' })
  const [deleteModal, setDeleteModal] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports`)
      const data = await res.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReports(reports.filter(r => r.id !== id))
      }
    } catch (err) {
      alert('Failed to delete report')
    }
    setDeleteModal(null)
  }

  const filteredReports = reports.filter(report => {
    if (filter.severity && report.severity?.toLowerCase() !== filter.severity) return false
    if (filter.project && report.project !== filter.project) return false
    if (filter.search) {
      const search = filter.search.toLowerCase()
      const matchTitle = report.generated_title?.toLowerCase().includes(search)
      const matchSummary = report.generated_summary?.toLowerCase().includes(search)
      if (!matchTitle && !matchSummary) return false
    }
    return true
  })

  const getSeverityClass = (severity) => {
    const map = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }
    return map[severity?.toLowerCase()] || 'badge-medium'
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 40, marginBottom: 24, width: 200 }}></div>
        <div className="skeleton" style={{ height: 100, marginBottom: 16 }}></div>
        <div className="skeleton" style={{ height: 100, marginBottom: 16 }}></div>
        <div className="skeleton" style={{ height: 100 }}></div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Report History</h1>
        <p className="page-subtitle">All your generated bug reports</p>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search reports..."
          style={{ flex: 1, minWidth: 200 }}
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
        />
        <select
          className="form-select"
          style={{ width: 150 }}
          value={filter.severity}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="form-select"
          style={{ width: 150 }}
          value={filter.project}
          onChange={(e) => setFilter({ ...filter, project: e.target.value })}
        >
          <option value="">All Projects</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="mobile">Mobile</option>
          <option value="infrastructure">Infrastructure</option>
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">No reports found</h3>
          <p className="empty-state-text">
            {reports.length === 0 ? 'Create your first bug report' : 'Try adjusting your filters'}
          </p>
          {reports.length === 0 && (
            <Link to="/new" className="btn btn-primary">
              Generate Report
            </Link>
          )}
        </div>
      ) : (
        <div className="reports-list">
          {filteredReports.map(report => (
            <div key={report.id} className="report-card">
              <Link to={`/report/${report.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="report-card-header">
                  <div>
                    <div className="report-card-title">{report.generated_title || 'Untitled Report'}</div>
                    <div className="report-card-date">
                      {new Date(report.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                      {report.project && ` • ${report.project}`}
                    </div>
                  </div>
                  <span className={`badge ${getSeverityClass(report.severity)}`}>
                    {report.severity || 'Medium'}
                  </span>
                </div>
                <p className="report-card-preview">{report.generated_summary}</p>
              </Link>
              <div className="report-card-actions">
                <Link to={`/report/${report.id}`} className="btn btn-secondary btn-icon" title="View">
                  👁
                </Link>
                <button
                  className="btn btn-danger btn-icon"
                  title="Delete"
                  onClick={() => setDeleteModal(report.id)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteModal && (
        <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Delete Report?</h3>
              <button className="modal-close" onClick={() => setDeleteModal(null)}>×</button>
            </div>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              This action cannot be undone. The report will be permanently deleted.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteModal)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}