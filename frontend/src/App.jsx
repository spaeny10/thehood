import { useState, useEffect } from 'react';
import { Cloud, RefreshCw, Settings, Map, MessageCircle, LogIn, X, UserPlus, Menu, ChevronDown, TrendingUp } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trendRange, setTrendRange] = useState(24);
  const [weatherTrendsOpen, setWeatherTrendsOpen] = useState(false);

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHistoricalData();
  }, [trendRange]);

  const fetchHistoricalData = async () => {
    try {
      const limit = trendRange <= 24 ? 100 : trendRange <= 168 ? 500 : 2000;
      const res = await weatherApi.getHistorical(trendRange, limit);
      setHistoricalData(res.data);
    } catch (err) {
      console.error('Error fetching historical weather:', err);
    }
  };

  const fetchWeatherData = async () => {
    try {
      setLoading(true);

      const [currentResponse, forecastResponse, lakeResponse] = await Promise.all([
        weatherApi.getCurrent(),
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
      if (forecastResponse) setForecast(forecastResponse.data);
      if (lakeResponse) setLakeData(lakeResponse.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Admin page (admin only)
  if (page === 'admin') {
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center">
          <div className="card text-center max-w-sm">
            <Settings className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Admin Access Required</h2>
            <p className="text-sm text-slate-400 mb-4">You need to sign in with an admin account to access settings.</p>
            <button onClick={() => setPage('dashboard')} className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-amber-400 text-sm font-medium transition-all">Back to Dashboard</button>
          </div>
        </div>
      );
    }
    return <AdminPage onBack={() => setPage('dashboard')} onNavigate={setPage} currentWeather={currentWeather} />;
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Kanopolanes</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">Personal Weather Dashboard</p>
              </div>
            </div>

            {/* Desktop nav (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-3">
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
              <button onClick={() => setPage('map')} className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-dark-border flex items-center justify-center transition-colors" title="Court Map">
                <Map className="w-4.5 h-4.5 text-slate-400" />
              </button>
              <button onClick={() => setPage('discuss')} className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-dark-border flex items-center justify-center transition-colors" title="Discuss">
                <MessageCircle className="w-4.5 h-4.5 text-slate-400" />
              </button>
              <button onClick={() => setPage('admin')} className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-dark-border flex items-center justify-center transition-colors" title="Settings">
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

            {/* Mobile: refresh + hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={fetchWeatherData}
                disabled={loading}
                className="w-9 h-9 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-40 flex items-center justify-center transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-dark-border flex items-center justify-center transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-slate-400" /> : <Menu className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pt-3 border-t border-dark-border/50 space-y-2">
              <button onClick={() => { setPage('map'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors text-left">
                <Map className="w-4 h-4 text-slate-400" /> <span className="text-sm text-slate-300">Court Map</span>
              </button>
              <button onClick={() => { setPage('discuss'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors text-left">
                <MessageCircle className="w-4 h-4 text-slate-400" /> <span className="text-sm text-slate-300">Discuss</span>
              </button>
              <button onClick={() => { setPage('admin'); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors text-left">
                <Settings className="w-4 h-4 text-slate-400" /> <span className="text-sm text-slate-300">Settings</span>
              </button>
              {isLoggedIn ? (
                <button onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors text-left">
                  {user.profile_pic ? (
                    <img src={user.profile_pic} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 text-[10px] font-bold">{user.name?.charAt(0)}</div>
                  )}
                  <span className="text-sm text-slate-300">Sign Out ({user.name})</span>
                </button>
              ) : (
                <button onClick={() => { setShowAuthModal(true); setAuthError(''); setAuthMode('login'); setAuthForm({ username: '', password: '', name: '', email: '' }); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors text-left">
                  <LogIn className="w-4 h-4 text-amber-400" /> <span className="text-sm text-amber-400">Sign In</span>
                </button>
              )}
              {lastUpdate && (
                <div className="px-3 py-1 text-xs text-slate-500">
                  Last updated: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}
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
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="space-y-6">

          {/* Lake Conditions — Top Section */}
          <section>
            <LakePanel data={lakeData} />
          </section>

          {/* Current Weather + Forecast */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Current Conditions on Shawn & Jenn's Porch</h2>
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

          {/* Weather Radar */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Weather Radar</h2>
            <div className="card overflow-hidden" style={{ padding: 0 }}>
              <iframe
                src="https://www.rainviewer.com/map.html?loc=38.72,-98.77,8&oFa=0&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=1&o=83&lm=1&layer=radar&sm=1&sn=1"
                width="100%"
                height="400"
                frameBorder="0"
                allowFullScreen
                title="Weather Radar - Lake Kanopolis"
                className="rounded-xl" style={{ minHeight: '300px' }}
              />
            </div>
          </section>

          {/* Historical Charts */}
          <section>
            <div className="card">
              <button onClick={() => setWeatherTrendsOpen(!weatherTrendsOpen)} className="flex items-center justify-between w-full cursor-pointer" style={{ background: 'none', border: 'none', padding: 0 }}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-white">Weather Trends</h2>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${weatherTrendsOpen ? 'rotate-180' : ''}`} />
              </button>
              {weatherTrendsOpen && (
                <div className="mt-4">
                  <div className="flex items-center justify-end gap-1 mb-4">
                    {[
                      { label: '24h', hours: 24 },
                      { label: '3d', hours: 72 },
                      { label: '7d', hours: 168 },
                      { label: '30d', hours: 720 },
                      { label: '3mo', hours: 2160 },
                    ].map(opt => (
                      <button key={opt.hours} onClick={() => setTrendRange(opt.hours)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${trendRange === opt.hours
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'text-slate-500 hover:text-slate-300'
                          }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <WeatherChart
                      data={historicalData}
                      dataKeys={[
                        { key: 'outdoor_temp', name: 'Outdoor', color: '#f59e0b' },
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
                </div>
              )}
            </div>
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
              {isAdmin && (
                <button
                  onClick={() => setPage('admin')}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
                >
                  Settings
                </button>
              )}
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
