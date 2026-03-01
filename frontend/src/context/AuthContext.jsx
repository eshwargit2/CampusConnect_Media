import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('cc_user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    // Verify token on mount
    useEffect(() => {
        const token = localStorage.getItem('cc_token');
        if (!token) {
            setLoading(false);
            return;
        }

        api.get('/auth/me')
            .then(({ data }) => {
                setUser(data.user);
                localStorage.setItem('cc_user', JSON.stringify(data.user));
            })
            .catch(() => {
                localStorage.removeItem('cc_token');
                localStorage.removeItem('cc_user');
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('cc_token', data.token);
        localStorage.setItem('cc_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (email, username, password, bio) => {
        const { data } = await api.post('/auth/register', { email, username, password, bio });
        localStorage.setItem('cc_token', data.token);
        localStorage.setItem('cc_user', JSON.stringify(data.user));
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_user');
        setUser(null);
    }, []);

    const updateUser = useCallback((updates) => {
        setUser((prev) => {
            const updated = { ...prev, ...updates };
            localStorage.setItem('cc_user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
