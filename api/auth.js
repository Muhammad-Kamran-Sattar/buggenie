import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import initSqlJs from 'sql.js'

const JWT_SECRET = process.env.JWT_SECRET || 'buggenie-secret-key-change-in-production'

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

function runAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

async function execQuery(sql, params = []) {
  db.run(sql, params)
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method, url } = req

  try {
    db = await getDb()

    // Route: POST /api/auth/register
    if (method === 'POST' && url === '/api/auth/register') {
      const { email, password, name } = req.body

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

      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })

      return res.json({
        token,
        user: { id: userId, email, name }
      })
    }

    // Route: POST /api/auth/login
    if (method === 'POST' && url === '/api/auth/login') {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      const user = runQuery('SELECT * FROM users WHERE email = ?', [email])
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const validPassword = await bcrypt.compare(password, user.password_hash)
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

      return res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name }
      })
    }

    // Route: GET /api/auth/me
    if (method === 'GET' && url === '/api/auth/me') {
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        const user = runQuery('SELECT id, email, name FROM users WHERE id = ?', [decoded.userId])
        if (!user) {
          return res.status(401).json({ error: 'User not found' })
        }
        return res.json({ user })
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token' })
      }
    }

    // 404 for unknown routes
    res.status(404).json({ error: 'Not found' })

  } catch (err) {
    console.error('Auth API error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}