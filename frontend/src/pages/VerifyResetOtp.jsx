import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';
import api from '../lib/api';

const VerifyResetOtp = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const location = useLocation();
    
    const email = location.state?.email || '';
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // If email is missing, redirect back to forgot-password
        if (!email) {
            toast.error('Session expired. Please request a new OTP.');
            navigate('/forgot-password', { replace: true });
        }
    }, [email, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!otp.trim() || otp.length !== 6) {
            setError('ENTER A VALID 6-DIGIT OTP');
            return;
        }
        setLoading(true); setError('');
        try {
            const { data } = await api.post('/auth/verify-reset-otp', { email, otp });
            toast.success(data.message || 'OTP verified successfully!');
            // Redirect to reset password page with email and verified OTP in state
            navigate('/reset-password', { state: { email, otp } });
        } catch (err) {
            setError(err.response?.data?.error || 'VERIFICATION FAILED. TRY AGAIN.');
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
                                <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>VERIFY IDENTITY</div>
                                <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: '800', color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                                    ENTER<span style={{ color: 'var(--black)' }}> OTP</span>
                                </h1>
                            </div>
                        </div>
                        <p style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                            WE SENT A ONE-TIME PASSWORD TO YOUR REGISTERED EMAIL
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
                                <label className="field-label" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700' }}>One-Time Password (OTP)</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                    <input className="input-field" type="text"
                                        value={otp}
                                        onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                                        placeholder="Enter 6-digit OTP"
                                        required
                                        maxLength={6}
                                        disabled={loading}
                                        style={{
                                            paddingLeft: '38px',
                                            fontFamily: "'Inter', sans-serif",
                                            letterSpacing: otp ? '4px' : 'normal',
                                            fontWeight: otp ? 'bold' : 'normal'
                                        }} />
                                </div>
                            </div>

                            <button type="submit" className="btn-brand"
                                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '12px', borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)' }}
                                disabled={loading}>
                                {loading ? <><Loader2 size={15} className="animate-spin" /> VERIFYING...</> : 'VERIFY OTP →'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', letterSpacing: '0.5px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-muted)', fontWeight: '600' }}>
                                BACK TO{' '}
                                <Link to="/forgot-password" style={{ color: 'var(--yellow)', fontWeight: '700', textDecoration: 'none' }}>
                                    EMAIL REQUEST
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
                        <span>SECURE VERIFY</span><span>🔑</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyResetOtp;