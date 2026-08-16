import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, Search, X, User, ChevronRight, Info, Pencil, Trash2, Check, BadgeCheck, Paperclip, Eye, Download, FileText, Play, File, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { OnlineDot, useOnline } from '../context/OnlineContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ── Mobile hook ───────────────────────────────────────────────────────
const useIsMobile = (bp = 768) => {
    const [mobile, setMobile] = useState(window.innerWidth < bp);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth < bp);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [bp]);
    return mobile;
};

// ── Input bar height constant (mobile fixed bar) ───────────────────────
const INPUT_BAR_HEIGHT = 58; // px — keep in sync with minHeight in the textarea/button

const renderVerificationBadge = (postCount) => {
    if (postCount === undefined || postCount === null) return null;
    if (postCount >= 50) {
        return (
            <span title="Premium Gold Creator (50+ Posts)" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
                <BadgeCheck size={14} color="#ffffff" fill="#eab308" style={{ filter: 'drop-shadow(0 1px 2px rgba(234,179,8,0.2))' }} />
            </span>
        );
    }
    if (postCount >= 15) {
        return (
            <span title="Verified Blue Creator (15+ Posts)" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
                <BadgeCheck size={14} color="#ffffff" fill="#3b82f6" style={{ filter: 'drop-shadow(0 1px 2px rgba(59,130,246,0.2))' }} />
            </span>
        );
    }
    return null;
};

// ── Time format ───────────────────────────────────────────────────────
const fmtTime = (ts) => {
    const d = new Date(ts);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday ' + format(d, 'HH:mm');
    return format(d, 'MMM d, HH:mm');
};

