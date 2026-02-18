import { useState } from 'react';
import { Droplets, Wind } from 'lucide-react';
import {
    formatTemp,
    formatHour,
    formatDay,
    getWeatherIcon,
    getWeatherDescription
} from '../utils/formatters';

const ForecastPanel = ({ forecast }) => {
    const [activeTab, setActiveTab] = useState('hourly');

    if (!forecast) {
        return (
            <div className="card h-full flex items-center justify-center">
                <p className="text-slate-400">Loading forecast...</p>
            </div>
        );
    }

    return (
        <div className="card h-full flex flex-col">
            {/* Tab Headers */}
            <div className="flex border-b border-dark-border mb-4">
                <button
                    onClick={() => setActiveTab('hourly')}
                    className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'hourly'
                            ? 'text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    Hourly
                    {activeTab === 'hourly' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('5day')}
                    className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${activeTab === '5day'
                            ? 'text-amber-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    5-Day
                    {activeTab === '5day' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'hourly' ? (
                    <HourlyForecast data={forecast.hourly} />
                ) : (
                    <DailyForecast data={forecast.daily} />
                )}
            </div>
        </div>
    );
};

const HourlyForecast = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-slate-400 text-sm">No hourly data available</p>;
    }

    return (
        <div className="overflow-y-auto max-h-[420px] pr-1 space-y-1 custom-scrollbar">
            {data.map((hour, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-dark-bg/50 transition-colors"
                >
                    <span className="text-sm text-slate-400 w-14 shrink-0">
                        {i === 0 ? 'Now' : formatHour(hour.time)}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">{getWeatherIcon(hour.weather_code)}</span>
                        <span className="text-sm text-slate-300 truncate">
                            {getWeatherDescription(hour.weather_code)}
                        </span>
                    </div>
                    {hour.precipitation_probability > 0 && (
                        <div className="flex items-center gap-1 text-xs text-cyan-400 w-12 justify-end shrink-0">
                            <Droplets className="w-3 h-3" />
                            {hour.precipitation_probability}%
                        </div>
                    )}
                    <span className="text-sm font-semibold text-white w-14 text-right shrink-0">
                        {formatTemp(hour.temp)}
                    </span>
                </div>
            ))}
        </div>
    );
};

const DailyForecast = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-slate-400 text-sm">No daily data available</p>;
    }

    return (
        <div className="space-y-2">
            {data.map((day, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-dark-bg/50 transition-colors"
                >
                    <span className="text-sm font-medium text-slate-300 w-20 shrink-0">
                        {formatDay(day.date)}
                    </span>
                    <span className="text-2xl">{getWeatherIcon(day.weather_code)}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                            {getWeatherDescription(day.weather_code)}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                            {day.precipitation_probability > 0 && (
                                <span className="flex items-center gap-1 text-xs text-cyan-400">
                                    <Droplets className="w-3 h-3" />
                                    {day.precipitation_probability}%
                                </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Wind className="w-3 h-3" />
                                {Math.round(day.wind_speed_max)} mph
                            </span>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-white">
                            {Math.round(day.temp_max)}°
                        </span>
                        <span className="text-sm text-slate-500 mx-1">/</span>
                        <span className="text-sm text-slate-400">
                            {Math.round(day.temp_min)}°
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ForecastPanel;
