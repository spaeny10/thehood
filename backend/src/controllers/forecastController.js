const ForecastService = require('../services/forecastService');

const forecastService = new ForecastService();

/**
 * Get forecast data (hourly + daily)
 */
const getForecast = async (req, res) => {
    try {
        const forecast = await forecastService.getForecast();
        res.json(forecast);
    } catch (error) {
        console.error('Error getting forecast:', error);
        res.status(500).json({ error: 'Failed to fetch forecast data' });
    }
};

module.exports = { getForecast };
