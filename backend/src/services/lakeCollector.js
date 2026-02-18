const cron = require('node-cron');
const LakeService = require('./lakeService');
const settingsService = require('./settingsService');

class LakeCollectorService {
    constructor() {
        this.lakeService = new LakeService();
        this.isRunning = false;
        this.cronJob = null;
    }

    /**
     * Start collecting lake data at configured interval
     */
    start() {
        if (this.isRunning) {
            console.log('Lake collector is already running');
            return;
        }

        // Collect immediately on start
        this.collectData();

        // Schedule based on settings
        const interval = settingsService.getNumber('lake_collection_interval') || 30;
        this.cronJob = cron.schedule(`*/${interval} * * * *`, () => {
            this.collectData();
        });

        this.isRunning = true;
        console.log(`✓ Lake data collector started (every ${interval} minutes)`);
    }

    /**
     * Stop collecting
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('✓ Lake data collector stopped');
        }
    }

    /**
     * Restart with new interval (called after settings change)
     */
    restart() {
        this.stop();
        this.start();
    }

    /**
     * Collect and store lake data
     */
    async collectData() {
        try {
            console.log('[Lake Collector] Fetching lake data...');
            const data = await this.lakeService.getLakeConditions();

            if (data && data.elevation !== null) {
                this.lakeService.saveLakeData(data);
                console.log(`[Lake Collector] Lake data saved — elevation: ${data.elevation} ft, temp: ${data.water_temp_f}°F`);
            }
        } catch (error) {
            console.error('[Lake Collector] Error collecting data:', error.message);
        }
    }

    /**
     * Get status
     */
    getStatus() {
        const interval = settingsService.getNumber('lake_collection_interval') || 30;
        return {
            isRunning: this.isRunning,
            collectInterval: interval
        };
    }
}

module.exports = LakeCollectorService;
