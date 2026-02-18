try {
  require('dotenv').config();
  console.log('[Boot] dotenv loaded');
} catch (e) { console.log('[Boot] no .env file, using system env'); }

console.log('[Boot] Starting server...');
console.log('[Boot] DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('[Boot] POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET' : 'NOT SET');
console.log('[Boot] PORT:', process.env.PORT || 3001);

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');

console.log('[Boot] Core modules loaded');

const { dbReady } = require('./config/database');
console.log('[Boot] Database module loaded');

const weatherRoutes = require('./routes/weatherRoutes');
const alertRoutes = require('./routes/alertRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const lakeRoutes = require('./routes/lakeRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const lotsRoutes = require('./routes/lotsRoutes');
const facebookRoutes = require('./routes/facebookRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const authRoutes = require('./routes/authRoutes');
console.log('[Boot] Routes loaded');

try {
  require('./controllers/authController');
  console.log('[Boot] Auth controller loaded');
} catch (e) {
  console.error('[Boot] Auth controller failed:', e.message);
}

const DataCollectorService = require('./services/dataCollector');
const AlertService = require('./services/alertService');
const LakeCollectorService = require('./services/lakeCollector');
const RetentionService = require('./services/retentionService');
console.log('[Boot] Services loaded');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.JWT_SECRET || 'session-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

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
  res.json({ status: 'ok', database: dbConnected ? 'connected' : 'connecting', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA fallback
app.get('{*path}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) res.status(200).send('Kanopolanes API is running. Frontend not built yet.');
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start HTTP server immediately
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

// Connect DB and start services
dbReady.then(async () => {
  dbConnected = true;
  console.log('✓ Database connected, starting services...');
  dataCollector.start();
  alertService.start();
  await lakeCollector.start();
  retentionService.start();
  console.log('✓ All background services started');
}).catch(err => {
  console.error('⚠️  Database connection failed:', err.message);
  console.error('   Server is running but DB features are unavailable');
});

// Graceful shutdown
const shutdown = () => { dataCollector.stop(); alertService.stop(); lakeCollector.stop(); retentionService.stop(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
