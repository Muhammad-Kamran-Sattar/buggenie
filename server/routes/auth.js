import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { run, get, all } from '../db/init.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'buggenie-secret-key-change-in-production'

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' })
    }

    // Check if user exists
    const existingUser = get('SELECT id FROM users WHERE email = ?', [email])
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = uuidv4()

    run('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, name])

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: userId, email, name }
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = get('SELECT * FROM users WHERE email = ?', [email])
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Get current user
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = get('SELECT id, email, name FROM users WHERE id = ?', [decoded.userId])
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }
    res.json({ user })
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router