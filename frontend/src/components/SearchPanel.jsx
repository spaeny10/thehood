import { useState, useRef, useEffect } from 'react';
import { Search, ArrowLeft, Sparkles, Send, Loader2, ThermometerSun, Waves, Fish, Wind, Home, CalendarDays, MessageSquare, Zap } from 'lucide-react';
import { searchApi } from '../services/api';

const SUGGESTED_QUESTIONS = [
  { icon: ThermometerSun, text: "What's the temperature right now?", color: 'amber' },
  { icon: Waves, text: "Is the lake level rising or falling?", color: 'blue' },
  { icon: Fish, text: "What fish are biting?", color: 'emerald' },
  { icon: Wind, text: "How windy was it yesterday?", color: 'purple' },
  { icon: Home, text: "Who owns lot 15?", color: 'pink' },
  { icon: CalendarDays, text: "Any upcoming events?", color: 'cyan' },
  { icon: ThermometerSun, text: "What was the hottest day this week?", color: 'orange' },
  { icon: MessageSquare, text: "What are people talking about?", color: 'violet' },
];

const SOURCE_COLORS = {
  'Weather Station': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25' },
  'Weather History': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25' },
  'Lake Data': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/25' },
  'Lake History': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/25' },
  'Court Map': { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/25' },
  'Community Board': { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/25' },
  'Events Calendar': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25' },
  'KDWP Fishing Report': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
};

const CHIP_COLORS = {
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', hover: 'hover:bg-amber-500/20', icon: 'text-amber-500' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', hover: 'hover:bg-blue-500/20', icon: 'text-blue-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', hover: 'hover:bg-emerald-500/20', icon: 'text-emerald-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', hover: 'hover:bg-purple-500/20', icon: 'text-purple-500' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', hover: 'hover:bg-pink-500/20', icon: 'text-pink-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', hover: 'hover:bg-cyan-500/20', icon: 'text-cyan-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', hover: 'hover:bg-orange-500/20', icon: 'text-orange-500' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', hover: 'hover:bg-violet-500/20', icon: 'text-violet-500' },
};

export default function SearchPanel({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    // Focus input on mount with slight delay for mobile
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll to results when they appear
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  const handleSearch = async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await searchApi.query(q);
      const data = response.data;
      setResult(data);
      setHistory(prev => [{ query: q, answer: data.answer, sources: data.sources, timestamp: new Date() }, ...prev].slice(0, 10));
    } catch (err) {
      const message = err.response?.data?.error || 'Search failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleSuggestion = (text) => {
    setQuery(text);
    handleSearch(text);
  };

  const handleNewQuestion = () => {
    setQuery('');
    setResult(null);
    setError('');
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="border-b border-dark-border/50 backdrop-blur-md bg-dark-bg/80 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">AI Search</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/20 mb-4">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Ask anything about Kanopolanes
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Weather, lake conditions, lot owners, fishing, events — just ask in plain English.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-dark-card border border-dark-border rounded-2xl overflow-hidden group-focus-within:border-amber-500/40 transition-colors">
              <Search className="w-5 h-5 text-slate-500 ml-4 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What was the temperature last Tuesday?"
                disabled={loading}
                className="flex-1 bg-transparent text-white placeholder-slate-600 text-base py-4 px-3 outline-none disabled:opacity-50"
                style={{ fontSize: '16px' }}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex items-center justify-center w-12 h-12 mr-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-30 disabled:hover:bg-amber-500/10 transition-all shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 text-amber-400" />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="card mb-6">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-slate-400">Searching across Kanopolanes data...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card mb-6 border-red-500/20">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={handleNewQuestion}
                  className="mt-2 text-xs text-slate-400 hover:text-amber-400 transition-colors"
                >
                  Try another question →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div ref={resultsRef} className="space-y-4 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Answer Card */}
            <div className="card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                    {result.answer}
                  </div>
                </div>
              </div>

              {/* Source Badges */}
              {result.sources && result.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-dark-border/50">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider self-center mr-1">Sources</span>
                  {result.sources.map((source) => {
                    const colors = SOURCE_COLORS[source] || { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/25' };
                    return (
                      <span
                        key={source}
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {source}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Duration */}
              {result.duration_ms && (
                <div className="mt-3 text-[10px] text-slate-600">
                  Answered in {(result.duration_ms / 1000).toFixed(1)}s
                </div>
              )}
            </div>

            {/* Ask Another */}
            <button
              onClick={handleNewQuestion}
              className="w-full py-3 rounded-xl bg-dark-card border border-dark-border hover:border-amber-500/30 text-sm text-slate-400 hover:text-amber-400 transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Ask another question
            </button>
          </div>
        )}

        {/* Suggested Questions — show when no result/error/loading */}
        {!result && !error && !loading && (
          <div>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
              Try asking
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUGGESTED_QUESTIONS.map(({ icon: Icon, text, color }) => {
                const colors = CHIP_COLORS[color];
                return (
                  <button
                    key={text}
                    onClick={() => handleSuggestion(text)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${colors.bg} ${colors.border} ${colors.hover} group`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${colors.icon} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    <span className={`text-sm ${colors.text}`}>{text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Previous Searches */}
        {history.length > 0 && !loading && (
          <div className="mt-10 pt-6 border-t border-dark-border/30">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
              Recent searches
            </h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(item.query)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-card/50 border border-dark-border/50 hover:border-amber-500/20 text-left transition-all group"
                >
                  <Search className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors truncate">{item.query}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
