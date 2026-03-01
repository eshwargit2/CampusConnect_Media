import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';

const OnlineContext = createContext({ onlineUsers: {}, checkOnline: () => { } });

export const OnlineProvider = ({ children }) => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState({}); // { [userId]: true/false }
    const pendingIdsRef = useRef(new Set());
    const debounceRef = useRef(null);

    // ── Heartbeat: ping every 30s while logged in ──
    useEffect(() => {
        if (!user) return;

        const beat = () => api.post('/users/heartbeat').catch(() => { });
        beat(); // Immediate first beat
        const interval = setInterval(beat, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // ── Batch check online status ──
    const flushCheck = useCallback(async () => {
        const ids = Array.from(pendingIdsRef.current);
        pendingIdsRef.current.clear();
        if (ids.length === 0) return;

        try {
            const { data } = await api.post('/users/online-status', { userIds: ids });
            setOnlineUsers(prev => ({ ...prev, ...data.online }));
        } catch { /* silent */ }
    }, []);

    // Queue user IDs to check, debounced to batch them
    const checkOnline = useCallback((userIds) => {
        if (!Array.isArray(userIds)) userIds = [userIds];
        userIds.forEach(id => { if (id) pendingIdsRef.current.add(id); });

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(flushCheck, 200);
    }, [flushCheck]);

    // Periodically refresh online status every 60s
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(() => {
            const ids = Object.keys(onlineUsers);
            if (ids.length > 0) {
                ids.forEach(id => pendingIdsRef.current.add(id));
                flushCheck();
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [user, onlineUsers, flushCheck]);

    return (
        <OnlineContext.Provider value={{ onlineUsers, checkOnline }}>
            {children}
        </OnlineContext.Provider>
    );
};

export const useOnline = () => useContext(OnlineContext);

// ── Reusable green dot component ──
export const OnlineDot = ({ userId, size = 10, offset = true }) => {
    const { onlineUsers, checkOnline } = useOnline();

    useEffect(() => {
        if (userId) checkOnline(userId);
    }, [userId, checkOnline]);

    if (!onlineUsers[userId]) return null;

    return (
        <div
            title="Online"
            style={{
                position: offset ? 'absolute' : 'relative',
                bottom: offset ? '-1px' : 'auto',
                right: offset ? '-1px' : 'auto',
                width: `${size}px`,
                height: `${size}px`,
                background: '#00FF88',
                border: '2px solid var(--white)',
                borderRadius: '0',
                boxShadow: '0 0 6px rgba(0,255,136,0.6)',
                zIndex: 2,
                flexShrink: 0,
            }}
        />
    );
};
