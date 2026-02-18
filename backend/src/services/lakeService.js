const axios = require('axios');
const db = require('../config/database');
const settingsService = require('./settingsService');

class LakeService {
    constructor() {
        this.usgsBaseURL = 'https://waterservices.usgs.gov/nwis/iv/';
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Get station IDs from settings
     */
    getConfig() {
        return {
            lakeStation: settingsService.get('lake_station_id') || '06865000',
            damStation: settingsService.get('dam_station_id') || '06865500',
            conservationLevel: settingsService.getNumber('conservation_pool_level') || 1463
        };
    }

    /**
     * Extract a parameter value from USGS timeSeries response
     */
    extractValue(timeSeries, paramCode) {
        const series = timeSeries.find(ts =>
            ts.variable.variableCode[0].value === paramCode
        );
        if (!series || !series.values[0]?.value[0]) return null;

        const raw = series.values[0].value[0];
        return {
            value: parseFloat(raw.value),
            dateTime: raw.dateTime
        };
    }

    /**
     * Get Kanopolis Lake conditions (live from USGS)
     */
    async getLakeConditions() {
        if (this.cache && Date.now() < this.cacheExpiry) {
            return this.cache;
        }

        const config = this.getConfig();

        try {
            const [lakeResponse, damResponse] = await Promise.all([
                axios.get(this.usgsBaseURL, {
                    params: {
                        format: 'json',
                        sites: config.lakeStation,
                        parameterCd: '62614,99067,00054',
                        siteStatus: 'all'
                    }
                }),
                axios.get(this.usgsBaseURL, {
                    params: {
                        format: 'json',
                        sites: config.damStation,
                        parameterCd: '00010,00060',
                        siteStatus: 'all'
                    }
                })
            ]);

            const lakeSeries = lakeResponse.data.value.timeSeries;
            const damSeries = damResponse.data.value.timeSeries;

            const elevation = this.extractValue(lakeSeries, '62614');
            const levelDiff = this.extractValue(lakeSeries, '99067');
            const storage = this.extractValue(lakeSeries, '00054');
            const waterTempC = this.extractValue(damSeries, '00010');
            const outflow = this.extractValue(damSeries, '00060');

            const waterTempF = waterTempC
                ? Math.round((waterTempC.value * 9 / 5 + 32) * 10) / 10
                : null;

            const result = {
                name: 'Kanopolis Lake',
                elevation: elevation?.value || null,
                conservation_level: config.conservationLevel,
                level_diff: levelDiff?.value || null,
                storage_acre_ft: storage?.value || null,
                water_temp_c: waterTempC?.value || null,
                water_temp_f: waterTempF,
                outflow_cfs: outflow?.value || null,
                last_updated: elevation?.dateTime || damSeries?.[0]?.values?.[0]?.value?.[0]?.dateTime || null
            };

            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;

            return result;
        } catch (error) {
            console.error('Error fetching lake data:', error.message);
            if (this.cache) {
                console.log('Returning stale cached lake data');
                return this.cache;
            }
            throw error;
        }
    }

    /**
     * Save lake data to database
     */
    saveLakeData(data) {
        const insert = db.prepare(`
      INSERT INTO lake_data (timestamp, elevation, conservation_level, level_diff, storage_acre_ft, water_temp_c, water_temp_f, outflow_cfs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        insert.run(
            Date.now(),
            data.elevation,
            data.conservation_level,
            data.level_diff,
            data.storage_acre_ft,
            data.water_temp_c,
            data.water_temp_f,
            data.outflow_cfs
        );
    }

    /**
     * Get historical lake data
     */
    getHistorical(hours = 24, limit = 100) {
        const since = Date.now() - (hours * 60 * 60 * 1000);
        return db.prepare(`
      SELECT * FROM lake_data
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(since, limit);
    }
}

module.exports = LakeService;
