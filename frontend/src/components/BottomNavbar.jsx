import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, PlusCircle, User, Search, MessageCircle, X } from 'lucide-react';
import api from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const BottomNavbar = ({ onUploadClick }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const [visible, setVisible] = useState(true);
    const prevScrollY = useRef(0);

    // Hide/show on scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY <= 20) {
                setVisible(true);
            } else if (currentScrollY > prevScrollY.current + 5) {
                setVisible(false); // scrolling down
            } else if (currentScrollY < prevScrollY.current - 5) {
                setVisible(true); // scrolling up
            }
            prevScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Poll unread messages count
    useEffect(() => {
        if (!user) return;
        const fetchUnread = () => api.get('/messages/unread-count').then(({ data }) => setUnreadCount(data.count || 0)).catch(() => { });
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // Real-time Browser Notifications
    useEffect(() => {
        if (!user) return;
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const channel = supabase
            .channel('realtime_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new;
                if (newMsg && newMsg.receiver_id === user.id) {
                    setUnreadCount(prev => prev + 1);
                    if ('Notification' in window && Notification.permission === 'granted') {
                        if (!location.pathname.startsWith('/messages')) {
                            const notification = new Notification('New Direct Message 💬', {
                                body: 'You received a new message!',
                            });
                            notification.onclick = () => {
                                window.focus();
                                navigate('/messages');
                            };
                        }
                    }
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                const newPost = payload.new;
                if (newPost && newPost.user_id !== user.id) {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        const notification = new Notification('New Post Alert 📸', {
                            body: 'Someone just shared a new post!',
                        });
                        notification.onclick = () => {
                            window.focus();
                            navigate('/');
                        };
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, location.pathname, navigate]);

    // Search state
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Close search on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Close search on route change
    useEffect(() => {
        setSearchOpen(false);
        setQuery('');
        setResults([]);
    }, [location.pathname]);

    // Debounced search
    const doSearch = useCallback(async (q) => {
        if (!q.trim()) { setResults([]); setSearching(false); return; }
        setSearching(true);
        try {
            const { data } = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
            setResults(data.users || []);
        } catch { setResults([]); }
        setSearching(false);
    }, []);

    const handleQueryChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        if (!val.trim()) { setResults([]); return; }
        debounceRef.current = setTimeout(() => doSearch(val), 250);
    };

    const openSearch = () => {
        setSearchOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    if (!user) return null;

    const isActive = (path) => location.pathname === path;
    const isProfileActive = location.pathname.startsWith('/profile');
    const isMessagesActive = location.pathname.startsWith('/messages');

    return (
        <>
            <div className="bottom-navbar" style={{
                transform: visible ? 'translateY(0)' : 'translateY(90px)',
            }}>
                {/* Home Tab */}
                <Link to="/" style={getTabStyle(isActive('/'))}>
                    <Home size={22} />
                    <span style={labelStyle}>Home</span>
                </Link>

                {/* Search Tab */}
                <button onClick={openSearch} style={getTabStyle(searchOpen)}>
                    <Search size={22} />
                    <span style={labelStyle}>Search</span>
                </button>

                {/* Create/Upload Tab */}
                <button onClick={onUploadClick} style={{
                    ...getTabStyle(false),
                    background: 'var(--yellow)',
                    color: '#ffffff',
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--clay-btn-shadow)',
                    border: 'none',
                    margin: '0 8px',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <PlusCircle size={24} />
                </button>

                {/* Messages Tab */}
                <Link to="/messages" style={{ ...getTabStyle(isMessagesActive), position: 'relative' }}>
                    <MessageCircle size={22} />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '4px',
                            right: '16px',
                            background: 'var(--red)',
                            color: '#ffffff',
                            fontSize: '9px',
                            fontWeight: '700',
                            minWidth: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}>{unreadCount}</span>
                    )}
                    <span style={labelStyle}>Messages</span>
                </Link>

                {/* Profile Tab */}
                <Link to={`/profile/${user.username}`} style={getTabStyle(isProfileActive)}>
                    {user.profile_image ? (
                        <img
                            src={user.profile_image}
                            alt=""
                            style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isProfileActive ? '2px solid var(--yellow)' : '1px solid var(--border-color)',
                            }}
                        />
                    ) : (
                        <User size={22} />
                    )}
                    <span style={labelStyle}>Profile</span>
                </Link>
            </div>

            {/* ── SEARCH OVERLAY ── */}
            {searchOpen && (
                <div ref={searchRef} style={{
                    position: 'fixed',
                    bottom: '90px',
                    left: '16px',
                    right: '16px',
                    zIndex: 998,
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <div className="animate-scale-in" style={{
                        width: '100%',
                        maxWidth: '680px',
                        background: 'var(--white)',
                        border: 'var(--border-thick)',
                        borderRadius: '24px',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                    }}>
                        {/* Search input */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            borderBottom: '1px solid var(--border-color)',
                            padding: '0 16px',
                        }}>
                            <Search size={16} color="var(--yellow)" style={{ flexShrink: 0 }} />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={handleQueryChange}
                                placeholder="Search users..."
                                autoFocus
                                style={{
                                    flex: 1, background: 'none', border: 'none', outline: 'none',
                                    color: 'var(--black)',
                                    fontFamily: "'Outfit', sans-serif",
                                    fontSize: '14px', fontWeight: '600',
                                    letterSpacing: '0.5px',
                                    padding: '16px 12px',
                                }}
                            />
                            <button onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', padding: '4px', flexShrink: 0,
                                }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Results */}
                        {query.trim() && (
                            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                {searching ? (
                                    <div style={{
                                        padding: '24px', textAlign: 'center',
                                        fontSize: '10px', letterSpacing: '3px',
                                        color: 'var(--text-muted)', textTransform: 'uppercase',
                                    }}>
                                        SEARCHING...
                                    </div>
                                ) : results.length === 0 ? (
                                    <div style={{
                                        padding: '24px', textAlign: 'center',
                                        fontSize: '10px', letterSpacing: '3px',
                                        color: 'var(--text-muted)', textTransform: 'uppercase',
                                    }}>
                                        NO USERS FOUND
                                    </div>
                                ) : (
                                    results.map((u) => (
                                        <Link
                                            key={u.id}
                                            to={`/profile/${u.username}`}
                                            onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '14px',
                                                padding: '14px 16px',
                                                textDecoration: 'none',
                                                borderBottom: '1px solid var(--border-color)',
                                                transition: 'background 0.12s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-tint)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Avatar */}
                                            {u.profile_image ? (
                                                <img src={u.profile_image} alt=""
                                                    style={{
                                                        width: '40px', height: '40px',
                                                        borderRadius: '50%',
                                                        objectFit: 'cover', flexShrink: 0,
                                                    }} />
                                            ) : (
                                                <div style={{
                                                    width: '40px', height: '40px',
                                                    background: 'var(--primary-tint)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: "'Outfit', sans-serif",
                                                    fontWeight: '700', fontSize: '18px',
                                                    color: 'var(--yellow)', flexShrink: 0,
                                                }}>
                                                    {u.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontFamily: "'Outfit', sans-serif",
                                                    fontWeight: '700', fontSize: '14px',
                                                    color: 'var(--black)',
                                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {u.username}
                                                </p>
                                                {u.bio && (
                                                    <p style={{
                                                        fontSize: '11px', color: 'var(--text-muted)',
                                                        marginTop: '2px',
                                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {u.bio}
                                                    </p>
                                                )}
                                            </div>
                                            {/* Arrow */}
                                            <span style={{
                                                fontSize: '16px', color: 'var(--yellow)',
                                                fontWeight: '700', flexShrink: 0,
                                            }}>→</span>
                                        </Link>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Footer tag */}
                        <div style={{
                            padding: '8px 16px',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '9px', letterSpacing: '1.5px',
                            color: 'var(--text-muted)', textTransform: 'uppercase',
                        }}>
                            <span>FIND PEOPLE</span>
                            <span>ESC TO CLOSE</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Search backdrop */}
            {searchOpen && (
                <div
                    onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 997,
                        background: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(3px)',
                    }}
                />
            )}
        </>
    );
};

// Inline helper styles for navbar tabs
const getTabStyle = (isActive) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    textDecoration: 'none',
    color: isActive ? 'var(--yellow)' : 'var(--text-muted)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    gap: '2px',
    transition: 'all 0.15s ease',
});

const labelStyle = {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
};

export default BottomNavbar;
