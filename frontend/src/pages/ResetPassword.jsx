import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import api from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const ResetPassword = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [form, setForm] = useState({ password: '', confirm: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [tokenLoading, setTokenLoading] = useState(true);
    const [accessToken, setAccessToken] = useState('');

    useEffect(() => {
        const extractToken = async () => {
            try {
                // Check for errors in URL hash first (Supabase error redirects)
                const hash = window.location.hash.substring(1);
                if (hash) {
                    const hashParams = new URLSearchParams(hash);
                    const errorParam = hashParams.get('error');
                    const errorCode = hashParams.get('error_code');
                    const errorDesc = hashParams.get('error_description');
                    
                    if (errorParam || errorCode) {
                        let errorMsg = 'Invalid or expired reset link.';
                        if (errorCode === 'otp_expired') {
                            errorMsg = 'This reset link has expired. Please request a new one.';
                        } else if (errorDesc) {
                            errorMsg = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
                        }
                        setError(errorMsg);
                        setTokenLoading(false);
                        return;
                    }
                }

                // Method 1: PKCE flow → ?code=xxx in query params (Supabase default now)
                const searchParams = new URLSearchParams(window.location.search);
                const code = searchParams.get('code');

                if (code) {
                    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (!exchangeError && data?.session?.access_token) {
                        setAccessToken(data.session.access_token);
                        window.history.replaceState(null, '', window.location.pathname);
                        setTokenLoading(false);
                        return;
                    }
                }

                // Method 2: Implicit flow → #access_token=xxx in URL hash (older Supabase)
                if (hash) {
                    const hashParams = new URLSearchParams(hash);
                    const token = hashParams.get('access_token');
                    const type = hashParams.get('type');
                    if (token && type === 'recovery') {
                        setAccessToken(token);
                        window.history.replaceState(null, '', window.location.pathname);
                        setTokenLoading(false);
                        return;
                    }
                }

                // No token found
                setError('Invalid or expired reset link. Please request a new one.');
            } catch (e) {
                console.error('Token extraction error:', e);
                setError('Invalid or expired reset link. Please request a new one.');
            }
            setTokenLoading(false);
        };

        extractToken();
    }, []);

    const passStrength = form.password.length >= 10 ? 3 : form.password.length >= 6 ? 2 : form.password.length > 0 ? 1 : 0;
    const strengthColors = ['', 'var(--red)', 'var(--yellow)', 'var(--green)'];
    const strengthLabels = ['', 'WEAK', 'OK', 'STRONG'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) { setError('PASSWORDS DO NOT MATCH'); return; }
        if (form.password.length < 6) { setError('PASSWORD MUST BE AT LEAST 6 CHARACTERS'); return; }
        if (!accessToken) { setError('MISSING TOKEN. REQUEST A NEW LINK.'); return; }

        setLoading(true); setError('');
        try {
            await api.post('/auth/reset-password', { accessToken, newPassword: form.password });
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'RESET FAILED. TRY AGAIN.');
        } finally { setLoading(false); }
    };

    const pad = isMobile ? '24px 20px' : '36px';

    // Loading while extracting token
    if (tokenLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'var(--yellow)', marginBottom: '16px' }} />
                    <p style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>VERIFYING LINK...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)', padding: isMobile ? '0' : '40px 24px' }}>
            {!isMobile && <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '8px', background: 'var(--yellow)' }} />}

            <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>
                {done ? (
                    /* ── Success ── */
                    <div style={{ border: isMobile ? 'none' : 'var(--border-thick)', boxShadow: isMobile ? 'none' : 'var(--shadow-lg)' }}>
                        <div style={{ background: 'var(--green)', padding: isMobile ? '28px 20px' : '36px', borderBottom: '5px solid var(--black)', textAlign: 'center' }}>
                            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎉</div>
                            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--black)', textTransform: 'uppercase' }}>
                                PASSWORD RESET!
                            </h1>
                        </div>
                        <div style={{ background: 'var(--white)', padding: pad, textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: '24px' }}>
                                Your password has been updated. Redirecting to login...
                            </p>
                            <Link to="/login" className="btn-brand" style={{ display: 'inline-flex', justifyContent: 'center', padding: '14px 24px', fontSize: '12px' }}>
                                GO TO LOGIN →
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div style={{ border: isMobile ? 'none' : 'var(--border-thick)', boxShadow: isMobile ? 'none' : 'var(--shadow-lg)' }}>
                        {/* Header */}
                        <div style={{
                            background: 'var(--black)', padding: isMobile ? '28px 20px' : '32px 36px',
                            borderBottom: '5px solid var(--yellow)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '44px', height: '44px', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <GraduationCap size={24} color="var(--black)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>SET NEW PASSWORD</div>
                                    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                        RESET<span style={{ color: 'var(--white)' }}> PASSWORD</span>
                                    </h1>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ background: 'var(--white)', padding: pad }}>
                            {!accessToken ? (
                                /* No valid token */
                                <div style={{ textAlign: 'center' }}>
                                    <div className="error-banner" style={{ marginBottom: '24px', justifyContent: 'center' }}>
                                        <AlertCircle size={14} /> {error}
                                    </div>
                                    <Link to="/forgot-password" className="btn-brand" style={{ display: 'inline-flex', padding: '14px 24px', fontSize: '12px' }}>
                                        REQUEST NEW LINK →
                                    </Link>
                                </div>
                            ) : (
                                /* Form */
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {error && (
                                        <div className="error-banner animate-fade-in"><AlertCircle size={14} /> {error}</div>
                                    )}

                                    {/* New password */}
                                    <div>
                                        <label className="field-label">New Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                            <input className="input-field" type={showPass ? 'text' : 'password'}
                                                value={form.password}
                                                onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError(''); }}
                                                placeholder="Min. 6 characters"
                                                required autoFocus disabled={loading}
                                                style={{ paddingLeft: '38px', paddingRight: '42px' }} />
                                            <button type="button" onClick={() => setShowPass(!showPass)}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {form.password && (
                                            <div style={{ marginTop: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} style={{ flex: 1, height: '5px', border: '2px solid var(--black)', background: passStrength >= i ? strengthColors[passStrength] : 'transparent', transition: 'background 0.2s' }} />
                                                ))}
                                                <span style={{ fontSize: '9px', letterSpacing: '2px', fontWeight: '700', color: strengthColors[passStrength], marginLeft: '8px', minWidth: '44px' }}>
                                                    {strengthLabels[passStrength]}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm */}
                                    <div>
                                        <label className="field-label">Confirm Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                            <input className="input-field" type={showPass ? 'text' : 'password'}
                                                value={form.confirm}
                                                onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); setError(''); }}
                                                placeholder="Repeat password" required disabled={loading}
                                                style={{
                                                    paddingLeft: '38px',
                                                    borderColor: form.confirm ? (form.confirm === form.password ? 'var(--green)' : 'var(--red)') : undefined,
                                                }} />
                                            {form.confirm && (
                                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                                    {form.confirm === form.password
                                                        ? <CheckCircle size={15} color="var(--green)" />
                                                        : <AlertCircle size={15} color="var(--red)" />}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button type="submit" className="btn-brand"
                                        style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '12px' }}
                                        disabled={loading}>
                                        {loading ? <><Loader2 size={15} className="animate-spin" /> RESETTING...</> : 'SET NEW PASSWORD →'}
                                    </button>
                                </form>
                            )}
                        </div>

                        <div style={{
                            background: 'var(--yellow)', padding: '10px 16px',
                            font: "700 10px/1 'Space Mono', monospace",
                            letterSpacing: '3px', display: 'flex', justifyContent: 'space-between',
                        }}>
                            <span>SECURE RESET</span><span>🔐</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
