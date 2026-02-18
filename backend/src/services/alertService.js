const cron = require('node-cron');
const db = require('../config/database');

class AlertService {
  constructor() {
    this.checkInterval = process.env.ALERT_CHECK_INTERVAL || 1;
    this.isRunning = false;
    this.lastAlertTime = {};
    this.cooldownPeriod = 15 * 60 * 1000; // 15 minutes cooldown
  }

  /**
   * Start monitoring alerts
   */
  start() {
    if (this.isRunning) {
      console.log('Alert service is already running');
      return;
    }

    // Check alerts every N minutes
    this.cronJob = cron.schedule(`*/${this.checkInterval} * * * *`, () => {
      this.checkAlerts();
    });

    this.isRunning = true;
    console.log(`✓ Alert service started (checking every ${this.checkInterval} minute)`);
  }

  /**
   * Stop monitoring alerts
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('✓ Alert service stopped');
    }
  }

  /**
   * Check all active alerts against current weather data
   */
  async checkAlerts() {
    try {
      // Get all enabled alerts
      const alerts = db.prepare('SELECT * FROM alerts WHERE enabled = 1').all();

      // Get latest weather data
      const latestData = db.prepare(`
        SELECT * FROM weather_data
        ORDER BY timestamp DESC
        LIMIT 1
      `).get();

      if (!latestData) {
        return;
      }

      // Check each alert
      for (const alert of alerts) {
        this.evaluateAlert(alert, latestData);
      }
    } catch (error) {
      console.error('[Alert Service] Error checking alerts:', error.message);
    }
  }

  /**
   * Evaluate a single alert condition
   */
  evaluateAlert(alert, weatherData) {
    const value = weatherData[alert.type];

    if (value === null || value === undefined) {
      return;
    }

    let isTriggered = false;

    switch (alert.condition) {
      case 'greater_than':
        isTriggered = value > alert.threshold;
        break;
      case 'less_than':
        isTriggered = value < alert.threshold;
        break;
      case 'equal_to':
        isTriggered = value === alert.threshold;
        break;
      case 'between':
        // For future use with range alerts
        break;
    }

    if (isTriggered) {
      this.triggerAlert(alert, value);
    }
  }

  /**
   * Trigger an alert (with cooldown to prevent spam)
   */
  triggerAlert(alert, value) {
    const now = Date.now();
    const lastTime = this.lastAlertTime[alert.id] || 0;

    // Check cooldown period
    if (now - lastTime < this.cooldownPeriod) {
      return;
    }

    // Save to alert history
    const insert = db.prepare(`
      INSERT INTO alert_history (alert_id, value, message)
      VALUES (?, ?, ?)
    `);

    const message = this.formatAlertMessage(alert, value);
    insert.run(alert.id, value, message);

    // Update last alert time
    this.lastAlertTime[alert.id] = now;

    console.log(`[ALERT TRIGGERED] ${alert.name}: ${message}`);

    // Here you could add additional actions:
    // - Send email notification
    // - Send push notification
    // - Send webhook
    // - etc.
  }

  /**
   * Format alert message
   */
  formatAlertMessage(alert, value) {
    const typeLabels = {
      indoor_temp: 'Indoor Temperature',
      outdoor_temp: 'Outdoor Temperature',
      wind_speed: 'Wind Speed',
      rain_hourly: 'Hourly Rain',
      lightning_count: 'Lightning Strikes'
    };

    const typeLabel = typeLabels[alert.type] || alert.type;
    const unit = this.getUnit(alert.type);

    return `${typeLabel} is ${value}${unit} (threshold: ${alert.threshold}${unit})`;
  }

  /**
   * Get unit for alert type
   */
  getUnit(type) {
    const units = {
      indoor_temp: '°F',
      outdoor_temp: '°F',
      wind_speed: ' mph',
      rain_hourly: ' in',
      lightning_count: ' strikes'
    };
    return units[type] || '';
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      activeAlerts: db.prepare('SELECT COUNT(*) as count FROM alerts WHERE enabled = 1').get().count
    };
  }
}

module.exports = AlertService;
