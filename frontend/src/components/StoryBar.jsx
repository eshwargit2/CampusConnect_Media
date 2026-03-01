import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OnlineDot } from '../context/OnlineContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const StoryBar = ({ onOpenViewer, onRefreshKey }) => {
    const { user } = useAuth();
    const [storyGroups, setStoryGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => { fetchStories(); }, [onRefreshKey]);

    const fetchStories = async () => {
        try {
            const { data } = await api.get('/stories');
            setStoryGroups(data.storyGroups || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    const scroll = (dir) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
        }
    };

    const hasMyStory = user && storyGroups.some(g => g.user.id === user.id);

    return (
        <>
            <div style={{
                background: 'var(--white)', border: 'var(--border-thick)',
                boxShadow: 'var(--shadow-lg)', marginBottom: '32px',
                position: 'relative',
            }}>
                {/* Header */}
                <div style={{
                    background: 'var(--black)', padding: '8px 16px',
                    borderBottom: '4px solid var(--yellow)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: '9px',
                        fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)',
                        textTransform: 'uppercase',
                    }}>■ STORIES</span>
                    <span style={{
                        fontSize: '8px', letterSpacing: '2px', color: 'rgba(245,240,232,0.4)',
                        textTransform: 'uppercase',
                    }}>24H • TAP TO VIEW</span>
                </div>

                {/* Scrollable row */}
                <div style={{ position: 'relative' }}>
                    {/* Left arrow */}
                    <button onClick={() => scroll(-1)} style={{
                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                        zIndex: 2, background: 'var(--black)', border: '2px solid var(--yellow)',
                        color: 'var(--yellow)', cursor: 'pointer', padding: '6px',
                        display: 'flex', opacity: 0.8,
                    }}>
                        <ChevronLeft size={14} />
                    </button>

                    <div ref={scrollRef} style={{
                        display: 'flex', gap: '0',
                        overflowX: 'auto', scrollBehavior: 'smooth',
                        padding: '16px 14px',
                        scrollbarWidth: 'none',
                    }}>
                        {/* Add story button */}
                        {user && (
                            <button onClick={() => setShowUpload(true)} style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: '6px',
                                padding: '0 14px', cursor: 'pointer',
                                background: 'none', border: 'none', flexShrink: 0,
                                minWidth: '76px',
                            }}>
                                <div style={{
                                    width: '62px', height: '62px',
                                    border: '3px dashed var(--yellow)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(255,224,0,0.08)',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--yellow)'; e.currentTarget.style.borderStyle = 'solid'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,224,0,0.08)'; e.currentTarget.style.borderStyle = 'dashed'; }}
                                >
                                    <Plus size={22} color="var(--black)" />
                                </div>
                                <span style={{
                                    fontSize: '9px', fontWeight: '700',
                                    letterSpacing: '1px', textTransform: 'uppercase',
                                    color: 'rgba(10,10,10,0.5)',
                                    fontFamily: "'Space Mono', monospace",
                                }}>
                                    {hasMyStory ? 'ADD' : 'YOUR\nSTORY'}
                                </span>
                            </button>
                        )}

                        {/* Story circles */}
                        {loading ? (
                            [1, 2, 3, 4].map(i => (
                                <div key={i} style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', gap: '6px',
                                    padding: '0 14px', flexShrink: 0,
                                }}>
                                    <div className="skeleton" style={{
                                        width: '62px', height: '62px', borderRadius: '0',
                                        border: '3px solid var(--black)',
                                    }} />
                                    <div className="skeleton" style={{ width: '42px', height: '8px' }} />
                                </div>
                            ))
                        ) : (
                            storyGroups.map(group => (
                                <button key={group.user.id}
                                    onClick={() => onOpenViewer(storyGroups, storyGroups.indexOf(group))}
                                    style={{
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: '6px',
                                        padding: '0 14px', cursor: 'pointer',
                                        background: 'none', border: 'none', flexShrink: 0,
                                        minWidth: '76px',
                                    }}
                                >
                                    <div style={{
                                        width: '62px', height: '62px',
                                        border: group.hasUnviewed
                                            ? '3px solid var(--yellow)'
                                            : '3px solid rgba(10,10,10,0.2)',
                                        boxShadow: group.hasUnviewed
                                            ? '0 0 0 2px var(--black), 4px 4px 0 var(--yellow)'
                                            : '2px 2px 0 rgba(10,10,10,0.1)',
                                        overflow: 'hidden', position: 'relative',
                                        transition: 'all 0.2s',
                                    }}>
                                        {group.user.profile_image ? (
                                            <img src={group.user.profile_image} alt={group.user.username}
                                                style={{
                                                    width: '100%', height: '100%', objectFit: 'cover',
                                                    filter: group.hasUnviewed ? 'none' : 'grayscale(70%)',
                                                    transition: 'filter 0.2s',
                                                }} />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                background: group.hasUnviewed ? 'var(--yellow)' : '#ddd',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: "'Space Grotesk', sans-serif",
                                                fontWeight: '700', fontSize: '22px',
                                                color: 'var(--black)',
                                            }}>
                                                {group.user.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {/* Story count badge */}
                                        {group.stories.length > 1 && (
                                            <div style={{
                                                position: 'absolute', bottom: '2px', right: '2px',
                                                background: 'var(--black)', color: 'var(--yellow)',
                                                fontSize: '8px', fontWeight: '700',
                                                padding: '1px 4px', lineHeight: '1.2',
                                            }}>
                                                {group.stories.length}
                                            </div>
                                        )}
                                        {/* Online dot */}
                                        <OnlineDot userId={group.user.id} size={9} />
                                    </div>
                                    <span style={{
                                        fontSize: '9px', fontWeight: '700',
                                        letterSpacing: '0.5px', textTransform: 'uppercase',
                                        color: group.hasUnviewed ? 'var(--black)' : 'rgba(10,10,10,0.4)',
                                        fontFamily: "'Space Mono', monospace",
                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap', maxWidth: '68px',
                                    }}>
                                        {group.user.id === user?.id ? 'YOU' : group.user.username}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Right arrow */}
                    <button onClick={() => scroll(1)} style={{
                        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                        zIndex: 2, background: 'var(--black)', border: '2px solid var(--yellow)',
                        color: 'var(--yellow)', cursor: 'pointer', padding: '6px',
                        display: 'flex', opacity: 0.8,
                    }}>
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <StoryUploadModal
                    onClose={() => setShowUpload(false)}
                    onUploaded={() => { setShowUpload(false); fetchStories(); }}
                />
            )}
        </>
    );
};

