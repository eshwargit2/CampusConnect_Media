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
    const [registered, setRegistered] = useState(false); // show verify-email notice

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
            const data = await register(form.email, form.username, form.password, form.bio);
            if (data.requiresVerification) {
                // Show verify-email notice
                setRegistered(true);
            } else {
                toast.success('ACCOUNT CREATED ✦');
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error?.toUpperCase() || 'REGISTRATION FAILED');
        } finally { setLoading(false); }
    };

    const pad = isMobile ? '20px' : '32px 36px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--white)', overflow: 'hidden' }}>
            {!isMobile && <div style={{ width: '8px', background: registered ? 'var(--green)' : 'var(--red)', flexShrink: 0, borderRight: '3px solid var(--black)' }} />}

            {/* ── Email Sent Confirmation ── */}
            {registered && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '40px 24px' }}>
                    <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>
                        <div style={{ border: isMobile ? 'none' : 'var(--border-thick)', boxShadow: isMobile ? 'none' : 'var(--shadow-lg)' }}>
                            <div style={{ background: 'var(--green)', padding: isMobile ? '28px 20px' : '36px', borderBottom: '5px solid var(--black)', textAlign: 'center' }}>
                                <div style={{ fontSize: '52px', marginBottom: '12px' }}>📧</div>
                                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--black)', textTransform: 'uppercase', letterSpacing: '-0.5px', margin: 0 }}>
                                    CHECK YOUR EMAIL
                                </h1>
                            </div>
                            <div style={{ background: 'var(--white)', padding: pad, textAlign: 'center' }}>
                                <p style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '8px' }}>
                                    We've sent a verification link to
                                </p>
                                <p style={{ fontFamily: "'Space Mono', monospace", fontWeight: '700', fontSize: '13px', letterSpacing: '1px', background: 'var(--black)', color: 'var(--yellow)', padding: '10px 16px', display: 'inline-block', marginBottom: '20px' }}>
                                    {form.email}
                                </p>
                                <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.5)', lineHeight: '1.7', marginBottom: '24px' }}>
                                    Click the link in the email to activate your account. Check your <strong>spam folder</strong> if you don't see it. The link expires in <strong>24 hours</strong>.
                                </p>
                                <Link to="/login" className="btn-ghost" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '11px' }}>
                                    ← BACK TO LOGIN
                                </Link>
                            </div>
                            <div style={{ background: 'var(--green)', padding: '10px 16px', font: "700 10px/1 'Space Mono', monospace", letterSpacing: '3px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>VERIFY YOUR EMAIL</span><span>✅</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '40px 24px', flexDirection: 'column' }}>
                <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: isMobile ? '100%' : '460px', margin: '0 auto', flex: isMobile ? 1 : 'unset', display: 'flex', flexDirection: 'column' }}>

                    {/* Header */}
                    <div style={{
                        background: 'var(--black)', padding: isMobile ? '24px 20px' : '28px 36px',
                        border: isMobile ? 'none' : 'var(--border-thick)',
                        borderBottom: '5px solid var(--red)',
                        boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--yellow)', flexShrink: 0 }}>
                                    <GraduationCap size={20} color="var(--black)" />
                                </div>
                                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: 'var(--yellow)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                    JOIN COLLEGE<span style={{ color: 'var(--white)' }}>CIRCLE</span>
                                </h1>
                            </div>
                            <div style={{ fontSize: '9px', letterSpacing: '2px', color: 'var(--red)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right', lineHeight: '1.5', flexShrink: 0 }}>
                                @{DOMAIN}<br />ONLY
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div style={{
                        background: 'var(--white)', padding: pad, flex: 1,
                        border: isMobile ? 'none' : 'var(--border-thick)', borderTop: 'none',
                        boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                    }}>
                        {error && (
                            <div className="error-banner animate-fade-in"><AlertCircle size={14} />{error}</div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* Email */}
                            <div>
                                <label className="field-label">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                    <input className="input-field" type="email" name="email" value={form.email} onChange={handleChange}
                                        placeholder={`you@${DOMAIN}`} required autoComplete="email"
                                        style={{
                                            paddingLeft: '38px', paddingRight: '38px',
                                            borderColor: form.email ? (emailValid ? 'var(--green)' : 'var(--red)') : undefined,
                                            boxShadow: form.email ? `4px 4px 0 ${emailValid ? 'var(--green)' : 'var(--red)'}` : undefined,
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
                                <label className="field-label">Username</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                    <input className="input-field" type="text" name="username" value={form.username} onChange={handleChange}
                                        placeholder="chooseyourusername" required autoComplete="username"
                                        style={{ paddingLeft: '38px' }} disabled={loading} maxLength={30} />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="field-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                    <input className="input-field" type={showPass ? 'text' : 'password'}
                                        name="password" value={form.password} onChange={handleChange}
                                        placeholder="Min. 6 characters" required autoComplete="new-password"
                                        style={{ paddingLeft: '38px', paddingRight: '42px' }} disabled={loading} />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--black)' }}>
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

                            {/* Bio */}
                            <div>
                                <label className="field-label">Bio <span style={{ opacity: 0.4, fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <FileText size={14} style={{ position: 'absolute', left: '12px', top: '14px', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                    <textarea className="input-field" name="bio" value={form.bio} onChange={handleChange}
                                        placeholder="Tell us about yourself..." rows={2}
                                        style={{ paddingLeft: '38px', resize: 'none' }} disabled={loading} maxLength={150} />
                                </div>
                            </div>

                            <button type="submit" className="btn-brand"
                                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '13px', marginTop: '4px' }}
                                disabled={loading}>
                                {loading ? <><Loader2 size={16} className="animate-spin" /> CREATING...</> : 'CREATE ACCOUNT →'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '3px solid var(--black)', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', letterSpacing: '1px' }}>
                                HAVE AN ACCOUNT?{' '}
                                <Link to="/login" style={{ color: 'var(--black)', fontWeight: '700', textDecoration: 'underline', textDecorationThickness: '3px', textUnderlineOffset: '4px' }}>
                                    SIGN IN
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div style={{
                        background: 'var(--red)', color: 'var(--white)',
                        border: isMobile ? 'none' : 'var(--border-thick)', borderTop: 'none',
                        padding: '10px 16px',
                        font: "700 10px/1 'Space Mono', monospace",
                        letterSpacing: '3px', textTransform: 'uppercase',
                        display: 'flex', justifyContent: 'space-between',
                        boxShadow: isMobile ? 'none' : '6px 6px 0 var(--black)',
                    }}>
                        <span>ONLY @{DOMAIN}</span><span>■■■</span>
                    </div>
                </div>
            </div>

            {!isMobile && <div style={{ width: '8px', background: 'var(--black)', flexShrink: 0 }} />}
        </div>
    );
};

export default Register;
