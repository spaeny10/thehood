const axios = require('axios');

class NWSAlertService {
    constructor() {
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes (alerts are time-sensitive)
        this.lat = 38.72;
        this.lon = -98.77;
    }

    async getAlerts() {
        if (this.cache && Date.now() < this.cacheExpiry) return this.cache;

        try {
            const res = await axios.get(`https://api.weather.gov/alerts/active`, {
                params: { point: `${this.lat},${this.lon}` },
                headers: {
                    'User-Agent': 'KanopolanesWeather (kanopolanes@weather.app)',
                    'Accept': 'application/geo+json',
                },
                timeout: 10000,
            });

            const features = res.data?.features || [];
            const alerts = features.map(f => ({
                id: f.properties.id,
                event: f.properties.event,
                headline: f.properties.headline,
                description: f.properties.description,
                severity: f.properties.severity, // Extreme, Severe, Moderate, Minor, Unknown
                urgency: f.properties.urgency,
                certainty: f.properties.certainty,
                effective: f.properties.effective,
                expires: f.properties.expires,
                sender: f.properties.senderName,
            }));

            const result = {
                alerts,
                count: alerts.length,
                fetched_at: new Date().toISOString(),
            };

            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;
            return result;
        } catch (error) {
            console.error('Error fetching NWS alerts:', error.message);
            if (this.cache) return this.cache;
            return {
                alerts: [],
                count: 0,
                fetched_at: new Date().toISOString(),
                error: true,
            };
        }
    }
}

module.exports = NWSAlertService;
