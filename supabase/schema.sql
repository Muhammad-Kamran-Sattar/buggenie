-- BugGenie AI - Supabase Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  project_id UUID,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can see own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policies for reports table
CREATE POLICY "Anyone can read reports" ON reports
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reports" ON reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update reports" ON reports
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete reports" ON reports
  FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Note: For auth, you may want to use Supabase Auth instead of custom users table
-- This schema uses a simple custom auth for compatibility