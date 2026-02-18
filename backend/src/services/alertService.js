const cron = require('node-cron');
const { pool } = require('../config/database');

class AlertService {
  constructor() {
    this.checkInterval = process.env.ALERT_CHECK_INTERVAL || 1;
    this.isRunning = false;
    this.lastAlertTime = {};
    this.cooldownPeriod = 15 * 60 * 1000;
  }

  start() {
    if (this.isRunning) return;
    this.cronJob = cron.schedule(`*/${this.checkInterval} * * * *`, () => this.checkAlerts());
    this.isRunning = true;
    console.log(`✓ Alert service started (checking every ${this.checkInterval} minute)`);
  }

  stop() {
    if (this.cronJob) { this.cronJob.stop(); this.isRunning = false; console.log('✓ Alert service stopped'); }
  }

  async checkAlerts() {
    try {
      const { rows: alerts } = await pool.query('SELECT * FROM alerts WHERE enabled = 1');
      const latest = await pool.query('SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 1');
      const latestData = latest.rows[0];
      if (!latestData) return;
      for (const alert of alerts) { await this.evaluateAlert(alert, latestData); }
    } catch (error) {
      console.error('[Alert Service] Error:', error.message);
    }
  }

  evaluateAlert(alert, weatherData) {
    const value = weatherData[alert.type];
    if (value === null || value === undefined) return;
    let isTriggered = false;
    switch (alert.condition) {
      case 'greater_than': isTriggered = value > alert.threshold; break;
      case 'less_than': isTriggered = value < alert.threshold; break;
      case 'equal_to': isTriggered = value === alert.threshold; break;
    }
    if (isTriggered) return this.triggerAlert(alert, value);
  }

  async triggerAlert(alert, value) {
    const now = Date.now();
    if (now - (this.lastAlertTime[alert.id] || 0) < this.cooldownPeriod) return;

    const message = this.formatAlertMessage(alert, value);
    await pool.query(
      `INSERT INTO alert_history (alert_id, value, message) VALUES ($1, $2, $3)`,
      [alert.id, value, message]
    );
    this.lastAlertTime[alert.id] = now;
    console.log(`[ALERT TRIGGERED] ${alert.name}: ${message}`);
  }

  formatAlertMessage(alert, value) {
    const labels = { indoor_temp: 'Indoor Temperature', outdoor_temp: 'Outdoor Temperature', wind_speed: 'Wind Speed', rain_hourly: 'Hourly Rain', lightning_count: 'Lightning Strikes' };
    const unit = this.getUnit(alert.type);
    return `${labels[alert.type] || alert.type} is ${value}${unit} (threshold: ${alert.threshold}${unit})`;
  }

  getUnit(type) {
    const units = { indoor_temp: '°F', outdoor_temp: '°F', wind_speed: ' mph', rain_hourly: ' in', lightning_count: ' strikes' };
    return units[type] || '';
  }

  async getStatus() {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM alerts WHERE enabled = 1');
    return { isRunning: this.isRunning, checkInterval: this.checkInterval, activeAlerts: parseInt(rows[0].count) };
  }
}

module.exports = AlertService;
