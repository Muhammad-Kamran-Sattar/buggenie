import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import initSqlJs from 'sql.js'

let db = null

async function getDb() {
  if (db) return db
  const SQL = await initSqlJs()
  db = new SQL.Database()
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Create demo user if not exists
  try {
    const demoExists = db.exec("SELECT id FROM users WHERE email = 'demo@buggenie.ai'")
    if (demoExists.length === 0 || !demoExists[0].values || demoExists[0].values.length === 0) {
      const demoHash = await bcrypt.hash('demo123', 10)
      db.run("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
        ['demo-user-id', 'demo@buggenie.ai', demoHash, 'Demo User'])
      console.log('Demo user created')
    }
  } catch (e) {
    console.log('Demo user may already exist:', e.message)
  }

  return db
}

function runQuery(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

async function execQuery(sql, params = []) {
  db.run(sql, params)
}

function generateToken() {
  return uuidv4() + '-' + Date.now()
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Parse body if needed
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (e) {
      body = {}
    }
  }
  req.parsedBody = body

  // Parse the path from URL, removing query string
  const path = req.url?.split('?')[0] || ''
  const method = req.method

  console.log('Request:', method, path, 'body:', req.parsedBody)

  try {
    db = await getDb()

    // Route: POST /api/auth/login
    if (method === 'POST' && path === '/api/auth/login') {
      const { email, password } = req.parsedBody || {}

      console.log('Login attempt:', email)

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      const user = runQuery('SELECT * FROM users WHERE email = ?', [email])
      console.log('User found:', !!user, user?.email)

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const validPassword = await bcrypt.compare(password, user.password_hash)
      console.log('Password valid:', validPassword)

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const token = generateToken()

      return res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name }
      })
    }

    // Route: POST /api/auth/register
    if (method === 'POST' && path === '/api/auth/register') {
      const { email, password, name } = req.parsedBody || {}

      console.log('Register attempt:', email)

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' })
      }

      const existingUser = runQuery('SELECT id FROM users WHERE email = ?', [email])
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' })
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const userId = uuidv4()

      execQuery('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
        [userId, email, passwordHash, name])

      console.log('User created:', email)

      const token = generateToken()

      return res.json({
        token,
        user: { id: userId, email, name }
      })
    }

    // Route: GET /api/auth/me
    if (method === 'GET' && path === '/api/auth/me') {
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      // Simple token validation - just return demo user for now
      if (token) {
        return res.json({ user: { id: 'demo-user-id', email: 'demo@buggenie.ai', name: 'Demo User' } })
      }

      res.status(401).json({ error: 'Invalid token' })
    }

    // 404 for unknown routes
    res.status(404).json({ error: 'Not found', path })

  } catch (err) {
    console.error('Auth API error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
}