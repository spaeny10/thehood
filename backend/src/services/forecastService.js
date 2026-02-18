const axios = require('axios');

class ForecastService {
    constructor() {
        this.baseURL = 'https://api.open-meteo.com/v1/forecast';
        this.latitude = process.env.LATITUDE || 32.78;
        this.longitude = process.env.LONGITUDE || -96.80;
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Get forecast data (hourly + daily), with caching
     */
    async getForecast() {
        // Return cached data if still fresh
        if (this.cache && Date.now() < this.cacheExpiry) {
            return this.cache;
        }

        try {
            const response = await axios.get(this.baseURL, {
                params: {
                    latitude: this.latitude,
                    longitude: this.longitude,
                    hourly: [
                        'temperature_2m',
                        'relative_humidity_2m',
                        'precipitation_probability',
                        'weather_code',
                        'wind_speed_10m'
                    ].join(','),
                    daily: [
                        'temperature_2m_max',
                        'temperature_2m_min',
                        'weather_code',
                        'precipitation_probability_max',
                        'wind_speed_10m_max'
                    ].join(','),
                    temperature_unit: 'fahrenheit',
                    wind_speed_unit: 'mph',
                    precipitation_unit: 'inch',
                    forecast_days: 5,
                    timezone: 'auto'
                }
            });

            const data = response.data;

            // Build hourly array (next 24 hours from now)
            const now = new Date();
            const hourly = [];
            for (let i = 0; i < data.hourly.time.length; i++) {
                const time = new Date(data.hourly.time[i]);
                if (time >= now && hourly.length < 24) {
                    hourly.push({
                        time: data.hourly.time[i],
                        temp: data.hourly.temperature_2m[i],
                        humidity: data.hourly.relative_humidity_2m[i],
                        precipitation_probability: data.hourly.precipitation_probability[i],
                        weather_code: data.hourly.weather_code[i],
                        wind_speed: data.hourly.wind_speed_10m[i]
                    });
                }
            }

            // Build daily array
            const daily = data.daily.time.map((time, i) => ({
                date: time,
                temp_max: data.daily.temperature_2m_max[i],
                temp_min: data.daily.temperature_2m_min[i],
                weather_code: data.daily.weather_code[i],
                precipitation_probability: data.daily.precipitation_probability_max[i],
                wind_speed_max: data.daily.wind_speed_10m_max[i]
            }));

            const result = { hourly, daily };

            // Cache the result
            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;

            return result;
        } catch (error) {
            console.error('Error fetching forecast:', error.message);
            // Return cached data if available, even if expired
            if (this.cache) {
                console.log('Returning stale cached forecast data');
                return this.cache;
            }
            throw error;
        }
    }
}

module.exports = ForecastService;
