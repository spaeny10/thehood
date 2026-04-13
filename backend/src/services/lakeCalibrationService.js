const cron = require('node-cron');
const { pool } = require('../config/database');

/**
 * Self-calibrating service for lake level forecast.
 *
 * Compares past forecasts against actual observed lake data and computes
 * better-fit parameters:
 *   - runoff_coefficient: how much rainfall becomes inflow
 *   - gauge travel times: lag between upstream flow spike and dam arrival
 *   - surge_threshold: multiplier for upstream surge detection
 *   - elevation_factor: correction for non-linear lake bathymetry
 *
 * Runs weekly. Needs ~2 weeks of data before first meaningful calibration.
 */
class LakeCalibrationService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;

        // Default parameters (used until enough data exists)
        this.defaults = {
            runoff_coefficient: 0.15,
            surge_threshold: 1.5,
            elevation_factor: 1.0,
            travel_hours: {
                '06860000': 60,
                '06861000': 42,
                '06862700': 30,
                '06863000': 21,
                '06864000': 15,
                '06864500': 9,
                '06863420': 21,
                '06863500': 18,
            },
        };
    }

    async start() {
        if (this.isRunning) return;
        // Run calibration on startup (non-blocking) and then weekly on Sundays at 3am
        setTimeout(() => this.calibrate(), 60000);
        this.cronJob = cron.schedule('0 3 * * 0', () => this.calibrate());
        this.isRunning = true;
        console.log('✓ Lake calibration service started (weekly on Sundays 3am)');
    }

    stop() {
        if (this.cronJob) { this.cronJob.stop(); this.isRunning = false; }
    }

    /**
     * Get the current calibrated parameters (or defaults if not enough data).
     */
    async getParameters() {
        try {
            const { rows } = await pool.query(
                `SELECT * FROM lake_calibration ORDER BY calibrated_at DESC LIMIT 1`
            );
            if (rows.length > 0) {
                const row = rows[0];
                return {
                    runoff_coefficient: row.runoff_coefficient,
                    surge_threshold: row.surge_threshold,
                    elevation_factor: row.elevation_factor,
                    travel_hours: row.travel_hours_json ? JSON.parse(row.travel_hours_json) : this.defaults.travel_hours,
                    calibrated_at: row.calibrated_at,
                    data_points: row.data_points,
                    accuracy_score: row.accuracy_score,
                };
            }
        } catch (e) {
            // Table may not exist yet
        }
        return { ...this.defaults, calibrated_at: null, data_points: 0, accuracy_score: null };
    }

    /**
     * Main calibration routine. Compares forecast predictions to actual outcomes.
     */
    async calibrate() {
        try {
            console.log('[Calibration] Starting calibration run...');

            // Need at least 14 days of data
            const minDataAge = Date.now() - 14 * 24 * 3600000;
            const lookbackMs = 90 * 24 * 3600000; // Use up to 90 days
            const since = Date.now() - lookbackMs;

            // Get historical lake data (actual observations)
            const { rows: lakeRows } = await pool.query(
                `SELECT timestamp, elevation, inflow_cfs, outflow_cfs, water_temp_f
                 FROM lake_data WHERE timestamp >= $1 ORDER BY timestamp ASC`,
                [since]
            );

            if (lakeRows.length < 50) {
                console.log(`[Calibration] Not enough data yet (${lakeRows.length} points, need 50+). Using defaults.`);
                return;
            }

            const oldestPoint = Number(lakeRows[0].timestamp);
            if (oldestPoint > minDataAge) {
                console.log('[Calibration] Data span too short (need 14+ days). Using defaults.');
                return;
            }

            // Get historical forecasts
            const { rows: forecastRows } = await pool.query(
                `SELECT generated_at, current_elevation, predicted_elevation_24h,
                        predicted_elevation_48h, predicted_elevation_72h,
                        current_inflow_cfs, current_outflow_cfs, precip_total_inches
                 FROM lake_forecast WHERE generated_at >= $1 ORDER BY generated_at ASC`,
                [since]
            );

            // === 1. Calibrate elevation factor ===
            // Compare predicted vs actual elevation changes
            const elevationFactor = this.calibrateElevationFactor(forecastRows, lakeRows);

            // === 2. Calibrate runoff coefficient ===
            // Compare actual inflow during/after rain events vs what runoff model predicted
            const runoffCoefficient = await this.calibrateRunoff(lakeRows);

            // === 3. Calibrate travel times ===
            // Cross-correlate upstream gauge flows with actual inflow at the dam
            const travelHours = await this.calibrateTravelTimes(since);

            // === 4. Calibrate surge threshold ===
            const surgeThreshold = this.calibrateSurgeThreshold(forecastRows, lakeRows);

            // === 5. Compute accuracy score ===
            const accuracy = this.computeAccuracy(forecastRows, lakeRows);

            // Save calibrated parameters
            await pool.query(
                `INSERT INTO lake_calibration
                 (calibrated_at, runoff_coefficient, surge_threshold, elevation_factor,
                  travel_hours_json, data_points, accuracy_score)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    Date.now(),
                    runoffCoefficient,
                    surgeThreshold,
                    elevationFactor,
                    JSON.stringify(travelHours),
                    lakeRows.length,
                    accuracy,
                ]
            );

            console.log(`[Calibration] Complete — runoff: ${runoffCoefficient.toFixed(3)}, ` +
                `elevation_factor: ${elevationFactor.toFixed(3)}, surge: ${surgeThreshold.toFixed(2)}, ` +
                `accuracy: ${(accuracy * 100).toFixed(1)}%, data_points: ${lakeRows.length}`);

        } catch (error) {
            console.error('[Calibration] Error:', error.message);
        }
    }

    /**
     * Compare predicted elevation changes to actual.
     * Returns a correction factor (>1 means model underestimates changes).
     */
    calibrateElevationFactor(forecastRows, lakeRows) {
        if (forecastRows.length < 5) return this.defaults.elevation_factor;

        const lakeByTime = this.indexByTime(lakeRows);
        let sumPredicted = 0;
        let sumActual = 0;
        let count = 0;

        for (const fc of forecastRows) {
            if (!fc.predicted_elevation_24h || !fc.current_elevation) continue;

            const predictedChange = fc.predicted_elevation_24h - fc.current_elevation;
            const actualAt24h = this.findClosest(lakeByTime, fc.generated_at + 24 * 3600000, 3600000);

            if (actualAt24h && actualAt24h.elevation != null) {
                const actualChange = actualAt24h.elevation - fc.current_elevation;
                // Only use meaningful changes (> 0.005 ft)
                if (Math.abs(predictedChange) > 0.005 || Math.abs(actualChange) > 0.005) {
                    sumPredicted += Math.abs(predictedChange);
                    sumActual += Math.abs(actualChange);
                    count++;
                }
            }
        }

        if (count < 5 || sumPredicted === 0) return this.defaults.elevation_factor;

        // Clamp to reasonable range [0.5, 2.0]
        const factor = Math.max(0.5, Math.min(2.0, sumActual / sumPredicted));
        console.log(`[Calibration] Elevation factor: ${factor.toFixed(3)} (from ${count} comparisons)`);
        return Math.round(factor * 1000) / 1000;
    }

    /**
     * Calibrate runoff coefficient by comparing inflow spikes to precipitation events.
     */
    async calibrateRunoff(lakeRows) {
        // Find periods where inflow increased significantly
        const inflowData = lakeRows.filter(r => r.inflow_cfs != null && r.inflow_cfs > 0);
        if (inflowData.length < 20) return this.defaults.runoff_coefficient;

        // Calculate average inflow as baseline
        const avgInflow = inflowData.reduce((s, r) => s + r.inflow_cfs, 0) / inflowData.length;

        // Find inflow spikes (> 2x average)
        const spikes = inflowData.filter(r => r.inflow_cfs > avgInflow * 2);
        if (spikes.length < 3) return this.defaults.runoff_coefficient;

        // For each spike, check if there was rain in the prior 48 hours
        // We estimate rain from the weather_data table
        let totalExcessInflow = 0;
        let totalRainfall = 0;
        let spikeCount = 0;

        for (const spike of spikes) {
            const ts = Number(spike.timestamp);
            try {
                const { rows: rainRows } = await pool.query(
                    `SELECT SUM(rain_daily) as total_rain FROM weather_data
                     WHERE timestamp >= $1 AND timestamp <= $2 AND rain_daily > 0`,
                    [ts - 48 * 3600000, ts]
                );
                const rain = rainRows[0]?.total_rain;
                if (rain && rain > 0.1) {
                    totalExcessInflow += spike.inflow_cfs - avgInflow;
                    totalRainfall += rain;
                    spikeCount++;
                }
            } catch (e) { /* skip */ }
        }

        if (spikeCount < 2 || totalRainfall === 0) return this.defaults.runoff_coefficient;

        // Derive coefficient: excess_inflow_cfs = rain_inches * coefficient * watershed * 645.33 / 3600
        // So coefficient = excess_inflow * 3600 / (rain * watershed * 645.33)
        const derived = (totalExcessInflow * 3600) / (totalRainfall * 2250 * 645.33);
        const coefficient = Math.max(0.05, Math.min(0.40, derived));

        console.log(`[Calibration] Runoff coefficient: ${coefficient.toFixed(3)} (from ${spikeCount} rain events)`);
        return Math.round(coefficient * 1000) / 1000;
    }

    /**
     * Cross-correlate upstream gauge data with actual dam inflow to find optimal lag.
     * Uses USGS historical instantaneous values.
     */
    async calibrateTravelTimes(since) {
        const travelHours = { ...this.defaults.travel_hours };

        // We need historical gauge data from USGS for cross-correlation.
        // This is expensive so we only do it for terminal gauges relative to
        // observed CWMS inflow. For indicator gauges, we scale proportionally.
        try {
            const axios = require('axios');
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(since).toISOString().split('T')[0];

            // Fetch historical daily flows for Russell and Ellsworth
            const [russellRes, ellsworthRes] = await Promise.all([
                axios.get('https://waterservices.usgs.gov/nwis/dv/', {
                    params: { format: 'json', sites: '06864000', parameterCd: '00060', startDT: startDate, endDT: endDate },
                    timeout: 15000,
                }).catch(() => null),
                axios.get('https://waterservices.usgs.gov/nwis/dv/', {
                    params: { format: 'json', sites: '06864500', parameterCd: '00060', startDT: startDate, endDT: endDate },
                    timeout: 15000,
                }).catch(() => null),
            ]);

            if (russellRes && ellsworthRes) {
                const russellFlows = this.extractDailyFlows(russellRes.data);
                const ellsworthFlows = this.extractDailyFlows(ellsworthRes.data);

                if (russellFlows.length > 14 && ellsworthFlows.length > 14) {
                    // Find the lag (in days) that maximizes cross-correlation
                    // between Russell and Ellsworth
                    const bestLag = this.findBestLag(russellFlows, ellsworthFlows, 0, 3);
                    const russellToEllsworthHours = Math.max(3, bestLag * 24);

                    // Russell is ~30 river miles upstream of Ellsworth
                    // Use this to derive velocity and scale other gauges
                    const velocity = 30 / russellToEllsworthHours; // miles per hour

                    // Approximate river distances to dam for each gauge
                    const distances = {
                        '06860000': 100, '06861000': 80, '06862700': 55,
                        '06863000': 45, '06864000': 30, '06864500': 15,
                        '06863420': 50, '06863500': 40,
                    };

                    for (const [id, dist] of Object.entries(distances)) {
                        const hours = Math.round(dist / velocity);
                        travelHours[id] = Math.max(1, Math.min(96, hours));
                    }

                    console.log(`[Calibration] Travel velocity: ${velocity.toFixed(2)} mph, ` +
                        `Russell→Ellsworth: ${russellToEllsworthHours}h`);
                }
            }
        } catch (error) {
            console.error('[Calibration] Travel time calibration error:', error.message);
        }

        return travelHours;
    }

    extractDailyFlows(usgsData) {
        try {
            const series = usgsData.value.timeSeries[0];
            return series.values[0].value
                .filter(v => v.value !== null && v.value !== '-999999')
                .map(v => ({ date: v.dateTime, flow: parseFloat(v.value) }));
        } catch (e) { return []; }
    }

    /**
     * Find the lag (in days) between two flow series that maximizes correlation.
     */
    findBestLag(upstream, downstream, minLag, maxLag) {
        let bestCorr = -1;
        let bestLag = Math.round((minLag + maxLag) / 2);

        // Align by date
        const downMap = {};
        for (const d of downstream) { downMap[d.date.split('T')[0]] = d.flow; }

        for (let lag = minLag; lag <= maxLag; lag++) {
            const pairs = [];
            for (const u of upstream) {
                const uDate = new Date(u.date);
                uDate.setDate(uDate.getDate() + lag);
                const key = uDate.toISOString().split('T')[0];
                if (downMap[key] !== undefined) {
                    pairs.push([u.flow, downMap[key]]);
                }
            }

            if (pairs.length < 10) continue;
            const corr = this.pearsonCorrelation(pairs);
            if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
        }

        return bestLag;
    }

    pearsonCorrelation(pairs) {
        const n = pairs.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (const [x, y] of pairs) {
            sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
        }
        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return den === 0 ? 0 : num / den;
    }

    /**
     * Calibrate surge detection threshold based on historical false positives.
     */
    calibrateSurgeThreshold(forecastRows, lakeRows) {
        // If we had surges predicted but elevation didn't actually rise,
        // threshold is too low. If we missed rises, threshold is too high.
        // For now, keep default until we have surge event history.
        if (forecastRows.length < 20) return this.defaults.surge_threshold;

        const lakeByTime = this.indexByTime(lakeRows);
        let overPredictions = 0;
        let correctPredictions = 0;

        for (const fc of forecastRows) {
            if (!fc.predicted_elevation_24h || !fc.current_elevation) continue;
            const predictedRise = fc.predicted_elevation_24h - fc.current_elevation > 0.05;
            const actual24h = this.findClosest(lakeByTime, fc.generated_at + 24 * 3600000, 3600000);
            if (!actual24h || actual24h.elevation == null) continue;

            const actualRise = actual24h.elevation - fc.current_elevation > 0.05;

            if (predictedRise && !actualRise) overPredictions++;
            if (predictedRise && actualRise) correctPredictions++;
        }

        const total = overPredictions + correctPredictions;
        if (total < 5) return this.defaults.surge_threshold;

        // If too many false positives, raise threshold
        const falseRate = overPredictions / total;
        let threshold = this.defaults.surge_threshold;
        if (falseRate > 0.5) threshold = Math.min(3.0, threshold + 0.25);
        else if (falseRate < 0.2) threshold = Math.max(1.2, threshold - 0.1);

        console.log(`[Calibration] Surge threshold: ${threshold.toFixed(2)} (false rate: ${(falseRate * 100).toFixed(0)}%)`);
        return Math.round(threshold * 100) / 100;
    }

    /**
     * Compute overall accuracy: how close were 24h predictions to reality?
     * Returns 0-1 score (1 = perfect).
     */
    computeAccuracy(forecastRows, lakeRows) {
        if (forecastRows.length < 5) return null;

        const lakeByTime = this.indexByTime(lakeRows);
        let totalError = 0;
        let count = 0;

        for (const fc of forecastRows) {
            if (!fc.predicted_elevation_24h || !fc.current_elevation) continue;
            const actual24h = this.findClosest(lakeByTime, fc.generated_at + 24 * 3600000, 3600000);
            if (!actual24h || actual24h.elevation == null) continue;

            const error = Math.abs(fc.predicted_elevation_24h - actual24h.elevation);
            totalError += error;
            count++;
        }

        if (count === 0) return null;

        // Convert mean absolute error to a 0-1 score
        // 0 ft error = 1.0, 0.5 ft error = 0.0
        const mae = totalError / count;
        const score = Math.max(0, 1 - mae / 0.5);
        console.log(`[Calibration] Accuracy: MAE=${mae.toFixed(4)} ft, score=${(score * 100).toFixed(1)}% (${count} comparisons)`);
        return Math.round(score * 1000) / 1000;
    }

    // --- Helpers ---

    indexByTime(rows) {
        const map = {};
        for (const r of rows) {
            map[Number(r.timestamp)] = r;
        }
        return map;
    }

    findClosest(timeMap, targetMs, toleranceMs) {
        const keys = Object.keys(timeMap).map(Number);
        let best = null;
        let bestDist = Infinity;
        for (const k of keys) {
            const dist = Math.abs(k - targetMs);
            if (dist < bestDist && dist <= toleranceMs) {
                bestDist = dist;
                best = timeMap[k];
            }
        }
        return best;
    }

    getStatus() {
        return { isRunning: this.isRunning };
    }
}

module.exports = LakeCalibrationService;
