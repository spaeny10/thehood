import { Thermometer, Droplets, Wind, CloudRain, Zap, Gauge, BatteryFull, BatteryLow } from 'lucide-react';
import { formatTemp, formatHumidity, formatWind, formatRain, formatDateTime, getWindDirection } from '../utils/formatters';

const WeatherCard = ({ data, title, icon: Icon }) => {
  if (!data) return null;

  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-purple-accent" />}
      </div>
      <div className="space-y-2 text-sm text-slate-300">
        <div className="text-2xl font-bold text-white mb-2">
          {formatTemp(data.outdoor_temp)}
        </div>
        <div className="text-xs text-slate-400">
          Last updated: {formatDateTime(data.timestamp)}
        </div>
      </div>
    </div>
  );
};

const HumidityBar = ({ value, label, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{formatHumidity(value)}</span>
    </div>
    <div className="w-full h-2 rounded-full bg-dark-bg overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${value != null ? Math.min(value, 100) : 0}%`,
          backgroundColor: color,
        }}
      />
    </div>
  </div>
);

const BatteryIndicator = ({ value, label }) => {
  const isLow = value === 1;
  const isUnknown = value === null || value === undefined;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {isLow ? (
          <BatteryLow className="w-5 h-5 text-red-400" />
        ) : (
          <BatteryFull className="w-5 h-5 text-emerald-400" />
        )}
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isUnknown
        ? 'bg-slate-700 text-slate-400'
        : isLow
          ? 'bg-red-500/20 text-red-400'
          : 'bg-emerald-500/20 text-emerald-400'
        }`}>
        {isUnknown ? 'N/A' : isLow ? 'LOW' : 'OK'}
      </span>
    </div>
  );
};

const CurrentWeather = ({ data }) => {
  if (!data) {
    return (
      <div className="card">
        <p className="text-slate-400">Loading weather data...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Outdoor Temperature */}
      <div className="card card-hover">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Outdoor</p>
            <p className="text-4xl font-bold text-white">{formatTemp(data.outdoor_temp)}</p>
            <p className="text-sm text-slate-400 mt-1">
              Feels like {formatTemp(data.feels_like)}
            </p>
          </div>
          <Thermometer className="w-8 h-8 text-purple-accent" />
        </div>
        <div className="text-xs text-slate-400">
          Dew Point: {formatTemp(data.dew_point)}
        </div>
      </div>


      {/* Humidity */}
      <div className="card card-hover">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-slate-400 mb-1">Humidity</p>
          </div>
          <Droplets className="w-8 h-8 text-cyan-400" />
        </div>
        <div className="space-y-3">
          <HumidityBar
            value={data.outdoor_humidity}
            label="Outdoor"
            color="#06b6d4"
          />
        </div>
      </div>

      {/* Battery Status */}
      <div className="card card-hover">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-slate-400 mb-1">Battery</p>
          </div>
          <BatteryFull className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="divide-y divide-dark-border">
          <BatteryIndicator value={data.battery_outdoor} label="Outdoor Sensor" />
        </div>
      </div>

      {/* Wind */}
      <div className="card card-hover">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Wind</p>
            <p className="text-4xl font-bold text-white">{formatWind(data.wind_speed)}</p>
            <p className="text-sm text-slate-400 mt-1">
              Gusts: {formatWind(data.wind_gust)}
            </p>
          </div>
          <Wind className="w-8 h-8 text-purple-accent" />
        </div>
        <div className="text-xs text-slate-400">
          Direction: {getWindDirection(data.wind_direction)} ({data.wind_direction}°)
        </div>
      </div>

      {/* Rain */}
      <div className="card card-hover">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Rain</p>
            <p className="text-2xl font-bold text-white">{formatRain(data.rain_hourly)}</p>
            <p className="text-xs text-slate-400">per hour</p>
          </div>
          <CloudRain className="w-8 h-8 text-purple-accent" />
        </div>
        <div className="flex flex-col gap-1 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Daily:</span>
            <span>{formatRain(data.rain_daily)}</span>
          </div>
          <div className="flex justify-between">
            <span>Monthly:</span>
            <span>{formatRain(data.rain_monthly)}</span>
          </div>
        </div>
      </div>

      {/* Pressure */}
      <div className="card card-hover">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Pressure</p>
            <p className="text-2xl font-bold text-white">
              {data.pressure ? data.pressure.toFixed(2) : '--'}
            </p>
            <p className="text-xs text-slate-400">inHg</p>
          </div>
          <Gauge className="w-8 h-8 text-purple-accent" />
        </div>
      </div>

      {/* Lightning */}
      <div className="card card-hover">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">Lightning</p>
            <p className="text-3xl font-bold text-white">
              {data.lightning_count || 0}
            </p>
            <p className="text-xs text-slate-400">strikes today</p>
          </div>
          <Zap className="w-8 h-8 text-yellow-400" />
        </div>
        {data.lightning_distance && (
          <div className="text-xs text-slate-400">
            Last strike: {data.lightning_distance} miles
          </div>
        )}
      </div>
    </div>
  );
};

export { WeatherCard, CurrentWeather };

