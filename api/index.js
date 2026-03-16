import express from 'express'
import cors from 'cors'
import { initDatabase } from '../server/db/init.js'
import authRoutes from '../server/routes/auth.js'
import reportsRoutes from '../server/routes/reports.js'

const app = express()

app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json())

// Initialize database
await initDatabase()

// Routes
app.use('/auth', authRoutes)
app.use('/reports', reportsRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app