const db = require('../config/database');
const AmbientWeatherService = require('../services/ambientWeather');

const weatherService = new AmbientWeatherService(
  process.env.AMBIENT_API_KEY,
  process.env.AMBIENT_APPLICATION_KEY
);

/**
 * Get current weather data
 */
const getCurrentWeather = async (req, res) => {
  try {
    // Try to get from database first (most recent entry)
    const dbData = db.prepare(`
      SELECT * FROM weather_data
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();

    if (dbData) {
      return res.json(dbData);
    }

    // If no data in DB, fetch from API
    const apiData = await weatherService.getCurrentWeather();
    if (apiData) {
      return res.json(apiData);
    }

    res.status(404).json({ error: 'No weather data available' });
  } catch (error) {
    console.error('Error getting current weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
};

/**
 * Get historical weather data
 */
const getHistoricalWeather = async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);

    const data = db.prepare(`
      SELECT * FROM weather_data
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(hoursAgo, parseInt(limit));

    res.json(data);
  } catch (error) {
    console.error('Error getting historical weather:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
};

/**
 * Get weather statistics
 */
const getWeatherStats = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);

    const stats = db.prepare(`
      SELECT
        MIN(outdoor_temp) as min_temp,
        MAX(outdoor_temp) as max_temp,
        AVG(outdoor_temp) as avg_temp,
        MIN(indoor_temp) as min_indoor_temp,
        MAX(indoor_temp) as max_indoor_temp,
        AVG(indoor_temp) as avg_indoor_temp,
        MAX(wind_speed) as max_wind,
        MAX(wind_gust) as max_gust,
        SUM(rain_hourly) as total_rain,
        AVG(humidity) as avg_humidity,
        MAX(lightning_count) as total_lightning
      FROM weather_data
      WHERE timestamp >= ?
    `).get(hoursAgo);

    res.json(stats);
  } catch (error) {
    console.error('Error getting weather stats:', error);
    res.status(500).json({ error: 'Failed to fetch weather statistics' });
  }
};

/**
 * Get devices info
 */
const getDevices = async (req, res) => {
  try {
    const devices = await weatherService.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

module.exports = {
  getCurrentWeather,
  getHistoricalWeather,
  getWeatherStats,
  getDevices
};
