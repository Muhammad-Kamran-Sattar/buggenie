import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { supabase, isSupabaseConfigured } from './supabase.js'

const JWT_SECRET = process.env.JWT_SECRET || 'buggenie-secret-key-change-in-production'

// AI fallback generator
function generateFallback({ title, project, severity, errorInput }) {
  const severityLower = (severity || 'medium').toLowerCase()
  let determinedSeverity = severityLower
  const errorLower = errorInput.toLowerCase()

  if (errorLower.includes('fatal') || errorLower.includes('crash') || errorLower.includes('exception')) {
    determinedSeverity = 'high'
  }
  if (errorLower.includes('undefined') || errorLower.includes('null') || errorLower.includes('cannot read')) {
    determinedSeverity = errorLower.includes('critical') ? 'critical' : determinedSeverity
  }

  const stackMatch = errorInput.match(/at\s+(\S+)\s+\(([^)]+):(\d+):(\d+)\)/)
  const errorTypeMatch = errorInput.match(/(Error|TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+)/i)

  const fileLocation = stackMatch ? `${stackMatch[2]}:${stackMatch[3]}` : 'unknown location'
  const functionName = stackMatch ? stackMatch[1] : 'unknown function'
  const errorType = errorTypeMatch ? errorTypeMatch[1] : 'Error'
  const errorMessage = errorTypeMatch ? errorTypeMatch[2].trim() : 'An error occurred'

  const generatedTitle = title || `${errorType}: ${errorMessage.substring(0, 50)}`
  const summary = `A ${determinedSeverity} severity bug was encountered in the ${project || 'application'}. The error "${errorMessage}" occurs at ${fileLocation} in the ${functionName} function. This issue prevents the expected functionality from working correctly.`

  const steps = [
    'Trigger the specific action or condition that leads to this error',
    'Observe the application behavior when the error occurs',
    `The error manifests at ${fileLocation} in the ${functionName} function`,
    'Record any console output or error messages displayed'
  ]

  const expected = `The application should handle this edge case gracefully without throwing an error. The ${functionName} function should return a valid result or handle the null/undefined case appropriately.`
  const actual = `Currently, the application throws a ${errorType} with the message: "${errorMessage}". This causes the application to fail or display an error state.`
  const rootCause = `The root cause appears to be improper null/undefined handling in the ${functionName} function at ${fileLocation}. The code attempts to access properties or methods on objects that may be null or undefined.`

  const fix = `// Suggested fix for ${functionName}:

function ${functionName}(params) {
  if (!params || params === null) {
    console.warn('Invalid parameters provided to ${functionName}');
    return null;
  }

  if (!params.requiredProperty) {
    throw new Error('Missing required property');
  }

  const result = params.data?.map(item => processItem(item)) || [];
  return result;
}`

  const tags = [project || 'general', determinedSeverity, errorType.toLowerCase(), 'runtime-error'].filter((v, i, a) => a.indexOf(v) === i)

  let confidence = 60
  if (errorInput.length > 200) confidence += 10
  if (stackMatch) confidence += 10
  if (errorTypeMatch) confidence += 10
  if (title) confidence += 5
  confidence = Math.min(confidence, 95)

  return { title: generatedTitle, severity: determinedSeverity, summary, steps, expected, actual, rootCause, fix, tags, confidence }
}

// In-memory storage for development (when Supabase not configured)
let devUsers = []
let devReports = []

export default async function handler(req, res) {
  const { method, url } = req
  const useSupabase = isSupabaseConfigured()

  try {
    // Auth: Register
    if (method === 'POST' && url === '/auth/register') {
      const { email, password, name } = req.body
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' })
      }

      let userId, token

      if (useSupabase) {
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).single()
        if (existing) return res.status(400).json({ error: 'Email already registered' })

        const passwordHash = await bcrypt.hash(password, 10)
        userId = uuidv4()

        await supabase.from('users').insert({
          id: userId,
          email,
          password_hash: passwordHash,
          name
        })
      } else {
        if (devUsers.find(u => u.email === email)) {
          return res.status(400).json({ error: 'Email already registered' })
        }
        const passwordHash = await bcrypt.hash(password, 10)
        userId = uuidv4()
        devUsers.push({ id: userId, email, password_hash: passwordHash, name })
      }

      token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
      return res.json({ token, user: { id: userId, email, name } })
    }

    // Auth: Login
    if (method === 'POST' && url === '/auth/login') {
      const { email, password } = req.body
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      let user

      if (useSupabase) {
        const { data } = await supabase.from('users').select('*').eq('email', email).single()
        user = data
      } else {
        user = devUsers.find(u => u.email === email)
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const validPassword = await bcrypt.compare(password, user.password_hash)
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
      return res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
    }

    // Get all reports
    if (method === 'GET' && url === '/reports') {
      let reports

      if (useSupabase) {
        const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
        reports = data
      } else {
        reports = [...devReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }

      return res.json({ reports: reports || [] })
    }

    // Get single report
    if (method === 'GET' && url?.match(/^\/reports\/[\w-]+$/)) {
      const id = url.split('/')[2]

      if (useSupabase) {
        const { data } = await supabase.from('reports').select('*').eq('id', id).single()
        if (!data) return res.status(404).json({ error: 'Report not found' })
        return res.json({ report: data })
      } else {
        const report = devReports.find(r => r.id === id)
        if (!report) return res.status(404).json({ error: 'Report not found' })
        return res.json({ report })
      }
    }

    // Generate report
    if (method === 'POST' && url === '/reports/generate') {
      const { title, project, severity, errorInput } = req.body
      if (!errorInput) {
        return res.status(400).json({ error: 'Error input is required' })
      }
      const generatedReport = generateFallback({ title, project, severity, errorInput })
      return res.json({ report: generatedReport })
    }

    // Save report
    if (method === 'POST' && url === '/reports') {
      const { original_input, generated_title, generated_summary, severity, steps_to_reproduce, expected_behavior, actual_behavior, root_cause_analysis, suggested_fix, tags, ai_confidence } = req.body

      const id = uuidv4()
      const userId = 'demo-user-id'
      const now = new Date().toISOString()

      if (useSupabase) {
        await supabase.from('reports').insert({
          id,
          user_id: userId,
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
          created_at: now,
          updated_at: now
        })
      } else {
        devReports.push({
          id,
          user_id: userId,
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
          created_at: now,
          updated_at: now
        })
      }

      return res.json({ report: { id, user_id: userId, original_input, generated_title, generated_summary, severity, steps_to_reproduce, expected_behavior, actual_behavior, root_cause_analysis, suggested_fix, tags, ai_confidence, created_at: now, updated_at: now } })
    }

    // Delete report
    if (method === 'DELETE' && url?.match(/^\/reports\/[\w-]+$/)) {
      const id = url.split('/')[2]

      if (useSupabase) {
        await supabase.from('reports').delete().eq('id', id)
      } else {
        devReports = devReports.filter(r => r.id !== id)
      }

      return res.json({ success: true })
    }

    res.status(404).json({ error: 'Not found' })
  } catch (err) {
    console.error('API Error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
}