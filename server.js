const express = require('express');
const { createServer } = require('http');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.js');
const keysRoutes = require('./src/routes/keys.js');
const projectRoutes = require('./src/routes/projects.js');
const taskRoutes = require('./src/routes/tasks.js');
const activityRoutes = require('./src/routes/activity.js');
const agentRoutes = require('./src/routes/agents.js');

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
app.use('/api/v1/agents', agentRoutes);

// Heartbeat endpoint - mount it so /api/v1/heartbeat works
// The agentRoutes router has a /heartbeat route, so we need to mount it at /api/v1
// But that would make /agents accessible at /api/v1/agents, which is what we want
// Let's try a different approach - just duplicate the heartbeat route at top level
app.post('/api/v1/heartbeat', (req, res, next) => {
  // Forward the request to the agent's /heartbeat route
  req.url = '/heartbeat';
  req.baseUrl = '/api/v1/agents';
  return agentRoutes(req, res, next);
});

// DEBUG: Print all mounted routes
console.log('\n=== MOUNTED ROUTES ===');
app._router.stack.forEach(r => {
    if (r.route) {
        const path = r.route.path;
        const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(', ');
        console.log(`${methods.padEnd(10)} ${path}`);
    }
});
console.log('=====================\n');

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
