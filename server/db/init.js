import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DB_PATH = join(__dirname, 'buggenie.db')

let db = null

export async function initDatabase() {
  const SQL = await initSqlJs()

  // Load existing database or create new one
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

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
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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

  // Create indexes
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)')
  } catch (e) {
    // Indexes may already exist
  }

  saveDatabase()
  console.log('Database initialized')
  return db
}

export function getDb() {
  return db
}

export function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(DB_PATH, buffer)
  }
}

// Helper functions to replace better-sqlite3 API
export function run(sql, params = []) {
  db.run(sql, params)
  saveDatabase()
}

export function get(sql, params = []) {
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

export function all(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export default { initDatabase, getDb, run, get, all, saveDatabase }