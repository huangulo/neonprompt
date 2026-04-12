# ProjectDashboard v2 — Architecture Spec & Build Plan

## Vision

A lightweight project dashboard that serves as a **shared state layer between humans and AI agents**. Humans get a clean UI. Agents get a RESTful API. Both can read and write project/task state without opening files or parsing chat logs.

**Repo:** https://github.com/huangulo/projectdashboard
**Server:** RackNerd (100.90.129.230) at `~/workspace/ProjectDashboard`
**Port:** 3335

---

## Current State (What Exists)

- Node.js + Express + SQLite (better-sqlite3)
- Single-user hardcoded auth (session-based)
- Two tables: `projects` (id, name, status) and `tasks` (id, project_id, title, completed, comments, created_at)
- Vanilla JS frontend (dark theme)
- Basic CRUD: login, create/delete projects, add/complete/delete tasks

### Repo Hygiene Issues (Must Fix First)

- `node_modules/` is committed to git
- `tasks.db` (live database) is committed
- `dashboard.log` is committed
- Two `progress-*.txt` files (OpenClaw artifacts) committed
- Five loose `test-*.js` files in root
- `session-debug.js` in root
- README is bare-bones
- No `.gitignore` entries for db files, logs, node_modules

---

## Target Architecture

### Auth System

Two separate auth paths:

1. **Human Auth** — JWT-based login via `/auth/login`. Returns a token stored in `localStorage`. All UI requests send `Authorization: Bearer <token>`. Session-based auth is removed.

2. **Agent Auth** — API key in `X-API-Key` header. Keys are stored hashed (SHA-256) in an `api_keys` table. Agents hit `/api/v1/*` endpoints with their key. Each key has a `label` (e.g., "ally-mcbeagle") for audit trail.

### Database Schema (v2)

```sql
-- Existing (modified)
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',  -- active, paused, completed, archived
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',  -- todo, in_progress, done, blocked
  priority TEXT DEFAULT 'medium',  -- low, medium, high, urgent
  assigned_to TEXT,  -- free text: "hugo", "ally", "codex-agent"
  due_date TEXT,  -- ISO 8601 date string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- New tables
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 of the actual key
  label TEXT NOT NULL,  -- "ally-mcbeagle", "codex", etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,  -- bcrypt
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,  -- username or api_key label
  actor_type TEXT NOT NULL,  -- 'human' or 'agent'
  action TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'completed'
  entity_type TEXT NOT NULL,  -- 'project' or 'task'
  entity_id INTEGER,
  details TEXT,  -- JSON string with what changed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY
);
```

### API Design

All API routes under `/api/v1/`. Accept both JWT (human) and API key (agent) auth.

```
# Projects
GET    /api/v1/projects                    — List all projects (filterable: ?status=active)
GET    /api/v1/projects/:id                — Get single project with task summary
POST   /api/v1/projects                    — Create project
PATCH  /api/v1/projects/:id                — Update project (name, status, description)
DELETE /api/v1/projects/:id                — Delete project (cascade)

# Tasks
GET    /api/v1/projects/:projectId/tasks   — List tasks (filterable: ?status=todo&priority=high&assigned_to=ally)
GET    /api/v1/tasks/:id                   — Get single task
POST   /api/v1/projects/:projectId/tasks   — Create task
PATCH  /api/v1/tasks/:id                   — Update task (any field)
DELETE /api/v1/tasks/:id                   — Delete task

# Activity
GET    /api/v1/activity                    — Recent activity log (?limit=20&project_id=1)

# Auth (human only)
POST   /auth/login                         — Returns JWT
POST   /auth/register                      — Create user (admin only, or first-user setup)

# API Keys (human only, requires JWT)
GET    /api/v1/keys                        — List API keys (labels only, not keys)
POST   /api/v1/keys                        — Generate new API key (returns key ONCE)
DELETE /api/v1/keys/:id                    — Revoke API key

# Health
GET    /health                             — { status: "ok", version: "2.0.0", uptime: ... }
```

### Response Format

