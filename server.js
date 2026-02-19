const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3335;
const db = new Database('tasks.db');

// Enable Foreign Keys for CASCADE DELETE
db.pragma('foreign_keys = ON');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'dashboard-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    if (req.path.startsWith('/api')) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      res.redirect('/login');
    }
  }
};

// Public Routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'lechauve' && password === 'calvito911#') {
    req.session.authenticated = true;
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid credentials');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Protected Routes
// Order matters: static first, THEN catch-all if needed, but static should handle /
app.use(requireAuth, express.static('public'));

// Init DB
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT 0,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

// API Endpoints

// 1. Projects
app.get('/api/projects', (req, res) => {
  const rows = db.prepare("SELECT * FROM projects ORDER BY id DESC").all();
  res.json(rows);
});

app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  try {
    const info = db.prepare("INSERT INTO projects (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid, name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Tasks
app.get('/api/tasks/:projectId', (req, res) => {
  const { projectId } = req.params;
  const rows = db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY completed ASC, created_at DESC").all(projectId);
  res.json(rows);
});

app.post('/api/tasks', (req, res) => {
  const { projectId, title } = req.body;
  const info = db.prepare("INSERT INTO tasks (project_id, title) VALUES (?, ?)").run(projectId, title);
  res.json({ id: info.lastInsertRowid, projectId, title, completed: 0 });
});

app.patch('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = Object.keys(req.body).map(key => `${key} = @${key}`).join(', ');
  const stmt = db.prepare(`UPDATE tasks SET ${updates} WHERE id = @id`);
  stmt.run({ ...req.body, id });
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Start Server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Project Dashboard running at http://0.0.0.0:${port}`);
});
