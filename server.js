const express = require('express');
const { createServer } = require('http');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.js');
const keysRoutes = require('./src/routes/keys.js');
const projectRoutes = require('./src/routes/projects.js');
const taskRoutes = require('./src/routes/tasks.js');
const activityRoutes = require('./src/routes/activity.js');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3335;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount auth routes at /api/v1/auth
app.use('/api/v1/auth', authRoutes);

// Mount v1 routes
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/activity', activityRoutes);

// Health endpoint (no auth required)
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'ok',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
    timestamp: new Date().toISOString()
  });
});

// Serve static files (login.html is accessible without auth)
app.use(express.static('public'));

// Start Server
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Project Dashboard running at http://0.0.0.0:${port}`);
});
