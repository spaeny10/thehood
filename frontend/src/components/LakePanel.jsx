import { useState, useEffect } from 'react';
import { Waves, Thermometer, ArrowDownToLine, ArrowUpFromLine, Activity, TrendingUp, Fish, ExternalLink, ChevronDown, Wind, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { lakeApi } from '../services/api';

const LakePanel = ({ data }) => {
    const [history, setHistory] = useState([]);
    const [timeRange, setTimeRange] = useState(99999); // all time default
    const [fishingReport, setFishingReport] = useState(null);
    const [trendsOpen, setTrendsOpen] = useState(false);
    const [fishingOpen, setFishingOpen] = useState(false);
    const [forecast, setForecast] = useState(null);
    const [forecastOpen, setForecastOpen] = useState(true);

    useEffect(() => {
        loadHistory();
        loadFishingReport();
        loadForecast();
    }, [timeRange]);

    const loadForecast = async () => {
        try {
            const res = await lakeApi.getForecast();
            setForecast(res.data);
        } catch (err) {
            console.error('Error loading lake forecast:', err);
        }
    };

    const loadFishingReport = async () => {
        try {
            const res = await lakeApi.getFishingReport();
            setFishingReport(res.data);
        } catch (err) {
            console.error('Error loading fishing report:', err);
        }
    };

    const loadHistory = async () => {
        try {
            const res = await lakeApi.getHistorical(timeRange);
            // Reverse so oldest first for charts, and format timestamps
            const formatted = (res.data || []).reverse().map(row => ({
                ...row,
                time: new Date(Number(row.timestamp)).toLocaleDateString([], { month: 'short', day: 'numeric' }) +
                    ' ' + new Date(Number(row.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            setHistory(formatted);
        } catch (err) {
            console.error('Error loading lake history:', err);
        }
    };

    const chartTooltipStyle = {
        contentStyle: { background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 },
        labelStyle: { color: '#94a3b8' },
    };

    if (!data) {
        return (
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <Waves className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold text-white">Kanopolis Lake</h3>
                </div>
                <p className="text-slate-400 text-sm">Loading lake data...</p>
            </div>
        );
    }

    const diffAbs = data.level_diff != null ? Math.abs(data.level_diff) : null;
    const isBelow = data.level_diff != null && data.level_diff < 0;
    const isAbove = data.level_diff != null && data.level_diff > 0;

    // Summer pool: lake is typically held 4ft above conservation in summer
    const summerPool = data.conservation_level + 4;
    const summerDiff = data.elevation != null ? data.elevation - summerPool : null;
    const summerDiffAbs = summerDiff != null ? Math.abs(summerDiff) : null;
    const isSummer = (() => { const m = new Date().getMonth(); return m >= 4 && m <= 9; })(); // May–Oct

    // Gauge: map elevation to percentage (conservation pool = 100%, conservation - 10ft = 0%)
    const gaugeMin = data.conservation_level - 10;
    const gaugeRange = 10;
    const levelPercent = data.elevation
        ? Math.max(0, Math.min(100, ((data.elevation - gaugeMin) / gaugeRange) * 100))
        : 0;

    return (
        <div className="space-y-4">
            <div className="card">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <Waves className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{data.name || 'Kanopolis Lake'}</h3>
                            <p className="text-xs text-slate-500">USGS & Corps of Engineers Data</p>
                        </div>
                    </div>
                    {data.last_updated && (
                        <span className="text-xs text-slate-500">
                            {new Date(data.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Pool Elevation + Gauge */}
                    <div className="bg-dark-bg rounded-xl p-4 col-span-2 lg:col-span-3">
                        <div className="flex justify-between items-baseline mb-3">
                            <div className="flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-medium text-slate-400">Pool Elevation</span>
                            </div>
                            <span className="text-2xl font-bold text-white">
                                {data.elevation?.toFixed(2) ?? '--'}
                                <span className="text-xs text-slate-500 ml-1">ft</span>
                            </span>
                        </div>

                        {/* Visual gauge bar */}
                        <div className="relative w-full h-3 bg-slate-800/80 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${levelPercent}%`,
                                    background: isBelow
                                        ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                                        : 'linear-gradient(90deg, #06b6d4, #22d3ee)',
                                }}
                            />
                        </div>

                        <div className="flex justify-between items-center text-xs">
                            <span className={`font-semibold ${isBelow ? 'text-amber-400' : isAbove ? 'text-cyan-400' : 'text-emerald-400'}`}>
                                {diffAbs != null
                                    ? `${diffAbs.toFixed(2)} ft ${isBelow ? 'below' : isAbove ? 'above' : 'at'} conservation`
                                    : '--'}
                            </span>
                            <span className="text-slate-500">
                                Conservation: {data.conservation_level} ft
                            </span>
                        </div>
                        {isSummer && summerDiffAbs != null && (
                            <div className="mt-2 text-xs">
                                <span className={`font-semibold ${summerDiff < 0 ? 'text-amber-400' : summerDiff > 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                                    {summerDiffAbs.toFixed(2)} ft {summerDiff < 0 ? 'below' : summerDiff > 0 ? 'above' : 'at'} summer pool
                                </span>
                                <span className="text-slate-500 ml-2">Summer Pool: {summerPool} ft</span>
                            </div>
                        )}
                    </div>

                    {/* Water Temperature */}
                    <div className="bg-dark-bg rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Thermometer className="w-4 h-4 text-orange-400" />
                            <span className="text-xs font-medium text-slate-400">Water Temp</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {data.water_temp_f != null ? `${data.water_temp_f}°` : '--'}
                            <span className="text-xs text-slate-500 ml-1">F</span>
                        </p>
                        {data.water_temp_c != null && (
                            <p className="text-xs text-slate-500 mt-1">{data.water_temp_c}°C</p>
                        )}
                        <p className="text-[10px] text-slate-600 mt-1">
                            {data.water_temp_source === 'kdwp' ? 'Corps of Engineers' : data.water_temp_source === 'usgs' ? 'USGS Dam Station' : ''}
                        </p>
                    </div>

                    {/* Dam Outflow */}
                    <div className="bg-dark-bg rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <ArrowDownToLine className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-medium text-slate-400">Dam Outflow</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {data.outflow_cfs != null ? data.outflow_cfs : '--'}
                            <span className="text-xs text-slate-500 ml-1">cfs</span>
                        </p>
                        {data.storage_acre_ft != null && (
                            <p className="text-xs text-slate-500 mt-1">
                                {data.storage_acre_ft.toLocaleString()} acre-ft storage
                            </p>
                        )}
                    </div>

                    {/* Inflow */}
                    <div className="bg-dark-bg rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <ArrowUpFromLine className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-medium text-slate-400">Inflow</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {data.inflow_cfs != null ? Math.round(data.inflow_cfs * 100) / 100 : '--'}
                            <span className="text-xs text-slate-500 ml-1">cfs</span>
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1">Corps of Engineers</p>
                    </div>

                    {/* Surface Wind */}
                    <div className="bg-dark-bg rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Wind className="w-4 h-4 text-teal-400" />
                            <span className="text-xs font-medium text-slate-400">Surface Wind</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {data.surface_wind_mph != null ? data.surface_wind_mph : '--'}
                            <span className="text-xs text-slate-500 ml-1">mph</span>
                        </p>
                        {data.surface_wind_dir != null && (
                            <p className="text-xs text-slate-500 mt-1">
                                {['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(data.surface_wind_dir / 22.5) % 16]}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ 72-HOUR LAKE FORECAST ═══ */}
            {forecast && (
                <div className="card">
                    <button onClick={() => setForecastOpen(!forecastOpen)} className="flex items-center justify-between w-full cursor-pointer" style={{ background: 'none', border: 'none', padding: 0 }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <BarChart3 className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-bold text-white">5-Day Lake Forecast</h3>
                                <p className="text-[10px] text-slate-500">
                                    Based on {forecast.gauge_status?.length || 0} upstream gauges
                                    {forecast.generated_at && ` • ${new Date(forecast.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                forecast.trend === 'rising' ? 'bg-amber-500/20 text-amber-400' :
                                forecast.trend === 'falling' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-emerald-500/20 text-emerald-400'
                            }`}>
                                {forecast.trend === 'rising' ? 'Rising' : forecast.trend === 'falling' ? 'Falling' : 'Stable'}
                            </span>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${forecastOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {forecastOpen && (
                        <div className="mt-4">
                            {/* Key metrics row */}
                            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                                <div className="bg-dark-bg rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-slate-500 mb-1">Now</p>
                                    <p className="text-lg font-bold text-white">{forecast.current_elevation?.toFixed(2)}</p>
                                    <p className="text-[10px] text-slate-500">ft</p>
                                </div>
                                {[
                                    { label: 'Day 1', key: 'predicted_elevation_24h' },
                                    { label: 'Day 2', key: 'predicted_elevation_48h' },
                                    { label: 'Day 3', key: 'predicted_elevation_72h' },
                                    { label: 'Day 4', key: 'predicted_elevation_96h' },
                                    { label: 'Day 5', key: 'predicted_elevation_120h', highlight: true },
                                ].map(({ label, key, highlight }) => (
                                    <div key={key} className="bg-dark-bg rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-slate-500 mb-1">{label}</p>
                                        <p className={`text-lg font-bold ${highlight ? 'text-violet-400' : 'text-white'}`}>
                                            {forecast[key]?.toFixed(2) ?? '--'}
                                        </p>
                                        <p className="text-[10px] text-slate-500">ft</p>
                                    </div>
                                ))}
                            </div>
                            {forecast.elevation_change_120h != null && (
                                <p className="text-xs text-center mb-4">
                                    <span className={`font-semibold ${forecast.elevation_change_120h > 0 ? 'text-amber-400' : forecast.elevation_change_120h < 0 ? 'text-blue-400' : 'text-emerald-400'}`}>
                                        {forecast.elevation_change_120h > 0 ? '+' : ''}{forecast.elevation_change_120h.toFixed(3)} ft over 5 days
                                    </span>
                                </p>
                            )}

                            {/* Forecast elevation chart */}
                            {forecast.forecast_points?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-medium text-slate-400 mb-2">Predicted Elevation (ft)</p>
                                    <ResponsiveContainer width="100%" height={180}>
                                        <AreaChart data={forecast.forecast_points.map(p => ({
                                            ...p,
                                            time: `+${p.hour}h`,
                                            label: p.hour % 24 === 0 ? `Day ${p.hour / 24}` : '',
                                        }))}>
                                            <defs>
                                                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval={23} />
                                            <YAxis domain={['dataMin - 0.05', 'dataMax + 0.05']} tick={{ fontSize: 10, fill: '#64748b' }} width={55} />
                                            <Tooltip
                                                {...chartTooltipStyle}
                                                labelFormatter={(_, payload) => payload?.[0]?.payload?.time || ''}
                                                formatter={(v) => [`${Number(v).toFixed(3)} ft`, 'Elevation']}
                                            />
                                            <ReferenceLine y={forecast.conservation_level} stroke="#64748b" strokeDasharray="4 4" label={{ value: 'Conservation', fill: '#64748b', fontSize: 10, position: 'left' }} />
                                            <Area type="monotone" dataKey="predicted_elevation" stroke="#8b5cf6" fill="url(#forecastGrad)" strokeWidth={2} dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Upstream gauge status */}
                            {forecast.gauge_status?.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-slate-400 mb-2">Upstream Gauge Network</p>
                                    <div className="space-y-1.5">
                                        {forecast.gauge_status.map(g => (
                                            <div key={g.id} className="flex items-center justify-between bg-dark-bg rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${g.is_terminal ? 'bg-violet-400' : 'bg-slate-500'}`} />
                                                    <span className="text-xs text-slate-300">{g.name}</span>
                                                    <span className="text-[10px] text-slate-600">{g.river}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-white">{g.flow_cfs != null ? `${g.flow_cfs} cfs` : '--'}</span>
                                                    {g.travel_hours > 0 && (
                                                        <span className="text-[10px] text-slate-500">~{g.travel_hours}h to dam</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {forecast.surges?.length > 0 && (
                                        <div className="mt-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            <p className="text-xs text-amber-400 font-semibold">Upstream Surge Detected</p>
                                            {forecast.surges.map((s, i) => (
                                                <p key={i} className="text-[11px] text-amber-300/80 mt-1">
                                                    {s.gauge}: +{s.excess_cfs} cfs arriving in ~{s.arrival_hours}h
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Confidence note */}
                            <p className="text-[10px] text-slate-600 mt-3 text-center">
                                Confidence: High (0-24h) / Medium (1-3 days) / Low (3-5 days)
                                {forecast.precip_total_inches > 0 && ` • ${forecast.precip_total_inches.toFixed(2)}" rain forecast`}
                                {forecast.calibration?.calibrated_at
                                    ? ` • Self-calibrated model (${((forecast.calibration.accuracy_score || 0) * 100).toFixed(0)}% accuracy, ${forecast.calibration.data_points} data points)`
                                    : ' • Using default parameters (calibrating after 2 weeks of data)'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ LAKE TRENDS ═══ */}
            <div className="card">
                <button onClick={() => setTrendsOpen(!trendsOpen)} className="flex items-center justify-between w-full mb-0 cursor-pointer" style={{ background: 'none', border: 'none', padding: 0 }}>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-base font-bold text-white">Lake Trends</h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${trendsOpen ? 'rotate-180' : ''}`} />
                </button>
                {trendsOpen && (
                    <div>
                        <div className="flex items-center justify-end gap-1 mt-3 mb-4">
                            {[{ label: '24h', hours: 24 }, { label: '3d', hours: 72 }, { label: '7d', hours: 168 }, { label: '30d', hours: 720 }, { label: 'All', hours: 99999 }].map(opt => (
                                <button key={opt.hours} onClick={() => setTimeRange(opt.hours)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === opt.hours
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {history.length > 1 ? (
                            <>
                                {/* Elevation Chart */}
                                <div className="mb-6">
                                    <p className="text-xs font-medium text-slate-400 mb-2">Pool Elevation (ft)</p>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <AreaChart data={history}>
                                            <defs>
                                                <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                                            <YAxis domain={['dataMin - 0.1', 'dataMax + 0.1']} tick={{ fontSize: 10, fill: '#64748b' }} width={55} />
                                            <Tooltip {...chartTooltipStyle} formatter={(v) => [`${Number(v).toFixed(2)} ft`, 'Elevation']} />
                                            <Area type="monotone" dataKey="elevation" stroke="#06b6d4" fill="url(#elevGrad)" strokeWidth={2} dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Water Temp Chart */}
                                <div className="mb-6">
                                    <p className="text-xs font-medium text-slate-400 mb-2">Water Temperature (°F)</p>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <LineChart data={history}>
                                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                                            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: '#64748b' }} width={35} />
                                            <Tooltip {...chartTooltipStyle} formatter={(v) => [`${Number(v).toFixed(1)}°F`, 'Water Temp']} />
                                            <Line type="monotone" dataKey="water_temp_f" stroke="#f97316" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Inflow / Outflow Chart */}
                                <div className="mb-6">
                                    <p className="text-xs font-medium text-slate-400 mb-2">Inflow & Outflow (cfs)</p>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <AreaChart data={history}>
                                            <defs>
                                                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={45} />
                                            <Tooltip {...chartTooltipStyle} formatter={(v, name) => [`${v} cfs`, name === 'inflow_cfs' ? 'Inflow' : 'Outflow']} />
                                            <Area type="monotone" dataKey="inflow_cfs" stroke="#10b981" fill="url(#inflowGrad)" strokeWidth={2} dot={false} />
                                            <Area type="monotone" dataKey="outflow_cfs" stroke="#3b82f6" fill="url(#outflowGrad)" strokeWidth={2} dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Surface Wind Chart */}
                                <div>
                                    <p className="text-xs font-medium text-slate-400 mb-2">Surface Wind (mph)</p>
                                    <ResponsiveContainer width="100%" height={140}>
                                        <LineChart data={history}>
                                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={35} />
                                            <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v} mph`, 'Wind']} />
                                            <Line type="monotone" dataKey="surface_wind_mph" stroke="#14b8a6" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-8">No trend data available yet — the lake collector will populate this automatically.</p>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ FISHING REPORT ═══ */}
            {fishingReport && (
                <div className="card">
                    <button onClick={() => setFishingOpen(!fishingOpen)} className="flex items-center justify-between w-full cursor-pointer" style={{ background: 'none', border: 'none', padding: 0 }}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Fish className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-base font-bold text-white">Fishing Report</h3>
                                <p className="text-[10px] text-slate-500">
                                    {fishingReport.source}{fishingReport.updated_date ? ` • Updated ${fishingReport.updated_date}` : ''}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${fishingOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {fishingOpen && (
                        <div className="mt-4">
                            {/* Species Table */}
                            {fishingReport.species && fishingReport.species.length > 0 && (
                                <div className="space-y-2">
                                    {fishingReport.species.map((fish, i) => (
                                        <div key={i} className="bg-dark-bg rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-semibold text-white">{fish.name}</span>
                                                <div className="flex items-center gap-2">
                                                    {fish.size && <span className="text-[11px] text-slate-400">{fish.size}</span>}
                                                    {fish.rating && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fish.rating.toLowerCase() === 'good'
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : fish.rating.toLowerCase() === 'fair'
                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                : fish.rating.toLowerCase() === 'excellent'
                                                                    ? 'bg-cyan-500/20 text-cyan-400'
                                                                    : 'bg-slate-500/20 text-slate-400'
                                                            }`}>
                                                            {fish.rating}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {fish.details && (
                                                <p className="text-xs text-slate-400 leading-relaxed">{fish.details}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Footer with link */}
                            <div className="flex items-center justify-between mt-3">
                                <a href={fishingReport.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                                    Full report on KDWP <ExternalLink className="w-3 h-3" />
                                </a>
                                {fishingReport.fetched_at && (
                                    <p className="text-[10px] text-slate-600">
                                        Fetched {new Date(fishingReport.fetched_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LakePanel;
