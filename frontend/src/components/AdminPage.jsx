import { useState, useEffect } from 'react';
import {
    Settings, Clock, Database, MapPin, Waves, Trash2, Save,
    ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, HardDrive
} from 'lucide-react';
import { settingsApi } from '../services/api';

const AdminPage = ({ onBack, onNavigate }) => {
    const [settings, setSettings] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState({});
    const [toast, setToast] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [settingsRes, statsRes] = await Promise.all([
                settingsApi.getAll(),
                settingsApi.getStats()
            ]);
            setSettings(settingsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Error loading settings:', err);
            showToast('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleChange = (key, value) => {
        setDirty(prev => ({ ...prev, [key]: value }));
    };

    const getValue = (key) => {
        if (dirty[key] !== undefined) return dirty[key];
        return settings?.[key]?.value ?? '';
    };

    const handleSave = async () => {
        if (Object.keys(dirty).length === 0) return;
        try {
            setSaving(true);
            const res = await settingsApi.update(dirty);
            setSettings(res.data);
            setDirty({});
            showToast('Settings saved successfully');
        } catch (err) {
            console.error('Error saving settings:', err);
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePurge = async (type, label) => {
        if (!confirm(`Are you sure you want to delete all ${label} data? This cannot be undone.`)) return;
        try {
            await settingsApi.purge(type);
            showToast(`${label} data purged`);
            const statsRes = await settingsApi.getStats();
            setStats(statsRes.data);
        } catch (err) {
            showToast('Purge failed', 'error');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
        );
    }

    const hasDirty = Object.keys(dirty).length > 0;

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${toast.type === 'error'
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                    : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    }`}>
                    {toast.type === 'error'
                        ? <AlertTriangle className="w-4 h-4" />
                        : <CheckCircle className="w-4 h-4" />
                    }
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="border-b border-dark-border/50 bg-dark-bg sticky top-0 z-10 backdrop-blur-sm">
                <div className="max-w-[1000px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">Settings</h1>
                                <p className="text-xs text-slate-500">Administration & Configuration</p>
                            </div>
                        </div>
                        {hasDirty && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-amber-400 text-sm font-medium transition-all"
                            >
                                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-[1000px] mx-auto px-6 py-6 space-y-6">

                {/* Data Collection */}
                <SettingsSection
                    icon={<Clock className="w-5 h-5 text-amber-400" />}
                    title="Data Collection"
                    description="Control how frequently data is fetched from external sources"
                >
                    <SettingsField
                        label="Weather Collection Interval"
                        description="How often to poll the Ambient Weather API"
                        suffix="minutes"
                        type="number"
                        value={getValue('weather_collection_interval')}
                        onChange={v => handleChange('weather_collection_interval', v)}
                    />
                    <SettingsField
                        label="Lake Collection Interval"
                        description="How often to poll USGS water data"
                        suffix="minutes"
                        type="number"
                        value={getValue('lake_collection_interval')}
                        onChange={v => handleChange('lake_collection_interval', v)}
                    />
                </SettingsSection>

                {/* Data Retention */}
                <SettingsSection
                    icon={<Database className="w-5 h-5 text-cyan-400" />}
                    title="Data Retention"
                    description="Configure how long historical data is kept before automatic cleanup"
                >
                    <SettingsField
                        label="Weather Data Retention"
                        description="Days to keep weather readings"
                        suffix="days"
                        type="number"
                        value={getValue('data_retention_days')}
                        onChange={v => handleChange('data_retention_days', v)}
                    />
                    <SettingsField
                        label="Lake Data Retention"
                        description="Days to keep lake readings"
                        suffix="days"
                        type="number"
                        value={getValue('lake_retention_days')}
                        onChange={v => handleChange('lake_retention_days', v)}
                    />
                    <SettingsField
                        label="Alert History Retention"
                        description="Days to keep alert trigger history"
                        suffix="days"
                        type="number"
                        value={getValue('alert_history_retention_days')}
                        onChange={v => handleChange('alert_history_retention_days', v)}
                    />

                    {/* DB Stats */}
                    {stats && (
                        <div className="mt-4 pt-4 border-t border-dark-border/50">
                            <div className="flex items-center gap-2 mb-3">
                                <HardDrive className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-medium text-slate-400">Database Statistics</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatBadge label="Weather Records" value={stats.weather_records.toLocaleString()} />
                                <StatBadge label="Lake Records" value={stats.lake_records.toLocaleString()} />
                                <StatBadge label="Alert History" value={stats.alert_history_records.toLocaleString()} />
                                <StatBadge label="Database Size" value={`${stats.db_size_mb} MB`} />
                            </div>
                        </div>
                    )}
                </SettingsSection>

                {/* Location */}
                <SettingsSection
                    icon={<MapPin className="w-5 h-5 text-emerald-400" />}
                    title="Location"
                    description="Coordinates used for weather forecast API"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <SettingsField
                            label="Latitude"
                            type="number"
                            step="0.01"
                            value={getValue('latitude')}
                            onChange={v => handleChange('latitude', v)}
                        />
                        <SettingsField
                            label="Longitude"
                            type="number"
                            step="0.01"
                            value={getValue('longitude')}
                            onChange={v => handleChange('longitude', v)}
                        />
                    </div>
                </SettingsSection>

                {/* USGS Stations */}
                <SettingsSection
                    icon={<Waves className="w-5 h-5 text-blue-400" />}
                    title="USGS Stations"
                    description="Station IDs for lake and dam data from USGS Water Services"
                >
                    <SettingsField
                        label="Lake Station ID"
                        description="USGS station for lake elevation and storage"
                        value={getValue('lake_station_id')}
                        onChange={v => handleChange('lake_station_id', v)}
                    />
                    <SettingsField
                        label="Dam Station ID"
                        description="USGS station for outflow and water temperature"
                        value={getValue('dam_station_id')}
                        onChange={v => handleChange('dam_station_id', v)}
                    />
                    <SettingsField
                        label="Conservation Pool Level"
                        description="Reference level for conservation pool (ft MSL)"
                        suffix="ft"
                        type="number"
                        value={getValue('conservation_pool_level')}
                        onChange={v => handleChange('conservation_pool_level', v)}
                    />
                </SettingsSection>

                {/* Danger Zone */}
                <div className="card border-red-500/20">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Danger Zone</h3>
                            <p className="text-xs text-slate-500">Permanently delete stored data</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <PurgeButton
                            label="Purge Weather Data"
                            count={stats?.weather_records}
                            onClick={() => handlePurge('weather', 'weather')}
                        />
                        <PurgeButton
                            label="Purge Lake Data"
                            count={stats?.lake_records}
                            onClick={() => handlePurge('lake', 'lake')}
                        />
                        <PurgeButton
                            label="Purge Alert History"
                            count={stats?.alert_history_records}
                            onClick={() => handlePurge('alert_history', 'alert history')}
                        />
                        <PurgeButton
                            label="Purge All Data"
                            onClick={() => handlePurge('all', 'ALL')}
                            danger
                        />
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-dark-border/30 mt-8">
                <div className="max-w-[1000px] mx-auto px-6 py-5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <nav className="flex items-center gap-6">
                            <span className="text-sm font-semibold text-white">Kanopolanes</span>
                            <button
                                onClick={onBack}
                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => onNavigate && onNavigate('map')}
                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
                            >
                                Court Map
                            </button>
                            <button
                                onClick={() => onNavigate && onNavigate('discuss')}
                                className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
                            >
                                Discuss
                            </button>
                            <button
                                onClick={() => { }}
                                className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                            >
                                Settings
                            </button>
                        </nav>
                        <p className="text-xs text-slate-600">
                            Ambient Weather • USGS Water Data • Open-Meteo Forecast
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

/* ───── Sub-components ───── */

const SettingsSection = ({ icon, title, description, children }) => (
    <div className="card">
        <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-dark-bg flex items-center justify-center">
                {icon}
            </div>
            <div>
                <h3 className="text-sm font-bold text-white">{title}</h3>
                {description && <p className="text-xs text-slate-500">{description}</p>}
            </div>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const SettingsField = ({ label, description, value, onChange, type = 'text', suffix, step }) => (
    <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">{label}</label>
        {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}
        <div className="flex items-center gap-2">
            <input
                type={type}
                step={step}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
            />
            {suffix && (
                <span className="text-xs text-slate-500 w-16 shrink-0">{suffix}</span>
            )}
        </div>
    </div>
);

const StatBadge = ({ label, value }) => (
    <div className="bg-dark-bg rounded-lg p-2.5 text-center">
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
    </div>
);

const PurgeButton = ({ label, count, onClick, danger }) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <span className="text-sm text-slate-300">{label}</span>
            {count !== undefined && (
                <span className="text-xs text-slate-500 ml-2">({count.toLocaleString()} records)</span>
            )}
        </div>
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${danger
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 border border-dark-border'
                }`}
        >
            Purge
        </button>
    </div>
);

export default AdminPage;
