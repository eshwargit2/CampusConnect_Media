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

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobileChat = isMobile && location.pathname.startsWith('/messages/') && location.pathname.split('/').length > 2;

    if (!user || isMobileChat) return null;

    const isActive = (path) => location.pathname === path;
    const isProfileActive = location.pathname.startsWith('/profile');
    const isMessagesActive = location.pathname.startsWith('/messages');

    return (
        <div className="bottom-navbar" style={{
            transform: visible ? 'translateY(0)' : 'translateY(90px)',
        }}>
            {/* Home Tab */}
            <Link to="/" style={getTabStyle(isActive('/'))}>
                <Home size={22} />
                <span style={labelStyle}>Home</span>
            </Link>

            {/* Search Tab */}
            <Link to="/search" style={getTabStyle(isActive('/search'))}>
                <Search size={22} />
                <span style={labelStyle}>Search</span>
            </Link>

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
