import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, MapPin, Clock, X } from 'lucide-react';
import { eventsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EventCalendar = () => {
    const [events, setEvents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', event_date: '', event_time: '', location: '' });
    const [error, setError] = useState('');
    const { user, isLoggedIn, isAdmin } = useAuth();

    useEffect(() => { loadEvents(); }, []);

    const loadEvents = async () => {
        try {
            const res = await eventsApi.getUpcoming();
            setEvents(res.data || []);
        } catch (err) {
            console.error('Error loading events:', err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title || !form.event_date) {
            setError('Title and date are required');
            return;
        }
        try {
            await eventsApi.create(form);
            setForm({ title: '', description: '', event_date: '', event_time: '', location: '' });
            setShowForm(false);
            setError('');
            loadEvents();
        } catch (err) {
            setError('Failed to create event');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this event?')) return;
        try {
            await eventsApi.delete(id);
            loadEvents();
        } catch (err) {
            console.error('Error deleting event:', err);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const date = new Date();
        date.setHours(parseInt(h), parseInt(m));
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    // Group events by date
    const grouped = events.reduce((acc, event) => {
        const key = event.event_date?.split('T')[0] || event.event_date;
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
    }, {});

    const isToday = (dateStr) => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Community Events</h1>
                        <p className="text-xs text-slate-500">Upcoming events at Lake Kanopolis</p>
                    </div>
                </div>
                {isLoggedIn && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/30 transition-colors cursor-pointer"
                        style={{ border: '1px solid rgba(139,92,246,0.3)' }}
                    >
                        {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showForm ? 'Cancel' : 'Add Event'}
                    </button>
                )}
            </div>

            {/* Create Form */}
            {showForm && (
                <form onSubmit={handleCreate} className="card mb-6">
                    <h3 className="text-sm font-bold text-white mb-3">New Event</h3>
                    {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <input
                            type="text"
                            placeholder="Event title *"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                        />
                        <input
                            type="date"
                            value={form.event_date}
                            onChange={e => setForm({ ...form, event_date: e.target.value })}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                        />
                        <input
                            type="time"
                            value={form.event_time}
                            onChange={e => setForm({ ...form, event_time: e.target.value })}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Location (optional)"
                            value={form.location}
                            onChange={e => setForm({ ...form, location: e.target.value })}
                            className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                        />
                    </div>
                    <textarea
                        placeholder="Description (optional)"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none mb-3"
                        rows={2}
                    />
                    <button
                        type="submit"
                        className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors cursor-pointer"
                    >
                        Create Event
                    </button>
                </form>
            )}

            {/* Events List */}
            {Object.keys(grouped).length === 0 ? (
                <div className="card text-center">
                    <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No upcoming events</p>
                    {isLoggedIn && (
                        <p className="text-slate-500 text-xs mt-1">Be the first to add one!</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(grouped).map(([date, dateEvents]) => (
                        <div key={date}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${isToday(date) ? 'bg-green-400' : 'bg-slate-600'}`} />
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${isToday(date) ? 'text-green-400' : 'text-slate-500'}`}>
                                    {isToday(date) ? 'Today' : formatDate(date)}
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {dateEvents.map(event => (
                                    <div key={event.id} className="card card-hover">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white">{event.title}</h4>
                                                {event.description && (
                                                    <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                    {event.event_time && (
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(event.event_time)}
                                                        </span>
                                                    )}
                                                    {event.location && (
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                                            <MapPin className="w-3 h-3" />
                                                            {event.location}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-600">
                                                        by {event.author_name}
                                                    </span>
                                                </div>
                                            </div>
                                            {(isAdmin || (user?.id && user.id === event.author_id)) && (
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="text-slate-600 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                                                    style={{ background: 'none', border: 'none', padding: 0 }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoggedIn && (
                <p className="text-center text-xs text-slate-500 mt-4">
                    Sign in to create events
                </p>
            )}
        </div>
    );
};

export default EventCalendar;
