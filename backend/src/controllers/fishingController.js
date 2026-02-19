const FishingReportService = require('../services/fishingReportService');

const fishingService = new FishingReportService();

const getFishingReport = async (req, res) => {
    try {
        const data = await fishingService.getReport();
        res.json(data);
    } catch (error) {
        console.error('Error getting fishing report:', error);
        res.status(500).json({ error: 'Failed to fetch fishing report' });
    }
};

module.exports = { getFishingReport };
