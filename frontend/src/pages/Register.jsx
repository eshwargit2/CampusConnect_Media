import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useIsMobile from '../hooks/useIsMobile';
import toast from 'react-hot-toast';
import api from '../lib/api';

const DOMAIN = 'gmail.com';

const Register = () => {
    const { registerVerifyOtp } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [form, setForm] = useState({ email: '', username: '', password: '', bio: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // OTP States
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleChange = (e) => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); };
    const emailValid = form.email.toLowerCase().endsWith(`@${DOMAIN}`);

    const hasMinLength = form.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(form.password);
    const hasLowercase = /[a-z]/.test(form.password);
    const hasNumber = /[0-9]/.test(form.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(form.password);

    const criteriaMetCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    const passStrength = criteriaMetCount === 5 ? 3 : criteriaMetCount >= 3 ? 2 : criteriaMetCount > 0 ? 1 : 0;
    const strengthColors = ['', 'var(--red)', 'var(--yellow)', 'var(--green)'];
    const strengthLabels = ['', 'WEAK', 'MEDIUM', 'STRONG'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!emailValid) { setError(`ONLY @${DOMAIN} EMAILS ALLOWED`); return; }
        if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
            setError('PASSWORD MUST MEET ALL REQUIREMENTS');
            return;
        }
        setLoading(true); setError('');
        try {
            await api.post('/auth/register-send-otp', {
                email: form.email,
                username: form.username,
                password: form.password,
                bio: form.bio
            });
            toast.success('OTP SENT TO YOUR EMAIL ✦');
            setOtpSent(true);
            setResendCooldown(60);
        } catch (err) {
            setError(err.response?.data?.error?.toUpperCase() || 'REGISTRATION FAILED');
        } finally { setLoading(false); }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otpCode.trim() || otpCode.length !== 6) {
            setError('PLEASE ENTER A VALID 6-DIGIT OTP');
            return;
        }
        setOtpLoading(true); setError('');
        try {
            await registerVerifyOtp(form.email, otpCode);
            toast.success('ACCOUNT CREATED & VERIFIED ✦');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error?.toUpperCase() || 'VERIFICATION FAILED');
        } finally { setOtpLoading(false); }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setOtpLoading(true); setError('');
        try {
            await api.post('/auth/register-send-otp', {
                email: form.email,
                username: form.username,
                password: form.password,
                bio: form.bio
            });
            toast.success('NEW OTP SENT ✦');
            setResendCooldown(60);
        } catch (err) {
            setError(err.response?.data?.error?.toUpperCase() || 'RESEND FAILED');
        } finally { setOtpLoading(false); }
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
                                    {otpSent ? 'VERIFY EMAIL' : 'JOIN COLLEGE'}<span style={{ color: 'var(--black)' }}>{otpSent ? ' ADDRESS' : 'CIRCLE'}</span>
                                </h1>
                            </div>
                            <div style={{ fontSize: '9px', letterSpacing: '1px', color: 'var(--yellow)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right', lineHeight: '1.5', flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>
                            <br />
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

                        {otpSent ? (
                            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <p style={{ fontSize: '12px', lineHeight: '1.7', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600', marginBottom: '8px' }}>
                                    An OTP was sent to <strong style={{ color: 'var(--yellow)' }}>{form.email}</strong>. Enter the 6-digit code below:
                                </p>
                                
                                <div>
                                    <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Verification Code</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                        <input className="input-field" type="text" name="otp" value={otpCode}
                                            onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6)); setError(''); }}
                                            placeholder="123456" required maxLength={6} pattern="\d{6}" inputMode="numeric"
                                            style={{ paddingLeft: '38px', letterSpacing: '8px', fontSize: '18px', fontWeight: '700', fontFamily: "'Space Mono', monospace" }}
                                            disabled={otpLoading} />
                                    </div>
                                </div>

                                <button type="submit" className="btn-brand"
                                    style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '13px', borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)' }}
                                    disabled={otpLoading}>
                                    {otpLoading ? <><Loader2 size={16} className="animate-spin" /> VERIFYING...</> : 'VERIFY & SIGN UP →'}
                                </button>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    <button type="button" onClick={handleResendOtp} className="btn-ghost"
                                        style={{ flex: 1, padding: '12px', fontSize: '11px', borderRadius: '10px', display: 'inline-flex', justifyContent: 'center' }}
                                        disabled={otpLoading || resendCooldown > 0}>
                                        {resendCooldown > 0 ? `RESEND IN ${resendCooldown}S` : 'RESEND OTP'}
                                    </button>
                                    <button type="button" onClick={() => { setOtpSent(false); setOtpCode(''); setError(''); }} className="btn-ghost"
                                        style={{ flex: 1, padding: '12px', fontSize: '11px', borderRadius: '10px', display: 'inline-flex', justifyContent: 'center' }}
                                        disabled={otpLoading}>
                                        ← EDIT DETAILS
                                    </button>
                                </div>
                            </form>
                        ) : (
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
                                        <>
                                            <div style={{ marginTop: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} style={{ flex: 1, height: '6px', border: '1px solid var(--border-color)', borderRadius: '3px', background: passStrength >= i ? strengthColors[passStrength] : 'transparent', transition: 'background 0.2s' }} />
                                                ))}
                                                <span style={{ fontSize: '9px', letterSpacing: '1px', fontWeight: '700', color: strengthColors[passStrength], marginLeft: '8px', minWidth: '44px', fontFamily: "'Outfit', sans-serif" }}>
                                                    {strengthLabels[passStrength]}
                                                </span>
                                            </div>

                                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: "'Outfit', sans-serif" }}>
                                                    Password Requirements:
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: hasMinLength ? 'var(--green)' : 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                                    <span>{hasMinLength ? '✓' : '○'}</span> At least 8 characters
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: hasUppercase ? 'var(--green)' : 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                                    <span>{hasUppercase ? '✓' : '○'}</span> One uppercase letter (A-Z)
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: hasLowercase ? 'var(--green)' : 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                                    <span>{hasLowercase ? '✓' : '○'}</span> One lowercase letter (a-z)
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: hasNumber ? 'var(--green)' : 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                                    <span>{hasNumber ? '✓' : '○'}</span> One number (0-9)
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: hasSpecial ? 'var(--green)' : 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                                    <span>{hasSpecial ? '✓' : '○'}</span> One special character (!@#$%^&*)
                                                </div>
                                            </div>
                                        </>
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
                        )}

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
                        <span></span><span>■■■</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
