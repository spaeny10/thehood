const SunMoonService = require('../services/sunMoonService');
const NWSAlertService = require('../services/nwsAlertService');

const sunMoonService = new SunMoonService();
const nwsAlertService = new NWSAlertService();

const getSunMoon = async (req, res) => {
    try {
        const data = await sunMoonService.getData();
        res.json(data);
    } catch (error) {
        console.error('Error getting sun/moon data:', error);
        res.status(500).json({ error: 'Failed to fetch sun/moon data' });
    }
};

const getNWSAlerts = async (req, res) => {
    try {
        const data = await nwsAlertService.getAlerts();
        res.json(data);
    } catch (error) {
        console.error('Error getting NWS alerts:', error);
        res.status(500).json({ error: 'Failed to fetch NWS alerts' });
    }
};

module.exports = { getSunMoon, getNWSAlerts };
