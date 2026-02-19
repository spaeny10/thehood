const axios = require('axios');

class SunMoonService {
    constructor() {
        this.cache = null;
        this.cacheExpiry = 0;
        this.cacheDuration = 30 * 60 * 1000; // 30 minutes
        this.lat = 38.72;
        this.lon = -98.77;
    }

    // Calculate moon phase (0=new, 0.5=full)
    getMoonPhase(date = new Date()) {
        // Synodic month = 29.53059 days
        // Known new moon: Jan 6, 2000 18:14 UTC
        const knownNew = new Date('2000-01-06T18:14:00Z');
        const diff = date.getTime() - knownNew.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        const synodicMonth = 29.53059;
        let phase = (days % synodicMonth) / synodicMonth;
        if (phase < 0) phase += 1;
        return phase;
    }

    getMoonPhaseName(phase) {
        if (phase < 0.0625) return { name: 'New Moon', emoji: '🌑' };
        if (phase < 0.1875) return { name: 'Waxing Crescent', emoji: '🌒' };
        if (phase < 0.3125) return { name: 'First Quarter', emoji: '🌓' };
        if (phase < 0.4375) return { name: 'Waxing Gibbous', emoji: '🌔' };
        if (phase < 0.5625) return { name: 'Full Moon', emoji: '🌕' };
        if (phase < 0.6875) return { name: 'Waning Gibbous', emoji: '🌖' };
        if (phase < 0.8125) return { name: 'Last Quarter', emoji: '🌗' };
        if (phase < 0.9375) return { name: 'Waning Crescent', emoji: '🌘' };
        return { name: 'New Moon', emoji: '🌑' };
    }

    getMoonIllumination(phase) {
        // Approximate illumination percentage
        return Math.round((1 - Math.cos(2 * Math.PI * phase)) / 2 * 100);
    }

    async getData() {
        if (this.cache && Date.now() < this.cacheExpiry) return this.cache;

        try {
            // Fetch from Open-Meteo daily API (includes sunrise/sunset)
            const res = await axios.get('https://api.open-meteo.com/v1/forecast', {
                params: {
                    latitude: this.lat,
                    longitude: this.lon,
                    daily: 'sunrise,sunset,daylight_duration',
                    timezone: 'America/Chicago',
                    forecast_days: 1,
                },
                timeout: 10000,
            });

            const daily = res.data?.daily;
            const now = new Date();
            const phase = this.getMoonPhase(now);
            const moonInfo = this.getMoonPhaseName(phase);

            const sunrise = daily?.sunrise?.[0] || null;
            const sunset = daily?.sunset?.[0] || null;
            const daylightSeconds = daily?.daylight_duration?.[0] || null;

            // Calculate day length in hours and minutes
            let dayLength = null;
            if (daylightSeconds) {
                const hours = Math.floor(daylightSeconds / 3600);
                const minutes = Math.round((daylightSeconds % 3600) / 60);
                dayLength = `${hours}h ${minutes}m`;
            }

            const result = {
                sunrise,
                sunset,
                day_length: dayLength,
                moon_phase: moonInfo.name,
                moon_emoji: moonInfo.emoji,
                moon_illumination: this.getMoonIllumination(phase),
                fetched_at: now.toISOString(),
            };

            this.cache = result;
            this.cacheExpiry = Date.now() + this.cacheDuration;
            return result;
        } catch (error) {
            console.error('Error fetching sun/moon data:', error.message);
            if (this.cache) return this.cache;

            // Fallback: just return moon data without sunrise/sunset
            const now = new Date();
            const phase = this.getMoonPhase(now);
            const moonInfo = this.getMoonPhaseName(phase);
            return {
                sunrise: null,
                sunset: null,
                day_length: null,
                moon_phase: moonInfo.name,
                moon_emoji: moonInfo.emoji,
                moon_illumination: this.getMoonIllumination(phase),
                fetched_at: now.toISOString(),
            };
        }
    }
}

module.exports = SunMoonService;
