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

module.exports = { getLakeConditions };
