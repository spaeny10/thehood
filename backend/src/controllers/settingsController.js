const settingsService = require('../services/settingsService');

const getSettings = (req, res) => {
    try {
        const settings = settingsService.getAll();
        res.json(settings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
};

const updateSettings = (req, res) => {
    try {
        const settings = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Invalid settings object' });
        }
        const updated = settingsService.update(settings);
        res.json(updated);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

const getStats = (req, res) => {
    try {
        const stats = settingsService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
};

const purgeData = (req, res) => {
    try {
        const { type } = req.body;
        if (!type) {
            return res.status(400).json({ error: 'Purge type required' });
        }
        const result = settingsService.purge(type);
        res.json(result);
    } catch (error) {
        console.error('Error purging data:', error);
        res.status(500).json({ error: 'Failed to purge data' });
    }
};

module.exports = { getSettings, updateSettings, getStats, purgeData };
