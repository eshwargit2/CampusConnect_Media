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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)', padding: isMobile ? '0' : '40px 24px' }}>
            {!isMobile && <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '8px', background: 'var(--yellow)' }} />}

            <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>

                {sent ? (
                    /* ── Success state ── */
                    <div style={{ border: isMobile ? 'none' : 'var(--border-thick)', boxShadow: isMobile ? 'none' : 'var(--shadow-lg)' }}>
                        <div style={{ background: 'var(--green)', padding: isMobile ? '28px 20px' : '36px', borderBottom: '5px solid var(--black)', textAlign: 'center' }}>
                            <CheckCircle size={48} color="var(--black)" style={{ marginBottom: '12px' }} />
                            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--black)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                CHECK YOUR EMAIL
                            </h1>
                        </div>
                        <div style={{ background: 'var(--white)', padding: pad, textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '8px' }}>
                                We've sent a password reset link to
                            </p>
                            <p style={{
                                fontFamily: "'Space Mono', monospace", fontWeight: '700',
                                fontSize: '13px', letterSpacing: '1px',
                                background: 'var(--black)', color: 'var(--yellow)',
                                padding: '10px 16px', display: 'inline-block',
                                marginBottom: '20px',
                            }}>
                                {email}
                            </p>
                            <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.5)', lineHeight: '1.7', marginBottom: '24px' }}>
                                Didn't get it? Check your <strong>spam folder</strong>. The link expires in 1 hour.
                            </p>
                            <Link to="/login" className="btn-ghost" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '11px' }}>
                                ← BACK TO LOGIN
                            </Link>
                        </div>
                        <div style={{
                            background: 'var(--yellow)', padding: '10px 16px',
                            border: isMobile ? 'none' : 'var(--border-thick)', borderTop: 'none',
                            font: "700 10px/1 'Space Mono', monospace",
                            letterSpacing: '3px', display: 'flex', justifyContent: 'space-between',
                        }}>
                            <span>EMAIL SENT</span><span>📧</span>
                        </div>
                    </div>
                ) : (
                    /* ── Form ── */
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
                                    <div style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>ACCOUNT RECOVERY</div>
                                    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                        FORGOT<span style={{ color: 'var(--white)' }}> PASSWORD</span>
                                    </h1>
                                </div>
                            </div>
                            <p style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase' }}>
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
                                    <label className="field-label">Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                        <input className="input-field" type="email"
                                            value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                                            placeholder="you@gmail.com" required autoFocus
                                            style={{ paddingLeft: '38px' }} disabled={loading} />
                                    </div>
                                </div>

                                <button type="submit" className="btn-brand"
                                    style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '12px' }}
                                    disabled={loading}>
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> SENDING...</> : 'SEND RESET LINK →'}
                                </button>
                            </form>

                            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '3px solid var(--black)', textAlign: 'center' }}>
                                <p style={{ fontSize: '13px', letterSpacing: '1px' }}>
                                    REMEMBER IT?{' '}
                                    <Link to="/login" style={{ color: 'var(--black)', fontWeight: '700', textDecoration: 'underline', textDecorationThickness: '3px', textUnderlineOffset: '4px' }}>
                                        SIGN IN
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {/* Footer tag */}
                        <div style={{
                            background: 'var(--yellow)', padding: '10px 16px',
                            borderTop: 'none',
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

export default ForgotPassword;
