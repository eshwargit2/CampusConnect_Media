import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, Search, X, User, ChevronRight, Info, Pencil, Trash2, Check } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { OnlineDot, useOnline } from '../context/OnlineContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ── Mobile hook ───────────────────────────────────────────────────────
const useIsMobile = (bp = 768) => {
    const [mobile, setMobile] = useState(window.innerWidth < bp);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < bp);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [bp]);
    return mobile;
};

// ── Input bar height constant (mobile fixed bar) ───────────────────────
const INPUT_BAR_HEIGHT = 58; // px — keep in sync with minHeight in the textarea/button

// ── Time format ───────────────────────────────────────────────────────
const fmtTime = (ts) => {
    const d = new Date(ts);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday ' + format(d, 'HH:mm');
    return format(d, 'MMM d, HH:mm');
};

// ── Avatar component ──────────────────────────────────────────────────
const Av = ({ user, size = 40, border = '2px solid var(--black)' }) => (
    user?.profile_image
        ? <img src={user.profile_image} alt={user?.username}
            style={{ width: size, height: size, border, objectFit: 'cover', flexShrink: 0, display: 'block' }} />
        : <div style={{
            width: size, height: size, background: 'var(--yellow)', border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
            fontSize: size * 0.38, color: 'var(--black)', flexShrink: 0,
        }}>{user?.username?.charAt(0).toUpperCase() || '?'}</div>
);

// ── Profile Panel ─────────────────────────────────────────────────────
const ProfilePanel = ({ partner, partnerId, onClose, isMobile }) => {
    const { onlineUsers } = useOnline();
    const isOnline = onlineUsers[partnerId] === true;
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!partner?.username) return;
        // Try common profile endpoint patterns
        api.get(`/users/profile/${partner.username}`)
            .then(({ data }) => setStats(data.user || data))
            .catch(() =>
                api.get(`/users/${partner.username}`)
                    .then(({ data }) => setStats(data.user || data))
                    .catch(() => { })
            );
    }, [partner?.username]);

    const body = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--white)' }}>
            {/* Header */}
            <div style={{
                background: 'var(--black)', padding: '12px 16px', flexShrink: 0,
                borderBottom: '3px solid var(--yellow)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                    PROFILE INFO
                </span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.5)', cursor: 'pointer', display: 'flex' }}>
                    <X size={16} />
                </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
                {/* Cover */}
                <div style={{
                    height: '60px', background: 'var(--black)',
                    backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,224,0,0.07) 0,rgba(255,224,0,0.07) 1px,transparent 0,transparent 50%)',
                    backgroundSize: '20px 20px',
                }} />

                <div style={{ padding: '0 16px 24px', marginTop: '-30px' }}>
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px' }}>
                        <Av user={partner} size={62} border="4px solid var(--white)" />
                        <OnlineDot userId={partnerId} size={12} />
                    </div>

                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--black)', margin: '0 0 4px' }}>
                        {partner?.username}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                        <div style={{ width: '6px', height: '6px', background: isOnline ? '#00FF88' : 'rgba(10,10,10,0.2)', boxShadow: isOnline ? '0 0 5px rgba(0,255,136,0.6)' : 'none' }} />
                        <span style={{ fontSize: '9px', letterSpacing: '2px', fontWeight: '700', color: isOnline ? '#00a85a' : 'rgba(10,10,10,0.4)', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>
                            {isOnline ? 'ONLINE NOW' : 'OFFLINE'}
                        </span>
                    </div>

                    {(stats?.bio || partner?.bio) && (
                        <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.6)', lineHeight: '1.55', marginBottom: '14px' }}>
                            {stats?.bio || partner?.bio}
                        </p>
                    )}

                    {stats && (
                        <div style={{ display: 'flex', border: '2px solid var(--black)', marginBottom: '16px', boxShadow: '2px 2px 0 var(--black)' }}>
                            {[{ l: 'POSTS', v: stats.posts_count ?? 0 }, { l: 'FOLLOWERS', v: stats.followers_count ?? 0 }, { l: 'FOLLOWING', v: stats.following_count ?? 0 }].map((s, i) => (
                                <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRight: i < 2 ? '2px solid var(--black)' : 'none' }}>
                                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '14px', color: 'var(--black)' }}>{s.v}</p>
                                    <p style={{ fontSize: '7px', letterSpacing: '1px', color: 'rgba(10,10,10,0.4)', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>{s.l}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <Link to={`/profile/${partner?.username}`} style={{ textDecoration: 'none' }}>
                        <button style={{
                            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                            background: 'var(--black)', color: 'var(--yellow)', border: '2px solid var(--black)',
                            padding: '11px', cursor: 'pointer', fontFamily: "'Space Mono', monospace",
                            fontSize: '10px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase',
                            boxShadow: '3px 3px 0 var(--yellow)',
                        }}>
                            <User size={12} /> VIEW FULL PROFILE <ChevronRight size={12} />
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '85dvh', border: '3px solid var(--black)', borderBottom: 'none', overflow: 'hidden' }}>
                    {body}
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '255px', flexShrink: 0, borderLeft: '3px solid var(--black)', overflow: 'hidden' }}>
            {body}
        </div>
    );
};

