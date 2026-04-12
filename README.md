# Project Dashboard

> A lightweight project dashboard designed as a shared state layer between humans and AI agents. Humans get a clean web UI. Agents get a REST API.

## Why This Exists

Tracking project state across humans and AI agents is painful. Different tools, different interfaces, different mental models. This dashboard bridges the gap with one source of truth and two interfaces:

- **Humans** get a cyberpunk-themed web UI for visual project management
- **AI agents** get a clean REST API for programmatic task management
- **Both** work on the same data — no sync, no conflicts, just state

## Features

- 🎨 **Cyberpunk Web UI** — Neon aesthetics, keyboard shortcuts, smooth interactions
- 🔐 **JWT Auth for Humans** — Secure token-based authentication
- 🔑 **API Key Auth for Agents** — Simple key-based access for automation
- 📊 **Task Management** — Priorities (urgent/high/medium/low), statuses, assignments, due dates
- 📜 **Activity Logging** — Complete audit trail of all actions
- 💾 **SQLite Database** — Zero dependencies, portable, fast
- 🐳 **Docker Ready** — Containerized deployment included
- 🤖 **Agent Heartbeat** — Real-time agent status monitoring (idle/working/error)
- 📈 **Progress Tracking** — Visual progress bars on tasks (0-100%)
- 🧠 **Model & Token Telemetry** — Track which AI model performed work and token usage
- ⛔ **Blocked Task Tracking** — Tasks can be marked blocked with a reason

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/projectdashboard.git
cd projectdashboard

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# Run the server
node server.js
```

### First Run

1. Open `http://localhost:3335` in your browser
2. You'll see a login screen — click "Setup Admin Account"
3. Create your admin username and password
4. You're in! Create your first project and start adding tasks

## Agent Integration

AI agents can use API keys for authentication instead of JWT tokens.

### Create an API Key

```bash
curl -X POST http://localhost:3335/api/v1/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "Ally McBeagle"}'

# Response:
{
  "success": true,
  "data": {
    "id": 1,
    "key": "pd_550e8400-e29b-41d4-a716-446655440000",
    "label": "Ally McBeagle"
  }
}
```

### Use API Key in Requests

```bash
# Set your API key
export DASHBOARD_API_KEY="pd_550e8400-e29b-41d4-a716-446655440000"

# Create a project
curl -X POST http://localhost:3335/api/v1/projects \
  -H "X-API-Key: $DASHBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Website Redesign", "description": "Modernize the company website"}'

# Create a task
curl -X POST http://localhost:3335/api/v1/tasks/project/1 \
  -H "X-API-Key: $DASHBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Design new homepage", "priority": "high", "assigned_to": "ally"}'

# Update task status
curl -X PATCH http://localhost:3335/api/v1/tasks/1 \
  -H "X-API-Key: $DASHBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Check activity log
curl http://localhost:3335/api/v1/activity?limit=10 \
  -H "X-API-Key: $DASHBOARD_API_KEY"
```

## Agent Telemetry

Agents can send heartbeats to report their status and track token usage across tasks.

### Send Heartbeat

Report agent status and current task:

```bash
# Send heartbeat
curl -H "X-API-Key: YOUR_KEY" -X POST -H "Content-Type: application/json" \
 -d '{"status":"working","model_used":"glm-4.7"}' \
 http://localhost:3335/api/v1/heartbeat
```

**Status values:** `idle`, `working`, `error`

### Track Model and Token Usage

Create tasks with model and token information:

```bash
# Create task with model info
curl -H "X-API-Key: YOUR_KEY" -X POST -H "Content-Type: application/json" \
 -d '{"title":"Build auth module","priority":"high","model_used":"glm-4.7","tokens_in":1500,"tokens_out":500}' \
 http://localhost:3335/api/v1/tasks/project/1
```

Update task progress and cumulative token usage:

```bash
# Update progress
curl -H "X-API-Key: YOUR_KEY" -X PATCH -H "Content-Type: application/json" \
 -d '{"progress":75,"tokens_in":4500,"tokens_out":2100}' \
 http://localhost:3335/api/v1/tasks/1
```

**Auto-complete:** When progress reaches 100%, status is automatically set to `done` and `completed_at` is set.

**Blocked tasks:** Set status to `blocked` and provide a reason:

```bash
curl -H "X-API-Key: YOUR_KEY" -X PATCH -H "Content-Type: application/json" \
 -d '{"status":"blocked","blocked_reason":"Waiting for API key"}' \
 http://localhost:3335/api/v1/tasks/1
```

## API Reference

For complete API documentation, see [docs/API.md](docs/API.md).

### Common Endpoints

#### List Projects
```bash
curl http://localhost:3335/api/v1/projects -H "X-API-Key: YOUR_KEY"
```

#### Create Task
```bash
curl -X POST http://localhost:3335/api/v1/tasks/project/1 \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Task name", "priority": "high"}'
```

#### Update Task
```bash
curl -X PATCH http://localhost:3335/api/v1/tasks/1 \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

#### List Activity
```bash
curl http://localhost:3335/api/v1/activity?limit=20 -H "X-API-Key: YOUR_KEY"
```

## Configuration

Environment variables in `.env`:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT token signing | - | ✅ Yes |
| `PORT` | HTTP server port | `3335` | No |

**Important:** Generate a strong `JWT_SECRET` for production:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Docker

### Build

```bash
docker build -t project-dashboard .
```

### Run

```bash
docker run -d \
  --name project-dashboard \
  -p 3335:3335 \
  -e JWT_SECRET=your-random-secret-key-here \
  -v $(pwd)/data:/app/data \
  project-dashboard
```

The database will persist in the `data/` volume.

## Database Schema

The dashboard uses SQLite with the following tables:

- `users` — Admin accounts (JWT auth)
- `api_keys` — API keys for agent access
- `projects` — Project records
- `tasks` — Task records with status, priority, assignments
- `activity_log` — Audit trail of all actions
- `agent_heartbeats` — Real-time agent status monitoring

Database migrations are automatically applied on startup.

## Development

```bash
# Run in development mode with auto-restart
npm run dev

# Run tests
npm test

# Run database migrations manually
node src/db.js migrate
```

## Troubleshooting

### Setup Already Completed

If you see "Setup already completed" when trying to create an admin account:

1. The users table already has records
2. Log in with existing credentials
3. Or reset the database: `rm data/tasks.db` and restart

### API Key Not Working

- Ensure you're using the `X-API-Key` header (not `Authorization`)
- Check the key starts with `pd_`
- Verify the key hasn't been deleted

### Port Already in Use

Change the port in `.env`:
```
PORT=3336
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests to the main branch.

## Support

- 📖 [Documentation](docs/API.md)
- 🐛 [Issue Tracker](https://github.com/yourusername/projectdashboard/issues)
- 💬 [Discord](https://discord.gg/your-invite)

---

Made with 🔮 by Hugo Angulo
