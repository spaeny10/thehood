import { Thermometer, Droplets, Wind, CloudRain, Zap, Gauge, BatteryFull, BatteryLow, Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { formatTemp, formatHumidity, formatWind, formatRain, formatDateTime, getWindDirection } from '../utils/formatters';

const ConditionRow = ({ icon: Icon, iconColor, label, sublabel, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-dark-border/40 last:border-0">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${iconColor}15` }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {sublabel && <p className="text-[10px] text-slate-500">{sublabel}</p>}
      </div>
    </div>
    <p className="text-base font-bold text-white">{value}</p>
  </div>
);

const CurrentWeather = ({ data, sunMoonData }) => {
  if (!data) {
    return (
      <div className="card">
        <p className="text-slate-400">Loading weather data...</p>
      </div>
    );
  }

  const battValue = data.battery_outdoor;
  const battLow = battValue === 1;
  const battUnknown = battValue === null || battValue === undefined;

  return (
    <div className="card">
      {/* Hero Temperature */}
      <div className="text-center pb-5 border-b border-dark-border/40">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Right Now</p>
        <div className="flex items-center justify-center gap-2">
          <Thermometer className="w-10 h-10 text-amber-400" />
          <p className="text-6xl font-bold text-white">{formatTemp(data.outdoor_temp)}</p>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Feels like {formatTemp(data.feels_like)}
        </p>
      </div>

      {/* Condition Rows */}
      <div className="mt-2">
        <ConditionRow
          icon={CloudRain}
          iconColor="#38bdf8"
          label="Rain"
          sublabel={`Daily: ${formatRain(data.rain_daily)} · Monthly: ${formatRain(data.rain_monthly)}`}
          value={formatRain(data.rain_hourly) + '/hr'}
        />
        <ConditionRow
          icon={Wind}
          iconColor="#a78bfa"
          label="Wind & Gusts"
          sublabel={`From ${getWindDirection(data.wind_direction)} (${data.wind_direction}°)`}
          value={`${formatWind(data.wind_speed)} | ${formatWind(data.wind_gust)}`}
        />
        <ConditionRow
          icon={Droplets}
          iconColor="#06b6d4"
          label="Humidity"
          value={formatHumidity(data.outdoor_humidity)}
        />
        <ConditionRow
          icon={Thermometer}
          iconColor="#64748b"
          label="Dew Point"
          value={formatTemp(data.dew_point)}
        />
        <ConditionRow
          icon={Gauge}
          iconColor="#818cf8"
          label="Pressure"
          value={data.pressure ? data.pressure.toFixed(2) + '"' : '--'}
        />
        <ConditionRow
          icon={Zap}
          iconColor="#facc15"
          label="Lightning"
          sublabel={data.lightning_distance ? `Last strike: ${data.lightning_distance} mi` : null}
          value={`${data.lightning_count || 0} strikes`}
        />

        {/* Sun/Moon inline rows */}
        {sunMoonData && (
          <>
            <ConditionRow
              icon={Sunrise}
              iconColor="#f59e0b"
              label="Sunrise"
              value={sunMoonData.sunrise ? new Date(sunMoonData.sunrise).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--'}
            />
            <ConditionRow
              icon={Sunset}
              iconColor="#ea580c"
              label="Sunset"
              sublabel={sunMoonData.day_length ? `Daylight: ${sunMoonData.day_length}` : null}
              value={sunMoonData.sunset ? new Date(sunMoonData.sunset).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '--'}
            />
            <div className="flex items-center justify-between py-3 border-b border-dark-border/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
                  {sunMoonData.moon_emoji || '🌙'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{sunMoonData.moon_phase}</p>
                  <p className="text-[10px] text-slate-500">{sunMoonData.moon_illumination}% illuminated</p>
                </div>
              </div>
            </div>
          </>
        )}
        <ConditionRow
          icon={battLow ? BatteryLow : BatteryFull}
          iconColor={battUnknown ? '#64748b' : battLow ? '#f87171' : '#34d399'}
          label="Outdoor Sensor"
          value={battUnknown ? 'N/A' : battLow ? 'LOW' : 'OK'}
        />
      </div>

      {/* Last updated */}
      <p className="text-[10px] text-slate-600 text-center mt-3">
        Updated {formatDateTime(data.timestamp)}
      </p>
    </div>
  );
};

export { CurrentWeather };
