import { useState, useEffect } from 'react';
import { Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { communityApi } from '../services/api';

const SunMoonCard = () => {
    const [data, setData] = useState(null);

    useEffect(() => {
        loadData();
        // Refresh every 30 minutes
        const interval = setInterval(loadData, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const res = await communityApi.getSunMoon();
            setData(res.data);
        } catch (err) {
            console.error('Error loading sun/moon data:', err);
        }
    };

    if (!data) return null;

    const formatTime = (isoString) => {
        if (!isoString) return '--';
        return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="card">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Sunrise */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Sunrise className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sunrise</p>
                        <p className="text-lg font-bold text-white">{formatTime(data.sunrise)}</p>
                    </div>
                </div>

                {/* Sunset */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Sunset className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Sunset</p>
                        <p className="text-lg font-bold text-white">{formatTime(data.sunset)}</p>
                    </div>
                </div>

                {/* Day Length */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Daylight</p>
                        <p className="text-lg font-bold text-white">{data.day_length || '--'}</p>
                    </div>
                </div>

                {/* Moon Phase */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl">
                        {data.moon_emoji || '🌙'}
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Moon</p>
                        <p className="text-sm font-bold text-white">{data.moon_phase}</p>
                        <p className="text-[10px] text-slate-500">{data.moon_illumination}% lit</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SunMoonCard;
