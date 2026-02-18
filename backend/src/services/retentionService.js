const cron = require('node-cron');
const db = require('../config/database');
const settingsService = require('./settingsService');

class RetentionService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
    }

    /**
     * Start daily retention cleanup (runs at 3 AM)
     */
    start() {
        if (this.isRunning) return;

        // Run cleanup once on startup
        this.cleanup();

        // Schedule daily at 3:00 AM
        this.cronJob = cron.schedule('0 3 * * *', () => {
            this.cleanup();
        });

        this.isRunning = true;
        console.log('✓ Retention service started (daily cleanup at 3 AM)');
    }

    /**
     * Stop the service
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('✓ Retention service stopped');
        }
    }

    /**
     * Run cleanup based on configured retention days
     */
    cleanup() {
        try {
            const weatherDays = settingsService.getNumber('data_retention_days') || 90;
            const lakeDays = settingsService.getNumber('lake_retention_days') || 180;
            const alertDays = settingsService.getNumber('alert_history_retention_days') || 30;

            const now = Date.now();
            const weatherCutoff = now - (weatherDays * 24 * 60 * 60 * 1000);
            const lakeCutoff = now - (lakeDays * 24 * 60 * 60 * 1000);
            const alertCutoff = new Date(now - (alertDays * 24 * 60 * 60 * 1000)).toISOString();

            const weatherResult = db.prepare('DELETE FROM weather_data WHERE timestamp < ?').run(weatherCutoff);
            const lakeResult = db.prepare('DELETE FROM lake_data WHERE timestamp < ?').run(lakeCutoff);
            const alertResult = db.prepare('DELETE FROM alert_history WHERE triggered_at < ?').run(alertCutoff);

            const total = weatherResult.changes + lakeResult.changes + alertResult.changes;
            if (total > 0) {
                console.log(`[Retention] Cleaned up: ${weatherResult.changes} weather, ${lakeResult.changes} lake, ${alertResult.changes} alert history records`);
            } else {
                console.log('[Retention] No records to clean up');
            }
        } catch (error) {
            console.error('[Retention] Error during cleanup:', error.message);
        }
    }

    getStatus() {
        return { isRunning: this.isRunning };
    }
}

module.exports = RetentionService;
