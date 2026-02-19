import { useState, useEffect } from 'react';
import { Waves, Thermometer, ArrowDownToLine, Activity, TrendingUp, Fish, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { lakeApi } from '../services/api';

const LakePanel = ({ data }) => {
    const [history, setHistory] = useState([]);
    const [timeRange, setTimeRange] = useState(168); // 7 days default
    const [fishingReport, setFishingReport] = useState(null);

    useEffect(() => {
        loadHistory();
        loadFishingReport();
    }, [timeRange]);

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
                            <p className="text-xs text-slate-500">USGS Real-time Data</p>
                        </div>
                    </div>
                    {data.last_updated && (
                        <span className="text-xs text-slate-500">
                            {new Date(data.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Pool Elevation + Gauge */}
                    <div className="bg-dark-bg rounded-xl p-4 col-span-2">
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
                </div>
            </div>

            {/* ═══ LAKE TRENDS ═══ */}
            {history.length > 1 && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-base font-bold text-white">Lake Trends</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {[{ label: '24h', hours: 24 }, { label: '3d', hours: 72 }, { label: '7d', hours: 168 }, { label: '30d', hours: 720 }].map(opt => (
                                <button key={opt.hours} onClick={() => setTimeRange(opt.hours)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${timeRange === opt.hours
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

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

                    {/* Outflow Chart */}
                    <div>
                        <p className="text-xs font-medium text-slate-400 mb-2">Dam Outflow (cfs)</p>
                        <ResponsiveContainer width="100%" height={140}>
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={45} />
                                <Tooltip {...chartTooltipStyle} formatter={(v) => [`${v} cfs`, 'Outflow']} />
                                <Area type="monotone" dataKey="outflow_cfs" stroke="#3b82f6" fill="url(#outflowGrad)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ═══ FISHING REPORT ═══ */}
            {fishingReport && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Fish className="w-4.5 h-4.5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Fishing Report</h3>
                                <p className="text-[10px] text-slate-500">{fishingReport.source}</p>
                            </div>
                        </div>
                        <a href={fishingReport.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                            KDWP <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                    <div className="bg-dark-bg rounded-xl p-4">
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                            {fishingReport.report}
                        </p>
                    </div>
                    {fishingReport.fetched_at && (
                        <p className="text-[10px] text-slate-600 mt-2 text-right">
                            Updated {new Date(fishingReport.fetched_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default LakePanel;
