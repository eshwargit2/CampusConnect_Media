import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useIsMobile from '../hooks/useIsMobile';
import toast from 'react-hot-toast';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [attemptsLeft, setAttemptsLeft] = useState(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // Read lockout from localStorage when email changes
    useEffect(() => {
        const emailKey = `cc_lockout_${form.email.toLowerCase().trim()}`;
        const stored = localStorage.getItem(emailKey);
        if (stored) {
            const until = parseInt(stored, 10);
            if (until > Date.now()) {
                setRemainingSeconds(Math.ceil((until - Date.now()) / 1000));
            } else {
                localStorage.removeItem(emailKey);
                setRemainingSeconds(0);
            }
        } else {
            setRemainingSeconds(0);
        }
        setAttemptsLeft(null); // Reset warning attempts on email change
    }, [form.email]);

    // Timer effect for the lockout countdown
    useEffect(() => {
        if (remainingSeconds <= 0) return;
        const interval = setInterval(() => {
            const emailKey = `cc_lockout_${form.email.toLowerCase().trim()}`;
            const stored = localStorage.getItem(emailKey);
            if (stored) {
                const until = parseInt(stored, 10);
                const diff = until - Date.now();
                if (diff > 0) {
                    setRemainingSeconds(Math.ceil(diff / 1000));
                } else {
                    localStorage.removeItem(emailKey);
                    setRemainingSeconds(0);
                    clearInterval(interval);
                }
            } else {
                setRemainingSeconds(0);
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [remainingSeconds, form.email]);

    // Format remaining seconds into a nice string: "Hh Mm Ss"
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const handleChange = (e) => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (remainingSeconds > 0) {
            setError(`Account is temporarily locked. Please wait ${formatTime(remainingSeconds)}.`);
            return;
        }
        setLoading(true); setError('');
        try {
            await login(form.email, form.password);
            toast.success('WELCOME BACK ✦');
            navigate('/');
        } catch (err) {
            const data = err.response?.data;
            if (data?.lockUntil || err.response?.status === 429) {
                const until = data?.lockUntil ? parseInt(data.lockUntil, 10) : (Date.now() + 5 * 60 * 60 * 1000);
                const emailKey = `cc_lockout_${form.email.toLowerCase().trim()}`;
                localStorage.setItem(emailKey, until.toString());
                setRemainingSeconds(Math.ceil((until - Date.now()) / 1000));
                setAttemptsLeft(0);
                setError(data?.error || 'Too many failed login attempts. Locked for 5 hours.');
            } else {
                setError(data?.error || 'LOGIN FAILED. TRY AGAIN.');
                if (typeof data?.attemptsLeft === 'number') {
                    setAttemptsLeft(data.attemptsLeft);
                } else {
                    setAttemptsLeft(null);
                }
            }
        } finally { setLoading(false); }
    };

    const pad = isMobile ? '20px' : '36px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-body)', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '40px 24px', flexDirection: 'column' }}>
                <div className="animate-fade-in-up" style={{
                    width: '100%', maxWidth: isMobile ? '100%' : '440px', margin: '0 auto', flex: isMobile ? 1 : 'unset', display: 'flex', flexDirection: 'column',
                    border: isMobile ? 'none' : 'var(--border-thick)',
                    borderRadius: isMobile ? 'none' : '24px',
                    boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                    overflow: 'hidden'
                }}>

                    {/* Header block */}
                    <div style={{
                        background: 'var(--primary-tint)', padding: isMobile ? '28px 20px' : '32px 36px',
                        borderBottom: '1px solid var(--border-color)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '44px', height: '44px', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', flexShrink: 0, boxShadow: 'var(--clay-btn-shadow)' }}>
                                <GraduationCap size={24} color="#ffffff" />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>EST. 2024 — SIGN IN</div>
                                <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--yellow)', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                                    COLLEGE<span style={{ color: 'var(--black)' }}>CIRCLE</span>
                                </h1>
                            </div>
                        </div>
                        <p style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>YOUR COLLEGE SOCIAL NETWORK</p>
                    </div>

                    {/* Form block */}
                    <div style={{
                        background: 'var(--white)', padding: `${pad}`, flex: 1,
                    }}>
                        {remainingSeconds > 0 && (
                            <div style={{
                                background: '#FFF0F0', border: '1px solid #FF2D2D', color: '#FF2D2D',
                                padding: '12px 16px', fontSize: '12px', fontWeight: '700', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
                                fontFamily: "'Outfit', sans-serif"
                            }}>
                                <AlertCircle size={16} /> LOCKED: Try again in {formatTime(remainingSeconds)}
                            </div>
                        )}

                        {attemptsLeft !== null && attemptsLeft > 0 && (
                            <div style={{
                                background: '#FFFDF0', border: '1px solid #FFE000', color: '#856404',
                                padding: '12px 16px', fontSize: '11px', fontWeight: '700', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
                                fontFamily: "'Outfit', sans-serif"
                            }}>
                                <AlertCircle size={16} color="#856404" /> WARNING: {attemptsLeft} attempts remaining before 5-hour lockout.
                            </div>
                        )}

                        {error && (
                            <div className="error-banner animate-fade-in"><AlertCircle size={16} /> {error}</div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input className="input-field" type="email" name="email"
                                        value={form.email} onChange={handleChange}
                                        placeholder="you@gmail.com" required
                                        style={{ paddingLeft: '38px', fontFamily: "'Inter', sans-serif" }} disabled={loading || remainingSeconds > 0} autoComplete="email" />
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="field-label" style={{ marginBottom: 0, fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Password</label>
                                    <Link to="/forgot-password" style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'var(--yellow)', textDecoration: 'none', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>
                                        Forgot?
                                    </Link>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input className="input-field" type={showPass ? 'text' : 'password'}
                                        name="password" value={form.password} onChange={handleChange}
                                        placeholder="••••••••" required
                                        style={{ paddingLeft: '38px', paddingRight: '42px', fontFamily: "'Inter', sans-serif" }} disabled={loading || remainingSeconds > 0} autoComplete="current-password" />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
                                        disabled={remainingSeconds > 0}>
                                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-brand"
                                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '13px', marginTop: '8px', borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)' }}
                                disabled={loading || remainingSeconds > 0}>
                                {remainingSeconds > 0 ? `LOCKED (${formatTime(remainingSeconds)})` : loading ? <><Loader2 size={16} className="animate-spin" /> SIGNING IN...</> : 'SIGN IN →'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', letterSpacing: '0.5px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)', fontWeight: '600' }}>
                                NO ACCOUNT?{' '}
                                <Link to="/register" style={{ color: 'var(--yellow)', fontWeight: '700', textDecoration: 'none' }}>
                                    SIGN UP
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Bottom tag */}
                    <div style={{
                        background: 'var(--primary-tint)',
                        padding: '12px 20px',
                        fontSize: '10px',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: '700',
                        letterSpacing: '1.5px', textTransform: 'uppercase',
                        display: 'flex', justifyContent: 'space-between',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-color)',
                    }}>
                        <span></span><span>★★★</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
