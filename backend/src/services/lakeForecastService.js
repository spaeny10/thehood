const axios = require('axios');
const { pool } = require('../config/database');
const LakeService = require('./lakeService');
const LakeCalibrationService = require('./lakeCalibrationService');

class LakeForecastService {
    constructor() {
        this.usgsBaseURL = 'https://waterservices.usgs.gov/nwis/iv/';
        this.openMeteoURL = 'https://api.open-meteo.com/v1/forecast';
        this.lakeCoords = { lat: 38.617, lon: -97.968 };
        this.surfaceAcres = 3550;
        this.watershedSqMi = 2250;
        this.lakeService = new LakeService();
        this.calibrationService = new LakeCalibrationService();
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 30 * 60 * 1000;

        // Default gauge config (overridden by calibration)
        this.defaultGauges = [
            { id: '06860000', name: 'Elkader',          river: 'Smoky Hill', travelHours: 60, indicator: true },
            { id: '06861000', name: 'Arnold',            river: 'Smoky Hill', travelHours: 42, indicator: true },
            { id: '06862700', name: 'Schoenchen',        river: 'Smoky Hill', travelHours: 30, indicator: true },
            { id: '06863000', name: 'Pfeifer',           river: 'Smoky Hill', travelHours: 21, indicator: true },
            { id: '06864000', name: 'Russell',           river: 'Smoky Hill', travelHours: 15, indicator: true },
            { id: '06864500', name: 'Ellsworth',         river: 'Smoky Hill', travelHours: 9,  indicator: false },
            { id: '06863420', name: 'Big Creek Ellis',   river: 'Big Creek',  travelHours: 21, indicator: true },
            { id: '06863500', name: 'Big Creek Hays',    river: 'Big Creek',  travelHours: 18, indicator: false },
        ];

        // Terminal gauges whose flow is summed for current inflow estimate
        this.terminalGaugeIds = ['06864500', '06863500'];
    }

    /**
     * Load calibrated parameters and apply to gauges.
     * Returns { gauges, runoffCoefficient, surgeThreshold, elevationFactor, calibration }
     */
    async loadCalibratedParams() {
        const cal = await this.calibrationService.getParameters();

        // Apply calibrated travel times to gauge definitions
        const gauges = this.defaultGauges.map(g => ({
            ...g,
            travelHours: cal.travel_hours?.[g.id] ?? g.travelHours,
        }));

        return {
            gauges,
            runoffCoefficient: cal.runoff_coefficient,
            surgeThreshold: cal.surge_threshold,
            elevationFactor: cal.elevation_factor,
            calibration: {
                calibrated_at: cal.calibrated_at,
                data_points: cal.data_points,
                accuracy_score: cal.accuracy_score,
            },
        };
    }

    async fetchAllGaugeFlows() {
        try {
            const siteIds = this.gauges.map(g => g.id).join(',');
            const response = await axios.get(this.usgsBaseURL, {
                params: { format: 'json', sites: siteIds, parameterCd: '00060', siteStatus: 'all' },
                timeout: 15000,
            });

            const flows = {};
            for (const ts of response.data.value.timeSeries) {
                const siteId = ts.sourceInfo.siteCode[0].value;
                const val = ts.values[0]?.value[0];
                if (val) {
                    flows[siteId] = {
                        flow_cfs: parseFloat(val.value),
                        dateTime: val.dateTime,
                    };
                }
            }
            console.log(`[Lake Forecast] Fetched flows for ${Object.keys(flows).length} gauges`);
            return flows;
        } catch (error) {
            console.error('[Lake Forecast] Error fetching gauge flows:', error.message);
            return {};
        }
    }

