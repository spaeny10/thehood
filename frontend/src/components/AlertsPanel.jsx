import { useState, useEffect } from 'react';
import { Bell, BellOff, Plus, Trash2, Edit, History } from 'lucide-react';
import { alertsApi } from '../services/api';

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    fetchAlertHistory();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await alertsApi.getAll();
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertHistory = async () => {
    try {
      const response = await alertsApi.getHistory(20);
      setAlertHistory(response.data);
    } catch (error) {
      console.error('Error fetching alert history:', error);
    }
  };

  const toggleAlert = async (id) => {
    try {
      await alertsApi.toggle(id);
      fetchAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const deleteAlert = async (id) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      await alertsApi.delete(id);
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const getConditionLabel = (condition) => {
    const labels = {
      greater_than: '>',
      less_than: '<',
      equal_to: '=',
    };
    return labels[condition] || condition;
  };

  const getTypeLabel = (type) => {
    const labels = {
      indoor_temp: 'Indoor Temp',
      outdoor_temp: 'Outdoor Temp',
      wind_speed: 'Wind Speed',
      rain_hourly: 'Hourly Rain',
      lightning_count: 'Lightning',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-slate-400">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-accent" />
            Active Alerts
          </h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-purple-accent hover:text-purple-light transition-colors"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-slate-400 text-sm">No alerts configured</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border transition-all ${
                  alert.enabled
                    ? 'border-purple-accent/30 bg-purple-accent/5'
                    : 'border-dark-border bg-dark-bg/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{alert.name}</span>
                      {alert.enabled ? (
                        <Bell className="w-4 h-4 text-purple-accent" />
                      ) : (
                        <BellOff className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {getTypeLabel(alert.type)} {getConditionLabel(alert.condition)}{' '}
                      {alert.threshold}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        alert.enabled
                          ? 'bg-purple-accent text-white hover:bg-purple-light'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {alert.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showHistory && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-accent" />
            Alert History
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alertHistory.length === 0 ? (
              <p className="text-slate-400 text-sm">No alert history</p>
            ) : (
              alertHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-dark-bg/50 border border-dark-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{item.alert_name}</p>
                      <p className="text-xs text-slate-400 mt-1">{item.message}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(item.triggered_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
