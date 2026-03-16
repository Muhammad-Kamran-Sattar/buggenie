// API service with environment-aware base URL

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3001/api'
  : '/api'

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export const auth = {
  login: (email, password) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),

  register: (email, password, name) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name })
  })
}

export const reports = {
  getAll: () => apiRequest('/reports'),

  getOne: (id) => apiRequest(`/reports/${id}`),

  generate: (data) => apiRequest('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  create: (data) => apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  delete: (id) => apiRequest(`/reports/${id}`, {
    method: 'DELETE'
  })
}