    async fetchPrecipForecast() {
        try {
            const response = await axios.get(this.openMeteoURL, {
                params: {
                    latitude: this.lakeCoords.lat,
                    longitude: this.lakeCoords.lon,
                    hourly: 'precipitation',
                    precipitation_unit: 'inch',
                    forecast_hours: 72,
                    timezone: 'America/Chicago',
                },
                timeout: 10000,
            });
            const hourly = response.data.hourly;
            return hourly.time.map((t, i) => ({
                time: new Date(t).getTime(),
                precip_inches: hourly.precipitation[i] || 0,
            }));
        } catch (error) {
            console.error('[Lake Forecast] Error fetching precip forecast:', error.message);
            return [];
        }
    }

    estimatePrecipRunoff(precipHourly, runoffCoefficient) {
        return precipHourly.map(p => ({
            time: p.time,
            runoff_cfs: p.precip_inches * runoffCoefficient * this.watershedSqMi * 645.33 / 3600,
        }));
    }

    buildInflowTimeline(gaugeFlows, precipRunoff, nowMs, gauges, surgeThreshold) {
        const hours = 72;
        const timeline = [];

        for (let h = 0; h < hours; h++) {
            timeline.push({
                time: nowMs + h * 3600000,
                hour: h,
                base_inflow_cfs: 0,
                precip_inflow_cfs: 0,
                total_inflow_cfs: 0,
            });
        }

        // Base inflow from terminal gauges (current measured flow)
        const currentInflow = this.terminalGaugeIds.reduce((sum, id) => {
            return sum + (gaugeFlows[id]?.flow_cfs || 0);
        }, 0);

        // Detect upstream surges using calibrated threshold
        const surges = [];
        for (const gauge of gauges) {
            if (gauge.indicator && gaugeFlows[gauge.id]) {
                const flow = gaugeFlows[gauge.id].flow_cfs;
                const terminalId = gauge.river === 'Big Creek' ? '06863500' : '06864500';
                const terminalFlow = gaugeFlows[terminalId]?.flow_cfs || 0;

                if (flow > terminalFlow * surgeThreshold && flow > 10) {
                    const excess = flow - terminalFlow;
                    surges.push({
                        gauge: gauge.name,
                        excess_cfs: excess,
                        arrivalHour: Math.round(gauge.travelHours),
                        duration: 12,
                    });
                }
            }
        }

        for (const slot of timeline) {
            slot.base_inflow_cfs = currentInflow;
        }

        for (const surge of surges) {
            for (let h = 0; h < surge.duration; h++) {
                const targetHour = surge.arrivalHour + h;
                if (targetHour < hours) {
                    const factor = Math.sin((h / surge.duration) * Math.PI);
                    timeline[targetHour].base_inflow_cfs += surge.excess_cfs * factor;
                }
            }
        }

        if (precipRunoff.length > 0) {
            for (let h = 0; h < Math.min(hours, precipRunoff.length); h++) {
                const laggedHour = h + 8;
                if (laggedHour < hours) {
                    timeline[laggedHour].precip_inflow_cfs += precipRunoff[h].runoff_cfs;
                }
            }
        }

        for (const slot of timeline) {
            slot.total_inflow_cfs = Math.round((slot.base_inflow_cfs + slot.precip_inflow_cfs) * 100) / 100;
        }

        return { timeline, currentInflow, surges };
    }

