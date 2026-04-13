const cron = require('node-cron');
const LakeForecastService = require('./lakeForecastService');

class LakeForecastCollector {
    constructor() {
        this.forecastService = new LakeForecastService();
        this.isRunning = false;
        this.cronJob = null;
    }

    async start() {
        if (this.isRunning) return;
        this.collectData();
        // Generate forecast every 60 minutes
        this.cronJob = cron.schedule('0 * * * *', () => this.collectData());
        this.isRunning = true;
        console.log('✓ Lake forecast collector started (every 60 minutes)');
    }

    stop() {
        if (this.cronJob) { this.cronJob.stop(); this.isRunning = false; console.log('✓ Lake forecast collector stopped'); }
    }

    restart() { this.stop(); this.start(); }

    async collectData() {
        try {
            console.log('[Lake Forecast Collector] Generating forecast...');
            const forecast = await this.forecastService.generateForecast();
            if (forecast) {
                await this.forecastService.saveForecast(forecast);
                console.log(`[Lake Forecast Collector] Forecast saved — trend: ${forecast.trend}, 72h: ${forecast.elevation_change_72h > 0 ? '+' : ''}${forecast.elevation_change_72h} ft`);
            }
        } catch (error) {
            console.error('[Lake Forecast Collector] Error:', error.message);
        }
    }

    getStatus() {
        return { isRunning: this.isRunning };
    }
}

module.exports = LakeForecastCollector;
