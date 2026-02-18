const { pool } = require('../config/database');
const AmbientWeatherService = require('../services/ambientWeather');

const weatherService = new AmbientWeatherService(
  process.env.AMBIENT_API_KEY,
  process.env.AMBIENT_APPLICATION_KEY
);

const getCurrentWeather = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 1');
    if (rows[0]) return res.json(rows[0]);
    const apiData = await weatherService.getCurrentWeather();
    if (apiData) return res.json(apiData);
    res.status(404).json({ error: 'No weather data available' });
  } catch (error) {
    console.error('Error getting current weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
};

const getHistoricalWeather = async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
    const { rows } = await pool.query(
      'SELECT * FROM weather_data WHERE timestamp >= $1 ORDER BY timestamp DESC LIMIT $2',
      [hoursAgo, parseInt(limit)]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error getting historical weather:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
};

const getWeatherStats = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
    const { rows } = await pool.query(`
      SELECT
        MIN(outdoor_temp) as min_temp, MAX(outdoor_temp) as max_temp, AVG(outdoor_temp) as avg_temp,
        MIN(indoor_temp) as min_indoor_temp, MAX(indoor_temp) as max_indoor_temp, AVG(indoor_temp) as avg_indoor_temp,
        MAX(wind_speed) as max_wind, MAX(wind_gust) as max_gust,
        SUM(rain_hourly) as total_rain
      FROM weather_data WHERE timestamp >= $1
    `, [hoursAgo]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting weather stats:', error);
    res.status(500).json({ error: 'Failed to fetch weather statistics' });
  }
};

const getDevices = async (req, res) => {
  try {
    const devices = await weatherService.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

module.exports = { getCurrentWeather, getHistoricalWeather, getWeatherStats, getDevices };
