const cron = require('node-cron');
const { pool } = require('../config/database');
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

  start() {
    if (this.isRunning) return;
    this.collectData();
    this.cronJob = cron.schedule(`*/${this.collectInterval} * * * *`, () => this.collectData());
    this.isRunning = true;
    console.log(`✓ Data collector started (every ${this.collectInterval} minutes)`);
  }

  stop() {
    if (this.cronJob) { this.cronJob.stop(); this.isRunning = false; console.log('✓ Data collector stopped'); }
  }

  async collectData() {
    try {
      console.log('[Data Collector] Fetching weather data...');
      const data = await this.weatherService.getCurrentWeather();
      if (data) {
        await this.saveWeatherData(data);
        console.log('[Data Collector] Weather data saved successfully');
      }
    } catch (error) {
      console.error('[Data Collector] Error:', error.message);
    }
  }

  async saveWeatherData(data) {
    await pool.query(`
      INSERT INTO weather_data (
        timestamp, indoor_temp, indoor_humidity, outdoor_temp, outdoor_humidity,
        wind_speed, wind_gust, wind_direction, rain_hourly, rain_daily,
        rain_weekly, rain_monthly, rain_total, pressure, uv_index,
        solar_radiation, feels_like, dew_point, lightning_count, lightning_distance,
        battery_outdoor, battery_indoor
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
      )
    `, [
      data.timestamp, data.indoor_temp, data.indoor_humidity, data.outdoor_temp, data.outdoor_humidity,
      data.wind_speed, data.wind_gust, data.wind_direction, data.rain_hourly, data.rain_daily,
      data.rain_weekly, data.rain_monthly, data.rain_total, data.pressure, data.uv_index,
      data.solar_radiation, data.feels_like, data.dew_point, data.lightning_count, data.lightning_distance,
      data.battery_outdoor, data.battery_indoor
    ]);
  }

  getStatus() {
    return { isRunning: this.isRunning, collectInterval: this.collectInterval };
  }
}

module.exports = DataCollectorService;
