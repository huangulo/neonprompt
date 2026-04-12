# Project Dashboard API Reference

Complete REST API documentation for the Project Dashboard.

**Base URL:** `http://your-host:3335/api/v1`

**Authentication:** Two methods supported:
- **Humans:** JWT token via `Authorization: Bearer <token>` header
- **Agents:** API key via `X-API-Key: <key>` header

---

## Authentication

### POST /auth/setup

Create the initial admin user. Only works when no users exist.

**Request:**
```json
{
  "username": "admin",
  "password": "secure-password-here"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

**Error (403):**
```json
{
  "success": false,
  "error": {
    "code": "SETUP_COMPLETE",
    "message": "Setup already completed"
  }
}
```

---

### POST /auth/login

Authenticate with existing credentials.

**Request:**
```json
{
  "username": "admin",
  "password": "secure-password-here"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

---

## Projects

### GET /projects

List all projects with task count summaries.

**Query Parameters:**
- `status` (optional) — Filter by status: `active`, `archived`

**Request:**
```bash
curl http://localhost:3335/api/v1/projects -H "X-API-Key: pd_..."
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Website Redesign",
      "description": "Modernize the company website",
      "status": "active",
      "created_at": "2026-04-12T15:00:00.000Z",
      "updated_at": "2026-04-12T15:00:00.000Z",
      "todo_count": 5,
      "in_progress_count": 2,
      "done_count": 10,
      "blocked_count": 1
    }
  ]
}
```

---

### GET /projects/:id

Get a single project with its full task list.

**Request:**
```bash
curl http://localhost:3335/api/v1/projects/1 -H "X-API-Key: pd_..."
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Website Redesign",
    "description": "Modernize the company website",
    "status": "active",
    "created_at": "2026-04-12T15:00:00.000Z",
    "updated_at": "2026-04-12T15:00:00.000Z",
    "tasks": [
      {
        "id": 1,
        "project_id": 1,
        "title": "Design new homepage",
        "description": "Create modern hero section",
        "priority": "high",
        "status": "todo",
        "assigned_to": "ally",
        "due_date": "2026-04-20T00:00:00.000Z",
        "created_at": "2026-04-12T15:00:00.000Z",
        "updated_at": "2026-04-12T15:00:00.000Z",
        "completed_at": null
      }
    ]
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

### POST /projects

Create a new project.

**Request:**
```json
{
  "name": "Website Redesign",
  "description": "Modernize the company website",
  "status": "active"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Website Redesign",
    "description": "Modernize the company website",
    "status": "active",
    "created_at": "2026-04-12T15:00:00.000Z",
    "updated_at": "2026-04-12T15:00:00.000Z"
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Name is required"
  }
}
```

---

### PATCH /projects/:id

Update a project.

**Allowed fields:** `name`, `description`, `status`

**Request:**
```json
{
  "status": "archived",
  "description": "Completed website redesign"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Website Redesign",
    "description": "Completed website redesign",
    "status": "archived",
    "created_at": "2026-04-12T15:00:00.000Z",
    "updated_at": "2026-04-12T16:00:00.000Z"
  }
}
```

---

### DELETE /projects/:id

Delete a project (cascades to all tasks).

**Request:**
```bash
curl -X DELETE http://localhost:3335/api/v1/projects/1 -H "X-API-Key: pd_..."
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## Tasks

### GET /tasks/project/:projectId

List tasks for a project.

**Query Parameters:**
- `status` (optional) — Filter: `todo`, `in_progress`, `done`, `blocked`
- `priority` (optional) — Filter: `urgent`, `high`, `medium`, `low`
- `assigned_to` (optional) — Filter by assignee

**Request:**
```bash
curl "http://localhost:3335/api/v1/tasks/project/1?status=todo&priority=high" \
  -H "X-API-Key: pd_..."
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "project_id": 1,
      "title": "Design new homepage",
      "description": "Create modern hero section",
      "priority": "high",
      "status": "todo",
      "assigned_to": "ally",
      "due_date": "2026-04-20T00:00:00.000Z",
      "created_at": "2026-04-12T15:00:00.000Z",
      "updated_at": "2026-04-12T15:00:00.000Z",
      "completed_at": null,
      "project_name": "Website Redesign"
    }
  ]
}
```

**Sorting:** Tasks are sorted by priority (urgent first), then due date, then creation date.

---

### GET /tasks/:id

Get a single task.

**Request:**
```bash
curl http://localhost:3335/api/v1/tasks/1 -H "X-API-Key: pd_..."
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "project_id": 1,
    "title": "Design new homepage",
    "description": "Create modern hero section",
    "priority": "high",
    "status": "todo",
    "assigned_to": "ally",
    "due_date": "2026-04-20T00:00:00.000Z",
    "created_at": "2026-04-12T15:00:00.000Z",
    "updated_at": "2026-04-12T15:00:00.000Z",
    "completed_at": null,
    "project_name": "Website Redesign"
  }
}
```

---

### POST /tasks/project/:projectId

Create a task in a project.

