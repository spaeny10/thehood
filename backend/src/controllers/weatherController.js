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

const getRainSummary = async (req, res) => {
  try {
    // Yesterday: get max rain_daily from yesterday's readings
    // rain_daily resets to 0 each day, so the max value = that day's total
    const yesterdayStart = new Date();
    yesterdayStart.setHours(0, 0, 0, 0);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date();
    yesterdayEnd.setHours(0, 0, 0, 0);

    const { rows: yesterdayRows } = await pool.query(
      'SELECT MAX(rain_daily) as total FROM weather_data WHERE timestamp >= $1 AND timestamp < $2',
      [yesterdayStart.getTime(), yesterdayEnd.getTime()]
    );

    // Last 10 days: get max rain_daily per calendar day, then sum them
    const tenDaysAgo = new Date();
    tenDaysAgo.setHours(0, 0, 0, 0);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const { rows: tenDayRows } = await pool.query(`
      SELECT SUM(daily_max) as total FROM (
        SELECT MAX(rain_daily) as daily_max
        FROM weather_data
        WHERE timestamp >= $1
        GROUP BY DATE(to_timestamp(timestamp / 1000) AT TIME ZONE 'America/Chicago')
      ) daily_totals
    `, [tenDaysAgo.getTime()]);

    res.json({
      yesterday: parseFloat(yesterdayRows[0]?.total) || 0,
      last_10_days: parseFloat(tenDayRows[0]?.total) || 0,
    });
  } catch (error) {
    console.error('Error getting rain summary:', error);
    res.status(500).json({ error: 'Failed to fetch rain summary' });
  }
};

module.exports = { getCurrentWeather, getHistoricalWeather, getWeatherStats, getDevices, getRainSummary };
