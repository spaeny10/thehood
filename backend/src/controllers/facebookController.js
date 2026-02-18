const facebookService = require('../services/facebookService');

const getFeed = async (req, res) => {
    try {
        const result = await facebookService.getFeed();
        res.json(result);
    } catch (error) {
        console.error('Error getting FB feed:', error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
};

const getEvents = async (req, res) => {
    try {
        const result = await facebookService.getEvents();
        res.json(result);
    } catch (error) {
        console.error('Error getting FB events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
};

module.exports = { getFeed, getEvents };
