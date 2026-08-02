import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useIsMobile from '../hooks/useIsMobile';
import toast from 'react-hot-toast';

const DOMAIN = 'gmail.com';

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [form, setForm] = useState({ email: '', username: '', password: '', bio: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); };
    const emailValid = form.email.toLowerCase().endsWith(`@${DOMAIN}`);
    const passStrength = form.password.length >= 10 ? 3 : form.password.length >= 6 ? 2 : form.password.length > 0 ? 1 : 0;
    const strengthColors = ['', 'var(--red)', 'var(--yellow)', 'var(--green)'];
    const strengthLabels = ['', 'WEAK', 'OK', 'STRONG'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!emailValid) { setError(`ONLY @${DOMAIN} EMAILS ALLOWED`); return; }
        if (form.password.length < 6) { setError('PASSWORD MIN 6 CHARACTERS'); return; }
        setLoading(true); setError('');
        try {
            await register(form.email, form.username, form.password, form.bio);
            toast.success('ACCOUNT CREATED ✦');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error?.toUpperCase() || 'REGISTRATION FAILED');
        } finally { setLoading(false); }
    };

    const pad = isMobile ? '20px' : '32px 36px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-body)', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '40px 24px', flexDirection: 'column' }}>
                <div className="animate-fade-in-up" style={{
                    width: '100%', maxWidth: isMobile ? '100%' : '460px', margin: '0 auto', flex: isMobile ? 1 : 'unset', display: 'flex', flexDirection: 'column',
                    border: isMobile ? 'none' : 'var(--border-thick)',
                    borderRadius: isMobile ? 'none' : '24px',
                    boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                    overflow: 'hidden'
                }}>

                    {/* Header */}
                    <div style={{
                        background: 'var(--primary-tint)', padding: isMobile ? '24px 20px' : '28px 36px',
                        borderBottom: '1px solid var(--border-color)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', flexShrink: 0, boxShadow: 'var(--clay-btn-shadow)' }}>
                                    <GraduationCap size={20} color="#ffffff" />
                                </div>
                                <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: isMobile ? '16px' : '18px', fontWeight: '800', color: 'var(--yellow)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                    JOIN COLLEGE<span style={{ color: 'var(--black)' }}>CIRCLE</span>
                                </h1>
                            </div>
                            <div style={{ fontSize: '9px', letterSpacing: '1px', color: 'var(--yellow)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right', lineHeight: '1.5', flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>
                                @{DOMAIN}<br />ONLY
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div style={{
                        background: 'var(--white)', padding: pad, flex: 1,
                    }}>
                        {error && (
                            <div className="error-banner animate-fade-in"><AlertCircle size={14} />{error}</div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Email */}
                            <div>
                                <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input className="input-field" type="email" name="email" value={form.email} onChange={handleChange}
                                        placeholder={`you@${DOMAIN}`} required autoComplete="email"
                                        style={{
                                            paddingLeft: '38px', paddingRight: '38px', fontFamily: "'Inter', sans-serif",
                                            borderColor: form.email ? (emailValid ? 'var(--green)' : 'var(--red)') : undefined,
                                        }} disabled={loading} />
                                    {form.email && (
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                            {emailValid ? <CheckCircle size={15} color="var(--green)" /> : <AlertCircle size={15} color="var(--red)" />}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Username */}
                            <div>
                                <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Username</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input className="input-field" type="text" name="username" value={form.username} onChange={handleChange}
                                        placeholder="chooseyourusername" required autoComplete="username"
                                        style={{ paddingLeft: '38px', fontFamily: "'Inter', sans-serif" }} disabled={loading} maxLength={30} />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input className="input-field" type={showPass ? 'text' : 'password'}
                                        name="password" value={form.password} onChange={handleChange}
                                        placeholder="Min. 6 characters" required autoComplete="new-password"
                                        style={{ paddingLeft: '38px', paddingRight: '42px', fontFamily: "'Inter', sans-serif" }} disabled={loading} />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}>
                                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {form.password && (
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {[1, 2, 3].map(i => (
                                            <div key={i} style={{ flex: 1, height: '6px', border: '1px solid var(--border-color)', borderRadius: '3px', background: passStrength >= i ? strengthColors[passStrength] : 'transparent', transition: 'background 0.2s' }} />
                                        ))}
                                        <span style={{ fontSize: '9px', letterSpacing: '1px', fontWeight: '700', color: strengthColors[passStrength], marginLeft: '8px', minWidth: '44px', fontFamily: "'Outfit', sans-serif" }}>
                                            {strengthLabels[passStrength]}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Bio <span style={{ opacity: 0.5, fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <FileText size={14} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <textarea className="input-field" name="bio" value={form.bio} onChange={handleChange}
                                        placeholder="Tell us about yourself..." rows={2}
                                        style={{ paddingLeft: '38px', resize: 'none', fontFamily: "'Inter', sans-serif" }} disabled={loading} maxLength={150} />
                                </div>
                            </div>

                            <button type="submit" className="btn-brand"
                                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '13px', marginTop: '4px', borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)' }}
                                disabled={loading}>
                                {loading ? <><Loader2 size={16} className="animate-spin" /> CREATING...</> : 'CREATE ACCOUNT →'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', letterSpacing: '0.5px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)', fontWeight: '600' }}>
                                HAVE AN ACCOUNT?{' '}
                                <Link to="/login" style={{ color: 'var(--yellow)', fontWeight: '700', textDecoration: 'none' }}>
                                    SIGN IN
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--primary-tint)', color: 'var(--text-muted)',
                        padding: '12px 20px',
                        fontSize: '10px',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: '700',
                        letterSpacing: '1.5px', textTransform: 'uppercase',
                        display: 'flex', justifyContent: 'space-between',
                        borderTop: '1px solid var(--border-color)',
                    }}>
                        <span>ONLY @{DOMAIN}</span><span>■■■</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
