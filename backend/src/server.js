require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const { dbReady } = require('./config/database');
const weatherRoutes = require('./routes/weatherRoutes');
const alertRoutes = require('./routes/alertRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const lakeRoutes = require('./routes/lakeRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const lotsRoutes = require('./routes/lotsRoutes');
const facebookRoutes = require('./routes/facebookRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const authRoutes = require('./routes/authRoutes');
require('./controllers/authController');
const DataCollectorService = require('./services/dataCollector');
const AlertService = require('./services/alertService');
const LakeCollectorService = require('./services/lakeCollector');
const RetentionService = require('./services/retentionService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.JWT_SECRET || 'session-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/lake', lakeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/lots', lotsRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/auth', authRoutes);

// Initialize services
const dataCollector = new DataCollectorService();
const alertService = new AlertService();
const lakeCollector = new LakeCollectorService();
const retentionService = new RetentionService();

let dbConnected = false;

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'connecting',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback — serve index.html for non-API routes
app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Frontend not built' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start HTTP server immediately so health check passes
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

// Then wait for DB and start background services
dbReady.then(async () => {
  dbConnected = true;
  console.log('✓ Database connected');
  dataCollector.start();
  alertService.start();
  await lakeCollector.start();
  retentionService.start();
  console.log('✓ All background services started');
}).catch(err => {
  console.error('Database connection failed:', err.message);
  // Server stays up for health checks but DB features won't work
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down...');
  dataCollector.stop();
  alertService.stop();
  lakeCollector.stop();
  retentionService.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