All API responses follow consistent format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-11T...",
    "actor": "ally-mcbeagle",
    "actor_type": "agent"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Task 42 not found"
  }
}
```

### File Structure (Target)

```
ProjectDashboard/
├── server.js               # Entry point (slim — just bootstraps app)
├── package.json
├── .env.example            # Template with placeholder values
├── .gitignore              # Proper exclusions
├── Dockerfile
├── docker-compose.yml      # Optional: with volume mounts
├── README.md               # Comprehensive setup + API docs
├── LICENSE                 # MIT
├── src/
│   ├── app.js              # Express app setup
│   ├── db.js               # Database init + migrations
│   ├── middleware/
│   │   ├── auth.js         # JWT + API key middleware
│   │   └── logger.js       # Activity logging middleware
│   └── routes/
│       ├── auth.js         # Login, register
│       ├── projects.js     # Project CRUD
│       ├── tasks.js        # Task CRUD
│       ├── keys.js         # API key management
│       └── activity.js     # Activity log
├── migrations/
│   ├── 001-initial.sql     # Current schema
│   └── 002-v2-upgrade.sql  # New fields + tables
├── public/
│   ├── index.html          # Dashboard UI
│   ├── login.html          # Login page
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js          # Frontend logic
├── tests/                  # Organized test files
│   └── api.test.js
└── docs/
    └── API.md              # Full API reference
```

---

## Build Plan — Sequenced Tasks for Ally

### Pre-requisites

Ally must SSH into `100.90.129.230` and work in `~/workspace/ProjectDashboard`.
Every task ends with a verification step. Do not proceed to next task until current one passes.

---

### TASK 1: Repo Cleanup & Restructure

**Goal:** Clean the repo so it's GitHub-presentable. No feature changes.

```
SSH into 100.90.129.230. Navigate to ~/workspace/ProjectDashboard.

STEP 1 — Backup current state:
  cp -r ~/workspace/ProjectDashboard ~/workspace/ProjectDashboard.bak

STEP 2 — Update .gitignore to include:
  node_modules/
  *.db
  *.log
  .env
  progress-*.txt
  sessions.db

STEP 3 — Remove tracked files that should be ignored:
  git rm -r --cached node_modules/
  git rm --cached tasks.db
  git rm --cached dashboard.log
  git rm --cached progress-*.txt
  (if sessions.db exists: git rm --cached sessions.db)

STEP 4 — Move test files:
  mkdir -p tests/
  mv test-*.js tests/
  mv session-debug.js tests/

STEP 5 — Create directory structure:
  mkdir -p src/middleware src/routes migrations public/css public/js docs

STEP 6 — Commit and push:
  git add -A
  git commit -m "chore: clean repo - remove tracked artifacts, restructure directories"
  git push origin main

VERIFICATION:
  - Run: git status (should be clean)
  - Run: ls node_modules/ (should exist locally but not in git)
  - Run: git ls-files | grep -E "(node_modules|\.db|\.log)" (should return nothing)
  - Check GitHub repo page confirms node_modules is gone
```

---

### TASK 2: Database Migration System

**Goal:** Add versioned migrations so schema changes are safe and repeatable.

```
SSH into 100.90.129.230. Navigate to ~/workspace/ProjectDashboard.

Create file: migrations/001-initial.sql
Contents — the current schema as-is (projects + tasks tables with existing columns).
This captures the baseline. Do NOT run this migration — it's already applied.

Create file: src/db.js
This module should:
  1. Import better-sqlite3
  2. Open/create the database file (path from env or default ./data/dashboard.db)
  3. Enable WAL mode: db.pragma('journal_mode = WAL')
  4. Enable foreign keys: db.pragma('foreign_keys = ON')
  5. Create a schema_version table if it doesn't exist
  6. Read all .sql files from migrations/ directory, sorted by filename
  7. Run any migration with a version number higher than current schema_version
  8. Update schema_version after each successful migration
  9. Export the db instance

