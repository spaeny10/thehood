const axios = require('axios');
const { pool } = require('../config/database');
const settingsService = require('./settingsService');

class LakeService {
    constructor() {
        this.usgsBaseURL = 'https://waterservices.usgs.gov/nwis/iv/';
        this.cwmsBaseURL = 'https://cwms-data.usace.army.mil/cwms-data';
        this.kdwpURL = 'https://ksoutdoors.gov/Fishing/Where-to-Fish-in-Kansas/Fishing-Locations-Public-Waters/Fishing-in-Northwest-Kansas/Kanopolis-Reservoir';
        this.openMeteoURL = 'https://api.open-meteo.com/v1/forecast';
        this.lakeCoords = { lat: 38.617, lon: -97.968 };
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 30 * 60 * 1000;
    }

    async getConfig() {
        return {
            lakeStation: await settingsService.get('lake_station_id') || '06865000',
            damStation: await settingsService.get('dam_station_id') || '06865500',
            conservationLevel: await settingsService.getNumber('conservation_pool_level') || 1463
        };
    }

    extractValue(timeSeries, paramCode) {
        const series = timeSeries.find(ts => ts.variable.variableCode[0].value === paramCode);
        if (!series || !series.values[0]?.value[0]) return null;
        const raw = series.values[0].value[0];
        return { value: parseFloat(raw.value), dateTime: raw.dateTime };
    }

    async fetchKDWPLakeTemp() {
        try {
            const response = await axios.get(this.kdwpURL, {
                headers: { 'User-Agent': 'Kanopolanes Weather Dashboard' },
                timeout: 15000,
            });
            const html = response.data;
            const match = html.match(/<strong>Lake Temperature:<\/strong><\/div>\s*<div class="field-text">\s*([\d.]+)\s*F/i);
            if (match) {
                const tempF = parseFloat(match[1]);
                if (!isNaN(tempF) && tempF > 0 && tempF < 120) {
                    console.log(`[Lake Service] KDWP lake temperature: ${tempF}°F`);
                    return tempF;
                }
            }
            console.log('[Lake Service] KDWP lake temperature not found in page');
            return null;
        } catch (error) {
            console.error('[Lake Service] Error fetching KDWP lake temp:', error.message);
            return null;
        }
    }

    async fetchCWMSFlows() {
        try {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
            const begin = yesterday.toISOString();
            const end = now.toISOString();

            const [inflowRes, outflowRes] = await Promise.all([
                axios.get(`${this.cwmsBaseURL}/timeseries`, {
                    params: { office: 'NWDM', name: 'KANS.Flow-In.Ave.1Day.1Day.Best-NWK', begin, end },
                    headers: { Accept: 'application/json;version=2' },
                    timeout: 15000,
                }),
                axios.get(`${this.cwmsBaseURL}/timeseries`, {
                    params: { office: 'NWDM', name: 'KANS.Flow-Out.Ave.1Day.1Day.Best-NWK', begin, end },
                    headers: { Accept: 'application/json;version=2' },
                    timeout: 15000,
                }),
            ]);

            const getLatest = (data) => {
                const vals = (data.values || []).filter(v => v[1] !== null);
                return vals.length > 0 ? vals[vals.length - 1][1] : null;
            };

            const inflow = getLatest(inflowRes.data);
            const outflow = getLatest(outflowRes.data);
            console.log(`[Lake Service] CWMS flows — inflow: ${inflow} cfs, outflow: ${outflow} cfs`);
            return { inflow, outflow };
        } catch (error) {
            console.error('[Lake Service] Error fetching CWMS flows:', error.message);
            return { inflow: null, outflow: null };
        }
    }

