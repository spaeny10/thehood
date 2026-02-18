const axios = require('axios');

class AmbientWeatherService {
  constructor(apiKey, applicationKey) {
    this.apiKey = apiKey;
    this.applicationKey = applicationKey;
    this.baseURL = 'https://api.ambientweather.net/v1';
  }

  /**
   * Get list of user's devices
   */
  async getDevices() {
    try {
      const response = await axios.get(`${this.baseURL}/devices`, {
        params: {
          applicationKey: this.applicationKey,
          apiKey: this.apiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error.message);
      throw error;
    }
  }

  /**
   * Get device data
   * @param {string} macAddress - Device MAC address
   * @param {number} limit - Number of records to return (default: 1)
   */
  async getDeviceData(macAddress, limit = 1) {
    try {
      const response = await axios.get(
        `${this.baseURL}/devices/${macAddress}`,
        {
          params: {
            applicationKey: this.applicationKey,
            apiKey: this.apiKey,
            limit: limit
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching device data:', error.message);
      throw error;
    }
  }

  /**
   * Get current weather data from the first device
   */
  async getCurrentWeather() {
    try {
      const devices = await this.getDevices();
      if (devices && devices.length > 0) {
        const deviceData = devices[0].lastData;
        return this.normalizeWeatherData(deviceData);
      }
      return null;
    } catch (error) {
      console.error('Error fetching current weather:', error.message);
      throw error;
    }
  }

  /**
   * Normalize weather data to consistent format
   */
  normalizeWeatherData(data) {
    return {
      timestamp: data.dateutc || Date.now(),
      indoor_temp: data.tempinf || data.temp1f || null,
      indoor_humidity: data.humidityin || data.humidity1 || null,
      outdoor_temp: data.tempf || null,
      outdoor_humidity: data.humidity || null,
      wind_speed: data.windspeedmph || null,
      wind_gust: data.windgustmph || null,
      wind_direction: data.winddir || null,
      rain_hourly: data.hourlyrainin || null,
      rain_daily: data.dailyrainin || null,
      rain_weekly: data.weeklyrainin || null,
      rain_monthly: data.monthlyrainin || null,
      rain_total: data.totalrainin || null,
      pressure: data.baromrelin || data.baromabsin || null,
      uv_index: data.uv || null,
      solar_radiation: data.solarradiation || null,
      feels_like: data.feelsLike || null,
      dew_point: data.dewPoint || null,
      lightning_count: data.lightning_day || null,
      lightning_distance: data.lightning_distance || null,
      battery_outdoor: data.batt1 !== undefined ? data.batt1 : (data.battout !== undefined ? data.battout : null),
      battery_indoor: data.batt_co2 !== undefined ? data.batt_co2 : (data.battin !== undefined ? data.battin : null)
    };
  }
}

module.exports = AmbientWeatherService;