Create file: migrations/002-v2-upgrade.sql
Contents:
  -- Add new columns to projects
  ALTER TABLE projects ADD COLUMN description TEXT;
  ALTER TABLE projects ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

  -- Add new columns to tasks
  ALTER TABLE tasks ADD COLUMN description TEXT;
  ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'todo';
  ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium';
  ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
  ALTER TABLE tasks ADD COLUMN due_date TEXT;
  ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;

  -- Migrate existing completed boolean to status
  UPDATE tasks SET status = 'done' WHERE completed = 1;
  UPDATE tasks SET status = 'todo' WHERE completed = 0;

  -- New tables
  CREATE TABLE IF NOT EXISTS users ( ... );   [full schema from above]
  CREATE TABLE IF NOT EXISTS api_keys ( ... ); [full schema from above]
  CREATE TABLE IF NOT EXISTS activity_log ( ... ); [full schema from above]

  -- Move database file to data/ directory
  -- NOTE: The db file path change should be handled in src/db.js, not SQL

Create directory: data/
Add to .gitignore: data/

Update server.js to import db from './src/db.js' instead of inline db setup.

VERIFICATION:
  - Run: node -e "require('./src/db.js')" (should complete without errors)
  - Run: sqlite3 data/dashboard.db ".tables" (should show all tables including new ones)
  - Run: sqlite3 data/dashboard.db "SELECT * FROM schema_version" (should show version 2)
  - Run: sqlite3 data/dashboard.db "PRAGMA table_info(tasks)" (should show new columns)
  - Existing data must still be intact (any projects/tasks previously created)

Commit: "feat: add migration system and v2 schema upgrade"
Push to main.
```

---

### TASK 3: Auth System (JWT + API Keys)

**Goal:** Replace hardcoded session auth with JWT for humans and API key auth for agents.

```
SSH into 100.90.129.230. Navigate to ~/workspace/ProjectDashboard.

Install dependencies:
  npm install jsonwebtoken bcryptjs uuid

Create file: src/middleware/auth.js
This module exports three things:

  1. authenticateHuman(req, res, next)
     - Reads Authorization header, expects "Bearer <jwt>"
     - Verifies JWT with secret from process.env.JWT_SECRET
     - Sets req.user = { id, username, role }
     - Returns 401 if invalid/missing

  2. authenticateAgent(req, res, next)
     - Reads X-API-Key header
     - Hashes the key with SHA-256
     - Looks up hash in api_keys table
     - Updates last_used_at
     - Sets req.agent = { id, label }
     - Returns 401 if invalid/missing

  3. authenticateAny(req, res, next)
     - Tries JWT first, then API key
     - Sets req.actor = { name, type } where type is 'human' or 'agent'
     - Returns 401 if neither works

Create file: src/routes/auth.js
  POST /auth/login
    - Accepts { username, password }
    - Verifies against users table (bcrypt compare)
    - Returns { token: "<jwt>", expiresIn: "24h" }
    - If no users exist yet, create the first user from request (bootstrap mode)

  POST /auth/setup
    - Only works if users table is empty (first-run setup)
    - Creates the first admin user
    - Returns JWT

Create file: src/routes/keys.js (requires authenticateHuman)
  GET /api/v1/keys
    - Lists all API keys (id, label, created_at, last_used_at — NOT the key itself)

  POST /api/v1/keys
    - Accepts { label }
    - Generates a UUID v4 key prefixed with "pd_" (e.g., "pd_550e8400-e29b...")
    - Stores SHA-256 hash in api_keys table
    - Returns the plain key ONCE in response: { key: "pd_...", label: "ally" }
    - The plain key is never stored or retrievable again

  DELETE /api/v1/keys/:id
    - Revokes (deletes) an API key