// ── Message bubble with edit/delete ──────────────────────────────────
const MessageBubble = ({ msg, isMe, showAv, partner, isMobile, onEdit, onDelete }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(msg.content);
    const menuRef = useRef(null);
    const editRef = useRef(null);
    const isOpt = msg.id?.startsWith('opt-');

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', h);
        document.addEventListener('touchstart', h);
        return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
    }, [menuOpen]);

    useEffect(() => {
        if (editing) { setEditText(msg.content); setTimeout(() => editRef.current?.focus(), 50); }
    }, [editing]);

    const submitEdit = async () => {
        const trimmed = editText.trim();
        if (!trimmed || trimmed === msg.content) { setEditing(false); return; }
        await onEdit(msg.id, trimmed);
        setEditing(false);
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
        if (e.key === 'Escape') { setEditing(false); setEditText(msg.content); }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: isMe ? 'row-reverse' : 'row',
            alignItems: 'flex-end', gap: '7px', marginBottom: '2px',
            position: 'relative',
        }}>
            {/* Partner avatar */}
            {!isMe && (
                <div style={{ width: isMobile ? 28 : 28, flexShrink: 0 }}>
                    {showAv && <Av user={partner} size={isMobile ? 28 : 28} border="1.5px solid var(--black)" />}
                </div>
            )}

            {/* Bubble + actions row */}
            <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'center', gap: '4px', maxWidth: isMobile ? '80%' : '70%', position: 'relative' }}>

                {/* Edit/Delete menu toggle — only for my messages, not optimistic */}
                {isMe && !isOpt && !editing && (
                    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={() => setMenuOpen(s => !s)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(10,10,10,0.25)',
                                /* Larger touch target on mobile */
                                padding: isMobile ? '8px 6px' : '4px',
                                minWidth: isMobile ? '36px' : 'auto',
                                minHeight: isMobile ? '36px' : 'auto',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'color 0.1s',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'rgba(10,10,10,0.6)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.25)'}
                        >
                            <svg width={isMobile ? 16 : 14} height={isMobile ? 16 : 14} viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                            </svg>
                        </button>

                        {/* Dropdown menu */}
                        {menuOpen && (
                            <div style={{
                                position: 'absolute', bottom: '100%', right: 0,
                                background: 'var(--black)', border: '2px solid var(--yellow)',
                                boxShadow: '4px 4px 0 var(--yellow)',
                                zIndex: 20, minWidth: '120px', marginBottom: '4px',
                            }}>
                                <button
                                    onClick={() => { setMenuOpen(false); setEditing(true); }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 14px', background: 'none', border: 'none',
                                        borderBottom: '1px solid rgba(255,224,0,0.15)',
                                        color: 'var(--white)', cursor: 'pointer', textAlign: 'left',
                                        fontFamily: "'Space Mono', monospace", fontSize: '10px',
                                        fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                    <Pencil size={11} color="var(--yellow)" /> EDIT
                                </button>
                                <button
                                    onClick={() => { setMenuOpen(false); onDelete(msg.id); }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 14px', background: 'none', border: 'none',
                                        color: '#ff6b6b', cursor: 'pointer', textAlign: 'left',
                                        fontFamily: "'Space Mono', monospace", fontSize: '10px',
                                        fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                    <Trash2 size={11} color="#ff6b6b" /> DELETE
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Bubble */}
                <div style={{
                    background: isMe ? 'var(--black)' : '#f8f6f0',
                    border: '2px solid var(--black)',
                    padding: editing ? '6px 8px' : (isMobile ? '8px 11px' : '9px 13px'),
                    boxShadow: isMe ? '2px 2px 0 rgba(255,224,0,0.45)' : '2px 2px 0 rgba(10,10,10,0.1)',
                    opacity: isOpt ? 0.55 : 1,
                    transition: 'opacity 0.2s',
                    flex: 1,
                }}>
                    {editing ? (
                        /* Edit mode */
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                            <textarea
                                ref={editRef}
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                rows={1}
                                style={{
                                    flex: 1, border: 'none', outline: 'none', resize: 'none',
                                    background: 'rgba(255,255,255,0.1)', color: 'var(--white)',
                                    fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px',
                                    lineHeight: '1.5', padding: '4px 6px', minWidth: 0,
                                    borderBottom: '2px solid var(--yellow)',
                                    maxHeight: '120px', overflowY: 'auto',
                                }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                                <button onClick={submitEdit} style={{ background: 'var(--yellow)', border: 'none', cursor: 'pointer', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={13} color="var(--black)" />
                                </button>
                                <button onClick={() => { setEditing(false); setEditText(msg.content); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={13} color="rgba(255,255,255,0.6)" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p style={{
                                color: isMe ? 'var(--white)' : 'var(--black)',
                                fontSize: isMobile ? '13.5px' : '13px', lineHeight: '1.55',
                                wordBreak: 'break-word', fontFamily: "'Space Grotesk', sans-serif",
                            }}>{msg.content}</p>
                            <p style={{
                                fontSize: '8px', letterSpacing: '0.3px',
                                color: isMe ? 'rgba(245,240,232,0.38)' : 'rgba(10,10,10,0.28)',
                                marginTop: '4px', textAlign: 'right',
                                fontFamily: "'Space Mono', monospace",
                            }}>
                                {isOpt ? '...' : fmtTime(msg.created_at)}
                                {isMe && !isOpt && <span style={{ marginLeft: '4px' }}>{msg.read_at ? '✓✓' : '✓'}</span>}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Messages Page ────────────────────────────────────────────────
const Messages = () => {
    const { partnerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isMobile = useIsMobile(768);

    const [conversations, setConversations] = useState([]);
    const [convsLoading, setConvsLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [msgsLoading, setMsgsLoading] = useState(false);
    const [partner, setPartner] = useState(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const pollRef = useRef(null);
    const searchDebRef = useRef(null);

    const showSidebar = !isMobile || !partnerId;
    const showChat = !isMobile || !!partnerId;

    // ── Load conversations ──
    const loadConversations = useCallback(async () => {
        try {
            const { data } = await api.get('/messages');
            setConversations(data.conversations || []);
        } catch { /* noop */ }
        finally { setConvsLoading(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // ── Load thread ──
    const loadThread = useCallback(async () => {
        if (!partnerId) return;
        setMsgsLoading(true);
        try {
            const { data } = await api.get(`/messages/${partnerId}`);
            setMessages(data.messages || []);
            setPartner(data.partner);
        } catch { toast.error('Failed to load messages'); }
        finally { setMsgsLoading(false); }
    }, [partnerId]);

    useEffect(() => { setMessages([]); setPartner(null); setShowProfile(false); loadThread(); }, [partnerId]);

    // ── Poll 4s ──
    useEffect(() => {
        if (!partnerId) return;
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await api.get(`/messages/${partnerId}`);
                setMessages(data.messages || []);
                loadConversations();
            } catch { /* noop */ }
        }, 4000);
        return () => clearInterval(pollRef.current);
    }, [partnerId, loadConversations]);

    // ── Scroll to bottom ──
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ── Auto-resize textarea ──
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }, [text]);

    // ── User search ──
    const handleSearch = (q) => {
        setSearchQ(q);
        clearTimeout(searchDebRef.current);
        if (!q.trim()) { setSearchResults([]); return; }
        searchDebRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
                setSearchResults((data.users || []).filter(u => u.id !== user?.id));
            } catch { setSearchResults([]); }
            setSearching(false);
        }, 250);
    };

    const startConversation = (u) => {
        setShowSearch(false); setSearchQ(''); setSearchResults([]);
        navigate(`/messages/${u.id}`);
    };

    // ── Send ──
    const sendMessage = async () => {
        if (!text.trim() || sending) return;
        const content = text.trim();
        setText('');
        setSending(true);
        const opt = { id: `opt-${Date.now()}`, sender_id: user.id, receiver_id: partnerId, content, created_at: new Date().toISOString(), read_at: null };
        setMessages(p => [...p, opt]);
        try {
            const { data } = await api.post(`/messages/${partnerId}`, { content });
            setMessages(p => p.map(m => m.id === opt.id ? data.message : m));
            loadConversations();
        } catch {
            setMessages(p => p.filter(m => m.id !== opt.id));
            setText(content);
            toast.error('Failed to send');
        }
        setSending(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    // ── Edit message ──
    const handleEdit = async (msgId, newContent) => {
        try {
            const { data } = await api.patch(`/messages/${msgId}`, { content: newContent });
            setMessages(p => p.map(m => m.id === msgId ? data.message : m));
        } catch { toast.error('Failed to edit'); }
    };

    // ── Delete message ──
    const handleDelete = async (msgId) => {
        setMessages(p => p.filter(m => m.id !== msgId));
        try {
            await api.delete(`/messages/${msgId}`);
            loadConversations();
        } catch {
            toast.error('Failed to delete');
            loadThread(); // re-fetch to restore
        }
    };

    // Group by date
    const groupedMessages = messages.reduce((acc, msg) => {
        const key = format(new Date(msg.created_at), 'yyyy-MM-dd');
        if (!acc[key]) acc[key] = [];
        acc[key].push(msg);
        return acc;
    }, {});

    const dateLabel = (key) => {
        const d = new Date(key);
        if (isToday(d)) return 'TODAY';
        if (isYesterday(d)) return 'YESTERDAY';
        return format(d, 'MMM d, yyyy').toUpperCase();
    };

    return (
        <div style={{
            display: 'flex',
            /* Full viewport minus navbar height (64px matches CSS .navbar) */
            height: isMobile ? 'calc(100dvh - 64px)' : 'calc(100vh - 64px)',
            marginTop: '64px',
            maxWidth: isMobile ? '100%' : '1200px',
            margin: isMobile ? '64px 0 0' : '64px auto 0',
            border: isMobile ? 'none' : '3px solid var(--black)',
            boxShadow: isMobile ? 'none' : '6px 6px 0 var(--black)',
            background: 'var(--white)',
            overflow: 'hidden',
            /* Account for left/right safe areas on notched phones in landscape */
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
        }}>

            {/* ══ SIDEBAR ══ */}
            {showSidebar && (
                <div style={{
                    width: isMobile ? '100%' : '300px', flexShrink: 0,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    borderRight: isMobile ? 'none' : '3px solid var(--black)',
                }}>
                    {/* Header */}
                    <div style={{
                        background: 'var(--black)', padding: isMobile ? '14px 16px' : '15px 20px',
                        borderBottom: '4px solid var(--yellow)', flexShrink: 0,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <MessageSquare size={16} color="var(--yellow)" />
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)' }}>MESSAGES</span>
                        </div>
                        <button onClick={() => setShowSearch(s => !s)} style={{
                            background: showSearch ? 'var(--yellow)' : 'rgba(255,224,0,0.15)',
                            border: '2px solid var(--yellow)', color: showSearch ? 'var(--black)' : 'var(--yellow)',
                            width: '34px', height: '34px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {showSearch ? <X size={15} /> : <Search size={15} />}
                        </button>
                    </div>

                    {/* New chat search */}
                    {showSearch && (
                        <div style={{ background: 'var(--black)', borderBottom: '3px solid var(--black)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px' }}>
                                <Search size={14} color="rgba(245,240,232,0.35)" style={{ flexShrink: 0 }} />
                                <input autoFocus value={searchQ} onChange={e => handleSearch(e.target.value)}
                                    placeholder="Find a user..."
                                    style={{
                                        flex: 1, background: 'none', border: 'none', outline: 'none',
                                        padding: '13px 10px', color: 'var(--white)',
                                        fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px',
                                    }}
                                />
                            </div>
                            {searching && <div style={{ padding: '10px 16px', fontSize: '10px', letterSpacing: '2px', color: 'rgba(245,240,232,0.4)' }}>SEARCHING...</div>}
                            {searchResults.map(u => (
                                <button key={u.id} onClick={() => startConversation(u)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                                        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        cursor: 'pointer', textAlign: 'left',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <Av user={u} size={38} border="2px solid rgba(255,224,0,0.4)" />
                                        <OnlineDot userId={u.id} size={8} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '13px', color: 'var(--white)', textTransform: 'uppercase' }}>{u.username}</p>
                                        {u.bio && <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        {convsLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ width: '24px', height: '24px' }} />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                                <MessageSquare size={36} style={{ color: 'rgba(10,10,10,0.12)', margin: '0 auto 14px', display: 'block' }} />
                                <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.35)', fontWeight: '700', marginBottom: '6px' }}>NO CONVERSATIONS</p>
                                <p style={{ fontSize: '11px', color: 'rgba(10,10,10,0.3)' }}>Tap 🔍 to find someone</p>
                            </div>
                        ) : conversations.map(conv => {
                            const active = conv.partner.id === partnerId;
                            const mine = conv.lastMessage.sender_id === user?.id;
                            return (
                                <button key={conv.partner.id}
                                    onClick={() => navigate(`/messages/${conv.partner.id}`)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: isMobile ? '15px 16px' : '13px 15px',
                                        background: active ? 'rgba(255,224,0,0.1)' : 'none',
                                        border: 'none', borderBottom: '1px solid rgba(10,10,10,0.07)',
                                        borderLeft: active ? '4px solid var(--yellow)' : '4px solid transparent',
                                        cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
                                    }}
                                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,224,0,0.05)'; }}
                                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none'; }}
                                >
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <Av user={conv.partner} size={isMobile ? 48 : 44} />
                                        <OnlineDot userId={conv.partner.id} size={10} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px', marginBottom: '3px' }}>
                                            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {conv.partner.username}
                                            </p>
                                            <span style={{ fontSize: '9px', color: 'rgba(10,10,10,0.35)', flexShrink: 0, fontFamily: "'Space Mono', monospace" }}>
                                                {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })}
                                            </span>
                                        </div>
                                        <p style={{
                                            fontSize: '12px',
                                            color: conv.unread > 0 ? 'var(--black)' : 'rgba(10,10,10,0.45)',
                                            fontWeight: conv.unread > 0 ? '600' : '400',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {mine ? 'You: ' : ''}{conv.lastMessage.content}
                                        </p>
                                    </div>
                                    {conv.unread > 0 && (
                                        <div style={{ background: 'var(--yellow)', color: 'var(--black)', fontSize: '9px', fontWeight: '700', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                                            {conv.unread}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══ CHAT PANEL ══ */}
            {showChat && (
                <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
                    {!partnerId ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                            <MessageSquare size={52} style={{ color: 'rgba(10,10,10,0.08)' }} />
                            <p style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.25)', fontWeight: '700', fontFamily: "'Space Mono', monospace" }}>
                                SELECT A CONVERSATION
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Chat column — MUST be flex column with fixed height */}
                            <div style={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                minWidth: 0, overflow: 'hidden',
                                /* Critical: constrain height inside the parent */
                                height: '100%',
                            }}>
                                {/* Header */}
                                <div style={{
                                    background: 'var(--black)', borderBottom: '4px solid var(--yellow)',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: isMobile ? '9px 14px' : '10px 18px',
                                    flexShrink: 0,
                                }}>
                                    {isMobile && (
                                        <button onClick={() => navigate('/messages')} style={{ background: 'none', border: 'none', color: 'var(--yellow)', cursor: 'pointer', display: 'flex', padding: '6px 8px 6px 0', WebkitTapHighlightColor: 'transparent' }}>
                                            <ArrowLeft size={20} />
                                        </button>
                                    )}
                                    <button onClick={() => setShowProfile(s => !s)} style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0,
                                        WebkitTapHighlightColor: 'transparent',
                                    }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <Av user={partner} size={isMobile ? 36 : 38} border="2px solid var(--yellow)" />
                                            <OnlineDot userId={partnerId} size={9} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: isMobile ? '13px' : '14px', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {partner?.username || '...'}
                                            </p>
                                            <p style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'rgba(255,224,0,0.4)', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>
                                                TAP FOR PROFILE
                                            </p>
                                        </div>
                                        <Info size={16} color={showProfile ? 'var(--yellow)' : 'rgba(255,224,0,0.3)'} style={{ flexShrink: 0 }} />
                                    </button>
                                </div>

                                {/* Messages area — flex: 1 = takes all remaining space */}
                                <div style={{
                                    flex: 1, overflowY: 'auto',
                                    padding: isMobile ? '10px 10px 6px' : '14px 14px 6px',
                                    /* On mobile, reserve space for the fixed input bar */
                                    paddingBottom: isMobile ? `${INPUT_BAR_HEIGHT + 10}px` : '6px',
                                    display: 'flex', flexDirection: 'column', gap: '2px',
                                    WebkitOverflowScrolling: 'touch',
                                    /* Prevent iOS bouncing from hiding input */
                                    overscrollBehavior: 'contain',
                                }}>

                                    {/* ── Partner banner at top of body (compact) ── */}
                                    {partner && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px 12px',
                                            borderBottom: '1px dashed rgba(10,10,10,0.1)',
                                            marginBottom: '8px',
                                            flexShrink: 0,
                                        }}>
                                            {/* Back button */}
                                            <button
                                                onClick={() => navigate('/messages')}
                                                style={{
                                                    background: 'var(--black)',
                                                    border: '2px solid var(--black)',
                                                    color: 'var(--yellow)',
                                                    width: '30px', height: '30px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                    boxShadow: '2px 2px 0 rgba(10,10,10,0.12)',
                                                    WebkitTapHighlightColor: 'transparent',
                                                    transition: 'box-shadow 0.15s, transform 0.15s',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '3px 3px 0 var(--yellow)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '2px 2px 0 rgba(10,10,10,0.12)'; }}
                                            >
                                                <ArrowLeft size={13} />
                                            </button>

                                            {/* Avatar + online dot */}
                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                <Av user={partner} size={isMobile ? 36 : 40} border="2px solid var(--black)" />
                                                <OnlineDot userId={partnerId} size={9} />
                                            </div>

                                            {/* Name + view profile */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontFamily: "'Space Grotesk', sans-serif",
                                                    fontWeight: '700',
                                                    fontSize: isMobile ? '13px' : '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.8px',
                                                    color: 'var(--black)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    lineHeight: 1.2,
                                                }}>
                                                    {partner?.username}
                                                </p>
                                                <button
                                                    onClick={() => setShowProfile(s => !s)}
                                                    style={{
                                                        background: 'none', border: 'none',
                                                        padding: 0, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        marginTop: '2px',
                                                        WebkitTapHighlightColor: 'transparent',
                                                    }}
                                                >
                                                    <Info size={9} color="rgba(10,10,10,0.3)" />
                                                    <span style={{
                                                        fontSize: '8px',
                                                        letterSpacing: '1px',
                                                        fontWeight: '700',
                                                        textTransform: 'uppercase',
                                                        fontFamily: "'Space Mono', monospace",
                                                        color: 'rgba(10,10,10,0.3)',
                                                    }}>VIEW PROFILE</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {msgsLoading ? (
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
                                            <div className="spinner" style={{ width: '28px', height: '28px' }} />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '30px 20px' }}>
                                            <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', fontWeight: '700', fontFamily: "'Space Mono', monospace" }}>NO MESSAGES YET</p>
                                            <p style={{ fontSize: '20px' }}>👋</p>
                                            <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.4)', fontFamily: "'Space Grotesk', sans-serif" }}>Say hello to {partner?.username}!</p>
                                        </div>
                                    ) : Object.entries(groupedMessages).map(([key, dayMsgs]) => (
                                        <React.Fragment key={key}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 6px' }}>
                                                <div style={{ flex: 1, height: '1px', background: 'rgba(10,10,10,0.08)' }} />
                                                <span style={{ fontSize: '8px', letterSpacing: '2px', color: 'rgba(10,10,10,0.3)', fontWeight: '700', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>
                                                    {dateLabel(key)}
                                                </span>
                                                <div style={{ flex: 1, height: '1px', background: 'rgba(10,10,10,0.08)' }} />
                                            </div>
                                            {dayMsgs.map((msg, idx) => (
                                                <MessageBubble
                                                    key={msg.id}
                                                    msg={msg}
                                                    isMe={msg.sender_id === user?.id}
                                                    showAv={msg.sender_id !== user?.id && (idx === 0 || dayMsgs[idx - 1]?.sender_id !== msg.sender_id)}
                                                    partner={partner}
                                                    isMobile={isMobile}
                                                    onEdit={handleEdit}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                    <div ref={messagesEndRef} style={{ height: 1 }} />
                                </div>

                                {/* ── Input bar ── */}
                                {/* On mobile: position fixed so keyboard doesn't push it offscreen */}
                                {/* On desktop: normal flex child at bottom of column */}
                                <div style={{
                                    borderTop: '3px solid var(--black)',
                                    background: 'var(--white)',
                                    display: 'flex', alignItems: 'flex-end',
                                    flexShrink: 0,
                                    /* === MOBILE: fixed to stay above keyboard === */
                                    ...(isMobile ? {
                                        position: 'fixed',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        zIndex: 40,
                                        /* Safe area for home bar on iPhone */
                                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                                        paddingLeft: 'env(safe-area-inset-left, 0px)',
                                        paddingRight: 'env(safe-area-inset-right, 0px)',
                                    } : {
                                        /* Desktop: safe area only at bottom */
                                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                                    }),
                                }}>
                                    <textarea
                                        ref={textareaRef}
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        rows={1}
                                        maxLength={2000}
                                        style={{
                                            flex: 1, border: 'none', outline: 'none', resize: 'none',
                                            padding: isMobile ? '14px 14px' : '14px 18px',
                                            /* 16px prevents iOS auto-zoom on focus */
                                            fontSize: isMobile ? '16px' : '13px',
                                            fontFamily: "'Space Grotesk', sans-serif",
                                            lineHeight: '1.5', background: 'transparent',
                                            color: 'var(--black)',
                                            minHeight: `${INPUT_BAR_HEIGHT}px`,
                                            maxHeight: '120px',
                                            overflowY: 'auto',
                                            display: 'block',
                                        }}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!text.trim() || sending}
                                        style={{
                                            background: text.trim() ? 'var(--black)' : 'rgba(10,10,10,0.07)',
                                            border: 'none', borderLeft: '3px solid var(--black)',
                                            color: text.trim() ? 'var(--yellow)' : 'rgba(10,10,10,0.2)',
                                            width: isMobile ? '58px' : 'auto',
                                            padding: isMobile ? '0' : '0 20px',
                                            minHeight: `${INPUT_BAR_HEIGHT}px`,
                                            cursor: text.trim() ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            fontFamily: "'Space Mono', monospace", fontSize: '11px',
                                            fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase',
                                            transition: 'background 0.15s, color 0.15s',
                                            flexShrink: 0,
                                            alignSelf: 'flex-end',
                                            WebkitTapHighlightColor: 'transparent',
                                        }}>
                                        <Send size={isMobile ? 20 : 14} />
                                        {!isMobile && 'SEND'}
                                    </button>
                                </div>
                            </div>

                            {/* Profile panel — desktop inline */}
                            {showProfile && !isMobile && (
                                <ProfilePanel partner={partner} partnerId={partnerId} onClose={() => setShowProfile(false)} isMobile={false} />
                            )}

                            {/* Profile panel — mobile bottom sheet */}
                            {showProfile && isMobile && (
                                <ProfilePanel partner={partner} partnerId={partnerId} onClose={() => setShowProfile(false)} isMobile={true} />
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Messages;
