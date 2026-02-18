const cron = require('node-cron');
const { pool } = require('../config/database');
const settingsService = require('./settingsService');

class RetentionService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
    }

    start() {
        if (this.isRunning) return;
        this.cleanup();
        this.cronJob = cron.schedule('0 3 * * *', () => this.cleanup());
        this.isRunning = true;
        console.log('✓ Retention service started (daily cleanup at 3 AM)');
    }

    stop() {
        if (this.cronJob) { this.cronJob.stop(); this.isRunning = false; console.log('✓ Retention service stopped'); }
    }

    async cleanup() {
        try {
            const weatherDays = await settingsService.getNumber('data_retention_days') || 90;
            const lakeDays = await settingsService.getNumber('lake_retention_days') || 180;
            const alertDays = await settingsService.getNumber('alert_history_retention_days') || 30;

            const now = Date.now();
            const weatherCutoff = now - (weatherDays * 24 * 60 * 60 * 1000);
            const lakeCutoff = now - (lakeDays * 24 * 60 * 60 * 1000);
            const alertCutoff = new Date(now - (alertDays * 24 * 60 * 60 * 1000)).toISOString();

            const w = await pool.query('DELETE FROM weather_data WHERE timestamp < $1', [weatherCutoff]);
            const l = await pool.query('DELETE FROM lake_data WHERE timestamp < $1', [lakeCutoff]);
            const a = await pool.query('DELETE FROM alert_history WHERE triggered_at < $1', [alertCutoff]);

            const total = (w.rowCount || 0) + (l.rowCount || 0) + (a.rowCount || 0);
            if (total > 0) {
                console.log(`[Retention] Cleaned up: ${w.rowCount} weather, ${l.rowCount} lake, ${a.rowCount} alert history records`);
            } else {
                console.log('[Retention] No records to clean up');
            }
        } catch (error) {
            console.error('[Retention] Error:', error.message);
        }
    }

    getStatus() { return { isRunning: this.isRunning }; }
}

module.exports = RetentionService;
