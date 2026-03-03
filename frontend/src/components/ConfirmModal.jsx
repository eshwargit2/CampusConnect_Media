import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'CONFIRM', cancelText = 'CANCEL', isDangerous = false }) => {
    if (!isOpen) return null;

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(10,10,10,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="animate-scale-in" style={{
                background: 'var(--white)', maxWidth: '420px', width: '100%',
                border: 'var(--border-thick)', 
                boxShadow: isDangerous ? '12px 12px 0 var(--red)' : '12px 12px 0 var(--yellow)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    background: isDangerous ? 'var(--red)' : 'var(--black)', 
                    padding: '14px 20px',
                    borderBottom: isDangerous ? '5px solid var(--black)' : '5px solid var(--yellow)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={14} color={isDangerous ? 'var(--black)' : 'var(--yellow)'} />
                        <span style={{
                            fontFamily: "'Space Mono', monospace", fontSize: '11px',
                            fontWeight: '700', letterSpacing: '3px', 
                            color: isDangerous ? 'var(--black)' : 'var(--yellow)',
                            textTransform: 'uppercase',
                        }}>
                            {title || 'CONFIRM ACTION'}
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', 
                        border: `2px solid ${isDangerous ? 'rgba(10,10,10,0.3)' : 'rgba(245,240,232,0.3)'}`,
                        color: isDangerous ? 'var(--black)' : 'var(--white)', 
                        cursor: 'pointer',
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    borderTop: '3px solid var(--black)',
                }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '14px 20px', 
                        background: 'var(--white)',
                        border: 'none', 
                        borderRight: '3px solid var(--black)',
                        cursor: 'pointer',
                        fontFamily: "'Space Mono', monospace", 
                        fontSize: '11px', 
                        fontWeight: '700',
                        letterSpacing: '2px', 
                        textTransform: 'uppercase',
                        color: 'var(--black)',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,10,10,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
                    >
                        {cancelText}
                    </button>

                    <button onClick={() => { onConfirm(); onClose(); }} style={{
                        flex: 1, padding: '14px 20px', 
                        background: isDangerous ? 'var(--red)' : 'var(--yellow)',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Space Mono', monospace", 
                        fontSize: '11px', 
                        fontWeight: '700',
                        letterSpacing: '2px', 
                        textTransform: 'uppercase',
                        color: 'var(--black)',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = isDangerous ? '#c62828' : '#e6d000'}
                        onMouseLeave={e => e.currentTarget.style.background = isDangerous ? 'var(--red)' : 'var(--yellow)'}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
