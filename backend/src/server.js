require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
// Load passport strategy
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

// Routes
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

// Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dataCollector: dataCollector.getStatus(),
    alertService: await alertService.getStatus(),
    lakeCollector: lakeCollector.getStatus(),
    retentionService: retentionService.getStatus()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ name: 'Kanopolanes API', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start long-running services when running locally (not on Vercel serverless)
if (!process.env.VERCEL) {
  dbReady.then(async () => {
    app.listen(PORT, async () => {
      console.log(`
╔═══════════════════════════════════════╗
║     Kanopolanes API Server            ║
╚═══════════════════════════════════════╝

🚀 Server running on port ${PORT}
📡 API endpoints available at http://localhost:${PORT}/api
      `);

      // Start background services
      dataCollector.start();
      alertService.start();
      await lakeCollector.start();
      retentionService.start();
    });
  }).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down gracefully...');
    dataCollector.stop();
    alertService.stop();
    lakeCollector.stop();
    retentionService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nShutting down gracefully...');
    dataCollector.stop();
    alertService.stop();
    lakeCollector.stop();
    retentionService.stop();
    process.exit(0);
  });
}

module.exports = app;
