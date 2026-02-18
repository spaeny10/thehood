import { format } from 'date-fns';

export const formatTemp = (temp) => {
  if (temp === null || temp === undefined) return '--';
  return `${Math.round(temp)}°F`;
};

export const formatHumidity = (humidity) => {
  if (humidity === null || humidity === undefined) return '--';
  return `${Math.round(humidity)}%`;
};

export const formatWind = (speed) => {
  if (speed === null || speed === undefined) return '--';
  return `${Math.round(speed)} mph`;
};

export const formatRain = (rain) => {
  if (rain === null || rain === undefined) return '--';
  return `${rain.toFixed(2)} in`;
};

export const formatPressure = (pressure) => {
  if (pressure === null || pressure === undefined) return '--';
  return `${pressure.toFixed(2)} inHg`;
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(Number(timestamp));
  if (isNaN(date.getTime())) return '--';
  return format(date, 'MMM d, h:mm a');
};

export const formatTime = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(Number(timestamp));
  if (isNaN(date.getTime())) return '--';
  return format(date, 'h:mm a');
};

export const getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return '--';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export const getUVLevel = (uv) => {
  if (uv === null || uv === undefined) return { level: 'Unknown', color: 'gray' };
  if (uv <= 2) return { level: 'Low', color: 'green' };
  if (uv <= 5) return { level: 'Moderate', color: 'yellow' };
  if (uv <= 7) return { level: 'High', color: 'orange' };
  if (uv <= 10) return { level: 'Very High', color: 'red' };
  return { level: 'Extreme', color: 'purple' };
};

const weatherCodeMap = {
  0: { icon: '☀️', desc: 'Clear' },
  1: { icon: '🌤️', desc: 'Mostly Clear' },
  2: { icon: '⛅', desc: 'Partly Cloudy' },
  3: { icon: '☁️', desc: 'Overcast' },
  45: { icon: '🌫️', desc: 'Fog' },
  48: { icon: '🌫️', desc: 'Rime Fog' },
  51: { icon: '🌦️', desc: 'Light Drizzle' },
  53: { icon: '🌦️', desc: 'Drizzle' },
  55: { icon: '🌦️', desc: 'Heavy Drizzle' },
  61: { icon: '🌧️', desc: 'Light Rain' },
  63: { icon: '🌧️', desc: 'Rain' },
  65: { icon: '🌧️', desc: 'Heavy Rain' },
  66: { icon: '🌧️', desc: 'Freezing Rain' },
  67: { icon: '🌧️', desc: 'Heavy Freezing Rain' },
  71: { icon: '🌨️', desc: 'Light Snow' },
  73: { icon: '🌨️', desc: 'Snow' },
  75: { icon: '🌨️', desc: 'Heavy Snow' },
  77: { icon: '🌨️', desc: 'Snow Grains' },
  80: { icon: '🌧️', desc: 'Light Showers' },
  81: { icon: '🌧️', desc: 'Showers' },
  82: { icon: '⛈️', desc: 'Heavy Showers' },
  85: { icon: '🌨️', desc: 'Snow Showers' },
  86: { icon: '🌨️', desc: 'Heavy Snow Showers' },
  95: { icon: '⛈️', desc: 'Thunderstorm' },
  96: { icon: '⛈️', desc: 'Thunderstorm w/ Hail' },
  99: { icon: '⛈️', desc: 'Severe Thunderstorm' },
};

export const getWeatherIcon = (code) => {
  return weatherCodeMap[code]?.icon || '🌡️';
};

export const getWeatherDescription = (code) => {
  return weatherCodeMap[code]?.desc || 'Unknown';
};

export const formatDay = (dateStr) => {
  if (!dateStr) return '--';
  const date = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return format(date, 'EEE');
};

export const formatHour = (timeStr) => {
  if (!timeStr) return '--';
  const date = new Date(timeStr);
  return format(date, 'ha').toLowerCase();
};

