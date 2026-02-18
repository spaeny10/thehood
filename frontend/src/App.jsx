import { useState, useEffect } from 'react';
import { Cloud, RefreshCw, Settings, Map, MessageCircle, LogIn, X, UserPlus } from 'lucide-react';
import { CurrentWeather } from './components/WeatherCard';
import WeatherChart from './components/WeatherChart';
import AlertsPanel from './components/AlertsPanel';
import ForecastPanel from './components/ForecastPanel';
import LakePanel from './components/LakePanel';
import AdminPage from './components/AdminPage';
import CourtMap from './components/CourtMap';
import DiscussPage from './components/DiscussPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { weatherApi, forecastApi, lakeApi } from './services/api';

function AppContent() {
  const [page, setPage] = useState('dashboard');
  const { user, isLoggedIn, isAdmin, loginFacebook, loginLocal, register, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');  // 'login' or 'register'
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({ username: '', password: '', name: '', email: '' });
  const [currentWeather, setCurrentWeather] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [lakeData, setLakeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);

      const [currentResponse, historicalResponse, forecastResponse, lakeResponse] = await Promise.all([
        weatherApi.getCurrent(),
        weatherApi.getHistorical(24, 100),
        forecastApi.get().catch(err => {
          console.error('Error fetching forecast:', err);
          return null;
        }),
        lakeApi.get().catch(err => {
          console.error('Error fetching lake data:', err);
          return null;
        })
      ]);

      setCurrentWeather(currentResponse.data);
      setHistoricalData(historicalResponse.data);
      if (forecastResponse) setForecast(forecastResponse.data);
      if (lakeResponse) setLakeData(lakeResponse.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Admin page
  if (page === 'admin') {
    return <AdminPage onBack={() => setPage('dashboard')} onNavigate={setPage} />;
  }

  // Court Map page
  if (page === 'map') {
    return <CourtMap onNavigate={setPage} />;
  }

  // Discuss page
  if (page === 'discuss') {
    return <DiscussPage onNavigate={setPage} />;
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border/50 bg-dark-bg sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Kanopolanes</h1>
                <p className="text-xs text-slate-500">Personal Weather Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdate && (
                <span className="text-xs text-slate-500">
                  {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={fetchWeatherData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-40 rounded-xl transition-all text-amber-400 text-sm font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setPage('map')}
                className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-dark-border flex items-center justify-center transition-colors"
                title="Court Map"
              >
                <Map className="w-4.5 h-4.5 text-slate-400" />
              </button>
              <button
                onClick={() => setPage('discuss')}
                className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-dark-border flex items-center justify-center transition-colors"
                title="Discuss"
              >
                <MessageCircle className="w-4.5 h-4.5 text-slate-400" />
              </button>
              <button
                onClick={() => setPage('admin')}
                className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-dark-border flex items-center justify-center transition-colors"
                title="Settings"
              >
                <Settings className="w-4.5 h-4.5 text-slate-400" />
              </button>
              {isLoggedIn ? (
                <button onClick={logout} className="flex items-center gap-2 ml-1" title={`${user.name} (${user.role})`}>
                  {user.profile_pic ? (
                    <img src={user.profile_pic} alt="" className="w-8 h-8 rounded-full border border-dark-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 text-xs font-bold border border-amber-500/20">
                      {user.name?.charAt(0)}
                    </div>
                  )}
                </button>
              ) : (
                <button onClick={() => { setShowAuthModal(true); setAuthError(''); setAuthMode('login'); setAuthForm({ username: '', password: '', name: '', email: '' }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-medium transition-all">
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
          <div className="bg-[#1a1d23] border border-dark-border rounded-2xl p-6 w-[380px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {authError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{authError}</div>}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAuthError('');
              try {
                if (authMode === 'login') {
                  await loginLocal(authForm.username, authForm.password);
                } else {
                  await register(authForm.username, authForm.password, authForm.name, authForm.email);
                }
                setShowAuthModal(false);
              } catch (err) { setAuthError(err.message); }
            }} className="space-y-3">

              {authMode === 'register' && (
                <>
                  <input type="text" placeholder="Display Name" required value={authForm.name}
                    onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-dark-border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/40" />
                  <input type="email" placeholder="Email (optional)" value={authForm.email}
                    onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-800/50 border border-dark-border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/40" />
                </>
              )}

              <input type="text" placeholder="Username" required value={authForm.username}
                onChange={e => setAuthForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-dark-border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/40" />
              <input type="password" placeholder="Password" required value={authForm.password}
                onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-dark-border rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/40" />

              <button type="submit" className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                {authMode === 'login' ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
              </button>
            </form>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-dark-border" />
              <span className="text-xs text-slate-500">or</span>
              <div className="flex-1 h-px bg-dark-border" />
            </div>

            <button onClick={() => { loginFacebook(); setShowAuthModal(false); }}
              className="mt-4 w-full py-2.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 text-[#1877F2] font-medium rounded-xl text-sm transition-colors">
              Continue with Facebook
            </button>

            <p className="mt-4 text-center text-xs text-slate-500">
              {authMode === 'login' ? (
                <>Don't have an account? <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-amber-400 hover:underline">Sign up</button></>
              ) : (
                <>Already have an account? <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-amber-400 hover:underline">Sign in</button></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        <div className="space-y-6">

          {/* Lake Conditions — Top Section */}
          <section>
            <LakePanel data={lakeData} />
          </section>

          {/* Current Weather + Forecast */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Current Conditions</h2>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 min-w-0">
                {loading && !currentWeather ? (
                  <div className="card">
                    <p className="text-slate-400">Loading weather data...</p>
                  </div>
                ) : (
                  <CurrentWeather data={currentWeather} />
                )}
              </div>
              <div className="w-full lg:w-[380px] shrink-0">
                <ForecastPanel forecast={forecast} />
              </div>
            </div>
          </section>

          {/* Historical Charts */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4">24-Hour Trends</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WeatherChart
                data={historicalData}
                dataKeys={[
                  { key: 'outdoor_temp', name: 'Outdoor', color: '#f59e0b' },
                  { key: 'indoor_temp', name: 'Indoor', color: '#fbbf24' },
                ]}
                title="Temperature"
                yAxisLabel="°F"
              />
              <WeatherChart
                data={historicalData}
                dataKeys={[
                  { key: 'outdoor_humidity', name: 'Outdoor', color: '#06b6d4' },
                  { key: 'indoor_humidity', name: 'Indoor', color: '#67e8f9' },
                ]}
                title="Humidity"
                yAxisLabel="%"
              />
              <WeatherChart
                data={historicalData}
                dataKeys={[
                  { key: 'wind_speed', name: 'Speed', color: '#a78bfa' },
                  { key: 'wind_gust', name: 'Gusts', color: '#c4b5fd' },
                ]}
                title="Wind"
                yAxisLabel="mph"
              />
              <WeatherChart
                data={historicalData}
                dataKeys={[
                  { key: 'rain_hourly', name: 'Hourly', color: '#38bdf8' },
                ]}
                title="Rainfall"
                yAxisLabel="inches"
              />
            </div>
          </section>

          {/* Alerts */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Alerts</h2>
            <AlertsPanel />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border/30 mt-8">
        <div className="max-w-[1440px] mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <nav className="flex items-center gap-6">
              <span className="text-sm font-semibold text-white">Kanopolanes</span>
              <button
                onClick={() => { }}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => setPage('map')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
              >
                Court Map
              </button>
              <button
                onClick={() => setPage('discuss')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
              >
                Discuss
              </button>
              <button
                onClick={() => setPage('admin')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
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
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
