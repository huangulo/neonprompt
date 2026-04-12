require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3335;
const db = require("./src/db.js");

// Enable Foreign Keys for CASCADE DELETE
db.pragma('foreign_keys = ON');

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes and middleware
const authRoutes = require('./src/routes/auth.js');
const keysRoutes = require('./src/routes/keys.js');
const { authenticateAny } = require('./src/middleware/auth.js');

// Mount auth routes (no auth required)
app.use('/auth', authRoutes);
app.use('/api/v1/keys', keysRoutes);

// Serve static files (login.html is accessible without auth)
app.use(express.static('public'));

// API Endpoints - protected with authenticateAny

// 1. Projects
app.get('/api/projects', authenticateAny, (req, res) => {
  const rows = db.prepare("SELECT * FROM projects ORDER BY id DESC").all();
  res.json(rows);
});

app.post('/api/projects', authenticateAny, (req, res) => {
  const { name } = req.body;
  try {
    const info = db.prepare("INSERT INTO projects (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid, name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', authenticateAny, (req, res) => {
  try {
    db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Tasks
app.get('/api/tasks/:projectId', authenticateAny, (req, res) => {
  const { projectId } = req.params;
  const rows = db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY completed ASC, created_at DESC").all(projectId);
  res.json(rows);
});

app.post('/api/tasks', authenticateAny, (req, res) => {
  const { projectId, title } = req.body;
  const info = db.prepare("INSERT INTO tasks (project_id, title) VALUES (?, ?)").run(projectId, title);
  res.json({ id: info.lastInsertRowid, projectId, title, completed: 0 });
});

app.patch('/api/tasks/:id', authenticateAny, (req, res) => {
  const { id } = req.params;
  const updates = Object.keys(req.body).map(key => `${key} = @${key}`).join(', ');
  const stmt = db.prepare(`UPDATE tasks SET ${updates} WHERE id = @id`);
  stmt.run({ ...req.body, id });
  res.json({ success: true });
});

app.delete('/api/tasks/:id', authenticateAny, (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Start Server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Project Dashboard running at http://0.0.0.0:${port}`);
});
