import { v4 as uuidv4 } from 'uuid'
import initSqlJs from 'sql.js'

let db = null
let anthropic = null

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
  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      original_input TEXT,
      generated_title TEXT,
      generated_summary TEXT,
      severity TEXT,
      steps_to_reproduce TEXT,
      expected_behavior TEXT,
      actual_behavior TEXT,
      root_cause_analysis TEXT,
      suggested_fix TEXT,
      tags TEXT,
      ai_confidence INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
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

function execQuery(sql, params = []) {
  db.run(sql, params)
}

async function getAnthropicClient() {
  if (!anthropic) {
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk')
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (apiKey) {
        anthropic = new Anthropic({ apiKey })
      }
    } catch (err) {
      console.log('Anthropic SDK not available, using fallback generation')
    }
  }
  return anthropic
}

async function generateBugReport({ title, project, severity, errorInput }) {
  const client = await getAnthropicClient()

  if (client) {
    const systemPrompt = `You are an expert bug report analyst. Generate a structured, comprehensive bug report from the provided error information. Your output must be valid JSON with these exact fields:
{
  "title": "concise bug title",
  "severity": "critical|high|medium|low",
  "summary": "2-3 sentence summary",
  "steps": ["step 1", "step 2", ...],
  "expected": "expected behavior description",
  "actual": "actual behavior description",
  "rootCause": "root cause analysis",
  "fix": "suggested code fix or solution",
  "tags": ["tag1", "tag2", ...],
  "confidence": 0-100
}`

    const userPrompt = `
Project: ${project || 'Not specified'}
Initial Severity: ${severity || 'medium'}
Error/Issue Information:
${errorInput}

Generate a comprehensive bug report in JSON format.
`

    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const jsonMatch = content.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        title: parsed.title,
        severity: parsed.severity,
        summary: parsed.summary,
        steps: parsed.steps,
        expected: parsed.expected,
        actual: parsed.actual,
        rootCause: parsed.rootCause,
        fix: parsed.fix,
        tags: parsed.tags,
        confidence: parsed.confidence
      }
    }
  }

  // Fallback
  const severityLower = (severity || 'medium').toLowerCase()
  let determinedSeverity = severityLower
  const errorLower = errorInput.toLowerCase()

  if (errorLower.includes('fatal') || errorLower.includes('crash') || errorLower.includes('exception')) {
    determinedSeverity = 'high'
  }

  const stackMatch = errorInput.match(/at\s+(\S+)\s+\(([^)]+):(\d+):(\d+)\)/)
  const errorTypeMatch = errorInput.match(/(Error|TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+)/i)

  const fileLocation = stackMatch ? `${stackMatch[2]}:${stackMatch[3]}` : 'unknown location'
  const functionName = stackMatch ? stackMatch[1] : 'unknown function'
  const errorType = errorTypeMatch ? errorTypeMatch[1] : 'Error'
  const errorMessage = errorTypeMatch ? errorTypeMatch[2].trim() : 'An error occurred'

  const generatedTitle = title || `${errorType}: ${errorMessage.substring(0, 50)}`

  return {
    title: generatedTitle,
    severity: determinedSeverity,
    summary: `A ${determinedSeverity} severity bug was encountered in the ${project || 'application'}. The error "${errorMessage}" occurs at ${fileLocation}.`,
    steps: ['Trigger the specific action that leads to this error', 'Observe the application behavior', 'Record console output'],
    expected: `The application should handle this edge case gracefully.`,
    actual: `The application throws a ${errorType}: "${errorMessage}".`,
    rootCause: `Improper null/undefined handling in the ${functionName} function at ${fileLocation}.`,
    fix: `// Add null checks in ${functionName}`,
    tags: [project || 'general', determinedSeverity, 'runtime-error'],
    confidence: 60
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method, url } = req

  try {
    db = await getDb()

    // GET /api/reports - Get all reports
    if (method === 'GET' && (url === '/api/reports' || url === '/api/reports/')) {
      const reports = runAll('SELECT * FROM reports ORDER BY created_at DESC')
      return res.json({ reports })
    }

    // GET /api/reports/:id - Get single report
    if (method === 'GET' && url.match(/^\/api\/reports\/[^\/]+$/)) {
      const id = url.split('/').pop()
      const report = runQuery('SELECT * FROM reports WHERE id = ?', [id])
      if (!report) {
        return res.status(404).json({ error: 'Report not found' })
      }
      return res.json({ report })
    }

    // POST /api/reports/generate - Generate bug report with AI
    if (method === 'POST' && (url === '/api/reports/generate' || url === '/api/reports/generate/')) {
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

      return res.json({ report: generatedReport })
    }

    // POST /api/reports - Save report
    if (method === 'POST' && (url === '/api/reports' || url === '/api/reports/')) {
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

      execQuery(`
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

      const report = runQuery('SELECT * FROM reports WHERE id = ?', [id])
      return res.json({ report })
    }

    // DELETE /api/reports/:id
    if (method === 'DELETE' && url.match(/^\/api\/reports\/[^\/]+$/)) {
      const id = url.split('/').pop()
      execQuery('DELETE FROM reports WHERE id = ?', [id])
      return res.json({ success: true })
    }

    // 404
    res.status(404).json({ error: 'Not found' })

  } catch (err) {
    console.error('Reports API error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
}