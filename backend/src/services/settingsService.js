const db = require('../config/database');

class SettingsService {
    constructor() {
        this.cache = null;
    }

    /**
     * Get all settings
     */
    getAll() {
        if (this.cache) return this.cache;

        const rows = db.prepare('SELECT * FROM settings ORDER BY category, key').all();
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

    /**
     * Get a single setting value
     */
    get(key) {
        const all = this.getAll();
        return all[key]?.value ?? null;
    }

    /**
     * Get a setting as a number
     */
    getNumber(key) {
        const val = this.get(key);
        return val !== null ? parseFloat(val) : null;
    }

    /**
     * Update multiple settings at once
     */
    update(settings) {
        const updateStmt = db.prepare(`
      UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE key = ?
    `);

        const updateMany = db.transaction((entries) => {
            for (const [key, value] of Object.entries(entries)) {
                updateStmt.run(String(value), key);
            }
        });

        updateMany(settings);
        this.cache = null; // invalidate cache
        return this.getAll();
    }

    /**
     * Get database statistics
     */
    getStats() {
        const weatherCount = db.prepare('SELECT COUNT(*) as count FROM weather_data').get().count;
        const lakeCount = db.prepare('SELECT COUNT(*) as count FROM lake_data').get().count;
        const alertHistoryCount = db.prepare('SELECT COUNT(*) as count FROM alert_history').get().count;
        const alertCount = db.prepare('SELECT COUNT(*) as count FROM alerts').get().count;

        // Get oldest/newest timestamps
        const weatherOldest = db.prepare('SELECT MIN(timestamp) as ts FROM weather_data').get().ts;
        const weatherNewest = db.prepare('SELECT MAX(timestamp) as ts FROM weather_data').get().ts;
        const lakeOldest = db.prepare('SELECT MIN(timestamp) as ts FROM lake_data').get().ts;
        const lakeNewest = db.prepare('SELECT MAX(timestamp) as ts FROM lake_data').get().ts;

        // Get database file size
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(__dirname, '../../weather.db');
        let dbSizeBytes = 0;
        try {
            const stat = fs.statSync(dbPath);
            dbSizeBytes = stat.size;
        } catch (e) { /* ignore */ }

        return {
            weather_records: weatherCount,
            lake_records: lakeCount,
            alert_history_records: alertHistoryCount,
            alert_rules: alertCount,
            weather_oldest: weatherOldest,
            weather_newest: weatherNewest,
            lake_oldest: lakeOldest,
            lake_newest: lakeNewest,
            db_size_bytes: dbSizeBytes,
            db_size_mb: Math.round(dbSizeBytes / 1024 / 1024 * 100) / 100
        };
    }

    /**
     * Purge data by type
     */
    purge(type) {
        switch (type) {
            case 'weather':
                db.prepare('DELETE FROM weather_data').run();
                return { deleted: 'weather_data' };
            case 'lake':
                db.prepare('DELETE FROM lake_data').run();
                return { deleted: 'lake_data' };
            case 'alert_history':
                db.prepare('DELETE FROM alert_history').run();
                return { deleted: 'alert_history' };
            case 'all':
                db.prepare('DELETE FROM weather_data').run();
                db.prepare('DELETE FROM lake_data').run();
                db.prepare('DELETE FROM alert_history').run();
                return { deleted: 'all' };
            default:
                throw new Error(`Unknown purge type: ${type}`);
        }
    }
}

module.exports = new SettingsService();
