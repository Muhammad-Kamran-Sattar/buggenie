# AI Bug Report Generator - SaaS Web Application

## 1. Project Overview

**Project Name:** BugGenie AI
**Type:** SaaS Web Application
**Core Functionality:** AI-powered bug report generator that transforms raw error descriptions into structured, actionable bug reports using AI analysis
**Target Users:** Software developers, QA engineers, product managers, and development teams

## 2. Technical Architecture

### Stack
- **Frontend:** React 18 + Vite + React Router
- **Backend:** Node.js + Express.js
- **Database:** SQLite (for demo) with Supabase-compatible schema (cloud-ready)
- **AI Integration:** Anthropic Claude API for bug analysis
- **Authentication:** JWT-based auth

### Modular Structure
```
/src
  /client          # Frontend React app
    /components    # Reusable UI components
    /pages         # Page components
    /hooks         # Custom React hooks
    /services      # API service layers
    /context       # React context providers
    /utils         # Utility functions
  /server          # Backend Express API
    /controllers   # Route controllers
    /services      # Business logic
    /models        # Data models
    /middleware    # Express middleware
    /routes        # API routes
    /config        # Configuration
  /shared          # Shared types and utilities
```

## 3. UI/UX Specification

### Color Palette
- **Primary:** #0D1117 (Deep dark background)
- **Secondary:** #161B22 (Card backgrounds)
- **Accent:** #58A6FF (Electric blue - primary actions)
- **Accent Secondary:** #F78166 (Coral - alerts/deletions)
- **Success:** #3FB950 (Green - success states)
- **Warning:** #D29922 (Amber - warnings)
- **Text Primary:** #E6EDF3 (Main text)
- **Text Secondary:** #8B949E (Muted text)
- **Border:** #30363D (Subtle borders)

### Typography
- **Primary Font:** "JetBrains Mono" (code-focused, technical feel)
- **Secondary Font:** "Plus Jakarta Sans" (readable headings)
- **Headings:** Plus Jakarta Sans, 600-700 weight
  - H1: 2.5rem
  - H2: 1.75rem
  - H3: 1.25rem
- **Body:** JetBrains Mono, 400 weight, 1rem
- **Small:** 0.875rem

### Layout
- **Max Width:** 1400px centered
- **Sidebar:** 260px fixed left (collapsible on mobile)
- **Content Area:** Fluid, min 320px mobile
- **Spacing:** 8px base unit (8, 16, 24, 32, 48)

### Responsive Breakpoints
- **Mobile:** < 768px (sidebar hidden, hamburger menu)
- **Tablet:** 768px - 1024px (collapsed sidebar)
- **Desktop:** > 1024px (full layout)

### Components

#### Navigation Sidebar
- Logo + app name at top
- Nav items: Dashboard, New Report, History, Settings
- User profile at bottom
- Active state: left accent border, background highlight

#### Bug Report Form
- Multi-step wizard interface
- Step 1: Basic Info (title, project, severity)
- Step 2: Error Input (textarea with code editor feel)
- Step 3: AI Analysis (loading state with progress)
- Step 4: Review & Edit (generated report)
- Step 5: Export/Submit

#### Generated Report Card
- Severity badge (Critical/High/Medium/Low)
- AI confidence score
- Expandable sections: Summary, Steps to Reproduce, Expected vs Actual, Root Cause Analysis, Suggested Fix
- Copy to clipboard, Export JSON/Markdown buttons

#### Dashboard
- Stats cards: Total Reports, This Week, AI Credits Used
- Recent reports list with quick actions
- Quick generate button

### Animations
- Page transitions: fade + slide (200ms ease-out)
- Card hover: subtle lift (transform: translateY(-2px))
- Button press: scale(0.98)
- Loading: skeleton pulse animation
- AI processing: typing indicator with dots

## 4. Functionality Specification

### Authentication
- Email/password registration and login
- JWT token storage in httpOnly cookies
- Protected routes
- Demo mode without auth

### Bug Report Generation Flow
1. User enters error description/stack trace
2. User selects project and severity (or lets AI determine)
3. AI analyzes and generates:
   - Title (concise)
   - Summary (2-3 sentences)
   - Steps to Reproduce (numbered list)
   - Expected Behavior
   - Actual Behavior
   - Root Cause Analysis
   - Suggested Fix (with code snippets)
   - Severity (AI-confirmed or overridden)
   - Tags/Labels
4. User reviews, edits if needed
5. Export as Markdown, JSON, or save to database

### Dashboard Features
- View all generated reports
- Filter by project, severity, date
- Search reports
- Delete reports
- Regenerate from original input

### Settings
- API key configuration (Anthropic)
- Default project preferences
- Export format preferences

## 5. Database Schema

### Users Table
- id, email, password_hash, created_at, updated_at

### Projects Table
- id, name, description, user_id, created_at

### Reports Table
- id, user_id, project_id, original_input
- generated_title, generated_summary, severity
- steps_to_reproduce, expected_behavior, actual_behavior
- root_cause_analysis, suggested_fix, tags
- ai_confidence, created_at, updated_at

## 6. Acceptance Criteria

### Must Have
- [ ] User can register/login (or use demo mode)
- [ ] Multi-step bug report generation wizard
- [ ] AI analysis produces complete structured report
- [ ] Dashboard shows all user reports
- [ ] Reports can be edited and deleted
- [ ] Export to Markdown and JSON
- [ ] Responsive design works on mobile
- [ ] Cloud-ready database schema

### Visual Checkpoints
- [ ] Dark theme with electric blue accents renders correctly
- [ ] Sidebar navigation is functional and highlights active route
- [ ] Loading states show during AI processing
- [ ] Report cards display all AI-generated sections
- [ ] Forms validate input and show error states