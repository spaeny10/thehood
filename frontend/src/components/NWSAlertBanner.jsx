import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { communityApi } from '../services/api';

const severityColors = {
    Extreme: { bg: 'bg-red-900/40', border: 'border-red-500/60', text: 'text-red-300', icon: 'text-red-400', badge: 'bg-red-500/30 text-red-300' },
    Severe: { bg: 'bg-red-900/30', border: 'border-red-500/40', text: 'text-red-200', icon: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
    Moderate: { bg: 'bg-amber-900/30', border: 'border-amber-500/40', text: 'text-amber-200', icon: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
    Minor: { bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', text: 'text-yellow-200', icon: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300' },
    Unknown: { bg: 'bg-slate-800/40', border: 'border-slate-500/30', text: 'text-slate-300', icon: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-300' },
};

const NWSAlertBanner = () => {
    const [alerts, setAlerts] = useState([]);
    const [dismissed, setDismissed] = useState(new Set());
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        loadAlerts();
        const interval = setInterval(loadAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadAlerts = async () => {
        try {
            const res = await communityApi.getNWSAlerts();
            setAlerts(res.data?.alerts || []);
        } catch (err) {
            console.error('Error loading NWS alerts:', err);
        }
    };

    const activeAlerts = alerts.filter(a => !dismissed.has(a.id));
    if (activeAlerts.length === 0) return null;

    return (
        <div className="space-y-2 mb-4">
            {activeAlerts.map(alert => {
                const colors = severityColors[alert.severity] || severityColors.Unknown;
                const isExpanded = expanded === alert.id;
                return (
                    <div key={alert.id} className={`${colors.bg} ${colors.border} border rounded-xl p-3`}>
                        <div className="flex items-start gap-3">
                            <AlertTriangle className={`w-5 h-5 ${colors.icon} shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-sm font-bold ${colors.text}`}>{alert.event}</span>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                                        {alert.severity}
                                    </span>
                                </div>
                                {alert.headline && (
                                    <p className={`text-xs ${colors.text} opacity-80 mt-1`}>{alert.headline}</p>
                                )}
                                {isExpanded && alert.description && (
                                    <p className="text-xs text-slate-300 mt-2 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                                        {alert.description}
                                    </p>
                                )}
                                <button
                                    onClick={() => setExpanded(isExpanded ? null : alert.id)}
                                    className="text-[10px] text-slate-400 hover:text-slate-300 mt-1 cursor-pointer"
                                    style={{ background: 'none', border: 'none', padding: 0 }}
                                >
                                    {isExpanded ? 'Show less' : 'Show details'}
                                </button>
                            </div>
                            <button
                                onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                                className="text-slate-500 hover:text-slate-300 shrink-0 cursor-pointer"
                                style={{ background: 'none', border: 'none', padding: 0 }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {alert.expires && (
                            <p className="text-[10px] text-slate-500 mt-1 ml-8">
                                Expires {new Date(alert.expires).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default NWSAlertBanner;
