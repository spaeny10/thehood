const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

// Weather data routes
router.get('/current', weatherController.getCurrentWeather);
router.get('/historical', weatherController.getHistoricalWeather);
router.get('/stats', weatherController.getWeatherStats);
router.get('/rain-summary', weatherController.getRainSummary);
router.get('/devices', weatherController.getDevices);

module.exports = router;
