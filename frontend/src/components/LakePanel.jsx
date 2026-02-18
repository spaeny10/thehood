import { Waves, Thermometer, ArrowDownToLine, Droplets, Activity } from 'lucide-react';

const LakePanel = ({ data }) => {
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
    );
};

export default LakePanel;