**Request:**
```json
{
  "title": "Design new homepage",
  "description": "Create modern hero section",
  "priority": "high",
  "assigned_to": "ally",
  "due_date": "2026-04-20T00:00:00.000Z",
  "status": "todo"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "project_id": 1,
    "title": "Design new homepage",
    "description": "Create modern hero section",
    "priority": "high",
    "status": "todo",
    "assigned_to": "ally",
    "due_date": "2026-04-20T00:00:00.000Z",
    "created_at": "2026-04-12T15:00:00.000Z",
    "updated_at": "2026-04-12T15:00:00.000Z",
    "completed_at": null
  }
}
```

**Defaults:** If not provided, `status` defaults to `todo` and `priority` defaults to `medium`.

---

### PATCH /tasks/:id

Update a task.

**Allowed fields:** `title`, `description`, `priority`, `assigned_to`, `due_date`, `status`

**Request:**
```json
{
  "status": "done"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "project_id": 1,
    "title": "Design new homepage",
    "description": "Create modern hero section",
    "priority": "high",
    "status": "done",
    "assigned_to": "ally",
    "due_date": "2026-04-20T00:00:00.000Z",
    "created_at": "2026-04-12T15:00:00.000Z",
    "updated_at": "2026-04-12T16:00:00.000Z",
    "completed_at": "2026-04-12T16:00:00.000Z"
  }
}
```

**Note:** Setting `status` to `done` automatically sets `completed_at`. Changing status from `done` clears it.

---

### DELETE /tasks/:id

Delete a task.

**Request:**
```bash
curl -X DELETE http://localhost:3335/api/v1/tasks/1 -H "X-API-Key: pd_..."
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## Activity Log

### GET /activity

Get recent activity log entries.

**Query Parameters:**
- `limit` (optional) — Max entries to return (default: 50)
- `project_id` (optional) — Filter by project
- `actor` (optional) — Filter by actor name

**Request:**
```bash
curl "http://localhost:3335/api/v1/activity?limit=20&actor=ally" \
  -H "X-API-Key: pd_..."
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "actor": "ally",
      "actor_type": "api_key",
      "action": "create",
      "entity_type": "task",
      "entity_id": 1,
      "details": "{\"title\":\"Design new homepage\",\"priority\":\"high\"}",
      "created_at": "2026-04-12T15:00:00.000Z",
      "entity_name": "Design new homepage"
    }
  ]
}
```

**Actions:** `create`, `update`, `delete`

**Entity Types:** `project`, `task`

**Actor Types:** `user`, `api_key`

---

## API Keys

### GET /keys

List all API keys (requires human authentication, not API key).

**Request:**
```bash
curl http://localhost:3335/api/v1/keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "label": "Ally McBeagle",
      "created_at": "2026-04-12T15:00:00.000Z",
      "last_used_at": "2026-04-12T16:00:00.000Z"
    }
  ]
}
```

**Security Note:** The actual key values are never returned (only created once).

---

### POST /keys

Create a new API key (requires human authentication).

**Request:**
```json
{
  "label": "Ally McBeagle"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "key": "pd_550e8400-e29b-41d4-a716-446655440000",
    "label": "Ally McBeagle"
  }
}
```

**Security Note:** The key is returned only once. Save it securely!

---

### DELETE /keys/:id

Delete an API key (requires human authentication).

**Request:**
```bash
curl -X DELETE http://localhost:3335/api/v1/keys/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## Health Check

### GET /health

Check service health (no authentication required).

**Request:**
```bash
curl http://localhost:3335/health
```

**Response (200):**
```json
{
  "status": "ok",
  "uptime": "2h 30m",
  "timestamp": "2026-04-12T17:30:00.000Z"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` — Missing or invalid authentication
- `FORBIDDEN` — Insufficient permissions
- `NOT_FOUND` — Resource doesn't exist
- `INVALID_INPUT` — Request body validation failed
- `INTERNAL_ERROR` — Server error

**HTTP Status Codes:**
- `200` — Success
- `201` — Created
- `400` — Bad Request
- `401` — Unauthorized
- `403` — Forbidden
- `404` — Not Found
- `500` — Internal Server Error

---

## Rate Limiting

Currently no rate limiting is enforced. This may be added in future versions.

---

## Webhooks

Webhooks are not currently supported. This may be added in future versions.

---

## Pagination

List endpoints use query parameters for filtering and limiting:
- `limit` — Maximum items to return (default varies by endpoint)
- Pagination via cursor is not yet implemented

---

## SDK Examples

### JavaScript (fetch)

```javascript
const API_BASE = 'http://localhost:3335/api/v1';
const API_KEY = 'pd_...';

// Create a project
async function createProject(name) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

// Create a task
async function createTask(projectId, title) {
  const res = await fetch(`${API_BASE}/tasks/project/${projectId}`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  return res.json();
}
```

### Python (requests)

```python
import requests

API_BASE = 'http://localhost:3335/api/v1'
API_KEY = 'pd_...'

headers = {'X-API-Key': API_KEY, 'Content-Type': 'application/json'}

# Create a project
response = requests.post(
    f'{API_BASE}/projects',
    headers=headers,
    json={'name': 'Website Redesign'}
)
project = response.json()

# Create a task
response = requests.post(
    f'{API_BASE}/tasks/project/{project["data"]["id"]}',
    headers=headers,
    json={'title': 'Design homepage', 'priority': 'high'}
)
task = response.json()
```

---

## Changelog

### v1.0 (2026-04-12)
- Initial release
- Project and task CRUD
- JWT and API key authentication
- Activity logging
- SQLite database with migrations
