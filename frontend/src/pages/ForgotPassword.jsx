import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, GraduationCap, CheckCircle } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';
import api from '../lib/api';

const ForgotPassword = () => {
    const isMobile = useIsMobile();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true); setError('');
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setSent(true);
        } catch (err) {
            setError(err.response?.data?.error || 'SOMETHING WENT WRONG. TRY AGAIN.');
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

                {sent ? (
                    /* ── Success state ── */
                    <div>
                        <div style={{ background: 'var(--primary-tint)', padding: isMobile ? '28px 20px' : '36px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <CheckCircle size={48} color="var(--yellow)" style={{ marginBottom: '12px' }} />
                            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                CHECK YOUR EMAIL
                            </h1>
                        </div>
                        <div style={{ background: 'var(--white)', padding: pad, textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '8px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)' }}>
                                We've sent a password reset link to
                            </p>
                            <p style={{
                                fontFamily: "'Outfit', sans-serif", fontWeight: '700',
                                fontSize: '13px', letterSpacing: '0.5px',
                                background: 'var(--primary-tint)', color: 'var(--yellow)',
                                padding: '10px 16px', display: 'inline-block',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                marginBottom: '20px',
                            }}>
                                {email}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '24px', fontFamily: "'Outfit', sans-serif" }}>
                                Didn't get it? Check your <strong>spam folder</strong>. The link expires in 1 hour.
                            </p>
                            <Link to="/login" className="btn-ghost" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '11px', borderRadius: '10px' }}>
                                ← BACK TO LOGIN
                            </Link>
                        </div>
                        <div style={{
                            background: 'var(--primary-tint)', padding: '12px 20px',
                            borderTop: '1px solid var(--border-color)',
                            fontSize: '10px', fontFamily: "'Outfit', sans-serif", fontWeight: '700',
                            letterSpacing: '1.5px', display: 'flex', justifyContent: 'space-between',
                            color: 'var(--text-muted)',
                        }}>
                            <span>EMAIL SENT</span><span>📧</span>
                        </div>
                    </div>
                ) : (
                    /* ── Form ── */
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
                                    <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>ACCOUNT RECOVERY</div>
                                    <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                        FORGOT<span style={{ color: 'var(--black)' }}> PASSWORD</span>
                                    </h1>
                                </div>
                            </div>
                            <p style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                ENTER YOUR EMAIL TO RECEIVE A RESET LINK
                            </p>
                        </div>

                        {/* Body */}
                        <div style={{ background: 'var(--white)', padding: pad }}>
                            {error && (
                                <div className="error-banner animate-fade-in" style={{ marginBottom: '16px' }}>
                                    <AlertCircle size={14} /> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                        <input className="input-field" type="email"
                                            value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                                            placeholder="you@gmail.com" required autoFocus
                                            style={{ paddingLeft: '38px', fontFamily: "'Inter', sans-serif" }} disabled={loading} />
                                    </div>
                                </div>

                                <button type="submit" className="btn-brand"
                                    style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '12px', borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)' }}
                                    disabled={loading}>
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> SENDING...</> : 'SEND RESET LINK →'}
                                </button>
                            </form>

                            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                                <p style={{ fontSize: '13px', letterSpacing: '0.5px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)', fontWeight: '600' }}>
                                    REMEMBER IT?{' '}
                                    <Link to="/login" style={{ color: 'var(--yellow)', fontWeight: '700', textDecoration: 'none' }}>
                                        SIGN IN
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {/* Footer tag */}
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

export default ForgotPassword;