// ─── Story Upload Modal ───────────────────────────────────────────────
const StoryUploadModal = ({ onClose, onUploaded }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const f = e.target.files[0]; if (!f) return;
        setFile(f); setPreview(URL.createObjectURL(f));
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('caption', caption);
            await api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('STORY POSTED! ✦');
            onUploaded();
        } catch (err) {
            toast.error(err.response?.data?.error?.toUpperCase() || 'UPLOAD FAILED');
        }
        finally { setUploading(false); }
    };

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
        }} onClick={e => e.target === e.currentTarget && !uploading && onClose()}>
            <div className="animate-scale-in" style={{
                background: 'var(--white)', maxWidth: '420px', width: '100%',
                border: 'var(--border-thick)', boxShadow: '12px 12px 0 var(--yellow)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    background: 'var(--black)', padding: '14px 20px',
                    borderBottom: '5px solid var(--yellow)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span style={{
                        fontFamily: "'Space Mono', monospace", fontSize: '11px',
                        fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)',
                        textTransform: 'uppercase',
                    }}>
                        ■ ADD STORY
                    </span>
                    <button onClick={onClose} disabled={uploading} style={{
                        background: 'none', border: '2px solid rgba(245,240,232,0.3)',
                        color: 'var(--white)', cursor: 'pointer',
                        width: '28px', height: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                    {preview ? (
                        <div style={{
                            position: 'relative', marginBottom: '16px',
                            border: 'var(--border)', overflow: 'hidden',
                            boxShadow: '4px 4px 0 var(--black)',
                        }}>
                            <img src={preview} alt="Preview" style={{
                                width: '100%', maxHeight: '350px', objectFit: 'cover', display: 'block',
                            }} />
                            <button onClick={() => { setFile(null); setPreview(null); }} style={{
                                position: 'absolute', top: '8px', right: '8px',
                                background: 'var(--black)', color: 'var(--yellow)',
                                border: '2px solid var(--yellow)', cursor: 'pointer',
                                width: '28px', height: '28px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', fontWeight: '700',
                            }}>✕</button>
                        </div>
                    ) : (
                        <button onClick={() => fileRef.current?.click()} style={{
                            width: '100%', padding: '50px 20px',
                            border: '3px dashed var(--black)',
                            background: 'rgba(255,224,0,0.06)',
                            cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '12px',
                            transition: 'all 0.2s', marginBottom: '16px',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,224,0,0.06)'}
                        >
                            <Plus size={32} />
                            <span style={{
                                fontSize: '11px', fontWeight: '700',
                                letterSpacing: '2px', textTransform: 'uppercase',
                                fontFamily: "'Space Mono', monospace",
                            }}>
                                CHOOSE IMAGE
                            </span>
                        </button>
                    )}

                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
                        style={{ display: 'none' }} />

                    <input value={caption} onChange={e => setCaption(e.target.value)}
                        placeholder="ADD A CAPTION (OPTIONAL)"
                        maxLength={100}
                        className="input-field"
                        style={{ marginBottom: '16px', width: '100%', boxSizing: 'border-box' }} />

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={onClose} className="btn-ghost"
                            style={{ flex: 1, fontSize: '11px' }} disabled={uploading}>
                            CANCEL
                        </button>
                        <button onClick={handleUpload} className="btn-brand"
                            style={{ flex: 1, fontSize: '11px' }}
                            disabled={!file || uploading}>
                            {uploading ? 'POSTING...' : 'POST STORY →'}
                        </button>
                    </div>

                    <p style={{
                        fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase',
                        color: 'rgba(10,10,10,0.3)', textAlign: 'center', marginTop: '12px',
                    }}>
                        Stories disappear after 24 hours
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StoryBar;
