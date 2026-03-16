import express from 'express'
import cors from 'cors'
import { initDatabase } from './db/init.js'
import authRoutes from './routes/auth.js'
import reportsRoutes from './routes/reports.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

// Initialize database and start server
async function start() {
  await initDatabase()

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/reports', reportsRoutes)

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch(console.error)