Update server.js:
  - Remove express-session and connect-sqlite3 dependencies
  - Remove session middleware
  - Remove hardcoded ADMIN_USER/ADMIN_PASS logic
  - Mount auth routes
  - Protect /api/v1/* with authenticateAny

Update .env.example:
  JWT_SECRET=change-me-to-a-random-string
  PORT=3335

Update public/login.html:
  - Change form to POST to /auth/login
  - Store returned JWT in localStorage
  - Redirect to index.html on success

Update public/index.html (or public/js/app.js):
  - Add JWT to all fetch() calls: headers: { 'Authorization': 'Bearer ' + token }
  - Add logout: clear localStorage, redirect to login

VERIFICATION:
  - Start server: node server.js
  - Visit http://localhost:3335/login — should show login page
  - First login should trigger setup (create user)
  - After login, dashboard should load and function as before
  - Test API key flow:
    curl -H "Authorization: Bearer <jwt>" -X POST -d '{"label":"test"}' http://localhost:3335/api/v1/keys
    (should return a key)
    curl -H "X-API-Key: pd_<returned-key>" http://localhost:3335/api/v1/projects
    (should return projects list)
  - Verify old session auth no longer works
  - Verify unauthenticated requests get 401

Commit: "feat: JWT auth for humans, API key auth for agents"
Push to main.
```

---

### TASK 4: Versioned API Routes

**Goal:** Move all CRUD logic to `/api/v1/` with consistent response format and activity logging.

```
SSH into 100.90.129.230. Navigate to ~/workspace/ProjectDashboard.

Create file: src/middleware/logger.js
  - Middleware that logs actions to activity_log table
  - Export a function: logActivity(actor, actorType, action, entityType, entityId, details)
  - Also export an Express middleware that auto-logs on successful mutations (POST/PATCH/DELETE)

Create file: src/routes/projects.js
  All routes use authenticateAny middleware.
  All responses use { success, data, meta } format.

  GET /api/v1/projects
    - Query params: ?status=active (optional filter)
    - Returns array of projects with task count summary:
      { id, name, status, description, created_at, updated_at,
        task_counts: { total, todo, in_progress, done, blocked } }

  GET /api/v1/projects/:id
    - Returns single project with full task list

  POST /api/v1/projects
    - Body: { name, description?, status? }
    - Logs activity

  PATCH /api/v1/projects/:id
    - Body: any subset of { name, description, status }
    - Updates updated_at
    - Logs activity with details of what changed

  DELETE /api/v1/projects/:id
    - Cascade deletes tasks
    - Logs activity

Create file: src/routes/tasks.js
  All routes use authenticateAny middleware.

  GET /api/v1/projects/:projectId/tasks
    - Query params: ?status=todo&priority=high&assigned_to=ally
    - Supports multiple filters combined
    - Returns array sorted by: priority (urgent first), then due_date (soonest first)

  GET /api/v1/tasks/:id
    - Returns single task with project name

  POST /api/v1/projects/:projectId/tasks
    - Body: { title, description?, priority?, assigned_to?, due_date?, status? }
    - Logs activity

  PATCH /api/v1/tasks/:id
    - Body: any subset of task fields
    - If status changes to 'done', auto-set completed_at
    - If status changes FROM 'done', clear completed_at
    - Updates updated_at
    - Logs activity with details

  DELETE /api/v1/tasks/:id
    - Logs activity

Create file: src/routes/activity.js
  GET /api/v1/activity
    - Query params: ?limit=20&project_id=1&actor=ally
    - Returns recent activity entries

Add health endpoint:
  GET /health
    - Returns { status: "ok", version: "2.0.0", uptime: process.uptime() }
    - No auth required

Create file: src/app.js
  - Set up Express app
  - Mount all routes
  - Error handling middleware
  - Export app

Update server.js to use src/app.js (just imports app and calls app.listen).

Update public/js/app.js (frontend):
  - Update all fetch URLs to use /api/v1/ prefix
  - Handle new response format ({ success, data })
  - Support new task fields in UI (priority badges, status dropdown)
  - Show assigned_to if present
  - Color-code priorities: urgent=red, high=orange, medium=blue, low=gray

VERIFICATION:
  - Start server, login via UI, verify all CRUD still works
  - Test agent access:
    # Create project
    curl -H "X-API-Key: pd_<key>" -X POST \
      -H "Content-Type: application/json" \
      -d '{"name":"Test Project","description":"Created by agent"}' \
      http://localhost:3335/api/v1/projects

    # Create task with priority
    curl -H "X-API-Key: pd_<key>" -X POST \
      -H "Content-Type: application/json" \
      -d '{"title":"Deploy v2","priority":"high","assigned_to":"ally"}' \
      http://localhost:3335/api/v1/projects/1/tasks

    # Update task status
    curl -H "X-API-Key: pd_<key>" -X PATCH \
      -H "Content-Type: application/json" \
      -d '{"status":"in_progress"}' \
      http://localhost:3335/api/v1/tasks/1

    # Check activity log
    curl -H "X-API-Key: pd_<key>" http://localhost:3335/api/v1/activity

  - Verify activity_log has entries for all mutations
  - Verify /health returns valid JSON without auth
  - Verify priority sorting works in task list

Commit: "feat: versioned API with activity logging and enhanced task model"
Push to main.
```

---

### TASK 5: README & Documentation

**Goal:** Write a comprehensive README that sells the project and documents the API.

```
SSH into 100.90.129.230. Navigate to ~/workspace/ProjectDashboard.

Replace README.md with the following structure:

# Project Dashboard

> A lightweight project management dashboard designed as a shared state layer
> between humans and AI agents. Humans get a clean web UI. Agents get a REST API.

## Why This Exists

Keeping track of project state across humans and AI agents is painful.
Agents work in terminals and chat windows. Humans check dashboards.
This bridges the gap — one source of truth, two interfaces.

## Features

- Clean dark-themed web UI for humans
- RESTful API for AI agents (any agent, any framework)
- JWT auth for humans, API key auth for agents
- Task priorities, statuses, assignments, due dates
- Activity log — see what humans and agents have been doing
- SQLite — zero external dependencies, single-file database
- Docker-ready

## Quick Start

[Setup instructions: clone, npm install, configure .env, run]

## Agent Integration

[Show how to create an API key and make curl requests]
[Show a simple example of an agent creating a task]

## API Reference

[Link to docs/API.md for full reference]
[Inline the most common endpoints with examples]

## Configuration

[.env variables explained]

## Docker

[docker build + docker run commands]
[docker-compose.yml usage]

## Contributing

[Standard: fork, branch, PR]

## License

MIT

---

Create file: docs/API.md
  Full API reference with every endpoint, request/response examples,
  error codes, and authentication instructions for both JWT and API key.

Update .env.example with all current variables and comments.

Update Dockerfile if needed (ensure it copies src/ directory).

Update docker-compose.yml:
  - Add volume mount for data/ directory (persist database)
  - Set environment variables

VERIFICATION:
  - Read README.md and verify all code examples actually work
  - Verify Docker build: docker build -t projectdashboard .
  - Verify Docker run: docker run -p 3335:3335 projectdashboard
  - Check that docs/API.md covers every endpoint from src/routes/

Commit: "docs: comprehensive README and API documentation"
Push to main.

Add GitHub topics to repo: project-management, dashboard, api, ai-agents, nodejs, sqlite
Add repo description: "Lightweight project dashboard — shared state layer for humans and AI agents"
```

---

## Task Delivery Notes for Hugo

Each task above is designed to be sent to Ally as a single message. Copy the content between the triple backticks for each task.

**Rules for Ally:**
1. Complete one task fully before moving to the next
2. Run all verification steps and report results
3. If a verification step fails, fix it before committing
4. Do not skip steps or combine tasks
5. Each commit should leave the app in a working state
6. If unsure about something, ask Hugo — don't guess

**Suggested order:** Task 1 → 2 → 3 → 4 → 5 (strictly sequential, each depends on the previous)

**After all 5 tasks are done**, the repo will be:
- Clean and GitHub-presentable
- Dual-auth (human + agent)
- Versioned API with consistent response format
- Activity-logged
- Documented
- Docker-ready

**What's intentionally left out** (future work, not v2 scope):
- WebSocket/real-time updates
- Multi-user roles beyond admin
- Time tracking
- Git integration
- Voice commands
- AI-powered suggestions
- Mobile PWA
- Dependency management between tasks

These can be separate GitHub issues for future sprints.
