import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'CONFIRM', cancelText = 'CANCEL', isDangerous = false }) => {
    if (!isOpen) return null;

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="animate-scale-in" style={{
                background: 'var(--white)', maxWidth: '420px', width: '100%',
                border: 'var(--border-thick)', 
                borderRadius: '24px',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    background: isDangerous ? 'var(--danger-tint)' : 'var(--primary-tint)', 
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={14} color={isDangerous ? 'var(--red)' : 'var(--yellow)'} />
                        <span style={{
                            fontFamily: "'Outfit', sans-serif", fontSize: '12px',
                            fontWeight: '700', letterSpacing: '1.5px', 
                            color: isDangerous ? 'var(--red)' : 'var(--yellow)',
                            textTransform: 'uppercase',
                        }}>
                            {title || 'CONFIRM ACTION'}
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', 
                        border: '1px solid var(--border-color)',
                        color: 'var(--black)', 
                        cursor: 'pointer',
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '12px',
                    }}>
                        <X size={13} />
                    </button>
                </div>

                {/* Message */}
                <div style={{ padding: '28px 24px' }}>
                    <p style={{
                        fontSize: '14px',
                        lineHeight: '1.7',
                        color: 'var(--black)',
                        textAlign: 'center',
                    }}>
                        {message}
                    </p>
                </div>

                {/* Action buttons */}
                <div style={{
                    display: 'flex', 
                    borderTop: '1px solid var(--border-color)',
                }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '14px 20px', 
                        background: 'transparent',
                        border: 'none', 
                        borderRight: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif", 
                        fontSize: '12px', 
                        fontWeight: '600',
                        letterSpacing: '1px', 
                        textTransform: 'uppercase',
                        color: 'var(--black)',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-tint)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        {cancelText}
                    </button>

                    <button onClick={() => { onConfirm(); onClose(); }} style={{
                        flex: 1, padding: '14px 20px', 
                        background: isDangerous ? 'var(--red)' : 'var(--yellow)',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif", 
                        fontSize: '12px', 
                        fontWeight: '600',
                        letterSpacing: '1px', 
                        textTransform: 'uppercase',
                        color: '#ffffff',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
                        onMouseLeave={e => e.currentTarget.style.opacity = 1}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
