import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, PlusSquare, User, LogOut, GraduationCap, Menu, X, Search, MessageSquare } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import api from '../lib/api';

const Navbar = ({ onUploadClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile(768);
    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

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
                            border: '3px solid var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <GraduationCap size={18} color="var(--black)" />
                        </div>
                        <span style={{
                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
                            fontSize: isMobile ? '13px' : '15px', color: 'var(--yellow)',
                            letterSpacing: isMobile ? '2px' : '3px', textTransform: 'uppercase',
                        }}>
                            COLLEGE<span style={{ color: 'var(--white)' }}>CIRCLE</span>
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
                                                background: 'var(--yellow)', color: 'var(--black)',
                                                fontSize: '8px', fontWeight: '700',
                                                minWidth: '14px', height: '14px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '0 2px',
                                            }}>{unreadCount}</span>
                                        )}
                                    </span>
                                }
                            />

                            {/* Search button */}
                            <button onClick={openSearch} style={{
                                background: searchOpen ? 'rgba(255,224,0,0.08)' : 'none',
                                border: 'none', borderBottom: searchOpen ? '3px solid var(--yellow)' : '3px solid transparent',
                                color: searchOpen ? 'var(--yellow)' : 'rgba(245,240,232,0.6)',
                                cursor: 'crosshair', padding: '20px 16px',
                                display: 'flex', alignItems: 'center', gap: '7px',
                                fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: '700',
                                letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.15s',
                            }}
                                onMouseEnter={e => { if (!searchOpen) { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }}
                                onMouseLeave={e => { if (!searchOpen) { e.currentTarget.style.color = 'rgba(245,240,232,0.6)'; e.currentTarget.style.background = 'none'; } }}
                            >
                                <Search size={14} /> SEARCH
                            </button>

                            <button onClick={onUploadClick} className="btn-brand" style={{
                                padding: '8px 16px', fontSize: '11px',
                                borderTop: 'none', borderBottom: 'none', boxShadow: 'none',
                            }}>
                                <PlusSquare size={14} /> POST
                            </button>
                            <DesktopLink
                                to={`/profile/${user.username}`}
                                active={location.pathname.startsWith('/profile')}
                                label={user.username?.toUpperCase().slice(0, 12)}
                                icon={user.profile_image
                                    ? <img src={user.profile_image} alt="" style={{ width: '17px', height: '17px', border: '2px solid var(--yellow)', objectFit: 'cover' }} />
                                    : <User size={14} />}
                            />
                            <button onClick={handleLogout} style={{
                                background: 'none', border: 'none',
                                borderLeft: '3px solid rgba(255,255,255,0.15)',
                                color: 'var(--white)', cursor: 'crosshair', padding: '20px 16px',
                                display: 'flex', alignItems: 'center',
                                transition: 'background 0.15s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--red)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    )}

                    {/* Mobile: right side */}
                    {user && isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Search button */}
                            <button onClick={openSearch} style={{
                                background: searchOpen ? 'var(--yellow)' : 'none',
                                border: '2px solid ' + (searchOpen ? 'var(--yellow)' : 'rgba(255,255,255,0.3)'),
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
                                background: 'none', border: '2px solid rgba(255,255,255,0.3)',
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
                    <div className="animate-fade-in-up" style={{
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '440px',
                        margin: isMobile ? '0' : '0 auto',
                        background: 'var(--black)',
                        border: isMobile ? 'none' : '3px solid var(--yellow)',
                        borderTop: isMobile ? '3px solid var(--yellow)' : '3px solid var(--yellow)',
                        boxShadow: isMobile ? '0 8px 40px rgba(0,0,0,0.6)' : '8px 8px 0 var(--yellow)',
                    }}>
                        {/* Search input */}
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            borderBottom: '2px solid rgba(255,224,0,0.15)',
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
                                    color: 'var(--white)',
                                    fontFamily: "'Space Mono', monospace",
                                    fontSize: '13px', fontWeight: '700',
                                    letterSpacing: '1px',
                                    padding: '16px 12px',
                                    textTransform: 'uppercase',
                                }}
                            />
                            <button onClick={() => { setSearchOpen(false); setQuery(''); setResults([]); }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'rgba(245,240,232,0.4)', padding: '4px', flexShrink: 0,
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
                                        color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase',
                                    }}>
                                        SEARCHING...
                                    </div>
                                ) : results.length === 0 ? (
                                    <div style={{
                                        padding: '24px', textAlign: 'center',
                                        fontSize: '10px', letterSpacing: '3px',
                                        color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase',
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
                                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                transition: 'background 0.12s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* Avatar */}
                                            {u.profile_image ? (
                                                <img src={u.profile_image} alt=""
                                                    style={{
                                                        width: '40px', height: '40px',
                                                        border: '3px solid var(--yellow)',
                                                        objectFit: 'cover', flexShrink: 0,
                                                    }} />
                                            ) : (
                                                <div style={{
                                                    width: '40px', height: '40px',
                                                    background: 'var(--yellow)',
                                                    border: '3px solid var(--yellow)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: "'Space Grotesk', sans-serif",
                                                    fontWeight: '700', fontSize: '18px',
                                                    color: 'var(--black)', flexShrink: 0,
                                                }}>
                                                    {u.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontFamily: "'Space Grotesk', sans-serif",
                                                    fontWeight: '700', fontSize: '14px',
                                                    color: 'var(--white)',
                                                    textTransform: 'uppercase', letterSpacing: '1px',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {u.username}
                                                </p>
                                                {u.bio && (
                                                    <p style={{
                                                        fontSize: '11px', color: 'rgba(245,240,232,0.4)',
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
                            borderTop: '2px solid rgba(255,224,0,0.15)',
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '9px', letterSpacing: '2px',
                            color: 'rgba(245,240,232,0.25)', textTransform: 'uppercase',
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
                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
                            fontSize: '14px', color: 'var(--yellow)',
                            letterSpacing: '3px', textTransform: 'uppercase',
                        }}>
                            MENU
                        </span>
                        <button onClick={closeMenu} style={{
                            background: 'none', border: '2px solid rgba(255,255,255,0.3)',
                            color: 'var(--white)', cursor: 'pointer',
                            width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* User badge */}
                    <div style={{
                        padding: '20px 24px', borderBottom: '2px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', gap: '14px',
                    }}>
                        {user.profile_image
                            ? <img src={user.profile_image} alt="" style={{ width: '48px', height: '48px', border: '3px solid var(--yellow)', objectFit: 'cover' }} />
                            : <div style={{
                                width: '48px', height: '48px', background: 'var(--yellow)',
                                border: '3px solid var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '20px', color: 'var(--black)',
                            }}>{user.username?.charAt(0).toUpperCase()}</div>
                        }
                        <div>
                            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '16px', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {user.username}
                            </p>
                            <p style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', marginTop: '2px' }}>
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
                                        background: 'var(--yellow)', color: 'var(--black)',
                                        fontSize: '8px', fontWeight: '700',
                                        minWidth: '14px', height: '14px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '0 2px',
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
                    <div style={{ padding: '20px 24px', borderTop: '3px solid var(--yellow)' }}>
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
        padding: '20px 16px', textDecoration: 'none',
        fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: '700',
        letterSpacing: '1px', textTransform: 'uppercase',
        color: active ? 'var(--yellow)' : 'rgba(245,240,232,0.6)',
        background: active ? 'rgba(255,224,0,0.08)' : 'transparent',
        borderBottom: active ? '3px solid var(--yellow)' : '3px solid transparent',
        transition: 'all 0.15s',
    }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'rgba(245,240,232,0.6)'; e.currentTarget.style.background = 'transparent'; } }}
    >
        {icon}{label}
    </Link>
);

export default Navbar;