    async fetchSurfaceWind() {
        try {
            const response = await axios.get(this.openMeteoURL, {
                params: {
                    latitude: this.lakeCoords.lat,
                    longitude: this.lakeCoords.lon,
                    current: 'wind_speed_10m,wind_direction_10m',
                    wind_speed_unit: 'mph',
                },
                timeout: 10000,
            });
            const current = response.data.current;
            console.log(`[Lake Service] Surface wind: ${current.wind_speed_10m} mph, dir: ${current.wind_direction_10m}°`);
            return {
                speed: current.wind_speed_10m ?? null,
                direction: current.wind_direction_10m ?? null,
            };
        } catch (error) {
            console.error('[Lake Service] Error fetching surface wind:', error.message);
            return { speed: null, direction: null };
        }
    }

    async getLakeConditions() {
        if (this.cache && Date.now() < this.cacheExpiry) return this.cache;
        const config = await this.getConfig();

        try {
            const [lakeResponse, damResponse, kdwpTempF, cwmsFlows, wind] = await Promise.all([
                axios.get(this.usgsBaseURL, { params: { format: 'json', sites: config.lakeStation, parameterCd: '62614,99067,00054', siteStatus: 'all' } }),
                axios.get(this.usgsBaseURL, { params: { format: 'json', sites: config.damStation, parameterCd: '00010,00060', siteStatus: 'all' } }),
                this.fetchKDWPLakeTemp(),
                this.fetchCWMSFlows(),
                this.fetchSurfaceWind(),
            ]);

            const lakeSeries = lakeResponse.data.value.timeSeries;
            const damSeries = damResponse.data.value.timeSeries;
            const elevation = this.extractValue(lakeSeries, '62614');
            const levelDiff = this.extractValue(lakeSeries, '99067');
            const storage = this.extractValue(lakeSeries, '00054');
            const waterTempC = this.extractValue(damSeries, '00010');
            const usgsOutflow = this.extractValue(damSeries, '00060');

            // Prefer KDWP actual lake temperature, fall back to USGS dam station
            const usgsTempF = waterTempC ? Math.round((waterTempC.value * 9 / 5 + 32) * 10) / 10 : null;
            const waterTempF = kdwpTempF ?? usgsTempF;
            const waterTempCFinal = kdwpTempF
                ? Math.round((kdwpTempF - 32) * 5 / 9 * 10) / 10
                : waterTempC?.value ?? null;

            // Prefer CWMS outflow (Corps daily), fall back to USGS dam station
            const outflow = cwmsFlows.outflow ?? usgsOutflow?.value ?? null;

            const result = {
                name: 'Kanopolis Lake',
                elevation: elevation?.value ?? null,
                conservation_level: config.conservationLevel,
                level_diff: levelDiff?.value ?? null,
                storage_acre_ft: storage?.value ?? null,
                water_temp_c: waterTempCFinal,
                water_temp_f: waterTempF,
                water_temp_source: kdwpTempF ? 'kdwp' : (usgsTempF ? 'usgs' : null),
                outflow_cfs: outflow,
                inflow_cfs: cwmsFlows.inflow,
                surface_wind_mph: wind.speed,
                surface_wind_dir: wind.direction,
                last_updated: elevation?.dateTime ?? damSeries?.[0]?.values?.[0]?.value?.[0]?.dateTime ?? null
            };

            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;
            return result;
        } catch (error) {
            console.error('Error fetching lake data:', error.message);
            if (this.cache) return this.cache;
            throw error;
        }
    }

    async saveLakeData(data) {
        await pool.query(
            `INSERT INTO lake_data (timestamp, elevation, conservation_level, level_diff, storage_acre_ft, water_temp_c, water_temp_f, outflow_cfs, inflow_cfs, surface_wind_mph, surface_wind_dir) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [Date.now(), data.elevation, data.conservation_level, data.level_diff, data.storage_acre_ft, data.water_temp_c, data.water_temp_f, data.outflow_cfs, data.inflow_cfs, data.surface_wind_mph, data.surface_wind_dir]
        );
    }

    async getHistorical(hours = 24, limit = 100) {
        const since = Date.now() - (hours * 60 * 60 * 1000);
        const { rows } = await pool.query(
            `SELECT * FROM lake_data WHERE timestamp >= $1 ORDER BY timestamp DESC LIMIT $2`,
            [since, limit]
        );
        return rows;
    }
}

module.exports = LakeService;
