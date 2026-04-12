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
const projectRoutes = require('./src/routes/projects.js');
const taskRoutes = require('./src/routes/tasks.js');
const activityRoutes = require('./src/routes/activity.js');

// Mount v1 routes
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/activity', activityRoutes);

// Health endpoint (no auth required)
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'ok',
    version: '2.0.0',
    uptime: uptime
  });
});

// Serve static files (login.html is accessible without auth)
app.use(express.static('public'));

// Start Server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Project Dashboard running at http://0.0.0.0:${port}`);
});
