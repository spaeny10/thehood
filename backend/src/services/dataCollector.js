const cron = require('node-cron');
const db = require('../config/database');
const AmbientWeatherService = require('./ambientWeather');

class DataCollectorService {
  constructor() {
    this.weatherService = new AmbientWeatherService(
      process.env.AMBIENT_API_KEY,
      process.env.AMBIENT_APPLICATION_KEY
    );
    this.collectInterval = process.env.DATA_COLLECTION_INTERVAL || 5;
    this.isRunning = false;
  }

  /**
   * Start collecting data at specified interval
   */
  start() {
    if (this.isRunning) {
      console.log('Data collector is already running');
      return;
    }

    // Run immediately on start
    this.collectData();

    // Schedule data collection every N minutes
    this.cronJob = cron.schedule(`*/${this.collectInterval} * * * *`, () => {
      this.collectData();
    });

    this.isRunning = true;
    console.log(`✓ Data collector started (every ${this.collectInterval} minutes)`);
  }

  /**
   * Stop collecting data
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('✓ Data collector stopped');
    }
  }

  /**
   * Collect and store weather data
   */
  async collectData() {
    try {
      console.log('[Data Collector] Fetching weather data...');
      const weatherData = await this.weatherService.getCurrentWeather();

      if (weatherData) {
        this.saveWeatherData(weatherData);
        console.log('[Data Collector] Weather data saved successfully');
      }
    } catch (error) {
      console.error('[Data Collector] Error collecting data:', error.message);
    }
  }

  /**
   * Save weather data to database
   */
  saveWeatherData(data) {
    const insert = db.prepare(`
      INSERT INTO weather_data (
        timestamp, indoor_temp, indoor_humidity, outdoor_temp, outdoor_humidity,
        wind_speed, wind_gust, wind_direction, rain_hourly, rain_daily,
        rain_weekly, rain_monthly, rain_total, pressure, uv_index,
        solar_radiation, feels_like, dew_point, lightning_count, lightning_distance,
        battery_outdoor, battery_indoor
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    insert.run(
      data.timestamp,
      data.indoor_temp,
      data.indoor_humidity,
      data.outdoor_temp,
      data.outdoor_humidity,
      data.wind_speed,
      data.wind_gust,
      data.wind_direction,
      data.rain_hourly,
      data.rain_daily,
      data.rain_weekly,
      data.rain_monthly,
      data.rain_total,
      data.pressure,
      data.uv_index,
      data.solar_radiation,
      data.feels_like,
      data.dew_point,
      data.lightning_count,
      data.lightning_distance,
      data.battery_outdoor,
      data.battery_indoor
    );
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      collectInterval: this.collectInterval
    };
  }
}

module.exports = DataCollectorService;
