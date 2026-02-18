const cron = require('node-cron');
const LakeService = require('./lakeService');
const settingsService = require('./settingsService');

class LakeCollectorService {
    constructor() {
        this.lakeService = new LakeService();
        this.isRunning = false;
        this.cronJob = null;
        this.collectInterval = 30;
    }

    async start() {
        if (this.isRunning) return;
        this.collectInterval = await settingsService.getNumber('lake_collection_interval') || 30;
        this.collectData();
        this.cronJob = cron.schedule(`*/${this.collectInterval} * * * *`, () => this.collectData());
        this.isRunning = true;
        console.log(`✓ Lake data collector started (every ${this.collectInterval} minutes)`);
    }

    stop() {
        if (this.cronJob) { this.cronJob.stop(); this.isRunning = false; console.log('✓ Lake data collector stopped'); }
    }

    restart() { this.stop(); this.start(); }

    async collectData() {
        try {
            console.log('[Lake Collector] Fetching lake data...');
            const data = await this.lakeService.getLakeConditions();
            if (data && data.elevation !== null) {
                await this.lakeService.saveLakeData(data);
                console.log(`[Lake Collector] Lake data saved — elevation: ${data.elevation} ft, temp: ${data.water_temp_f}°F`);
            }
        } catch (error) {
            console.error('[Lake Collector] Error:', error.message);
        }
    }

    getStatus() {
        return { isRunning: this.isRunning, collectInterval: this.collectInterval };
    }
}

module.exports = LakeCollectorService;
