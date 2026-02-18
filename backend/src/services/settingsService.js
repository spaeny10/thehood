const { pool } = require('../config/database');

class SettingsService {
    constructor() {
        this.cache = null;
    }

    async getAll() {
        if (this.cache) return this.cache;
        const { rows } = await pool.query('SELECT * FROM settings ORDER BY category, key');
        const settings = {};
        for (const row of rows) {
            settings[row.key] = {
                value: row.value,
                description: row.description,
                category: row.category,
                updated_at: row.updated_at
            };
        }
        this.cache = settings;
        return settings;
    }

    async get(key) {
        const all = await this.getAll();
        return all[key]?.value ?? null;
    }

    async getNumber(key) {
        const val = await this.get(key);
        return val !== null ? parseFloat(val) : null;
    }

    async update(settings) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const [key, value] of Object.entries(settings)) {
                await client.query(
                    `UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2`,
                    [String(value), key]
                );
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        this.cache = null;
        return this.getAll();
    }

    async getStats() {
        const [weather, lake, alertH, alertR, wOld, wNew, lOld, lNew] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM weather_data'),
            pool.query('SELECT COUNT(*) as count FROM lake_data'),
            pool.query('SELECT COUNT(*) as count FROM alert_history'),
            pool.query('SELECT COUNT(*) as count FROM alerts'),
            pool.query('SELECT MIN(timestamp) as ts FROM weather_data'),
            pool.query('SELECT MAX(timestamp) as ts FROM weather_data'),
            pool.query('SELECT MIN(timestamp) as ts FROM lake_data'),
            pool.query('SELECT MAX(timestamp) as ts FROM lake_data'),
        ]);

        return {
            weather_records: parseInt(weather.rows[0].count),
            lake_records: parseInt(lake.rows[0].count),
            alert_history_records: parseInt(alertH.rows[0].count),
            alert_rules: parseInt(alertR.rows[0].count),
            weather_oldest: wOld.rows[0].ts,
            weather_newest: wNew.rows[0].ts,
            lake_oldest: lOld.rows[0].ts,
            lake_newest: lNew.rows[0].ts,
            db_size_bytes: 0,
            db_size_mb: 0
        };
    }

    async purge(type) {
        switch (type) {
            case 'weather':
                await pool.query('DELETE FROM weather_data');
                return { deleted: 'weather_data' };
            case 'lake':
                await pool.query('DELETE FROM lake_data');
                return { deleted: 'lake_data' };
            case 'alert_history':
                await pool.query('DELETE FROM alert_history');
                return { deleted: 'alert_history' };
            case 'all':
                await pool.query('DELETE FROM weather_data');
                await pool.query('DELETE FROM lake_data');
                await pool.query('DELETE FROM alert_history');
                return { deleted: 'all' };
            default:
                throw new Error(`Unknown purge type: ${type}`);
        }
    }
}

module.exports = new SettingsService();