    async generateForecast() {
        if (this.cache && Date.now() < this.cacheExpiry) return this.cache;

        try {
            // Load calibrated parameters (learned from historical data)
            const params = await this.loadCalibratedParams();

            const [gaugeFlows, precipHourly, lakeConditions] = await Promise.all([
                this.fetchAllGaugeFlows(),
                this.fetchPrecipForecast(),
                this.lakeService.getLakeConditions(),
            ]);

            const nowMs = Date.now();
            const currentElevation = lakeConditions.elevation;
            const currentOutflow = lakeConditions.outflow_cfs || 0;

            if (currentElevation == null) {
                console.error('[Lake Forecast] No current elevation available');
                return null;
            }

            const precipRunoff = this.estimatePrecipRunoff(precipHourly, params.runoffCoefficient);
            const { timeline, currentInflow, surges } = this.buildInflowTimeline(
                gaugeFlows, precipRunoff, nowMs, params.gauges, params.surgeThreshold
            );

            // Project elevation changes hour by hour, applying calibrated elevation factor
            const forecastPoints = [];
            let elevation = currentElevation;

            for (const slot of timeline) {
                const netFlow = slot.total_inflow_cfs - currentOutflow;
                const deltaFt = (netFlow * 3600) / (this.surfaceAcres * 43560) * params.elevationFactor;
                elevation += deltaFt;

                forecastPoints.push({
                    time: slot.time,
                    hour: slot.hour,
                    predicted_elevation: Math.round(elevation * 1000) / 1000,
                    predicted_inflow_cfs: slot.total_inflow_cfs,
                    outflow_cfs: currentOutflow,
                    precip_contribution_cfs: Math.round(slot.precip_inflow_cfs * 100) / 100,
                });
            }

            const finalElevation = forecastPoints[forecastPoints.length - 1].predicted_elevation;
            const elevationChange = finalElevation - currentElevation;
            let trend = 'stable';
            if (elevationChange > 0.05) trend = 'rising';
            else if (elevationChange < -0.05) trend = 'falling';

            const gaugeStatus = params.gauges.map(g => ({
                id: g.id,
                name: g.name,
                river: g.river,
                flow_cfs: gaugeFlows[g.id]?.flow_cfs ?? null,
                travel_hours: g.travelHours,
                is_terminal: this.terminalGaugeIds.includes(g.id),
            }));

            const result = {
                generated_at: nowMs,
                current_elevation: currentElevation,
                predicted_elevation_24h: forecastPoints[23]?.predicted_elevation ?? null,
                predicted_elevation_48h: forecastPoints[47]?.predicted_elevation ?? null,
                predicted_elevation_72h: forecastPoints[71]?.predicted_elevation ?? null,
                elevation_change_72h: Math.round(elevationChange * 1000) / 1000,
                trend,
                current_inflow_cfs: Math.round(currentInflow * 100) / 100,
                current_outflow_cfs: currentOutflow,
                forecast_points: forecastPoints,
                gauge_status: gaugeStatus,
                surges: surges.map(s => ({ gauge: s.gauge, excess_cfs: Math.round(s.excess_cfs), arrival_hours: s.arrivalHour })),
                precip_total_inches: precipHourly.reduce((sum, p) => sum + p.precip_inches, 0),
                conservation_level: lakeConditions.conservation_level,
                calibration: params.calibration,
            };

            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;

            const calInfo = params.calibration.calibrated_at ? ` (calibrated, accuracy: ${((params.calibration.accuracy_score || 0) * 100).toFixed(0)}%)` : ' (using defaults)';
            console.log(`[Lake Forecast] Generated — trend: ${trend}, 72h change: ${elevationChange > 0 ? '+' : ''}${elevationChange.toFixed(3)} ft, inflow: ${currentInflow} cfs${calInfo}`);
            return result;
        } catch (error) {
            console.error('[Lake Forecast] Error generating forecast:', error.message);
            if (this.cache) return this.cache;
            return null;
        }
    }

    async saveForecast(forecast) {
        if (!forecast || !forecast.forecast_points?.length) return;

        // Store a summary row per generation
        await pool.query(
            `INSERT INTO lake_forecast (generated_at, current_elevation, predicted_elevation_24h, predicted_elevation_48h, predicted_elevation_72h, elevation_change_72h, trend, current_inflow_cfs, current_outflow_cfs, precip_total_inches) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
                forecast.generated_at, forecast.current_elevation,
                forecast.predicted_elevation_24h, forecast.predicted_elevation_48h,
                forecast.predicted_elevation_72h, forecast.elevation_change_72h,
                forecast.trend, forecast.current_inflow_cfs,
                forecast.current_outflow_cfs, forecast.precip_total_inches,
            ]
        );
    }

    async getLatestForecast() {
        // Return live-generated forecast (cached 30 min)
        return this.generateForecast();
    }
}

module.exports = LakeForecastService;
