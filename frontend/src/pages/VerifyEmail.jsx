import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, GraduationCap, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import useIsMobile from '../hooks/useIsMobile';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login: setAuthUser } = useAuth();
    const isMobile = useIsMobile();

    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error' | 'resent'
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMsg, setResendMsg] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setError('No verification token found. Please check your email for the link.');
            return;
        }

        // Call the backend to verify the token
        api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
            .then(({ data }) => {
                // Auto-login the user
                if (data.token && data.user) {
                    localStorage.setItem('cc_token', data.token);
                    localStorage.setItem('cc_user', JSON.stringify(data.user));
                    // Trigger auth context update
                    if (setAuthUser) setAuthUser(data.user);
                }
                setStatus('success');
                // Redirect to feed after 2s
                setTimeout(() => navigate('/', { replace: true }), 2500);
            })
            .catch((err) => {
                setError(err.response?.data?.error || 'Verification failed. The link may have expired.');
                setStatus('error');
            });
    }, []);

    const handleResend = async (e) => {
        e.preventDefault();
        if (!resendEmail.trim()) return;
        setResendLoading(true);
        setResendMsg('');
        try {
            const { data } = await api.post('/auth/resend-verification', { email: resendEmail });
            setResendMsg(data.message || 'Verification email resent!');
            setStatus('resent');
        } catch (err) {
            setResendMsg(err.response?.data?.error || 'Failed to resend. Try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const pad = isMobile ? '24px 20px' : '36px';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)', padding: isMobile ? '0' : '40px 24px' }}>
            {!isMobile && <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '8px', background: 'var(--yellow)' }} />}

            <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: '440px' }}>
                <div style={{ border: isMobile ? 'none' : 'var(--border-thick)', boxShadow: isMobile ? 'none' : 'var(--shadow-lg)' }}>

                    {/* ── Header ── */}
                    <div style={{ background: 'var(--black)', padding: isMobile ? '24px 20px' : '28px 36px', borderBottom: '5px solid var(--yellow)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <GraduationCap size={24} color="var(--black)" />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', letterSpacing: '3px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>EMAIL VERIFICATION</div>
                                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: '700', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '-0.5px', margin: 0 }}>
                                    VERIFY <span style={{ color: 'var(--white)' }}>ACCOUNT</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div style={{ background: 'var(--white)', padding: pad }}>

                        {/* VERIFYING */}
                        {status === 'verifying' && (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <Loader2 size={44} className="animate-spin" style={{ color: 'var(--yellow)', marginBottom: '16px' }} />
                                <p style={{ fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
                                    Verifying your email...
                                </p>
                            </div>
                        )}

                        {/* SUCCESS */}
                        {status === 'success' && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎉</div>
                                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: '700', color: 'var(--black)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    EMAIL VERIFIED!
                                </h2>
                                <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'rgba(10,10,10,0.6)', marginBottom: '24px' }}>
                                    Your account is now active. Redirecting you to the feed…
                                </p>
                                <Loader2 size={20} className="animate-spin" style={{ color: 'var(--yellow)' }} />
                            </div>
                        )}

                        {/* ERROR */}
                        {status === 'error' && (
                            <div>
                                <div className="error-banner" style={{ marginBottom: '24px', justifyContent: 'flex-start' }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>

                                <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.5)', marginBottom: '20px', lineHeight: '1.7' }}>
                                    Enter your email below and we'll send you a new verification link:
                                </p>

                                <form onSubmit={handleResend} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label className="field-label">Email Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.4)', pointerEvents: 'none' }} />
                                            <input
                                                className="input-field"
                                                type="email"
                                                value={resendEmail}
                                                onChange={e => setResendEmail(e.target.value)}
                                                placeholder="you@gmail.com"
                                                required
                                                style={{ paddingLeft: '38px' }}
                                                disabled={resendLoading}
                                            />
                                        </div>
                                    </div>

                                    {resendMsg && (
                                        <div style={{ fontSize: '12px', color: resendMsg.includes('sent') ? 'var(--green)' : 'var(--red)', fontWeight: '700', padding: '8px 12px', border: `2px solid ${resendMsg.includes('sent') ? 'var(--green)' : 'var(--red)'}`, background: resendMsg.includes('sent') ? '#e8fff4' : '#fff0f0' }}>
                                            {resendMsg}
                                        </div>
                                    )}

                                    <button type="submit" className="btn-brand"
                                        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '12px' }}
                                        disabled={resendLoading}>
                                        {resendLoading
                                            ? <><Loader2 size={14} className="animate-spin" /> SENDING...</>
                                            : '📧 RESEND VERIFICATION EMAIL'
                                        }
                                    </button>
                                </form>

                                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                    <Link to="/login" style={{ fontSize: '12px', color: 'var(--black)', fontWeight: '700', textDecoration: 'underline' }}>
                                        ← Back to Login
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* RESENT SUCCESS */}
                        {status === 'resent' && (
                            <div style={{ textAlign: 'center' }}>
                                <CheckCircle size={48} color="var(--black)" style={{ marginBottom: '16px' }} />
                                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '18px', fontWeight: '700', color: 'var(--black)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    CHECK YOUR EMAIL
                                </h2>
                                <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'rgba(10,10,10,0.6)', marginBottom: '8px' }}>
                                    A new verification link has been sent. It expires in <strong>24 hours</strong>.
                                </p>
                                <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.4)', marginBottom: '24px' }}>
                                    Don't see it? Check your spam folder.
                                </p>
                                <Link to="/login" className="btn-ghost" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: '11px' }}>
                                    ← BACK TO LOGIN
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* ── Footer tag ── */}
                    <div style={{
                        background: 'var(--yellow)', padding: '10px 16px',
                        font: "700 10px/1 'Space Mono', monospace",
                        letterSpacing: '3px', display: 'flex', justifyContent: 'space-between',
                    }}>
                        <span>EMAIL VERIFICATION</span><span>✅</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
