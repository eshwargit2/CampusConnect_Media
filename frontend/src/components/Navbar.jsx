import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, PlusSquare, User, LogOut, GraduationCap, Menu, X, Search, MessageSquare, Sun, Moon } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import api from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const Navbar = ({ onUploadClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile(768);
    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    // Search state
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false); };
    const isActive = (path) => location.pathname === path;
    const closeMenu = () => setMenuOpen(false);

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
        
        // Request Notification permission
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
                        // Avoid notifying if user is already actively looking at messages
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

    return (
        <>
            <nav className="navbar">
                <div style={{
                    maxWidth: isMobile ? '100%' : '1100px',
                    margin: '0 auto', padding: '0 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                }}>
                    {/* Logo */}
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={closeMenu}>
                        <div style={{
                            width: '34px', height: '34px', background: 'var(--yellow)',
                            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            boxShadow: 'var(--clay-btn-shadow)',
                        }}>
                            <GraduationCap size={18} color="#ffffff" />
                        </div>
                        <span style={{
                            fontFamily: "'Outfit', sans-serif", fontWeight: '700',
                            fontSize: isMobile ? '13px' : '15px', color: 'var(--yellow)',
                            letterSpacing: isMobile ? '1px' : '2px', textTransform: 'uppercase',
                        }}>
                            COLLEGE<span style={{ color: 'var(--black)' }}>CIRCLE</span>
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    {user && !isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <DesktopLink to="/" active={isActive('/')} label="FEED" icon={<Home size={14} />} />
                            <DesktopLink
                                to="/messages"
                                active={location.pathname.startsWith('/messages')}
                                label="MESSAGES"
                                icon={
                                    <span style={{ position: 'relative', display: 'flex' }}>
                                        <MessageSquare size={14} />
                                        {unreadCount > 0 && (
                                            <span style={{
                                                position: 'absolute', top: '-6px', right: '-8px',
                                                background: 'var(--red)', color: '#ffffff',
                                                fontSize: '8px', fontWeight: '700',
                                                minWidth: '14px', height: '14px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '0 2px',
                                                borderRadius: '50%',
                                            }}>{unreadCount}</span>
                                        )}
                                    </span>
                                }
                            />

                            <button onClick={toggleTheme} style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--black)', cursor: 'pointer', padding: '8px 12px',
                                display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                                borderRadius: '12px', margin: '0 4px',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--yellow)'; e.currentTarget.style.background = 'var(--primary-tint)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--black)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                            </button>

                            {/* Search button */}
                            <button onClick={openSearch} style={{
                                background: searchOpen ? 'var(--primary-tint)' : 'transparent',
                                border: 'none',
                                color: searchOpen ? 'var(--yellow)' : 'var(--black)',
                                cursor: 'pointer', padding: '8px 14px',
                                display: 'flex', alignItems: 'center', gap: '7px',
                                fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: '600',
                                letterSpacing: '0.5px', textTransform: 'uppercase', transition: 'all 0.15s',
                                borderRadius: '12px', margin: '0 4px',
                            }}
                                onMouseEnter={e => { if (!searchOpen) { e.currentTarget.style.color = 'var(--yellow)'; e.currentTarget.style.background = 'var(--primary-tint)'; } }}
                                onMouseLeave={e => { if (!searchOpen) { e.currentTarget.style.color = 'var(--black)'; e.currentTarget.style.background = 'transparent'; } }}
                            >
                                <Search size={14} /> SEARCH
                            </button>

                            <button onClick={onUploadClick} className="btn-brand" style={{
                                padding: '8px 16px !important', fontSize: '12px',
                                margin: '0 4px',
                            }}>
                                <PlusSquare size={14} /> POST
                            </button>
                            <DesktopLink
                                to={`/profile/${user.username}`}
                                active={location.pathname.startsWith('/profile')}
                                label={user.username?.toUpperCase().slice(0, 12)}
                                icon={user.profile_image
                                    ? <img src={user.profile_image} alt="" style={{ width: '17px', height: '17px', borderRadius: '50%', objectFit: 'cover' }} />
                                    : <User size={14} />}
                            />
                            <button onClick={handleLogout} style={{
                                background: 'none', border: 'none',
                                color: 'var(--red)', cursor: 'pointer', padding: '8px 12px',
                                display: 'flex', alignItems: 'center',
                                transition: 'all 0.15s',
                                borderRadius: '12px', margin: '0 4px',
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-tint)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    )}

                    {/* Mobile: right side */}
                    {user && isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Theme map */}
                            <button onClick={toggleTheme} style={{
                                background: 'none',
                                border: '2px solid var(--white-30)',
                                color: 'var(--white)',
                                width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                            }}>
                                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                            {/* Search button */}
                            <button onClick={openSearch} style={{
                                background: searchOpen ? 'var(--yellow)' : 'none',
                                border: '2px solid ' + (searchOpen ? 'var(--yellow)' : 'var(--white-30)'),
                                color: searchOpen ? 'var(--black)' : 'var(--white)',
                                width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                            }}>
                                <Search size={18} />
                            </button>
                            {/* Quick post button */}
                            <button onClick={onUploadClick} style={{
                                background: 'var(--yellow)', border: '2px solid var(--yellow)',
                                width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                            }}>
                                <PlusSquare size={18} color="var(--black)" />
                            </button>
                            {/* Hamburger */}
                            <button onClick={() => setMenuOpen(!menuOpen)} style={{
                                background: 'none', border: '2px solid var(--white-30)',
                                color: 'var(--white)', cursor: 'pointer',
                                width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {menuOpen ? <X size={18} /> : <Menu size={18} />}
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── SEARCH DROPDOWN ── */}
            {searchOpen && (
                <div ref={searchRef} style={{
                    position: 'fixed',
                    top: isMobile ? '64px' : '64px',
                    left: 0, right: 0,
                    zIndex: 998,
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <div className="animate-scale-in" style={{
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '440px',
                        margin: isMobile ? '0' : '0 auto',
                        background: 'var(--white)',
                        border: isMobile ? 'none' : 'var(--border-thick)',
                        borderRadius: '24px',
                        boxShadow: isMobile ? '0 8px 40px rgba(0,0,0,0.15)' : 'var(--shadow-lg)',
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
                                    fontSize: '13px', fontWeight: '600',
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
                                        color: 'var(--white-40)', textTransform: 'uppercase',
                                    }}>
                                        SEARCHING...
                                    </div>
                                ) : results.length === 0 ? (
                                    <div style={{
                                        padding: '24px', textAlign: 'center',
                                        fontSize: '10px', letterSpacing: '3px',
                                        color: 'var(--white-40)', textTransform: 'uppercase',
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
                        background: 'rgba(0,0,0,0.5)',
                    }}
                />
            )}

            {/* Mobile full-screen menu */}
            {isMobile && menuOpen && user && (
                <div className="mobile-menu-overlay">
                    {/* Header */}
                    <div className="mobile-menu-header">
                        <span style={{
                            fontFamily: "'Outfit', sans-serif", fontWeight: '700',
                            fontSize: '14px', color: 'var(--yellow)',
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                        }}>
                            MENU
                        </span>
                        <button onClick={closeMenu} style={{
                            background: 'none', border: '1px solid var(--border-color)',
                            color: 'var(--black)', cursor: 'pointer',
                            width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '12px',
                        }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* User badge */}
                    <div style={{
                        padding: '20px 24px', borderBottom: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', gap: '14px',
                    }}>
                        {user.profile_image
                            ? <img src={user.profile_image} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                            : <div style={{
                                width: '48px', height: '48px', background: 'var(--primary-tint)',
                                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%',
                                fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '20px', color: 'var(--yellow)',
                            }}>{user.username?.charAt(0).toUpperCase()}</div>
                        }
                        <div>
                            <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '16px', color: 'var(--black)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {user.username}
                            </p>
                            <p style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
                                COLLEGE MEMBER
                            </p>
                        </div>
                    </div>

                    {/* Links */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <Link to="/" className={`mobile-menu-link${isActive('/') ? ' active' : ''}`} onClick={closeMenu}>
                            <Home size={20} /> Feed
                        </Link>
                        <Link to="/messages"
                            className={`mobile-menu-link${location.pathname.startsWith('/messages') ? ' active' : ''}`}
                            onClick={closeMenu}>
                            <span style={{ position: 'relative', display: 'inline-flex' }}>
                                <MessageSquare size={20} />
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '-4px', right: '-8px',
                                        background: 'var(--red)', color: '#ffffff',
                                        fontSize: '8px', fontWeight: '700',
                                        minWidth: '14px', height: '14px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '0 2px',
                                        borderRadius: '50%',
                                    }}>{unreadCount}</span>
                                )}
                            </span>
                            Messages
                        </Link>
                        <Link to={`/profile/${user.username}`}
                            className={`mobile-menu-link${location.pathname.startsWith('/profile') ? ' active' : ''}`}
                            onClick={closeMenu}>
                            <User size={20} /> Profile
                        </Link>
                    </div>

                    {/* Logout at bottom */}
                    <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)' }}>
                        <button onClick={handleLogout} className="btn-red"
                            style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '13px' }}>
                            <LogOut size={16} /> SIGN OUT
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

const DesktopLink = ({ to, active, label, icon }) => (
    <Link to={to} style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '8px 16px', margin: '0 4px', textDecoration: 'none',
        fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: '600',
        letterSpacing: '0.5px', textTransform: 'uppercase',
        color: active ? '#ffffff' : 'var(--black)',
        background: active ? 'var(--yellow)' : 'transparent',
        borderRadius: '12px',
        boxShadow: active ? 'var(--clay-btn-shadow)' : 'none',
        transition: 'all 0.15s',
    }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--yellow)'; e.currentTarget.style.background = 'var(--primary-tint)'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--black)'; e.currentTarget.style.background = 'transparent'; } }}
    >
        {icon}{label}
    </Link>
);

export default Navbar;
