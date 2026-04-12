# Project Dashboard

**Host:** RackNerd (100.90.129.230)
**Path:** ~/workspace/ProjectDashboard
**URL:** http://100.90.129.230:3335
**Status:** Active / Production

---

## 📋 Overview

A lightweight project management dashboard built with Node.js, Express, and SQLite. Designed for tracking projects and their associated tasks with a clean, dark-themed UI.

**Version:** 1.0.0
**License:** Internal Use

---

## 🏗️ Architecture

### Tech Stack

- **Backend:**
  - Node.js (v20+)
  - Express.js (v4.21.1)
  - better-sqlite3 (v11.5.0) - Embedded database
  - express-session (v1.19.0) - Session management
  - connect-sqlite3 (v0.9.16) - SQLite session store
  - body-parser (v1.20.3) - Request parsing
  - cors (v2.8.5) - CORS handling
  - dotenv (v17.3.1) - Environment configuration

- **Frontend:**
  - Vanilla JavaScript (ES6+)
  - No frameworks
  - Dark-themed UI with CSS Grid/Flexbox
  - RESTful API integration

- **Database:**
  - SQLite (embedded)
  - Foreign key constraints with CASCADE DELETE
  - Two tables: `projects` and `tasks`

---

## 📊 Database Schema

### Projects Table
```sql
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active'
);
```

### Tasks Table
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**Constraints:**
- Foreign Keys enabled with CASCADE DELETE
- Unique constraint on project names
- Timestamp auto-generated for tasks

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/login` | Login page |
| POST | `/login` | Authenticate with credentials |
| GET | `/logout` | Destroy session and redirect |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| DELETE | `/api/projects/:id` | Delete project (cascades to tasks) |

**Create Project Request:**
```json
{
  "name": "Project Name"
}
```

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/:projectId` | List tasks for a project |
| POST | `/api/tasks` | Create new task |
| PATCH | `/api/tasks/:id` | Update task (completed, title, etc.) |
| DELETE | `/api/tasks/:id` | Delete task |

**Create Task Request:**
```json
{
  "projectId": 1,
  "title": "Task description"
}
```

**Update Task Request:**
```json
{
  "completed": 1,
  "title": "Updated task name"
}
```

---

## 🎨 UI Features

### Layout
- **Header:** Logo + Logout button
- **Sidebar:** Project list with add/delete
- **Main:** Task view for selected project

### Interactions
- Real-time project selection
- Checkbox task completion
- Enter key shortcuts for quick add
- Confirmation dialogs for destructive actions
- Auto-refresh after changes

