import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, GraduationCap, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';
import api from '../lib/api';

const ResetPassword = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || '';
    const otp = location.state?.otp || '';
    const [form, setForm] = useState({ password: '', confirm: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!email || !otp) {
            toast.error('Session expired. Please request a new OTP.');
            navigate('/forgot-password', { replace: true });
        }
    }, [email, otp, navigate]);

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
        if (!email || !otp) { setError('SESSION ERROR. TRY AGAIN.'); return; }
        if (form.password !== form.confirm) { setError('PASSWORDS DO NOT MATCH'); return; }
        if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
            setError('PASSWORD MUST MEET ALL REQUIREMENTS');
            return;
        }

        setLoading(true); setError('');
        try {
            const { data } = await api.post('/auth/reset-password', {
                email: email.trim(),
                otp: otp.trim(),
                newPassword: form.password
            });
            toast.success(data.message || 'PASSWORD RESET SUCCESSFUL!');
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'RESET FAILED. TRY AGAIN.');
        } finally { setLoading(false); }
    };

    const pad = isMobile ? '24px 20px' : '36px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)', padding: isMobile ? '0' : '40px 24px' }}>
            <div className="animate-fade-in-up" style={{
                width: '100%', maxWidth: '440px',
                border: isMobile ? 'none' : 'var(--border-thick)',
                borderRadius: isMobile ? 'none' : '24px',
                boxShadow: isMobile ? 'none' : 'var(--shadow-lg)',
                overflow: 'hidden'
            }}>
                {done ? (
                    /* ── Success ── */
                    <div>
                        <div style={{ background: 'var(--primary-tint)', padding: isMobile ? '28px 20px' : '36px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎉</div>
                            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                                PASSWORD RESET!
                            </h1>
                        </div>
                        <div style={{ background: 'var(--white)', padding: pad, textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: '24px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)', fontWeight: '600' }}>
                                Your password has been updated. Redirecting to login...
                            </p>
                            <Link to="/login" className="btn-brand" style={{ display: 'inline-flex', justifyContent: 'center', padding: '14px 24px', fontSize: '12px', borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)' }}>
                                GO TO LOGIN →
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Header */}
                        <div style={{
                            background: 'var(--primary-tint)', padding: isMobile ? '28px 20px' : '32px 36px',
                            borderBottom: '1px solid var(--border-color)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: '44px', height: '44px', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', flexShrink: 0, boxShadow: 'var(--clay-btn-shadow)' }}>
                                    <GraduationCap size={24} color="#ffffff" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>SET NEW PASSWORD</div>
                                    <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                        RESET<span style={{ color: 'var(--black)' }}> PASSWORD</span>
                                    </h1>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ background: 'var(--white)', padding: pad }}>
                            {/* Form */}
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {error && (
                                    <div className="error-banner animate-fade-in"><AlertCircle size={14} /> {error}</div>
                                )}



                                {/* New password */}
                                <div>
                                    <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                        <input className="input-field" type={showPass ? 'text' : 'password'}
                                            value={form.password}
                                            onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError(''); }}
                                            placeholder="Min. 8 characters"
                                            required disabled={loading}
                                            style={{ paddingLeft: '38px', paddingRight: '42px', fontFamily: "'Inter', sans-serif" }} />
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

                                {/* Confirm */}
                                <div>
                                    <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Confirm Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                        <input className="input-field" type={showPass ? 'text' : 'password'}
                                            value={form.confirm}
                                            onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); setError(''); }}
                                            placeholder="Repeat password" required disabled={loading}
                                            style={{
                                                paddingLeft: '38px',
                                                fontFamily: "'Inter', sans-serif",
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
                                    style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '12px', borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)' }}
                                    disabled={loading}>
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> RESETTING...</> : 'SET NEW PASSWORD →'}
                                </button>
                            </form>
                        </div>

                        <div style={{
                            background: 'var(--primary-tint)', padding: '12px 20px',
                            borderTop: '1px solid var(--border-color)',
                            fontSize: '10px',
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: '700',
                            letterSpacing: '1.5px', display: 'flex', justifyContent: 'space-between',
                            color: 'var(--text-muted)',
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
