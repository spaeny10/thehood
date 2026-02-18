import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, MessageSquare, Send, ThumbsUp, Pin, Trash2, ChevronDown,
  ChevronUp, RefreshCw, ExternalLink, Clock, Plus, Shield, Users, LogIn
} from 'lucide-react';
import { discussionApi, authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const FB_GROUP_URL = 'https://www.facebook.com/groups/688259924707972';

const CATEGORIES = [
  { key: 'all', label: 'All Posts', color: '#60a5fa' },
  { key: 'general', label: 'General', color: '#94a3b8' },
  { key: 'announcement', label: 'Announcements', color: '#f59e0b' },
  { key: 'maintenance', label: 'Maintenance', color: '#10b981' },
  { key: 'events', label: 'Events', color: '#a855f7' },
  { key: 'forsale', label: 'For Sale / Trade', color: '#f43f5e' },
];

const CAT_COLORS = Object.fromEntries(CATEGORIES.map(c => [c.key, c.color]));

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
const DiscussPage = ({ onNavigate }) => {
  const { user, isLoggedIn, isAdmin } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [showCompose, setShowCompose] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [comments, setComments] = useState({});
  const [showUsers, setShowUsers] = useState(false);

  /* ─── Fetch ─── */
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await discussionApi.getAll(category);
      setPosts(res.data);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  /* ─── Actions ─── */
  const handleLike = async (id) => {
    try {
      const res = await discussionApi.like(id);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: res.data.likes } : p));
    } catch (err) { console.error(err); }
  };

  const handlePin = async (id) => {
    try {
      await discussionApi.pin(id);
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await discussionApi.delete(id);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  /* ─── Comments ─── */
  const toggleComments = async (id) => {
    if (expandedPost === id) { setExpandedPost(null); return; }
    setExpandedPost(id);
    if (!comments[id]) {
      try {
        const res = await discussionApi.getComments(id);
        setComments(prev => ({ ...prev, [id]: res.data }));
      } catch (err) { console.error(err); }
    }
  };

  const addComment = async (postId, message) => {
    try {
      const res = await discussionApi.addComment(postId, { message });
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), res.data] }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
    } catch (err) { console.error(err); }
  };

  const deleteComment = async (postId, commentId) => {
    try {
      await discussionApi.deleteComment(postId, commentId);
      setComments(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: Math.max(0, (p.comment_count || 1) - 1) } : p));
    } catch (err) { console.error(err); }
  };

  /* ─── Create post ─── */
  const handleCreate = async (message, cat) => {
    try {
      await discussionApi.create({ message, category: cat });
      setShowCompose(false);
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  /* ─── Post to Facebook ─── */
  const shareToFacebook = (message) => {
    const url = `https://www.facebook.com/groups/688259924707972/?multi_permalinks&post_text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'width=600,height=500,left=200,top=100');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">

      {/* ═══ HEADER ═══ */}
      <header className="border-b border-dark-border/50 bg-dark-bg sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => onNavigate('dashboard')}
                className="w-9 h-9 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Community Board</h1>
                <p className="text-[10px] text-slate-500">Kanopolanes Park</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => setShowUsers(true)}
                  className="w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors" title="Manage Users">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}
              <button onClick={fetchPosts} disabled={loading}
                className="w-8 h-8 rounded-lg bg-slate-800/40 hover:bg-slate-700/40 flex items-center justify-center transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <a href={FB_GROUP_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/15 text-[#1877F2] text-[11px] font-medium transition-all">
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ CATEGORY TABS ═══ */}
      <div className="border-b border-dark-border/30 bg-dark-bg/80 sticky top-[57px] z-10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${category === c.key
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                  }`}
                style={category === c.key ? { background: `${c.color}15`, color: c.color } : {}}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-3">

          {/* Compose button */}
          {isLoggedIn ? (
            <button onClick={() => setShowCompose(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-dark-card border border-dark-border rounded-2xl hover:border-amber-500/20 transition-all group">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                {user?.profile_pic
                  ? <img src={user.profile_pic} alt="" className="w-9 h-9 rounded-full" />
                  : <Plus className="w-4 h-4 text-amber-400" />}
              </div>
              <span className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">
                What's on your mind, {user?.name?.split(' ')[0]}?
              </span>
            </button>
          ) : (
            <div className="w-full flex items-center justify-center px-4 py-3 bg-dark-card border border-dark-border rounded-2xl">
              <span className="text-sm text-slate-500">Sign in to post and comment</span>
            </div>
          )}

          {/* Compose modal */}
          {showCompose && (
            <ComposeModal
              onClose={() => setShowCompose(false)}
              onCreate={handleCreate}
              onShareFacebook={shareToFacebook}
              userName={user?.name}
              userPic={user?.profile_pic}
            />
          )}

          {/* Loading */}
          {loading && posts.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-500">Loading posts…</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">No posts yet</p>
              <p className="text-xs text-slate-600 mt-1">Be the first to share something!</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                expanded={expandedPost === post.id}
                comments={comments[post.id] || []}
                isAdmin={isAdmin}
                isLoggedIn={isLoggedIn}
                onLike={() => handleLike(post.id)}
                onPin={() => handlePin(post.id)}
                onDelete={() => handleDelete(post.id)}
                onToggleComments={() => toggleComments(post.id)}
                onAddComment={(msg) => addComment(post.id, msg)}
                onDeleteComment={(cId) => deleteComment(post.id, cId)}
                onShareFacebook={() => shareToFacebook(post.message)}
              />
            ))
          )}
        </div>
      </main>

      {/* User management modal */}
      {showUsers && <UserManagement onClose={() => setShowUsers(false)} />}

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-dark-border/30 mt-auto shrink-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <nav className="flex items-center justify-center gap-6 flex-wrap">
            <span className="text-sm font-semibold text-white">Kanopolanes</span>
            <button onClick={() => onNavigate('dashboard')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">Dashboard</button>
            <button onClick={() => onNavigate('map')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">Court Map</button>
            <button className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">Discuss</button>
            <button onClick={() => onNavigate('admin')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">Settings</button>
          </nav>
        </div>
      </footer>
    </div>
  );
};

/* ═══════════════════════ POST CARD ═══════════════════════ */
const PostCard = ({ post, expanded, comments, isAdmin, isLoggedIn, onLike, onPin, onDelete, onToggleComments, onAddComment, onDeleteComment, onShareFacebook }) => {
  const catColor = CAT_COLORS[post.category] || '#94a3b8';

  return (
    <article className="bg-dark-card border border-dark-border rounded-2xl p-4 transition-all hover:border-dark-border/80"
      style={{ borderColor: post.pinned ? 'rgba(245,158,11,0.15)' : undefined }}>

      {post.pinned === 1 && (
        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold mb-2">
          <Pin className="w-3 h-3" /> Pinned
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${catColor}15` }}>
          <span className="text-xs font-bold" style={{ color: catColor }}>
            {post.author.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{post.author}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />{timeAgo(post.created_at)}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ background: `${catColor}10`, color: catColor }}>
              {CATEGORIES.find(c => c.key === post.category)?.label || post.category}
            </span>
          </div>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button onClick={onPin} title={post.pinned ? 'Unpin' : 'Pin'}
              className="w-7 h-7 rounded-lg hover:bg-slate-800/60 flex items-center justify-center transition-colors">
              <Pin className={`w-3 h-3 ${post.pinned ? 'text-amber-400' : 'text-slate-600'}`} />
            </button>
            <button onClick={onDelete} title="Delete"
              className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-colors group">
              <Trash2 className="w-3 h-3 text-slate-600 group-hover:text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Message */}
      <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-wrap mb-3">{post.message}</p>

      {/* Action bar */}
      <div className="flex items-center gap-1 pt-2 border-t border-dark-border/30">
        <button onClick={onLike}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-amber-400 transition-all text-[11px] font-medium">
          <ThumbsUp className="w-3.5 h-3.5" />
          {post.likes > 0 ? post.likes : 'Like'}
        </button>
        <button onClick={onToggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-all text-[11px] font-medium">
          <MessageSquare className="w-3.5 h-3.5" />
          {(post.comment_count || 0) > 0 ? `${post.comment_count}` : 'Comment'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button onClick={onShareFacebook}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#1877F2]/10 text-slate-500 hover:text-[#1877F2] transition-all text-[11px] font-medium ml-auto">
          <ExternalLink className="w-3.5 h-3.5" />
          Share to FB
        </button>
      </div>

      {expanded && (
        <CommentsSection
          comments={comments}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          onAdd={onAddComment}
          onDelete={onDeleteComment}
        />
      )}
    </article>
  );
};

/* ═══════════════════════ COMMENTS ═══════════════════════ */
const CommentsSection = ({ comments, isLoggedIn, isAdmin, onAdd, onDelete }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const submit = () => {
    if (!message.trim()) return;
    onAdd(message.trim());
    setMessage('');
    inputRef.current?.focus();
  };

  return (
    <div className="mt-3 pt-3 border-t border-dark-border/20 space-y-3">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2.5 group">
          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-slate-500">{c.author.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-dark-bg rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-slate-300">{c.author}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{c.message}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-[10px] text-slate-600">{timeAgo(c.created_at)}</span>
              {isAdmin && (
                <button onClick={() => onDelete(c.id)}
                  className="text-[10px] text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {isLoggedIn ? (
        <div className="flex gap-2">
          <div className="flex-1 flex bg-dark-bg border border-dark-border/50 rounded-xl overflow-hidden focus-within:border-slate-600">
            <input ref={inputRef} type="text" value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none" />
            <button onClick={submit} disabled={!message.trim()}
              className="px-3 text-amber-400 hover:text-amber-300 disabled:text-slate-700 transition-colors">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-slate-600 text-center py-1">Sign in to comment</p>
      )}
    </div>
  );
};

/* ═══════════════════════ COMPOSE MODAL ═══════════════════════ */
const ComposeModal = ({ onClose, onCreate, onShareFacebook, userName, userPic }) => {
  const [message, setMessage] = useState('');
  const [cat, setCat] = useState('general');
  const [alsoShareFB, setAlsoShareFB] = useState(false);
  const textRef = useRef(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const submit = () => {
    if (!message.trim()) return;
    onCreate(message.trim(), cat);
    if (alsoShareFB) onShareFacebook(message.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl">

        <div className="px-5 py-4 border-b border-dark-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userPic ? (
              <img src={userPic} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 text-xs font-bold">
                {userName?.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-white">New Post</h3>
              <p className="text-[10px] text-slate-500">Posting as {userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Category */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => c.key !== 'all').map(c => (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${cat === c.key ? 'text-white' : 'text-slate-500 hover:text-slate-300 bg-dark-bg'
                  }`}
                style={cat === c.key ? { background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30` } : { border: '1px solid transparent' }}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Message */}
          <textarea ref={textRef} value={message} onChange={e => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/30 resize-none leading-relaxed" />

          {/* Also share to Facebook */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={alsoShareFB} onChange={e => setAlsoShareFB(e.target.checked)}
              className="w-4 h-4 rounded border-dark-border bg-dark-bg accent-[#1877F2]" />
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-[#1877F2]">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Also post to Facebook group
            </span>
          </label>
        </div>

        <div className="px-5 py-3 border-t border-dark-border/50 flex items-center justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={submit} disabled={!message.trim()}
            className="px-5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-xs font-semibold disabled:opacity-30 transition-all">
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════ USER MANAGEMENT (ADMIN) ═══════════════════════ */
const UserManagement = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.getUsers();
        setUsers(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      const res = await authApi.updateRole(id, newRole);
      setUsers(prev => prev.map(u => u.id === id ? res.data : u));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-dark-border/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" /> Manage Users
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">&times;</button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading…</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No users yet</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-dark-border/20 last:border-0">
                {u.profile_pic ? (
                  <img src={u.profile_pic} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                    {u.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                  <p className="text-[10px] text-slate-500">{u.email || 'No email'}</p>
                </div>
                <button onClick={() => toggleRole(u.id, u.role)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${u.role === 'admin'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800/50 text-slate-500 border border-dark-border hover:border-amber-500/20 hover:text-amber-400'
                    }`}>
                  {u.role === 'admin' ? '★ Admin' : 'Member'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-dark-border/50">
          <p className="text-[10px] text-slate-600 text-center">Click a role badge to toggle admin access</p>
        </div>
      </div>
    </div>
  );
};

export default DiscussPage;
