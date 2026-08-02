import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const _raw = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = _raw.endsWith('/api') ? _raw.slice(0, -4) : _raw;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (token) navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      sessionStorage.setItem('adminToken', data.token);
      sessionStorage.setItem('adminUser', JSON.stringify(data.admin));
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-body)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? 16 : 24,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif",
    }}>

      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--white)',
        border: 'var(--border-thick)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: 'var(--primary-tint)', padding: isMobile ? '16px 20px' : '24px 28px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: isMobile ? 22 : 28 }}>⚡</span>
            <div>
              <div style={{ fontSize: isMobile ? 13 : 16, fontWeight: 800, letterSpacing: '0.5px', color: 'var(--black)', lineHeight: 1.2 }}>
                CAMPUSCONNECT
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: 'var(--text-muted)', marginTop: 2 }}>
                ADMIN PORTAL
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '24px 20px' : '32px 28px' }}>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: 'var(--yellow)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
            Restricted Access
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 24 }}>
            Enter your admin credentials to continue
          </div>

          {error && (
            <div style={{
              background: '#fff0f0', border: '1px solid #FF2D2D', color: '#FF2D2D',
              padding: '12px 16px', fontSize: 12, fontWeight: 700, borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            }}>
              <span>⛔</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: 'var(--text-body)', borderLeft: '3px solid var(--yellow)', paddingLeft: 8 }}>
                USERNAME
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 12, fontSize: 16, pointerEvents: 'none' }}>👤</span>
                <input
                  id="admin-username"
                  type="text"
                  placeholder="admin"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  required
                  autoComplete="username"
                  style={{
                    width: '100%', padding: '13px 14px 13px 42px',
                    background: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-body)',
                    fontSize: isMobile ? 16 : 14, fontFamily: "'Inter', sans-serif",
                    outline: 'none', borderRadius: '12px', boxSizing: 'border-box',
                    transition: 'all 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--yellow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: 'var(--text-body)', borderLeft: '3px solid var(--yellow)', paddingLeft: 8 }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 12, fontSize: 16, pointerEvents: 'none' }}>🔐</span>
                <input
                  id="admin-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '13px 44px 13px 42px',
                    background: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-body)',
                    fontSize: isMobile ? 16 : 14, fontFamily: "'Inter', sans-serif",
                    outline: 'none', borderRadius: '12px', boxSizing: 'border-box',
                    transition: 'all 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--yellow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                  style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1 }}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--primary-tint)', color: 'var(--yellow)', border: 'none',
                padding: '15px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '1px',
                textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif",
                boxShadow: 'var(--clay-btn-shadow)', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginTop: 8, width: '100%', borderRadius: '12px', opacity: loading ? 0.7 : 1,
                minHeight: 48,
              }}
            >
              {loading ? '⏳ AUTHENTICATING...' : '🛡️ ACCESS ADMIN PANEL'}
            </button>
          </form>

          <div style={{ marginTop: 24, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: 0.5, lineHeight: 1.6 }}>
            🔒 This area is for administrators only. Unauthorized access is prohibited.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: 'var(--primary-tint)', borderTop: '1px solid var(--border-color)',
          padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
          fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase',
        }}>
          <span>CAMPUSCONNECT ADMIN</span>
          <span>v1.0</span>
          <span>SECURE</span>
        </div>
      </div>
    </div>
  );
}
