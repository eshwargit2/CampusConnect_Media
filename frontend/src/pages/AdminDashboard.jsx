import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const _raw = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = _raw.endsWith('/api') ? _raw.slice(0, -4) : _raw;

// ─── Window Width Hook ────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}

// ─── API Helpers ──────────────────────────────────────────────────────────
function getToken() { return sessionStorage.getItem('adminToken'); }

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
  if (user.profile_image) {
    return <img src={user.profile_image} alt={user.username}
      style={{ width: size, height: size, objectFit: 'cover', border: '2px solid #333', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, background: '#FFE000', color: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, border: '2px solid #333', flexShrink: 0,
    }}>
      {user.username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      background: '#111', border: `2px solid ${accent}`,
      padding: '16px 18px', boxShadow: `4px 4px 0 ${accent}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: accent, fontFamily: "'Space Mono', monospace", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 9, letterSpacing: 2, color: '#666', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────
function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#888', textTransform: 'uppercase', borderLeft: '3px solid #FFE000', paddingLeft: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────
const inputStyle = {
  background: '#1a1a1a', border: '2px solid #333', color: '#f5f0e8',
  padding: '10px 12px', fontSize: 13, fontFamily: "'Space Mono', monospace",
  outline: 'none', width: '100%', borderRadius: 0, boxSizing: 'border-box',
};

const saveBtnStyle = {
  background: '#FFE000', color: '#0a0a0a', border: '2px solid #FFE000',
  padding: '10px 18px', fontSize: 11, fontWeight: 700, letterSpacing: 1,
  textTransform: 'uppercase', fontFamily: "'Space Mono', monospace",
  cursor: 'pointer', boxShadow: '4px 4px 0 rgba(255,224,0,0.3)',
  transition: 'transform 0.1s', borderRadius: 0, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40,
};

const actionBtn = (border, bg) => ({
  background: bg, border: `1px solid ${border}`, color: border,
  padding: '8px 10px', cursor: 'pointer', fontSize: 13,
  transition: 'all 0.1s', borderRadius: 0, lineHeight: 1, minHeight: 36,
});

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  backdropFilter: 'blur(4px)',
};

const modalHeader = {
  background: '#0a0a0a', borderBottom: '2px solid #222',
  padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

const closeBtn = {
  background: 'none', border: 'none', color: '#888', fontSize: 18,
  cursor: 'pointer', padding: 6, lineHeight: 1, minWidth: 32, minHeight: 32,
};

const modalError = {
  background: '#1a0000', border: '2px solid #FF2D2D', color: '#FF2D2D',
  padding: '10px 14px', fontSize: 12, fontWeight: 700, display: 'flex',
  alignItems: 'center', gap: 8, marginBottom: 16,
};

const modalSuccess = {
  background: '#001a0d', border: '2px solid #00FF88', color: '#00FF88',
  padding: '10px 14px', fontSize: 12, fontWeight: 700, display: 'flex',
  alignItems: 'center', gap: 8, marginBottom: 16,
};

// ─── Edit User Modal ──────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }) {
  const isMobile = useWindowWidth() <= 600;
  const [form, setForm] = useState({
    username: user.username || '', email: user.email || '', bio: user.bio || '',
    address: user.address || '', website: user.website || '',
    link_instagram: user.link_instagram || '', link_twitter: user.link_twitter || '',
    link_linkedin: user.link_linkedin || '', link_github: user.link_github || '',
  });
  const [resetPw, setResetPw] = useState('');
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setSuccess('User updated successfully!');
      onSaved(data.user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResetPw = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}/reset-password`, { method: 'PUT', body: JSON.stringify({ newPassword: resetPw }) });
      setSuccess('Password reset successfully!');
      setResetPw('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const f = (field) => ({
    value: form[field],
    onChange: e => setForm(p => ({ ...p, [field]: e.target.value })),
    style: { ...inputStyle, fontSize: isMobile ? 16 : 13 },
  });

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{
        background: '#111', border: '2px solid #333', width: '100%', maxWidth: isMobile ? '100%' : 560,
        boxShadow: '8px 8px 0 rgba(255,224,0,0.2)', fontFamily: "'Space Mono', monospace",
        maxHeight: isMobile ? '95vh' : '90vh', display: 'flex', flexDirection: 'column',
        ...(isMobile ? { margin: 0, alignSelf: 'flex-end', width: '100%' } : {}),
      }} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar user={user} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FFE000', letterSpacing: 1 }}>EDIT USER</div>
              <div style={{ fontSize: 11, color: '#888' }}>@{user.username}</div>
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #222', flexShrink: 0 }}>
          {[['info', '📋 Info'], ['social', '🔗 Links'], ['password', '🔑 Password']].map(([k, v]) => (
            <button key={k} onClick={() => { setTab(k); setError(''); setSuccess(''); }}
              style={{
                flex: 1, padding: '12px 4px', background: 'none', border: 'none',
                borderBottom: tab === k ? '3px solid #FFE000' : '3px solid transparent',
                color: tab === k ? '#FFE000' : '#666', fontSize: isMobile ? 10 : 11, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer', fontFamily: "'Space Mono', monospace", whiteSpace: 'nowrap',
              }}>
              {v}
            </button>
          ))}
        </div>

        <div style={{ padding: isMobile ? '16px' : '24px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={modalError}><span>⛔</span> {error}</div>}
          {success && <div style={modalSuccess}><span>✅</span> {success}</div>}

          {tab === 'info' && (
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FieldRow label="Username"><input type="text" {...f('username')} required /></FieldRow>
              <FieldRow label="Email"><input type="email" {...f('email')} required /></FieldRow>
              <FieldRow label="Bio"><textarea {...f('bio')} rows={3} style={{ ...f('bio').style, resize: 'vertical' }} /></FieldRow>
              <FieldRow label="Address"><input type="text" {...f('address')} /></FieldRow>
              <FieldRow label="Website"><input type="text" {...f('website')} /></FieldRow>
              <button type="submit" disabled={loading} style={{ ...saveBtnStyle, width: '100%' }}>
                {loading ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </form>
          )}

          {tab === 'social' && (
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['Instagram', 'link_instagram', '📸'], ['Twitter / X', 'link_twitter', '🐦'], ['LinkedIn', 'link_linkedin', '💼'], ['GitHub', 'link_github', '🐙']].map(([lbl, key, icon]) => (
                <FieldRow key={key} label={`${icon} ${lbl}`}>
                  <input type="text" {...f(key)} placeholder="https://..." />
                </FieldRow>
              ))}
              <button type="submit" disabled={loading} style={{ ...saveBtnStyle, width: '100%' }}>
                {loading ? '⏳ Saving...' : '💾 Save Links'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleResetPw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#1a1a00', border: '2px solid #FFE000', padding: 12, fontSize: 11, color: '#FFE000', letterSpacing: 0.5 }}>
                ⚠️ Setting a new password will immediately log out the user if they are active.
              </div>
              <FieldRow label="New Password">
                <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)}
                  required minLength={6} placeholder="Min. 6 characters"
                  style={{ ...inputStyle, fontSize: isMobile ? 16 : 13 }} />
              </FieldRow>
              <button type="submit" disabled={loading}
                style={{ ...saveBtnStyle, width: '100%', background: '#FF2D2D', borderColor: '#FF2D2D', boxShadow: '4px 4px 0 rgba(255,45,45,0.3)' }}>
                {loading ? '⏳ Resetting...' : '🔑 Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────
function ConfirmDelete({ user, onClose, onConfirm, loading }) {
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{
        background: '#111', border: '2px solid #FF2D2D', width: '100%', maxWidth: 400,
        boxShadow: '8px 8px 0 rgba(255,45,45,0.3)', fontFamily: "'Space Mono', monospace",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ ...modalHeader, background: '#1a0000', borderBottom: '2px solid #FF2D2D' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FF2D2D', letterSpacing: 1 }}>⛔ DELETE USER</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
          <div style={{ fontSize: 14, color: '#f5f0e8', marginBottom: 8, fontWeight: 700 }}>Delete @{user.username}?</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 24, lineHeight: 1.7 }}>
            This will permanently delete the user and all their posts, stories, messages, follows, and likes.<br />
            <strong style={{ color: '#FF2D2D' }}>This action cannot be undone.</strong>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose}
              style={{ ...saveBtnStyle, flex: 1, background: '#1a1a1a', borderColor: '#333', color: '#f5f0e8', boxShadow: '4px 4px 0 #333' }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              style={{ ...saveBtnStyle, flex: 1, background: '#FF2D2D', borderColor: '#FF2D2D', boxShadow: '4px 4px 0 rgba(255,45,45,0.3)' }}>
              {loading ? '⏳ Deleting...' : '🗑️ Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Detail Panel ────────────────────────────────────────────────────
function UserDetailPanel({ userId, onClose, onEdit, onDelete, onPostDeleted }) {
  const isMobile = useWindowWidth() <= 768;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);
  const [postMsg, setPostMsg] = useState(null);

  useEffect(() => {
    apiFetch(`/api/admin/users/${userId}`)
      .then(d => setUser(d.user))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (tab !== 'posts') return;
    setPostsLoading(true);
    apiFetch(`/api/admin/users/${userId}/posts?page=${postsPage}&limit=9`)
      .then(d => { setPosts(d.posts || []); setPostsTotal(d.total || 0); setPostsTotalPages(d.totalPages || 1); })
      .catch(err => setPostMsg({ text: err.message, type: 'error' }))
      .finally(() => setPostsLoading(false));
  }, [userId, tab, postsPage]);

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    setDeletingPostId(postToDelete.id);
    try {
      await apiFetch(`/api/admin/posts/${postToDelete.id}`, { method: 'DELETE' });
      setPosts(ps => ps.filter(p => p.id !== postToDelete.id));
      setPostsTotal(t => t - 1);
      setUser(u => u ? { ...u, posts_count: Math.max(0, (u.posts_count || 1) - 1) } : u);
      setPostMsg({ text: 'Post deleted', type: 'success' });
      setTimeout(() => setPostMsg(null), 3000);
      if (onPostDeleted) onPostDeleted();
    } catch (err) { setPostMsg({ text: err.message, type: 'error' }); }
    finally { setDeletingPostId(null); setPostToDelete(null); }
  };

  const panelWidth = isMobile ? '100vw' : 400;

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#111', borderLeft: isMobile ? 'none' : '3px solid #FFE000', width: panelWidth, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", color: '#666', fontSize: 12 }}>
        Loading...
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end', backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{
        background: '#111', borderLeft: isMobile ? 'none' : '3px solid #FFE000', borderTop: isMobile ? '3px solid #FFE000' : 'none',
        width: panelWidth, height: '100%', display: 'flex', flexDirection: 'column',
        fontFamily: "'Space Mono', monospace", animation: 'slideInRight 0.25s ease', overflowY: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ ...modalHeader, background: '#111', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar user={user} size={isMobile ? 34 : 40} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f0e8' }}>@{user.username}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #222', flexShrink: 0 }}>
          {[['info', '📋 Info'], ['posts', `📸 Posts (${user.posts_count || 0})`]].map(([k, v]) => (
            <button key={k} onClick={() => { setTab(k); setPostMsg(null); setPostToDelete(null); }}
              style={{
                flex: 1, padding: '12px 4px', background: 'none', border: 'none',
                borderBottom: tab === k ? '3px solid #FFE000' : '3px solid transparent',
                color: tab === k ? '#FFE000' : '#666', fontSize: 11, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer', fontFamily: "'Space Mono', monospace",
              }}>
              {v}
            </button>
          ))}
        </div>

        {/* Info Tab */}
        {tab === 'info' && (
          <div style={{ padding: isMobile ? 16 : 20, overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
              {[['Posts', user.posts_count, '#00FF88'], ['Stories', user.stories_count, '#0055FF'], ['Followers', user.followers_count, '#FFE000'], ['Following', user.following_count, '#FF2D2D']].map(([lbl, val, clr]) => (
                <div key={lbl} style={{ background: '#0a0a0a', border: `1px solid ${clr}`, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: clr }}>{val}</div>
                  <div style={{ fontSize: 9, color: '#666', letterSpacing: 1 }}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['🆔 User ID', user.id], ['📅 Joined', formatDate(user.created_at)], ['📝 Bio', user.bio || '—'], ['📍 Address', user.address || '—'], ['🌐 Website', user.website || '—'], ['📸 Instagram', user.link_instagram || '—'], ['🐦 Twitter', user.link_twitter || '—'], ['💼 LinkedIn', user.link_linkedin || '—'], ['🐙 GitHub', user.link_github || '—']].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: '#666', minWidth: 100, flexShrink: 0 }}>{lbl}</span>
                  <span style={{ color: '#f5f0e8', wordBreak: 'break-all' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {tab === 'posts' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {postToDelete && (
              <div style={{ background: '#1a0000', border: '2px solid #FF2D2D', margin: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#FF2D2D', fontWeight: 700 }}>⛔ Delete this post permanently?</div>
                {postToDelete.caption && (
                  <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic' }}>
                    "{postToDelete.caption.slice(0, 70)}{postToDelete.caption.length > 70 ? '…' : ''}"
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPostToDelete(null)}
                    style={{ ...saveBtnStyle, flex: 1, background: '#1a1a1a', borderColor: '#444', color: '#f5f0e8', boxShadow: '3px 3px 0 #444', fontSize: 10, padding: '8px 0' }}>
                    Cancel
                  </button>
                  <button onClick={handleDeletePost} disabled={!!deletingPostId}
                    style={{ ...saveBtnStyle, flex: 1, background: '#FF2D2D', borderColor: '#FF2D2D', boxShadow: '3px 3px 0 rgba(255,45,45,0.3)', fontSize: 10, padding: '8px 0' }}>
                    {deletingPostId ? '⏳' : '🗑️ Confirm'}
                  </button>
                </div>
              </div>
            )}
            {postMsg && (
              <div style={{
                margin: '8px 12px 0', padding: '10px 14px', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                background: postMsg.type === 'error' ? '#1a0000' : '#001a0d',
                border: `2px solid ${postMsg.type === 'error' ? '#FF2D2D' : '#00FF88'}`,
                color: postMsg.type === 'error' ? '#FF2D2D' : '#00FF88',
              }}>
                {postMsg.type === 'error' ? '⛔' : '✅'} {postMsg.text}
              </div>
            )}
            {postsLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#555', fontSize: 12 }}>Loading posts...</div>
            ) : posts.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 12 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>No posts yet.
              </div>
            ) : (
              <div style={{ padding: 12, flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {posts.map(post => (
                    <div key={post.id} style={{ position: 'relative', aspectRatio: '1', background: '#0a0a0a', border: '1px solid #222', overflow: 'hidden' }}>
                      {post.image_url
                        ? <img src={post.image_url} alt="Post" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', fontSize: 20 }}>📝</div>
                      }
                      {/* Always visible on mobile, hover on desktop */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: isMobile ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        padding: 5, transition: 'background 0.2s',
                      }}
                        onMouseEnter={e => !isMobile && (e.currentTarget.style.background = 'rgba(0,0,0,0.78)')}
                        onMouseLeave={e => !isMobile && (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                      >
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <span style={{ fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 4px' }}>❤️ {post.likes_count}</span>
                          <span style={{ fontSize: 9, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 4px' }}>💬 {post.comments_count}</span>
                        </div>
                        <button
                          id={`delete-post-${post.id}`}
                          onClick={() => { setPostToDelete(post); setPostMsg(null); }}
                          disabled={deletingPostId === post.id}
                          style={{
                            background: '#FF2D2D', border: '1px solid #ff6060', color: '#fff',
                            width: '100%', padding: '5px 0', fontSize: 9, fontWeight: 700,
                            letterSpacing: 1, cursor: 'pointer', fontFamily: "'Space Mono', monospace",
                            textTransform: 'uppercase', borderRadius: 0, minHeight: 28,
                          }}
                        >
                          {deletingPostId === post.id ? '⏳' : '🗑️ DELETE'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {postsTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                    <button disabled={postsPage === 1} onClick={() => setPostsPage(p => p - 1)}
                      style={{ ...saveBtnStyle, padding: '6px 14px', fontSize: 10, opacity: postsPage === 1 ? 0.4 : 1, cursor: postsPage === 1 ? 'not-allowed' : 'pointer' }}>←</button>
                    <span style={{ fontSize: 10, color: '#666', alignSelf: 'center' }}>{postsPage}/{postsTotalPages}</span>
                    <button disabled={postsPage === postsTotalPages} onClick={() => setPostsPage(p => p + 1)}
                      style={{ ...saveBtnStyle, padding: '6px 14px', fontSize: 10, opacity: postsPage === postsTotalPages ? 0.4 : 1, cursor: postsPage === postsTotalPages ? 'not-allowed' : 'pointer' }}>→</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ padding: '12px 16px', borderTop: '2px solid #222', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={() => onEdit(user)} style={{ ...saveBtnStyle, flex: 1, fontSize: 10, padding: '10px 0' }}>✏️ Edit</button>
          <button onClick={() => onDelete(user)} style={{ ...saveBtnStyle, flex: 1, fontSize: 10, padding: '10px 0', background: '#FF2D2D', borderColor: '#FF2D2D', boxShadow: '4px 4px 0 rgba(255,45,45,0.3)' }}>
            🗑️ Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Card (mobile view) ──────────────────────────────────────────────
function UserCard({ user, onView, onEdit, onDelete }) {
  return (
    <div style={{ background: '#111', border: '1px solid #222', marginBottom: 8, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={user} size={36} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f0e8' }}>@{user.username}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button id={`view-user-${user.id}`} onClick={() => onView(user.id)} style={actionBtn('#0055FF', '#001a4d')} title="View">👁️</button>
          <button id={`edit-user-${user.id}`} onClick={() => onEdit(user)} style={actionBtn('#FFE000', '#2a2600')} title="Edit">✏️</button>
          <button id={`delete-user-${user.id}`} onClick={() => onDelete(user)} style={actionBtn('#FF2D2D', '#2a0000')} title="Delete">🗑️</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
        <span style={{ color: '#00FF88' }}>📸 {user.posts_count} posts</span>
        <span style={{ color: '#FFE000' }}>👥 {user.followers_count} followers</span>
        <span style={{ color: '#555' }}>📅 {formatDate(user.created_at)}</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const width = useWindowWidth();
  const isMobile = width <= 768;
  const isSmall = width <= 480;

  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewUserId, setViewUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) { navigate('/admin-login', { replace: true }); return; }
    const adminData = sessionStorage.getItem('adminUser');
    if (adminData) setAdmin(JSON.parse(adminData));
    apiFetch('/api/admin/verify').catch(() => {
      sessionStorage.removeItem('adminToken');
      navigate('/admin-login', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    setStatsLoading(true);
    apiFetch('/api/admin/stats').then(d => setStats(d)).catch(console.error).finally(() => setStatsLoading(false));
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/users?page=${page}&limit=15&search=${encodeURIComponent(search)}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { showToast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminUser');
    navigate('/admin-login', { replace: true });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
      setUsers(u => u.filter(x => x.id !== deleteUser.id));
      setTotal(t => t - 1);
      setDeleteUser(null);
      setViewUserId(null);
      showToast(`@${deleteUser.username} deleted`);
      apiFetch('/api/admin/stats').then(d => setStats(d)).catch(() => {});
    } catch (err) { showToast(err.message, 'error'); }
    finally { setDeleteLoading(false); }
  };

  const handleUserSaved = (updatedUser) => {
    setUsers(u => u.map(x => x.id === updatedUser.id ? { ...x, ...updatedUser } : x));
    showToast('User updated');
  };

  // Close sidebar on wider screens
  useEffect(() => { if (!isMobile) setSidebarOpen(false); }, [isMobile]);

  const statsList = stats ? [
    ['👥', 'Total Users', stats.totalUsers, '#FFE000'],
    ['📸', 'Total Posts', stats.totalPosts, '#00FF88'],
    ['📖', 'Stories', stats.totalStories, '#0055FF'],
    ['💬', 'Messages', stats.totalMessages, '#FF2D2D'],
    ['🆕', 'New This Week', stats.newUsersThisWeek, '#FF8C00'],
  ] : [];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: "'Space Mono', monospace", color: '#f5f0e8' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: toast.type === 'error' ? '#FF2D2D' : '#0a0a0a',
          color: toast.type === 'error' ? '#fff' : '#FFE000',
          border: `3px solid ${toast.type === 'error' ? '#0a0a0a' : '#FFE000'}`,
          padding: '12px 16px', fontSize: 12, fontWeight: 700,
          letterSpacing: 1, boxShadow: `6px 6px 0 ${toast.type === 'error' ? '#0a0a0a' : '#FFE000'}`,
          fontFamily: "'Space Mono', monospace", maxWidth: 'calc(100vw - 32px)',
        }}>
          {toast.type === 'error' ? '⛔' : '✅'} {toast.msg}
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#111', borderRight: '3px solid #FFE000',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: isMobile ? 'fixed' : 'sticky', top: 0, height: '100vh',
        zIndex: isMobile ? 500 : 1,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile ? 'transform 0.25s ease' : 'none',
      }}>
        <div style={{ background: '#FFE000', padding: '16px 18px', borderBottom: '3px solid #0a0a0a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#0a0a0a' }}>CAMPUS</div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#333' }}>ADMIN</div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#0a0a0a', padding: 4 }}>
              ✕
            </button>
          )}
        </div>

        <nav style={{ padding: '8px 0', flex: 1 }}>
          {[['📊', 'Dashboard'], ['👥', 'Users']].map(([icon, label]) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px', cursor: 'pointer',
              background: label === 'Dashboard' ? 'rgba(255,224,0,0.15)' : 'none',
              borderLeft: label === 'Dashboard' ? '4px solid #FFE000' : '4px solid transparent',
              color: label === 'Dashboard' ? '#FFE000' : '#888',
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
            }}>
              <span>{icon}</span> {label}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 18px', borderTop: '2px solid #1a1a1a' }}>
          <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>Logged in as</div>
          <div style={{ fontSize: 12, color: '#FFE000', fontWeight: 700, marginBottom: 12 }}>{admin?.username || 'Admin'}</div>
          <button id="admin-logout-btn" onClick={handleLogout} style={{
            width: '100%', padding: '10px 0', background: '#1a1a1a', border: '2px solid #333',
            color: '#f5f0e8', fontSize: 11, fontWeight: 700, letterSpacing: 1,
            cursor: 'pointer', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', minHeight: 40,
          }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          background: '#0d0d0d', borderBottom: '2px solid #1a1a1a',
          padding: isMobile ? '14px 16px' : '18px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{
                background: 'none', border: '2px solid #333', color: '#FFE000', fontSize: 16,
                cursor: 'pointer', padding: '6px 10px', borderRadius: 0, lineHeight: 1,
              }}>☰</button>
            )}
            <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, letterSpacing: 2, color: '#FFE000' }}>
              {isMobile ? 'ADMIN' : 'ADMIN DASHBOARD'}
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isSmall ? 'repeat(2, 1fr)' : isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
          gap: 12, padding: isMobile ? '16px' : '20px 28px',
          background: '#0d0d0d', borderBottom: '2px solid #1a1a1a',
        }}>
          {statsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: '#111', border: '2px solid #222', padding: '16px 18px', height: 88 }} />
            ))
            : statsList.map(([icon, label, value, accent]) => (
              <StatCard key={label} icon={icon} label={label} value={value} accent={accent} />
            ))
          }
        </div>

        {/* Users section */}
        <div style={{ margin: isMobile ? 12 : 24, background: '#111', border: '2px solid #1a1a1a', flex: 1 }}>
          {/* Section header */}
          <div style={{
            padding: isMobile ? '12px 14px' : '14px 18px',
            borderBottom: '2px solid #1a1a1a',
            display: 'flex', flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#f5f0e8' }}>👥 ALL USERS</span>
              <span style={{ background: '#FFE000', color: '#0a0a0a', fontSize: 10, fontWeight: 700, padding: '3px 8px' }}>{total}</span>
            </div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <input
                id="admin-search-input"
                type="text"
                placeholder={isMobile ? 'Search...' : 'Search username or email...'}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{
                  flex: 1, padding: '9px 12px', fontSize: isMobile ? 16 : 12,
                  background: '#0a0a0a', color: '#f5f0e8', border: '2px solid #333',
                  fontFamily: "'Space Mono', monospace", outline: 'none', borderRadius: 0, minWidth: 0,
                }}
              />
              <button type="submit" style={{ ...saveBtnStyle, padding: '9px 14px', fontSize: 11, flexShrink: 0 }}>🔍</button>
              {search && (
                <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
                  style={{ ...saveBtnStyle, padding: '9px 12px', fontSize: 11, background: '#1a1a1a', borderColor: '#444', color: '#f5f0e8', boxShadow: '3px 3px 0 #444', flexShrink: 0 }}>
                  ✕
                </button>
              )}
            </form>
          </div>

          {/* Mobile: Card view | Desktop: Table view */}
          {isMobile ? (
            <div style={{ padding: '8px', minHeight: 200 }}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ background: '#1a1a1a', height: 80, marginBottom: 8, border: '1px solid #222' }} />
                ))
              ) : users.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#555', fontSize: 12 }}>
                  {search ? `No users found for "${search}"` : 'No users found'}
                </div>
              ) : users.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onView={setViewUserId}
                  onEdit={setEditUser}
                  onDelete={setDeleteUser}
                />
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: '#0a0a0a', borderBottom: '2px solid #FFE000' }}>
                    {['User', 'Email', 'Posts', 'Followers', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#FFE000', textAlign: 'left', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} style={{ padding: '14px' }}>
                            <div style={{ height: 14, background: '#1a1a1a', width: j === 0 ? 120 : 70 }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: 12 }}>
                        {search ? `No users found for "${search}"` : 'No users found'}
                      </td>
                    </tr>
                  ) : users.map((user, i) => (
                    <tr key={user.id}
                      style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 130 }}>
                          <Avatar user={user} size={30} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f5f0e8' }}>@{user.username}</div>
                            <div style={{ fontSize: 9, color: '#555' }}>{user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11, color: '#888', maxWidth: 180 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#00FF88', fontWeight: 700 }}>{user.posts_count}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#FFE000', fontWeight: 700 }}>{user.followers_count}</td>
                      <td style={{ padding: '12px 14px', fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>{formatDate(user.created_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button id={`view-user-${user.id}`} onClick={() => setViewUserId(user.id)} style={actionBtn('#0055FF', '#001a4d')} title="View">👁️</button>
                          <button id={`edit-user-${user.id}`} onClick={() => setEditUser(user)} style={actionBtn('#FFE000', '#2a2600')} title="Edit">✏️</button>
                          <button id={`delete-user-${user.id}`} onClick={() => setDeleteUser(user)} style={actionBtn('#FF2D2D', '#2a0000')} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: isMobile ? '12px 14px' : '14px 18px', borderTop: '2px solid #1a1a1a',
              flexWrap: 'wrap', gap: 8,
            }}>
              <span style={{ fontSize: 10, color: '#555' }}>Page {page}/{totalPages} · {total} users</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  style={{ ...saveBtnStyle, padding: '6px 12px', fontSize: 10, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
                {!isMobile && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ ...saveBtnStyle, padding: '6px 10px', fontSize: 10, background: p === page ? '#FFE000' : '#1a1a1a', borderColor: p === page ? '#FFE000' : '#333', color: p === page ? '#0a0a0a' : '#f5f0e8', boxShadow: `3px 3px 0 ${p === page ? 'rgba(255,224,0,0.3)' : '#333'}` }}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  style={{ ...saveBtnStyle, padding: '6px 12px', fontSize: 10, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)}
          onSaved={(u) => { handleUserSaved(u); setEditUser(null); }} />
      )}
      {deleteUser && (
        <ConfirmDelete user={deleteUser} loading={deleteLoading}
          onClose={() => setDeleteUser(null)} onConfirm={handleDeleteConfirm} />
      )}
      {viewUserId && (
        <UserDetailPanel
          userId={viewUserId}
          onClose={() => setViewUserId(null)}
          onEdit={(u) => { setViewUserId(null); setEditUser(u); }}
          onDelete={(u) => { setViewUserId(null); setDeleteUser(u); }}
          onPostDeleted={() => {
            apiFetch('/api/admin/stats').then(d => setStats(d)).catch(() => {});
            setUsers(us => us.map(u => u.id === viewUserId ? { ...u, posts_count: Math.max(0, (u.posts_count || 1) - 1) } : u));
          }}
        />
      )}
    </div>
  );
}