// ── Avatar component ──────────────────────────────────────────────────
const Av = ({ user, size = 40, border = '1px solid var(--border-color)' }) => (
    user?.profile_image
        ? <img src={user.profile_image} alt={user?.username}
            style={{ width: size, height: size, border, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
        : <div style={{
            width: size, height: size, background: 'var(--yellow)', border,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Outfit', sans-serif", fontWeight: '700',
            fontSize: size * 0.38, color: '#ffffff', flexShrink: 0,
        }}>{user?.username?.charAt(0).toUpperCase() || '?'}</div>
);

// ── Profile Panel ─────────────────────────────────────────────────────
const ProfilePanel = ({ partner, partnerId, onClose, isMobile }) => {
    const { onlineUsers } = useOnline();
    const isOnline = onlineUsers[partnerId] === true;
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!partner?.username) return;
        api.get(`/users/profile/${partner.username}`)
            .then(({ data }) => setStats(data.user || data))
            .catch(() =>
                api.get(`/users/${partner.username}`)
                    .then(({ data }) => setStats(data.user || data))
                    .catch(() => { })
            );
    }, [partner?.username]);

    const body = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--white)', color: 'var(--text-body)' }}>
            {/* Header */}
            <div className="profile-panel-header">
                <span className="profile-panel-title">
                    Profile Info
                </span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                    <X size={16} />
                </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
                {/* Cover */}
                <div style={{
                    height: '80px', background: 'var(--primary-tint)',
                    backgroundImage: 'radial-gradient(var(--yellow) 0.5px, transparent 0.5px), radial-gradient(var(--yellow) 0.5px, var(--white) 0.5px)',
                    backgroundSize: '10px 10px',
                    backgroundPosition: '0 0, 5px 5px',
                    opacity: 0.4
                }} />

                <div style={{ padding: '0 16px 24px', marginTop: '-30px' }}>
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                        <Av user={partner} size={62} border="3px solid var(--white)" />
                        <OnlineDot userId={partnerId} size={12} />
                    </div>

                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--black)', margin: '0 0 4px' }}>
                        {partner?.username}
                        {renderVerificationBadge(partner?.posts_count)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--text-muted)' }} />
                        <span style={{ fontSize: '9px', letterSpacing: '1px', fontWeight: '700', color: isOnline ? 'var(--green)' : 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>
                            {isOnline ? 'Online Now' : 'Offline'}
                        </span>
                    </div>

                    {(stats?.bio || partner?.bio) && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.55', marginBottom: '16px' }}>
                            {stats?.bio || partner?.bio}
                        </p>
                    )}

                    {stats && (
                        <div className="profile-card-stats">
                            {[{ l: 'Posts', v: stats.posts_count ?? 0 }, { l: 'Followers', v: stats.followers_count ?? 0 }, { l: 'Following', v: stats.following_count ?? 0 }].map((s, i) => (
                                <div key={s.l} className="profile-card-stat-item">
                                    <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '14px', color: 'var(--black)' }}>{s.v}</p>
                                    <p style={{ fontSize: '8px', letterSpacing: '0.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '500' }}>{s.l}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <Link to={`/profile/${partner?.username}`} style={{ textDecoration: 'none' }}>
                        <button className="profile-button-view">
                            <User size={12} /> View Full Profile <ChevronRight size={12} />
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '85dvh', border: '1px solid var(--border-color)', borderBottom: 'none', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', overflow: 'hidden' }}>
                    {body}
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '255px', flexShrink: 0, borderLeft: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {body}
        </div>
    );
};

// ── Message bubble with edit/delete ──────────────────────────────────
const MessageBubble = ({ msg, isMe, showAv, partner, isMobile, onEdit, onDelete, onViewPhoto, onViewDoc }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(msg.content);
    const menuRef = useRef(null);
    const editRef = useRef(null);
    const isOpt = msg.id?.startsWith('opt-');

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', h);
        document.addEventListener('touchstart', h);
        return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
    }, [menuOpen]);

    useEffect(() => {
        if (editing) { setEditText(msg.content); setTimeout(() => editRef.current?.focus(), 50); }
    }, [editing]);

    const submitEdit = async () => {
        const trimmed = editText.trim();
        if (!trimmed || trimmed === msg.content) { setEditing(false); return; }
        await onEdit(msg.id, trimmed);
        setEditing(false);
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
        if (e.key === 'Escape') { setEditing(false); setEditText(msg.content); }
    };

    return (
        <div className="bubble-container" style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}>
            {/* Partner avatar */}
            {!isMe && (
                <div style={{ width: 28, flexShrink: 0 }}>
                    {showAv && <Av user={partner} size={28} border="1px solid var(--border-color)" />}
                </div>
            )}

            {/* Bubble + actions row */}
            <div className="bubble-wrap" style={{ flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: isMobile ? '80%' : '70%' }}>

                {/* Edit/Delete menu toggle — only for my messages, not optimistic */}
                {isMe && !isOpt && !editing && (
                    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={() => setMenuOpen(s => !s)}
                            className="bubble-action-trigger"
                        >
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                            </svg>
                        </button>

                        {/* Dropdown menu */}
                        {menuOpen && (
                            <div className="bubble-dropdown-menu">
                                <button
                                    onClick={() => { setMenuOpen(false); setEditing(true); }}
                                    className="bubble-dropdown-btn"
                                >
                                    <Pencil size={11} color="var(--yellow)" /> Edit
                                </button>
                                <button
                                    onClick={() => { setMenuOpen(false); onDelete(msg.id); }}
                                    className="bubble-dropdown-btn delete"
                                >
                                    <Trash2 size={11} color="var(--red)" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Bubble */}
                <div className={`msg-bubble ${isMe ? 'me' : 'them'}`} style={{ opacity: isOpt ? 0.55 : 1 }}>
                    {editing ? (
                        /* Edit mode */
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                            <textarea
                                ref={editRef}
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                rows={1}
                                style={{
                                    flex: 1, border: 'none', outline: 'none', resize: 'none',
                                    background: 'rgba(255,255,255,0.08)', color: 'var(--white)',
                                    fontFamily: "'Inter', sans-serif", fontSize: '13px',
                                    lineHeight: '1.5', padding: '4px 6px', minWidth: 0,
                                    borderBottom: '2.5px solid var(--white)',
                                    maxHeight: '120px', overflowY: 'auto',
                                }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                                <button onClick={submitEdit} style={{ background: '#ffffff', border: 'none', borderRadius: '50%', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={12} color="var(--yellow)" strokeWidth={3} />
                                </button>
                                <button onClick={() => { setEditing(false); setEditText(msg.content); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={12} color="rgba(255,255,255,0.8)" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Render image attachment if exists */}
                            {msg.attachment_url && msg.attachment_type === 'image' && (
                                <div 
                                    onClick={() => onViewPhoto(msg.attachment_url)}
                                    style={{
                                        position: 'relative',
                                        borderRadius: '12px',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        marginBottom: msg.content ? '8px' : '0',
                                        maxHeight: '220px',
                                        maxWidth: '300px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <img 
                                        src={msg.attachment_url} 
                                        alt={msg.attachment_name || "Attachment"} 
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            maxHeight: '220px',
                                            objectFit: 'cover',
                                            display: 'block',
                                            transition: 'transform 0.3s ease'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                    <div style={{
                                        position: 'absolute', inset: 0, 
                                        background: 'rgba(0,0,0,0.25)', opacity: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'opacity 0.2s ease', color: '#fff', fontSize: '11px',
                                        fontFamily: "'Inter', sans-serif"
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                    >
                                        <Eye size={14} style={{ marginRight: '4px' }} /> View Photo
                                    </div>
                                </div>
                            )}

                            {/* Render video attachment if exists */}
                            {msg.attachment_url && msg.attachment_type === 'video' && (
                                <div style={{
                                    position: 'relative',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    marginBottom: msg.content ? '8px' : '0',
                                    maxHeight: '220px',
                                    maxWidth: '300px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: '#000000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <video 
                                        src={msg.attachment_url} 
                                        controls 
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            maxHeight: '220px',
                                            display: 'block'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Render document attachment if exists */}
                            {msg.attachment_url && ['pdf', 'docx', 'pptx', 'xlsx', 'raw'].includes(msg.attachment_type) && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: isMe ? 'rgba(255, 255, 255, 0.12)' : 'rgba(30, 41, 59, 0.05)',
                                    border: isMe ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(30, 41, 59, 0.08)',
                                    marginBottom: msg.content ? '8px' : '0',
                                    minWidth: '200px',
                                    maxWidth: '260px',
                                    wordBreak: 'break-all'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            padding: '6px',
                                            borderRadius: '6px',
                                            background: msg.attachment_type === 'pdf' ? 'rgba(239, 68, 68, 0.15)' : 
                                                        msg.attachment_type === 'docx' ? 'rgba(59, 130, 246, 0.15)' : 
                                                        msg.attachment_type === 'pptx' ? 'rgba(249, 115, 22, 0.15)' : 
                                                        msg.attachment_type === 'xlsx' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                            color: msg.attachment_type === 'pdf' ? '#ef4444' : 
                                                   msg.attachment_type === 'docx' ? '#3b82f6' : 
                                                   msg.attachment_type === 'pptx' ? '#f97316' : 
                                                   msg.attachment_type === 'xlsx' ? '#22c55e' : 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <FileText size={18} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: isMe ? '#ffffff' : 'var(--black)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }} title={msg.attachment_name}>
                                                {msg.attachment_name || 'Document'}
                                            </p>
                                            <p style={{
                                                fontSize: '8px',
                                                color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                marginTop: '1px',
                                                fontWeight: '700'
                                            }}>
                                                {msg.attachment_type === 'raw' ? 'file' : msg.attachment_type}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        marginTop: '2px',
                                        borderTop: isMe ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
                                        paddingTop: '6px'
                                    }}>
                                        {!isOpt && ['pdf', 'docx', 'pptx', 'xlsx'].includes(msg.attachment_type) && (
                                            <button 
                                                onClick={() => onViewDoc({ url: msg.attachment_url, type: msg.attachment_type, name: msg.attachment_name })}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '2px',
                                                    padding: '5px 8px',
                                                    borderRadius: '6px',
                                                    border: 'none',
                                                    background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)',
                                                    color: isMe ? '#ffffff' : 'var(--black)',
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = isMe ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)'}
                                                onMouseLeave={e => e.currentTarget.style.background = isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)'}
                                            >
                                                <Eye size={10} /> View
                                            </button>
                                        )}
                                        <a 
                                            href={msg.attachment_url} 
                                            download={msg.attachment_name || 'download'} 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '2px',
                                                padding: '5px 8px',
                                                borderRadius: '6px',
                                                background: isMe ? '#ffffff' : 'var(--black)',
                                                color: isMe ? 'var(--yellow)' : '#ffffff',
                                                fontSize: '10px',
                                                fontWeight: '600',
                                                textDecoration: 'none',
                                                textAlign: 'center',
                                                transition: 'transform 0.15s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <Download size={10} /> Get
                                        </a>
                                    </div>
                                </div>
                            )}

                            {msg.content && (
                                <p style={{
                                    fontSize: isMobile ? '13.5px' : '13px', lineHeight: '1.45',
                                    wordBreak: 'break-word', fontFamily: "'Inter', sans-serif",
                                }}>{msg.content}</p>
                            )}
                            
                            <p className="bubble-time">
                                {isOpt ? '...' : fmtTime(msg.created_at)}
                                {isMe && !isOpt && (
                                    <span style={{ marginLeft: '4px', color: msg.read_at ? 'var(--white)' : 'rgba(255,255,255,0.5)' }}>
                                        {msg.read_at ? '✓✓' : '✓'}
                                    </span>
                                )}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Messages Page ────────────────────────────────────────────────
const Messages = () => {
    const { partnerId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isMobile = useIsMobile(768);

    const [conversations, setConversations] = useState([]);
    const [convsLoading, setConvsLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [msgsLoading, setMsgsLoading] = useState(false);
    const [partner, setPartner] = useState(null);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    // Staged attachments & Viewer Modals state
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [activePhoto, setActivePhoto] = useState(null);
    const [activeDoc, setActiveDoc] = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const pollRef = useRef(null);
    const searchDebRef = useRef(null);

    // Clean up staged preview URL on change/unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            if (filePreview && filePreview.url) {
                URL.revokeObjectURL(filePreview.url);
            }
        };
    }, [filePreview]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (filePreview && filePreview.url) {
            URL.revokeObjectURL(filePreview.url);
        }

        let fileType = 'raw';
        const fileMime = file.type || '';

        if (fileMime.startsWith('image/')) {
            fileType = 'image';
        } else if (fileMime.startsWith('video/')) {
            fileType = 'video';
        } else if (fileMime === 'application/pdf') {
            fileType = 'pdf';
        } else if (fileMime.includes('word') || fileMime.includes('msword')) {
            fileType = 'docx';
        } else if (fileMime.includes('presentation') || fileMime.includes('powerpoint')) {
            fileType = 'pptx';
        } else if (fileMime.includes('spreadsheet') || fileMime.includes('excel')) {
            fileType = 'xlsx';
        }

        setSelectedFile(file);
        setFilePreview({
            url: URL.createObjectURL(file),
            type: fileType,
            name: file.name,
            size: file.size
        });
    };

    const removeSelectedFile = () => {
        if (filePreview && filePreview.url) {
            URL.revokeObjectURL(filePreview.url);
        }
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const showSidebar = !isMobile || !partnerId;
    const showChat = !isMobile || !!partnerId;

    // ── Load conversations ──
    const loadConversations = useCallback(async () => {
        try {
            const { data } = await api.get('/messages');
            setConversations(data.conversations || []);
        } catch { /* noop */ }
        finally { setConvsLoading(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // ── Load thread ──
    const loadThread = useCallback(async () => {
        if (!partnerId) return;
        setMsgsLoading(true);
        try {
            const { data } = await api.get(`/messages/${partnerId}`);
            setMessages(data.messages || []);
            setPartner(data.partner);
        } catch { toast.error('Failed to load messages'); }
        finally { setMsgsLoading(false); }
    }, [partnerId]);

    useEffect(() => { setMessages([]); setPartner(null); setShowProfile(false); loadThread(); }, [partnerId]);

    // ── Poll 4s ──
    useEffect(() => {
        if (!partnerId) return;
        pollRef.current = setInterval(async () => {
            try {
                const { data } = await api.get(`/messages/${partnerId}`);
                setMessages(data.messages || []);
                loadConversations();
            } catch { /* noop */ }
        }, 4000);
        return () => clearInterval(pollRef.current);
    }, [partnerId, loadConversations]);

    // ── Scroll to bottom ──
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ── Auto-resize textarea ──
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }, [text]);

    // ── User search ──
    const handleSearch = (q) => {
        setSearchQ(q);
        clearTimeout(searchDebRef.current);
        if (!q.trim()) { setSearchResults([]); return; }
        searchDebRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
                setSearchResults((data.users || []).filter(u => u.id !== user?.id));
            } catch { setSearchResults([]); }
            setSearching(false);
        }, 250);
    };

    const startConversation = (u) => {
        setShowSearch(false); setSearchQ(''); setSearchResults([]);
        navigate(`/messages/${u.id}`);
    };

    // ── Send ──
    const sendMessage = async () => {
        if ((!text.trim() && !selectedFile) || sending) return;
        const content = text.trim();
        const file = selectedFile;
        const preview = filePreview;
        
        setText('');
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setSending(true);

        const opt = { 
            id: `opt-${Date.now()}`, 
            sender_id: user.id, 
            receiver_id: partnerId, 
            content, 
            created_at: new Date().toISOString(), 
            read_at: null,
            attachment_url: preview ? preview.url : null,
            attachment_type: preview ? preview.type : null,
            attachment_name: preview ? preview.name : null
        };
        
        setMessages(p => [...p, opt]);
        
        try {
            let res;
            if (file) {
                // Determine resource type for Cloudinary direct upload
                let resourceType = 'raw';
                if (preview.type === 'image') {
                    resourceType = 'image';
                } else if (preview.type === 'video') {
                    resourceType = 'video';
                }

                // 1. Get Cloudinary signature from backend
                const { data: signData } = await api.get('/messages/cloudinary-signature');
                const { signature, timestamp, apiKey, cloudName } = signData;

                // 2. Upload file directly to Cloudinary
                const cloudFormData = new FormData();
                cloudFormData.append('file', file);
                cloudFormData.append('api_key', apiKey);
                cloudFormData.append('timestamp', timestamp);
                cloudFormData.append('signature', signature);
                cloudFormData.append('folder', 'messages');

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
                    method: 'POST', 
                    body: cloudFormData
                });
                
                if (!cloudRes.ok) {
                    throw new Error('Cloudinary upload failed');
                }
                
                const cloudJson = await cloudRes.json();
                const uploadedUrl = cloudJson.secure_url;

                // 3. Post reference metadata to messaging backend
                res = await api.post(`/messages/${partnerId}`, {
                    content,
                    attachmentUrl: uploadedUrl,
                    attachmentType: preview.type,
                    attachmentName: file.name
                });
            } else {
                res = await api.post(`/messages/${partnerId}`, { content });
            }
            const { data } = res;
            setMessages(p => p.map(m => m.id === opt.id ? data.message : m));
            loadConversations();
        } catch (err) {
            console.error('Send message error:', err);
            setMessages(p => p.filter(m => m.id !== opt.id));
            setText(content);
            if (file && preview) {
                setSelectedFile(file);
                setFilePreview(preview);
            }
            toast.error('Failed to send');
        }
        setSending(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    // ── Edit message ──
    const handleEdit = async (msgId, newContent) => {
        try {
            const { data } = await api.patch(`/messages/${msgId}`, { content: newContent });
            setMessages(p => p.map(m => m.id === msgId ? data.message : m));
        } catch { toast.error('Failed to edit'); }
    };

    // ── Delete message ──
    const handleDelete = async (msgId) => {
        setMessages(p => p.filter(m => m.id !== msgId));
        try {
            await api.delete(`/messages/${msgId}`);
            loadConversations();
        } catch {
            toast.error('Failed to delete');
            loadThread(); // re-fetch to restore
        }
    };

    // Group by date
    const groupedMessages = messages.reduce((acc, msg) => {
        const key = format(new Date(msg.created_at), 'yyyy-MM-dd');
        if (!acc[key]) acc[key] = [];
        acc[key].push(msg);
        return acc;
    }, {});

    const dateLabel = (key) => {
        const d = new Date(key);
        if (isToday(d)) return 'TODAY';
        if (isYesterday(d)) return 'YESTERDAY';
        return format(d, 'MMM d, yyyy').toUpperCase();
    };

    return (
        <div style={{
            display: 'flex',
            position: 'fixed',
            top: isMobile ? '60px' : '76px',
            bottom: 0,
            left: 0,
            right: 0,
            border: 'none',
            boxShadow: 'none',
            borderRadius: '0',
            background: 'var(--white)', color: 'var(--text-body)',
            overflow: 'hidden',
            /* Account for safe areas on mobile */
            paddingLeft: 'env(safe-area-inset-left, 0px)',
            paddingRight: 'env(safe-area-inset-right, 0px)',
            zIndex: 10,
        }}>
            <style>{`
                .msg-sidebar {
                    background: var(--white);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border-right: 1px solid var(--border-color);
                }

                .msg-sidebar-header {
                    background: var(--white);
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }

                .msg-sidebar-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    color: var(--black);
                    text-transform: uppercase;
                }

                .msg-search-toggle {
                    background: var(--primary-tint);
                    border: none;
                    color: var(--yellow);
                    border-radius: 50%;
                    width: 34px;
                    height: 34px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .msg-search-toggle:hover {
                    background: var(--yellow);
                    color: #ffffff;
                    transform: scale(1.05);
                }

                .msg-search-bar {
                    background: var(--primary-tint);
                    border-bottom: 1px solid var(--border-color);
                    padding: 2px 14px;
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }
                .msg-search-input {
                    flex: 1;
                    background: none;
                    border: none;
                    outline: none;
                    padding: 12px 8px;
                    color: var(--black);
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }

                .conv-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid var(--border-color);
                    border-left: 4px solid transparent;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s ease;
                    outline: none;
                }
                .conv-item:hover {
                    background: rgba(59, 130, 246, 0.04);
                }
                .conv-item.active {
                    background: var(--primary-tint);
                    border-left-color: var(--yellow);
                }

                .conv-unread-badge {
                    background: var(--yellow);
                    color: #ffffff;
                    font-size: 9px;
                    font-weight: 700;
                    min-width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3);
                }

                .chat-header {
                    background: var(--white);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 20px;
                    z-index: 5;
                    flex-shrink: 0;
                    width: 100%;
                }

                .chat-partner-name {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 700;
                    font-size: 14px;
                    color: var(--black);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .chat-partner-sub {
                    font-size: 8px;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    font-family: 'Outfit', sans-serif;
                    margin-top: 1px;
                }

                .chat-back-btn {
                    background: var(--primary-tint);
                    border: none;
                    color: var(--yellow);
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .chat-back-btn:hover {
                    background: var(--yellow);
                    color: #ffffff;
                    transform: scale(1.05);
                }

                /* Bubbles */
                .bubble-container {
                    display: flex;
                    align-items: flex-end;
                    gap: 8px;
                    margin-bottom: 8px;
                    position: relative;
                    transition: all 0.2s ease;
                }

                .bubble-wrap {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    position: relative;
                }

                .msg-bubble {
                    padding: 10px 14px;
                    border-radius: 18px;
                    font-family: 'Inter', sans-serif;
                    font-size: 13.5px;
                    line-height: 1.45;
                    word-break: break-word;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                    transition: all 0.2s ease;
                    position: relative;
                }

                .msg-bubble.me {
                    background: linear-gradient(135deg, var(--yellow) 0%, #2563eb 100%);
                    color: #ffffff;
                    border-bottom-right-radius: 4px;
                }

                .msg-bubble.them {
                    background: rgba(30, 41, 59, 0.05);
                    color: var(--text-body);
                    border-bottom-left-radius: 4px;
                    border: 1px solid rgba(30, 41, 59, 0.04);
                }
                [data-theme="dark"] .msg-bubble.them {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.04);
                }

                .bubble-time {
                    font-size: 8px;
                    letter-spacing: 0.3px;
                    margin-top: 4px;
                    text-align: right;
                    font-family: 'Space Mono', monospace;
                }
                .msg-bubble.me .bubble-time {
                    color: rgba(255, 255, 255, 0.65);
                }
                .msg-bubble.them .bubble-time {
                    color: var(--text-muted);
                }

                .bubble-action-trigger {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: var(--text-muted);
                    opacity: 0;
                    transition: opacity 0.2s ease, color 0.2s ease;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    outline: none;
                }
                .bubble-container:hover .bubble-action-trigger {
                    opacity: 1;
                }
                .bubble-action-trigger:hover {
                    background: rgba(0, 0, 0, 0.04);
                    color: var(--black);
                }
                [data-theme="dark"] .bubble-action-trigger:hover {
                    background: rgba(255, 255, 255, 0.06);
                    color: #ffffff;
                }

                .bubble-dropdown-menu {
                    position: absolute;
                    bottom: 100%;
                    right: 0;
                    background: var(--white);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    z-index: 20;
                    min-width: 110px;
                    margin-bottom: 4px;
                    overflow: hidden;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .bubble-dropdown-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    background: none;
                    border: none;
                    color: var(--text-body);
                    cursor: pointer;
                    text-align: left;
                    font-family: 'Inter', sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    transition: background 0.15s ease;
                }
                .bubble-dropdown-btn:hover {
                    background: var(--primary-tint);
                }
                .bubble-dropdown-btn.delete {
                    color: var(--red);
                }
                .bubble-dropdown-btn.delete:hover {
                    background: var(--danger-tint);
                }

                /* Chat Input */
                .chat-input-area {
                    border-top: 1px solid var(--border-color);
                    background: var(--white);
                    padding: 12px 16px;
                    display: flex;
                    align-items: flex-end;
                    gap: 12px;
                    flex-shrink: 0;
                    box-sizing: border-box;
                }

                .chat-input-wrapper {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    border-radius: 24px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-body);
                    transition: all 0.25s ease;
                    overflow: hidden;
                }
                .chat-input-wrapper:focus-within {
                    border-color: var(--yellow);
                    background: var(--white);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }

                .chat-input-field {
                    flex: 1;
                    border: none;
                    outline: none;
                    resize: none;
                    padding: 10px 16px;
                    font-size: 13.5px;
                    font-family: 'Inter', sans-serif;
                    line-height: 1.5;
                    background: transparent;
                    color: var(--text-body);
                    max-height: 120px;
                    overflow-y: auto;
                }

                .chat-send-btn {
                    background: var(--primary-tint);
                    border: none;
                    color: var(--yellow);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: default;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.25s ease;
                    flex-shrink: 0;
                    outline: none;
                }
                .chat-send-btn.active {
                    background: var(--yellow);
                    color: #ffffff;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.35);
                }
                .chat-send-btn.active:hover {
                    transform: scale(1.08);
                }
                .chat-send-btn.active:active {
                    transform: scale(0.95);
                }

                /* Profile Panel Modernized */
                .profile-panel-header {
                    background: var(--white);
                    padding: 14px 18px;
                    flex-shrink: 0;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .profile-panel-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 2px;
                    color: var(--black);
                    text-transform: uppercase;
                }

                .profile-card-stats {
                    display: flex;
                    border: 1px solid var(--border-color);
                    background: var(--white);
                    border-radius: 12px;
                    margin-bottom: 16px;
                    overflow: hidden;
                }
                .profile-card-stat-item {
                    flex: 1;
                    text-align: center;
                    padding: 10px 4px;
                    border-right: 1px solid var(--border-color);
                }
                .profile-card-stat-item:last-child {
                    border-right: none;
                }

                .profile-button-view {
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    background: var(--black);
                    color: var(--white);
                    border: none;
                    border-radius: 14px;
                    padding: 12px;
                    cursor: pointer;
                    font-family: 'Outfit', sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    transition: all 0.2s ease;
                }
                .profile-button-view:hover {
                    background: var(--yellow);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(8px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinner {
                    animation: spin 1s linear infinite;
                }
            `}</style>

            {/* ══ SIDEBAR ══ */}
            {showSidebar && (
                <div className="msg-sidebar" style={{ width: isMobile ? '100%' : '300px' }}>
                    {/* Header */}
                    <div className="msg-sidebar-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageSquare size={16} color="var(--yellow)" />
                            <span className="msg-sidebar-title">Messages</span>
                        </div>
                        <button onClick={() => setShowSearch(s => !s)} className="msg-search-toggle">
                            {showSearch ? <X size={15} /> : <Search size={15} />}
                        </button>
                    </div>

                    {/* New chat search */}
                    {showSearch && (
                        <div className="msg-search-bar">
                            <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            <input autoFocus value={searchQ} onChange={e => handleSearch(e.target.value)}
                                placeholder="Find a user..."
                                className="msg-search-input"
                            />
                            {searchQ && (
                                <button onClick={() => handleSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    {showSearch && searchResults.length > 0 && (
                        <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-color)', maxHeight: '200px', overflowY: 'auto', flexShrink: 0 }}>
                            {searching && <div style={{ padding: '10px 16px', fontSize: '10px', letterSpacing: '1px', color: 'var(--text-muted)' }}>Searching...</div>}
                            {searchResults.map(u => (
                                <button key={u.id} onClick={() => startConversation(u)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 16px', background: 'transparent',
                                        border: 'none', borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer', textAlign: 'left',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-tint)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <Av user={u} size={38} border="1px solid var(--yellow)" />
                                        <OnlineDot userId={u.id} size={8} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '13px', color: 'var(--black)', textTransform: 'uppercase' }}>
                                            {u.username}
                                            {renderVerificationBadge(u.posts_count)}
                                        </p>
                                        {u.bio && <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? '80px' : '0' }}>
                        {convsLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ width: '24px', height: '24px' }} />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                                <MessageSquare size={36} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 14px', display: 'block' }} />
                                <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px' }}>NO CONVERSATIONS</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tap search icon to find someone</p>
                            </div>
                        ) : conversations.map(conv => {
                            const active = conv.partner.id === partnerId;
                            const mine = conv.lastMessage.sender_id === user?.id;
                            return (
                                <button key={conv.partner.id}
                                    onClick={() => navigate(`/messages/${conv.partner.id}`)}
                                    className={`conv-item ${active ? 'active' : ''}`}
                                >
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <Av user={conv.partner} size={isMobile ? 46 : 42} />
                                        <OnlineDot userId={conv.partner.id} size={10} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px', marginBottom: '3px' }}>
                                            <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {conv.partner.username}
                                                {renderVerificationBadge(conv.partner.posts_count)}
                                            </p>
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}>
                                                {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })}
                                            </span>
                                        </div>
                                        <p style={{
                                            fontSize: '12px',
                                            color: conv.unread > 0 ? 'var(--black)' : 'var(--text-muted)',
                                            fontWeight: conv.unread > 0 ? '600' : '400',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {mine ? 'You: ' : ''}{conv.lastMessage.content}
                                        </p>
                                    </div>
                                    {conv.unread > 0 && (
                                        <div className="conv-unread-badge">
                                            {conv.unread}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══ CHAT PANEL ══ */}
            {showChat && (
                <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
                    {!partnerId ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                            <MessageSquare size={52} style={{ color: 'var(--text-muted)', opacity: 0.15 }} />
                            <p style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', fontFamily: "'Outfit', sans-serif" }}>
                                SELECT A CONVERSATION
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Chat column — MUST be flex column with fixed height */}
                            <div style={{
                                flex: 1, display: 'flex', flexDirection: 'column',
                                minWidth: 0, overflow: 'hidden',
                                /* Critical: constrain height inside the parent */
                                height: '100%',
                            }}>
                                {/* Header */}
                                <div className="chat-header">
                                    <button onClick={() => navigate('/messages')} className="chat-back-btn" style={{ marginRight: '8px' }}>
                                        <ArrowLeft size={18} />
                                    </button>
                                    <button onClick={() => setShowProfile(s => !s)} style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0,
                                        WebkitTapHighlightColor: 'transparent',
                                    }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <Av user={partner} size={isMobile ? 36 : 38} border="1px solid var(--yellow)" />
                                            <OnlineDot userId={partnerId} size={9} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p className="chat-partner-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {partner?.username || '...'}
                                                {renderVerificationBadge(partner?.posts_count)}
                                            </p>
                                            <p className="chat-partner-sub">
                                                Tap for profile
                                            </p>
                                        </div>
                                        <Info size={16} color={showProfile ? 'var(--yellow)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                                    </button>
                                </div>

                                {/* Messages area — flex: 1 = takes all remaining space */}
                                <div style={{
                                    flex: 1, overflowY: 'auto',
                                    padding: isMobile ? '10px 10px 6px' : '14px 14px 6px',
                                    /* On mobile, reserve space for the fixed input bar */
                                    paddingBottom: isMobile ? `${INPUT_BAR_HEIGHT + 20}px` : '6px',
                                    display: 'flex', flexDirection: 'column', gap: '2px',
                                    WebkitOverflowScrolling: 'touch',
                                    /* Prevent iOS bouncing from hiding input */
                                    overscrollBehavior: 'contain',
                                }}>

                                    {msgsLoading ? (
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
                                            <div className="spinner" style={{ width: '28px', height: '28px' }} />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '30px 20px' }}>
                                            <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', fontFamily: "'Outfit', sans-serif" }}>NO MESSAGES YET</p>
                                            <p style={{ fontSize: '20px' }}>👋</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>Say hello to {partner?.username}!</p>
                                        </div>
                                    ) : Object.entries(groupedMessages).map(([key, dayMsgs]) => (
                                        <React.Fragment key={key}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 6px' }}>
                                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                                                <span style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>
                                                    {dateLabel(key)}
                                                </span>
                                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                                            </div>
                                            {dayMsgs.map((msg, idx) => (
                                                <MessageBubble
                                                    key={msg.id}
                                                    msg={msg}
                                                    isMe={msg.sender_id === user?.id}
                                                    showAv={msg.sender_id !== user?.id && (idx === 0 || dayMsgs[idx - 1]?.sender_id !== msg.sender_id)}
                                                    partner={partner}
                                                    isMobile={isMobile}
                                                    onEdit={handleEdit}
                                                    onDelete={handleDelete}
                                                    onViewPhoto={setActivePhoto}
                                                    onViewDoc={setActiveDoc}
                                                />
                                            ))}
                                        </React.Fragment>
                                    ))}
                                    <div ref={messagesEndRef} style={{ height: 1 }} />
                                </div>

                                {/* ── Input bar ── */}
                                <div className="chat-input-area" style={isMobile ? {
                                    position: 'fixed',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    zIndex: 40,
                                    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                                    paddingLeft: 'env(safe-area-inset-left, 16px)',
                                    paddingRight: 'env(safe-area-inset-right, 16px)',
                                    borderTop: '1px solid var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    background: 'var(--white)'
                                } : {
                                    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    background: 'var(--white)'
                                }}>
                                    {/* Selected File Preview Box */}
                                    {filePreview && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            background: 'var(--primary-tint)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '14px',
                                            padding: '8px 12px',
                                            marginBottom: '8px',
                                            animation: 'slideUp 0.15s ease-out',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}>
                                            {filePreview.type === 'image' ? (
                                                <img 
                                                    src={filePreview.url} 
                                                    alt="Preview" 
                                                    style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} 
                                                />
                                            ) : filePreview.type === 'video' ? (
                                                <div style={{
                                                    width: '38px', height: '38px', borderRadius: '8px', 
                                                    background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                                                }}>
                                                    <Play size={16} />
                                                </div>
                                            ) : (
                                                <div style={{
                                                    width: '38px', height: '38px', borderRadius: '8px', 
                                                    background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--yellow)'
                                                }}>
                                                    <FileText size={18} />
                                                </div>
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {filePreview.name}
                                                </p>
                                                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                    {(filePreview.size / 1024 / 1024).toFixed(2)} MB • Staged
                                                </p>
                                            </div>
                                            <button 
                                                onClick={removeSelectedFile}
                                                style={{
                                                    background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer',
                                                    padding: '4px', display: 'flex', alignItems: 'center'
                                                }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', width: '100%' }}>
                                        {/* Attachment Button */}
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={sending}
                                            style={{
                                                background: filePreview ? 'var(--yellow)' : 'var(--primary-tint)',
                                                border: 'none',
                                                color: filePreview ? '#ffffff' : 'var(--yellow)',
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease',
                                                flexShrink: 0
                                            }}
                                            onMouseEnter={e => {
                                                if (!filePreview) e.currentTarget.style.background = 'var(--yellow)';
                                                if (!filePreview) e.currentTarget.style.color = '#ffffff';
                                            }}
                                            onMouseLeave={e => {
                                                if (!filePreview) e.currentTarget.style.background = 'var(--primary-tint)';
                                                if (!filePreview) e.currentTarget.style.color = 'var(--yellow)';
                                            }}
                                            title="Attach Photo, Video or Document"
                                        >
                                            <Paperclip size={18} />
                                        </button>
                                        
                                        <input 
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            accept="image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                                        />

                                        <div className="chat-input-wrapper">
                                            <textarea
                                                ref={textareaRef}
                                                value={text}
                                                onChange={e => setText(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type a message..."
                                                rows={1}
                                                maxLength={2000}
                                                className="chat-input-field"
                                                disabled={sending}
                                            />
                                        </div>
                                        <button
                                            onClick={sendMessage}
                                            disabled={(!text.trim() && !selectedFile) || sending}
                                            className={`chat-send-btn ${(text.trim() || selectedFile) && !sending ? 'active' : ''}`}
                                            title="Send Message"
                                        >
                                            {sending ? (
                                                <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                            ) : (
                                                <Send size={18} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Profile panel — desktop inline */}
                            {showProfile && !isMobile && (
                                <ProfilePanel partner={partner} partnerId={partnerId} onClose={() => setShowProfile(false)} isMobile={false} />
                            )}

                            {/* Profile panel — mobile bottom sheet */}
                            {showProfile && isMobile && (
                                <ProfilePanel partner={partner} partnerId={partnerId} onClose={() => setShowProfile(false)} isMobile={true} />
                            )}

                            {/* Photo Viewer Modal */}
                            {activePhoto && (
                                <div 
                                    onClick={() => setActivePhoto(null)}
                                    style={{
                                        position: 'fixed',
                                        inset: 0,
                                        zIndex: 999,
                                        background: 'rgba(15, 23, 42, 0.95)',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '24px',
                                        animation: 'fadeIn 0.25s ease-out'
                                    }}
                                >
                                    <button 
                                        onClick={() => setActivePhoto(null)}
                                        style={{
                                            position: 'absolute',
                                            top: '20px',
                                            right: '20px',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            color: '#ffffff',
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            zIndex: 1000,
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    >
                                        <X size={20} />
                                    </button>
                                    <img 
                                        src={activePhoto} 
                                        alt="Preview" 
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '90dvh',
                                            objectFit: 'contain',
                                            borderRadius: '8px',
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                            transform: 'scale(1)',
                                            animation: 'scaleIn 0.25s ease-out'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Document Viewer Modal */}
                            {activeDoc && (
                                <div 
                                    style={{
                                        position: 'fixed',
                                        inset: 0,
                                        zIndex: 999,
                                        background: 'rgba(15, 23, 42, 0.75)',
                                        backdropFilter: 'blur(8px)',
                                        WebkitBackdropFilter: 'blur(8px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: isMobile ? '12px' : '24px',
                                        animation: 'fadeIn 0.2s ease-out'
                                    }}
                                    onClick={() => setActiveDoc(null)}
                                >
                                    <div 
                                        onClick={e => e.stopPropagation()}
                                        style={{
                                            background: 'var(--white)',
                                            width: '100%',
                                            maxWidth: '900px',
                                            height: '85dvh',
                                            borderRadius: '24px',
                                            border: '1px solid var(--border-color)',
                                            boxShadow: 'var(--shadow-lg)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            animation: 'scaleIn 0.2s ease-out'
                                        }}
                                    >
                                        {/* Header */}
                                        <div style={{
                                            padding: '16px 20px',
                                            borderBottom: '1px solid var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: 'var(--white)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                <FileText size={18} color="var(--yellow)" style={{ flexShrink: 0 }} />
                                                <span style={{
                                                    fontFamily: "'Outfit', sans-serif",
                                                    fontWeight: '700',
                                                    fontSize: '13px',
                                                    letterSpacing: '1px',
                                                    color: 'var(--black)',
                                                    textTransform: 'uppercase',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {activeDoc.name || 'Document Viewer'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <a 
                                                    href={activeDoc.url} 
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Download document"
                                                    style={{
                                                        background: 'var(--primary-tint)',
                                                        color: 'var(--yellow)',
                                                        border: 'none',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    <Download size={14} />
                                                </a>
                                                <button 
                                                    onClick={() => setActiveDoc(null)}
                                                    style={{
                                                        background: 'none',
                                                        border: '1px solid var(--border-color)',
                                                        color: 'var(--black)',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Google Docs Viewer iframe */}
                                        <div style={{ flex: 1, background: '#f8fafc', position: 'relative' }}>
                                            <iframe 
                                                src={`https://docs.google.com/gview?url=${encodeURIComponent(activeDoc.url)}&embedded=true`} 
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    border: 'none'
                                                }}
                                                title="Google Document Viewer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Messages;
