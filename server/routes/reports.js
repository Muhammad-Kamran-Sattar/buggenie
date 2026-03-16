import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { run, get, all, saveDatabase } from '../db/init.js'
import { generateBugReport } from '../services/aiService.js'

const router = express.Router()

// Get all reports
router.get('/', (req, res) => {
  try {
    const reports = all('SELECT * FROM reports ORDER BY created_at DESC')
    res.json({ reports })
  } catch (err) {
    console.error('Failed to fetch reports:', err)
    res.status(500).json({ error: 'Failed to fetch reports' })
  }
})

// Get single report
router.get('/:id', (req, res) => {
  try {
    const report = get('SELECT * FROM reports WHERE id = ?', [req.params.id])
    if (!report) {
      return res.status(404).json({ error: 'Report not found' })
    }
    res.json({ report })
  } catch (err) {
    console.error('Failed to fetch report:', err)
    res.status(500).json({ error: 'Failed to fetch report' })
  }
})

// Generate bug report with AI
router.post('/generate', async (req, res) => {
  try {
    const { title, project, severity, errorInput } = req.body

    if (!errorInput) {
      return res.status(400).json({ error: 'Error input is required' })
    }

    const generatedReport = await generateBugReport({
      title,
      project,
      severity,
      errorInput
    })

    res.json({ report: generatedReport })
  } catch (err) {
    console.error('Failed to generate report:', err)
    res.status(500).json({ error: err.message || 'Failed to generate report' })
  }
})

// Save report
router.post('/', (req, res) => {
  try {
    const {
      original_input,
      generated_title,
      generated_summary,
      severity,
      steps_to_reproduce,
      expected_behavior,
      actual_behavior,
      root_cause_analysis,
      suggested_fix,
      tags,
      ai_confidence,
      project
    } = req.body

    const id = uuidv4()
    const userId = 'demo-user-id'

    run(`
      INSERT INTO reports (
        id, user_id, original_input, generated_title, generated_summary,
        severity, steps_to_reproduce, expected_behavior, actual_behavior,
        root_cause_analysis, suggested_fix, tags, ai_confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      userId,
      original_input,
      generated_title,
      generated_summary,
      severity,
      steps_to_reproduce,
      expected_behavior,
      actual_behavior,
      root_cause_analysis,
      suggested_fix,
      tags,
      ai_confidence
    ])

    const report = get('SELECT * FROM reports WHERE id = ?', [id])
    res.json({ report })
  } catch (err) {
    console.error('Failed to save report:', err)
    res.status(500).json({ error: 'Failed to save report' })
  }
})

// Delete report
router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM reports WHERE id = ?', [req.params.id])
    saveDatabase()
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete report:', err)
    res.status(500).json({ error: 'Failed to delete report' })
  }
})

export default router