### Styling
- Dark theme (#1a1a1a background)
- Blue accent (#4a9eff)
- Responsive flexbox layout
- Custom scrollbars

---

## 🚀 Deployment

### Environment Variables
```bash
ADMIN_USER=lechauve
ADMIN_PASS="calvito911#"
SESSION_SECRET=dashboard-secret-key
PORT=3335
```

### Docker Configuration
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3335
CMD ["node", "server.js"]
```

### Running Manually
```bash
cd ~/workspace/ProjectDashboard
npm install
node server.js
```

### Access
- **Internal:** http://0.0.0.0:3335
- **Tailscale:** http://100.90.129.230:3335
- **Credentials:** lechauve / calvito911#

---

## 🔒 Security

- Session-based authentication with express-session
- SQLite-backed session storage
- Protected API routes (401 Unauthorized)
- Session timeout: 24 hours
- Basic auth middleware for protected routes

---

## 📁 File Structure

```
ProjectDashboard/
├── server.js           # Main application server
├── package.json        # Dependencies
├── .env                # Environment variables
├── Dockerfile          # Container config
├── public/
│   ├── index.html      # Dashboard UI
│   └── login.html      # Login page
├── tasks.db            # SQLite database (tasks)
├── sessions.db         # Session storage
└── node_modules/       # Dependencies
```

---

## 🧪 Test Files

- `test-auth.js` - Authentication testing
- `test-body-padding.js` - Request body validation
- `test-e2e.js` - End-to-end testing
- `test-header.js` - HTTP header testing
- `test-strikethrough-verify.js` - UI element verification
- `test-regression-header-spacing.js` - Regression testing
- `session-debug.js` - Session debugging

---

# 🚀 Roadmap: Making It More Than Awesome

## Phase 1: Core Enhancements (Quick Wins)

### 1. Task Priorities & Due Dates
**Why:** A project manager without deadlines is just a wish-list manager.
**Implementation:**
```sql
ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium'; -- low, medium, high, urgent
ALTER TABLE tasks ADD COLUMN due_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
```
- Add priority badges (🔴 Urgent, 🟡 High, 🟢 Medium, ⚪ Low)
- Sort tasks by due date + priority
- Color-coded overdue tasks
- Calendar view for projects

### 2. Real-time Updates
**Why:** Refreshing manually is so 2010.
**Implementation:**
- WebSocket (Socket.io) integration
- Push notifications when tasks change
- Live collaboration indicators (who's viewing/editing)

### 3. Rich Task Details
**Why:** Tasks aren't just one-liners.
**Implementation:**
```sql
ALTER TABLE tasks ADD COLUMN description TEXT;
ALTER TABLE tasks ADD COLUMN tags TEXT; -- JSON array
ALTER TABLE tasks ADD COLUMN attachments TEXT; -- JSON array of file paths
```
- Task details modal
- Tag system for categorization
- File upload support (attachments)
- Subtasks / checklists within tasks

### 4. Keyboard Shortcuts
**Why:** Power users hate mice.
**Implementation:**
- `Ctrl+N` - New task
- `Ctrl+Shift+N` - New project
- `Ctrl+Enter` - Save
- `Escape` - Cancel/close
- `J/K` - Navigate tasks
- `X` - Toggle completion

---

## Phase 2: Advanced Features (The "Pro" Touch)

### 5. Project Templates
**Why:** You shouldn't start from scratch every time.
**Implementation:**
- Pre-built project templates (e.g., "Web Dev", "Marketing Launch", "Bug Sprint")
- Custom templates from completed projects
- Template marketplace (internal use)

### 6. Time Tracking
**Why:** Billable hours and productivity metrics.
**Implementation:**
```sql
CREATE TABLE time_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER,
  user TEXT,
  started_at TIMESTAMP,
  stopped_at TIMESTAMP,
  duration_seconds INTEGER,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```
- Start/stop timer on tasks
- Manual time entry
- Time reports per project/task
- Export to CSV

### 7. Activity Stream
**Why:** Accountability and transparency.
**Implementation:**
```sql
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT,
  action TEXT, -- created, updated, deleted, completed
  entity_type TEXT, -- project, task
  entity_id INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changes TEXT -- JSON diff
);
```
- Feed view of all changes
- "Undo" functionality for last action
- Email notifications for assigned tasks

### 8. Advanced Filtering & Search
**Why:** Finding things in 100+ tasks shouldn't be hard.
**Implementation:**
- Full-text search across tasks
- Filter by: priority, status, assignee, due date, tags
- Saved filters (custom views)
- Bulk operations (complete all, delete all, reassign)

---

## Phase 3: Analytics & Integrations

### 9. Dashboard Analytics
**Why:** Data-driven decisions.
**Implementation:**
- Project completion rate
- Task velocity (tasks completed per week)
- Burndown charts (Agile style)
- Time reports
- Export to PDF/CSV

### 10. OpenClaw Integration
**Why:** This is YOUR dashboard, Hugo. It should know about you.
**Implementation:**
- **Auto-task creation:** When you spawn a sub-agent via OpenClaw, auto-create a task on the dashboard
- **Status updates:** OpenClaw can push progress updates to tasks
- **Smart reminders:** Notify via WhatsApp/Telegram when a deadline is approaching
- **Agent tracking:** See which OpenClaw agent is working on which task

**Example Flow:**
```
Hugo: "Build me a React app"
Ally: Spawns Codex agent → Creates task "Build React app" on dashboard
Codex: Updates task status → Ally pushes "in_progress"
Hugo: Can check dashboard anytime without chatting
```

### 11. API Webhooks
**Why:** Other systems should know what's happening here.
**Implementation:**
- Webhooks on: task created, completed, deleted, due date reached
- Integrate with GitHub issues (sync with tasks)
- Integrate with calendar (due dates as events)

### 12. Mobile PWA
**Why:** You need to check tasks on your phone.
**Implementation:**
- Progressive Web App (installable)
- Offline support (IndexedDB)
- Push notifications for deadlines
- Touch-optimized UI

---

## Phase 4: The "Killer Features"

### 13. AI-Powered Task Suggestions
**Why:** Let the AI help you organize.
**Implementation:**
- "Suggest subtasks for this task" (uses OpenClaw's model)
- "Break down this project into tasks"
- Smart task categorization based on title
- Duplicate task detection

### 14. Voice Commands
**Why:** "Ally, add a task to deploy the server."
**Implementation:**
- Natural language task creation
- "Show me my high-priority tasks"
- "Complete task #42"
- Uses ElevenLabs TTS + Whisper STT (already have these tools!)

### 15. Dependency Management
**Why:** Some tasks can't start until others finish.
**Implementation:**
```sql
ALTER TABLE tasks ADD COLUMN depends_on TEXT; -- JSON array of task IDs
```
- Visual dependency graph
- Block tasks automatically when dependencies incomplete
- Critical path identification (Project Management 101)

### 16. Git Integration
**Why:** Track work by commits, not just checkboxes.
**Implementation:**
- Link tasks to Git commits/branches
- Auto-complete tasks when PRs are merged
- "Show all commits for this task"

---

## 🎯 Priority Implementation Order

**Start with these (highest impact, lowest effort):**

1. ✅ **Task Priorities & Due Dates** (1-2 hours)
2. ✅ **Keyboard Shortcuts** (2-3 hours)
3. ✅ **Advanced Filtering & Search** (3-4 hours)
4. ✅ **Activity Stream** (4-5 hours)
5. ✅ **OpenClaw Integration** (4-5 hours, but huge value)

**Next tier (medium effort, big features):**

6. ⚠️ **Time Tracking** (6-8 hours)
7. ⚠️ **Rich Task Details** (4-6 hours)
8. ⚠️ **Dashboard Analytics** (6-8 hours)
9. ⚠️ **Real-time Updates** (8-10 hours)

**Future proofing (big features, bigger effort):**

10. 🔮 **Mobile PWA** (10-15 hours)
11. 🔮 **AI-Powered Suggestions** (8-12 hours)
12. 🔮 **Voice Commands** (6-8 hours)
13. 🔮 **Dependency Management** (10-15 hours)

---

## 📝 Notes & Considerations

### Database Migration Strategy
- Since SQLite is embedded, migrations need to be versioned
- Add `migrations/` directory with SQL files
- Track `db_version` in a table to know which migrations to run
- Backup before migrations (you have the db files in git, but consider automated backups)

### Performance
- Current implementation is synchronous (better-sqlite3)
- For high concurrency, consider migrating to PostgreSQL
- Add indexes on frequently queried columns (due_date, priority, created_at)

### Backup Strategy
- Current: Database files in working directory
- Recommended: 
  - Daily automated backups to S3/Rclone destination
  - Point-in-time recovery capability
  - Export to JSON for portability

### Authentication Enhancements
- Current: Basic username/password
- Recommended:
  - TOTP/2FA support
  - Password reset flow
  - Multiple user roles (admin, editor, viewer)

---

## 🔗 Integrations to Consider

1. **GitHub/GitLab** - Sync tasks with issues
2. **Slack/Discord** - Notify on task completion
3. **Google Calendar** - Due dates as events
4. **Notion** - Import/export project templates
5. **Trello/Jira** - Migration tools for onboarding

---

**Analysis complete.** This dashboard is solid foundation, but there's room to make it a true powerhouse project management tool. The OpenClaw integration alone would make it worth the time.

*Case dismissed.* 🐾⚖️
