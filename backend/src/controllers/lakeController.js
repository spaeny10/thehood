const LakeService = require('../services/lakeService');

const lakeService = new LakeService();

const getLakeConditions = async (req, res) => {
    try {
        const data = await lakeService.getLakeConditions();
        res.json(data);
    } catch (error) {
        console.error('Error getting lake conditions:', error);
        res.status(500).json({ error: 'Failed to fetch lake conditions' });
    }
};

const getLakeHistorical = async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 168;
        const limit = parseInt(req.query.limit) || 500;
        const data = await lakeService.getHistorical(hours, limit);
        res.json(data);
    } catch (error) {
        console.error('Error getting lake history:', error);
        res.status(500).json({ error: 'Failed to fetch lake history' });
    }
};

module.exports = { getLakeConditions, getLakeHistorical };
