import React, { useState } from 'react';
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

    const handleChange = (e) => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await login(form.email, form.password);
            toast.success('WELCOME BACK ✦');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'LOGIN FAILED. TRY AGAIN.');
        } finally { setLoading(false); }
    };

    const pad = isMobile ? '20px' : '36px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--white)', overflow: 'hidden' }}>
            {/* Left accent */}
            {!isMobile && <div style={{ width: '8px', background: 'var(--yellow)', flexShrink: 0, borderRight: '3px solid var(--black)' }} />}

            <div style={{ flex: 1, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '40px 24px', flexDirection: 'column' }}>
                <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: isMobile ? '100%' : '440px', margin: '0 auto', flex: isMobile ? 1 : 'unset', display: 'flex', flexDirection: 'column' }}>

                    {/* Header block */}
                    <div style={{
                        background: 'var(--black)', padding: isMobile ? '28px 20px' : '32px 36px',
                        border: isMobile ? 'none' : 'var(--border-thick)',
                        borderBottom: '5px solid var(--yellow)',
                        boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '44px', height: '44px', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--yellow)', flexShrink: 0 }}>
                                <GraduationCap size={24} color="var(--black)" />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>EST. 2024 — SIGN IN</div>
                                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--yellow)', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                                    COLLEGE<span style={{ color: 'var(--white)' }}>CIRCLE</span>
                                </h1>
                            </div>
                        </div>
                        <p style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase' }}>YOUR COLLEGE SOCIAL NETWORK</p>
                    </div>

                    {/* Form block */}
                    <div style={{
                        background: 'var(--white)', padding: `${pad}`, flex: 1,
                        border: isMobile ? 'none' : 'var(--border-thick)', borderTop: 'none',
                        boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                    }}>
                        {error && (
                            <div className="error-banner animate-fade-in"><AlertCircle size={16} /> {error}</div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label className="field-label">Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                    <input className="input-field" type="email" name="email"
                                        value={form.email} onChange={handleChange}
                                        placeholder="you@gmail.com" required
                                        style={{ paddingLeft: '38px' }} disabled={loading} autoComplete="email" />
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
                                    <Link to="/forgot-password" style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '1px', color: 'var(--black)', textDecoration: 'underline', textUnderlineOffset: '3px', textTransform: 'uppercase' }}>
                                        Forgot?
                                    </Link>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                    <input className="input-field" type={showPass ? 'text' : 'password'}
                                        name="password" value={form.password} onChange={handleChange}
                                        placeholder="••••••••" required
                                        style={{ paddingLeft: '38px', paddingRight: '42px' }} disabled={loading} autoComplete="current-password" />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--black)' }}>
                                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-brand"
                                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '13px', marginTop: '8px' }}
                                disabled={loading}>
                                {loading ? <><Loader2 size={16} className="animate-spin" /> SIGNING IN...</> : 'SIGN IN →'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '3px solid var(--black)', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', letterSpacing: '1px' }}>
                                NO ACCOUNT?{' '}
                                <Link to="/register" style={{ color: 'var(--black)', fontWeight: '700', textDecoration: 'underline', textDecorationThickness: '3px', textUnderlineOffset: '4px' }}>
                                    SIGN UP
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Bottom tag */}
                    <div style={{
                        background: 'var(--yellow)',
                        border: isMobile ? 'none' : 'var(--border-thick)', borderTop: 'none',
                        padding: '10px 16px',
                        font: "700 10px/1 'Space Mono', monospace",
                        letterSpacing: '3px', textTransform: 'uppercase',
                        display: 'flex', justifyContent: 'space-between',
                        boxShadow: isMobile ? 'none' : '6px 6px 0 var(--black)',
                    }}>
                        <span>@GMAIL.COM ONLY</span><span>★★★</span>
                    </div>
                </div>
            </div>

            {/* Right accent */}
            {!isMobile && <div style={{ width: '8px', background: 'var(--black)', flexShrink: 0 }} />}
        </div>
    );
};

export default Login;
