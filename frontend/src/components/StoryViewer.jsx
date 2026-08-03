import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Clock, Send, Heart, Edit2, Maximize2, Minimize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ── Quick emoji reactions (Instagram-style) ──────────────────────────
const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
                   style={{ color: 'var(--yellow)', textDecoration: 'underline', pointerEvents: 'auto' }} 
                   onClick={(e) => e.stopPropagation()}>
                    {part}
                </a>
            );
        }
        return part;
    });
};

const StoryViewer = ({ storyGroups, initialGroupIndex = 0, onClose }) => {
    const { user } = useAuth();
    const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
    const [storyIdx, setStoryIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const [viewers, setViewers] = useState([]);
    const [viewersLoading, setViewersLoading] = useState(false);

    // Reply state
    const [replyText, setReplyText] = useState('');
    const [replySending, setReplySending] = useState(false);
    const [replyFocused, setReplyFocused] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [sentReaction, setSentReaction] = useState(null); // floating animation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editCaption, setEditCaption] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Like state — initialized from story data
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [storyImageFit, setStoryImageFit] = useState('cover');
    const [mediaLoaded, setMediaLoaded] = useState(false);
    const [mediaVisible, setMediaVisible] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);

    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const elapsedRef = useRef(0);
    const replyInputRef = useRef(null);
    const minLoadDelayDoneRef = useRef(false);
    const loadDelayTimeoutRef = useRef(null);
    const mediaLoadedRef = useRef(false);

    const STORY_DURATION = 5000;
    const STORY_MIN_LOAD_MS = 3000;

    const currentGroup = storyGroups[groupIdx];
    const currentStory = currentGroup?.stories?.[storyIdx];
    const isOwner = user?.id === currentGroup?.user?.id;

    // Pause timer when reply bar is focused, reactions open, or delete confirmation is shown
    const isInputActive = replyFocused || showReactions || showDeleteConfirm || isEditing;

    // Record view
    useEffect(() => {
        if (currentStory && user) {
            api.post(`/stories/${currentStory.id}/view`).catch(() => { });
        }
    }, [currentStory?.id, user]);

    // Reset reply + like when story changes
    useEffect(() => {
        setIsEditing(false);
        setEditCaption(currentStory?.caption || '');
        setReplyText('');
        setSentReaction(null);
        setShowReactions(false);
        setStoryImageFit('cover');
        // Sync like state from story data
        if (currentStory) {
            setLiked(currentStory.liked_by_me || false);
            setLikesCount(currentStory.likes_count || 0);
        }
    }, [currentStory?.id]);

    useEffect(() => {
        mediaLoadedRef.current = mediaLoaded;
    }, [mediaLoaded]);

    // Preload assets for the current group
    useEffect(() => {
        if (currentGroup?.stories) {
            currentGroup.stories.forEach(story => {
                if (story.image_url) {
                    if (story.image_url.includes('/video/')) {
                        const video = document.createElement('video');
                        video.src = story.image_url;
                        video.preload = 'auto';
                    } else {
                        const img = new Image();
                        img.src = story.image_url;
                    }
                }
            });
        }
    }, [groupIdx, currentGroup?.stories]);

    useEffect(() => {
        setMediaLoaded(false);
        setMediaVisible(false);
        mediaLoadedRef.current = false;
        setShowSpinner(false);

        // Show spinner only if asset takes more than 300ms to load (prevents spinner flashing)
        const spinnerTimeout = setTimeout(() => {
            if (!mediaLoadedRef.current) {
                setShowSpinner(true);
            }
        }, 300);

        return () => clearTimeout(spinnerTimeout);
    }, [currentStory?.id]);

    useEffect(() => {
        if (mediaLoaded) {
            setMediaVisible(true);
            setShowSpinner(false);
        }
    }, [mediaLoaded]);

    const handleStoryImageLoad = (e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (!naturalWidth || !naturalHeight) {
            setMediaLoaded(true);
            return;
        }

        const imgRatio = naturalWidth / naturalHeight;
        const containerWidth = Math.min(window.innerWidth, 440);
        const containerHeight = window.innerHeight;
        const containerRatio = containerWidth / containerHeight;

        // Auto contain landscape images & extremely tall portrait images (e.g. screenshots)
        // standard portrait ratios look best using 'cover'
        const isLandscape = naturalWidth > naturalHeight;
        const isExtremelyTall = imgRatio < (containerRatio * 0.7);

        if (isLandscape || isExtremelyTall) {
            setStoryImageFit('contain');
        } else {
            setStoryImageFit('cover');
        }
        setMediaLoaded(true);
    };

    // Lock scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    // ── Timer ─────────────────────────────────────────────────────────
    const startTimer = useCallback(() => {
        const remaining = STORY_DURATION - elapsedRef.current;
        startTimeRef.current = Date.now();

        timerRef.current = requestAnimationFrame(function tick() {
            const now = Date.now();
            const totalElapsed = elapsedRef.current + (now - startTimeRef.current);
            const pct = Math.min((totalElapsed / STORY_DURATION) * 100, 100);
            setProgress(pct);

            if (totalElapsed >= STORY_DURATION) { goNext(); return; }
            timerRef.current = requestAnimationFrame(tick);
        });
    }, [groupIdx, storyIdx, storyGroups.length]);

    const stopTimer = useCallback(() => {
        if (timerRef.current) { cancelAnimationFrame(timerRef.current); timerRef.current = null; }
        if (startTimeRef.current) { elapsedRef.current += Date.now() - startTimeRef.current; startTimeRef.current = null; }
    }, []);

    useEffect(() => {
        if (!paused && !showViewers && !isInputActive && mediaVisible) {
            elapsedRef.current = 0;
            setProgress(0);
            startTimer();
        }
        return () => stopTimer();
    }, [groupIdx, storyIdx, paused, showViewers, isInputActive, mediaVisible]);

    // ── Navigation ───────────────────────────────────────────────────
    const goNext = () => {
        stopTimer(); elapsedRef.current = 0;
        if (storyIdx < currentGroup.stories.length - 1) {
            setStoryIdx(s => s + 1);
        } else if (groupIdx < storyGroups.length - 1) {
            setGroupIdx(g => g + 1); setStoryIdx(0);
        } else { onClose(); }
    };

    const goPrev = () => {
        stopTimer(); elapsedRef.current = 0;
        if (storyIdx > 0) {
            setStoryIdx(s => s - 1);
        } else if (groupIdx > 0) {
            setGroupIdx(g => g - 1);
            setStoryIdx(storyGroups[groupIdx - 1].stories.length - 1);
        }
    };

    // ── Delete ───────────────────────────────────────────────────────
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/stories/${currentStory.id}`);
            toast.success('STORY DELETED');

            // Close confirm modal
            setShowDeleteConfirm(false);

            // Remove from local state
            currentGroup.stories.splice(storyIdx, 1);
            if (currentGroup.stories.length === 0) {
                if (storyGroups.length <= 1) { onClose(); return; }
                storyGroups.splice(groupIdx, 1);
                setGroupIdx(Math.min(groupIdx, storyGroups.length - 1));
                setStoryIdx(0);
            } else if (storyIdx >= currentGroup.stories.length) {
                setStoryIdx(currentGroup.stories.length - 1);
            } else {
                setStoryIdx(s => s); elapsedRef.current = 0;
            }
        } catch {
            toast.error('FAILED TO DELETE');
        } finally {
            setIsDeleting(false);
        }
    };

    // ── Edit ─────────────────────────────────────────────────────────
    const handleEditSave = async () => {
        setIsSaving(true);
        try {
            const { data } = await api.put(`/stories/${currentStory.id}`, { caption: editCaption });
            currentStory.caption = data.story.caption;
            setIsEditing(false);
            toast.success('STORY UPDATED');
        } catch {
            toast.error('FAILED TO UPDATE');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Viewers ──────────────────────────────────────────────────────
    const loadViewers = async () => {
        setShowViewers(true); setViewersLoading(true); stopTimer();
        try {
            const { data } = await api.get(`/stories/${currentStory.id}/viewers`);
            setViewers(data.viewers || []);
        } catch { toast.error('FAILED'); }
        finally { setViewersLoading(false); }
    };

    // ── Like toggle ───────────────────────────────────────────────────
    const handleLike = async () => {
        if (likeAnimating) return;
        // Optimistic update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount(c => newLiked ? c + 1 : Math.max(0, c - 1));
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);
        try {
            const { data } = await api.post(`/stories/${currentStory.id}/like`);
            setLiked(data.liked);
            setLikesCount(data.likes_count);
        } catch {
            // Revert on failure
            setLiked(liked);
            setLikesCount(c => liked ? c + 1 : Math.max(0, c - 1));
        }
    };

    // ── Reply send ────────────────────────────────────────────────────
    const sendReply = async (text) => {
        const content = (text || replyText).trim();
        if (!content || replySending) return;
        setReplySending(true);
        try {
            await api.post(`/stories/${currentStory.id}/reply`, { content });
            toast.success('REPLY SENT ✓', { style: { background: '#0a0a0a', color: '#FFE000', border: '2px solid #FFE000' } });
            setReplyText('');
            setReplyFocused(false);
            replyInputRef.current?.blur();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'FAILED TO SEND');
        }
        setReplySending(false);
    };

    const sendReaction = async (emoji) => {
        setShowReactions(false);
        setSentReaction(emoji);
        setTimeout(() => setSentReaction(null), 1200);
        await sendReply(emoji);
    };

    // ── Keyboard ──────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (replyFocused) return; // don't hijack while typing
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [groupIdx, storyIdx, storyGroups.length, replyFocused]);

    if (!currentStory) { onClose(); return null; }

    const timeAgo = formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true });

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#0a0a0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {/* Prev button */}
            {(groupIdx > 0 || storyIdx > 0) && (
                <button onClick={goPrev} className="story-nav-btn" style={{ left: '16px' }} title="Previous Story">
                    <ChevronLeft size={22} strokeWidth={2.5} />
                </button>
            )}

            {/* ── Main story card ── */}
            <div style={{
                width: '100%', maxWidth: '440px', height: '100%', maxHeight: '100dvh',
                position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
            }}
                onMouseDown={() => { if (!isInputActive) { setPaused(true); stopTimer(); } }}
                onMouseUp={() => { if (!isInputActive) { setPaused(false); startTimer(); } }}
                onTouchStart={() => { if (!isInputActive) { setPaused(true); stopTimer(); } }}
                onTouchEnd={() => { if (!isInputActive) { setPaused(false); startTimer(); } }}
            >
                {/* Progress bars */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    zIndex: 5, padding: '8px 12px',
                    display: 'flex', gap: '4px',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
                }}>
                    {currentGroup.stories.map((s, i) => (
                        <div key={s.id} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', background: 'var(--yellow)',
                                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                                transition: i === storyIdx ? 'none' : 'width 0.2s',
                            }} />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div style={{
                    position: 'absolute', top: '20px', left: 0, right: 0,
                    zIndex: 5, padding: '0 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {currentGroup.user.profile_image ? (
                            <img src={currentGroup.user.profile_image} alt=""
                                style={{ width: '36px', height: '36px', border: '2px solid var(--yellow)', objectFit: 'cover' }} />
                        ) : (
                            <div style={{
                                width: '36px', height: '36px',
                                background: 'var(--yellow)', border: '2px solid var(--yellow)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '700', fontSize: '16px', color: 'var(--black)',
                            }}>
                                {currentGroup.user.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontWeight: '700', fontSize: '13px',
                                color: 'white', textTransform: 'uppercase',
                                letterSpacing: '1px', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                            }}>{currentGroup.user.username}</p>
                            <p style={{ fontSize: '9px', letterSpacing: '1px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                                <Clock size={9} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                {timeAgo}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {isOwner && (
                            <>
                                <button 
                                    onClick={() => { setIsEditing(true); setEditCaption(currentStory.caption || ''); }} 
                                    className="story-header-btn"
                                    title="Edit Caption"
                                >
                                    <Edit2 size={15} strokeWidth={2} />
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirm(true)} 
                                    className="story-header-btn delete-btn"
                                    title="Delete Story"
                                >
                                    <Trash2 size={15} strokeWidth={2} />
                                </button>
                                <button 
                                    onClick={loadViewers} 
                                    className="story-header-btn viewers-btn"
                                    title="Views"
                                >
                                    <Eye size={15} strokeWidth={2} />
                                    {currentStory.views_count > 0 && (
                                        <span className="story-views-badge">{currentStory.views_count}</span>
                                    )}
                                </button>
                            </>
                        )}
                        <button 
                            onClick={() => setStoryImageFit(fit => fit === 'cover' ? 'contain' : 'cover')}
                            className="story-header-btn"
                            title={storyImageFit === 'cover' ? 'Fit to Screen' : 'Fill Screen'}
                        >
                            {storyImageFit === 'cover' ? (
                                <Minimize2 size={15} strokeWidth={2} />
                            ) : (
                                <Maximize2 size={15} strokeWidth={2} />
                            )}
                        </button>
                        <button onClick={onClose} className="story-header-btn" title="Close">
                            <X size={15} strokeWidth={2} />
                        </button>
                    </div>
                </div>

                {/* Story Media */}
                <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
                    {currentStory.image_url?.includes('/video/') ? (
                        <video
                            src={currentStory.image_url}
                            onLoadedData={handleStoryImageLoad}
                            onError={() => setMediaLoaded(true)}
                            autoPlay
                            controls={false}
                            playsInline
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: storyImageFit,
                                objectPosition: 'center',
                                display: 'block',
                                opacity: mediaVisible ? 1 : 0,
                                transition: 'opacity 0.2s ease',
                            }}
                        />
                    ) : (
                        <img
                            src={currentStory.image_url}
                            alt={currentStory.caption || 'Story'}
                            onLoad={handleStoryImageLoad}
                            onError={() => setMediaLoaded(true)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: storyImageFit,
                                objectPosition: 'center',
                                display: 'block',
                                opacity: mediaVisible ? 1 : 0,
                                transition: 'opacity 0.2s ease',
                            }}
                            draggable={false}
                        />
                    )}

                    {!mediaVisible && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            background: '#000',
                            zIndex: 2,
                        }}>
                            {showSpinner && (
                                <>
                                    <div className="spinner" style={{ width: '30px', height: '30px', borderTopColor: 'var(--yellow)' }} />
                                    <p style={{
                                        color: 'rgba(255,255,255,0.8)',
                                        fontFamily: "'Space Mono', monospace",
                                        fontSize: '10px',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                    }}>
                                        Loading...
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Tap zones (only when not typing) */}
                {!isInputActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 3 }}>
                        <div onClick={goPrev} style={{ flex: 1, cursor: 'pointer' }} />
                        <div onClick={goNext} style={{ flex: 2, cursor: 'pointer' }} />
                    </div>
                )}

                {/* Caption overlay */}
                {currentStory.caption && !isEditing && (
                    <div style={{
                        position: 'absolute',
                        bottom: isOwner ? '80px' : '76px',
                        left: 0, right: 0,
                        zIndex: 4, padding: '40px 20px 16px',
                        background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%)',
                        pointerEvents: 'none',
                    }}>
                        <p style={{
                            color: 'white', fontSize: '14px', lineHeight: '1.5',
                            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                            fontFamily: "'Space Mono', monospace",
                            pointerEvents: 'auto',
                        }}>{renderTextWithLinks(currentStory.caption)}</p>
                    </div>
                )}

                {/* Edit Caption overlay */}
                {isEditing && (
                    <div style={{
                        position: 'absolute',
                        bottom: '80px',
                        left: 0, right: 0,
                        zIndex: 10, padding: '20px',
                        background: 'rgba(0,0,0,0.85)',
                        borderTop: '2px solid var(--yellow)',
                        display: 'flex', flexDirection: 'column', gap: '10px'
                    }}
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => e.stopPropagation()}
                    >
                        <textarea
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            style={{
                                width: '100%', padding: '10px', fontSize: '13px',
                                fontFamily: "'Space Mono', monospace", border: '2px solid var(--yellow)',
                                background: 'rgba(255,224,0,0.1)', outline: 'none', resize: 'vertical', minHeight: '60px',
                                color: 'white',
                            }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsEditing(false)} disabled={isSaving} style={{
                                background: 'none', border: '2px solid white', color: 'white',
                                padding: '6px 12px', fontSize: '10px', fontWeight: '700', cursor: 'pointer',
                                fontFamily: "'Space Mono', monospace", letterSpacing: '1px', textTransform: 'uppercase'
                            }}>CANCEL</button>
                            <button onClick={handleEditSave} disabled={isSaving} style={{
                                background: 'var(--yellow)', border: '2px solid var(--yellow)', color: 'var(--black)',
                                padding: '6px 12px', fontSize: '10px', fontWeight: '700', cursor: 'pointer',
                                fontFamily: "'Space Mono', monospace", letterSpacing: '1px', textTransform: 'uppercase'
                            }}>{isSaving ? 'SAVING...' : 'SAVE'}</button>
                        </div>
                    </div>
                )}

                {/* Floating reaction animation */}
                {sentReaction && (
                    <div style={{
                        position: 'absolute', bottom: '100px', left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 20, fontSize: '52px',
                        animation: 'floatUp 1.2s ease forwards',
                        pointerEvents: 'none',
                    }}>
                        {sentReaction}
                    </div>
                )}

                {/* Owner view-count button */}
                {isOwner && (
                    <button onClick={loadViewers} className="story-owner-views-btn" title="View Story Stats">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Eye size={14} color="var(--yellow)" strokeWidth={2} /> {currentStory.views_count}
                        </div>
                        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Heart size={14} fill="#ff3c5a" color="#ff3c5a" strokeWidth={0} /> {currentStory.likes_count}
                        </div>
                    </button>
                )}

                {/* ══ REPLY BAR (Instagram-style) ══ */}
                {!isOwner && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        zIndex: 6,
                        padding: '10px 12px',
                        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                        background: replyFocused
                            ? 'rgba(10,10,10,0.92)'
                            : 'linear-gradient(0deg, rgba(10,10,10,0.75) 0%, transparent 100%)',
                        transition: 'background 0.25s',
                    }}
                        // Stop tap-zone from firing when clicking the bar
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => e.stopPropagation()}
                        onMouseUp={e => e.stopPropagation()}
                        onTouchEnd={e => e.stopPropagation()}
                    >
                        {/* Quick emoji reactions row */}
                        <div style={{
                            display: 'flex', gap: '8px',
                            marginBottom: '10px',
                            justifyContent: 'center',
                            opacity: replyFocused ? 0 : 1,
                            maxHeight: replyFocused ? '0px' : '48px',
                            overflow: 'hidden',
                            transition: 'opacity 0.25s ease, max-height 0.25s ease',
                        }}>
                            {QUICK_REACTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => sendReaction(emoji)}
                                    className="reaction-btn"
                                >{emoji}</button>
                            ))}
                        </div>

                        {/* Text input row */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                            {/* My avatar */}
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt=""
                                    style={{ width: '32px', height: '32px', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                                <div style={{
                                    width: '32px', height: '32px', flexShrink: 0,
                                    background: 'var(--yellow)', border: '1.5px solid rgba(255,255,255,0.3)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: '700', fontSize: '14px', color: 'var(--black)',
                                }}>
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* Input */}
                            <div className={`story-input-container ${replyFocused ? 'focused' : ''}`}>
                                <input
                                    ref={replyInputRef}
                                    type="text"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onFocus={() => setReplyFocused(true)}
                                    onBlur={() => setTimeout(() => setReplyFocused(false), 150)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                                        if (e.key === 'Escape') { setReplyFocused(false); replyInputRef.current?.blur(); }
                                    }}
                                    placeholder={`Reply to ${currentGroup.user.username}…`}
                                    maxLength={500}
                                    style={{
                                        flex: 1, background: 'none',
                                        border: 'none', outline: 'none',
                                        color: 'white',
                                        fontFamily: "'Space Grotesk', sans-serif",
                                        fontSize: '13px', padding: '10px 14px',
                                    }}
                                />
                            </div>

                            {/* ❤️ Like button */}
                            <button
                                onClick={handleLike}
                                className={`story-like-btn ${liked ? 'liked' : ''}`}
                                title={liked ? 'Unlike' : 'Like'}
                            >
                                <Heart
                                    size={18}
                                    fill={liked ? '#ef4444' : 'none'}
                                    stroke={liked ? '#ef4444' : 'currentColor'}
                                    strokeWidth={2}
                                />
                                {likesCount > 0 && (!currentGroup.user.hide_likes || isOwner) && (
                                    <span style={{
                                        fontSize: '8px', fontWeight: '700', marginTop: '1px',
                                        fontFamily: "'Space Mono', monospace",
                                    }}>{likesCount > 999 ? '999+' : likesCount}</span>
                                )}
                            </button>

                            {/* Send button */}
                            <button
                                onClick={() => sendReply()}
                                disabled={!replyText.trim() || replySending}
                                className={`story-send-btn ${replyText.trim() ? 'active' : ''}`}
                                title="Send Reply"
                            >
                                {replySending ? (
                                    <div className="spinner" style={{ width: '14px', height: '14px', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#ffffff' }} />
                                ) : (
                                    <Send size={15} strokeWidth={2} />
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Next button */}
            {(groupIdx < storyGroups.length - 1 || storyIdx < currentGroup.stories.length - 1) && (
                <button onClick={goNext} className="story-nav-btn" style={{ right: '16px' }} title="Next Story">
                    <ChevronRight size={22} strokeWidth={2.5} />
                </button>
            )}

            {/* ── Viewers panel ── */}
            {showViewers && (
                <div className="animate-fade-in" style={{
                    position: 'absolute', inset: 0, zIndex: 20,
                    background: 'rgba(10,10,10,0.92)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                }} onClick={e => e.target === e.currentTarget && setShowViewers(false)}>
                    <div className="animate-slide-up" style={{
                        background: 'var(--white)', maxWidth: '440px', width: '100%',
                        maxHeight: '60vh', display: 'flex', flexDirection: 'column',
                        border: 'var(--border-thick)', borderBottom: 'none', overflow: 'hidden',
                    }}>
                        <div style={{
                            background: 'var(--black)', padding: '12px 20px',
                            borderBottom: '4px solid var(--yellow)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={14} color="var(--yellow)" />
                                <span style={{
                                    fontFamily: "'Space Mono', monospace", fontSize: '10px',
                                    fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)',
                                    textTransform: 'uppercase',
                                }}>VIEWERS — {viewers.length}</span>
                            </div>
                            <button onClick={() => { setShowViewers(false); setPaused(false); }} style={{
                                background: 'none', border: '2px solid rgba(245,240,232,0.3)',
                                color: 'var(--white)', cursor: 'pointer', width: '26px', height: '26px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}><X size={12} /></button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {viewersLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                                    <div className="spinner" style={{ width: '28px', height: '28px' }} />
                                </div>
                            ) : viewers.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center' }}>
                                    <Eye size={28} style={{ color: 'rgba(10,10,10,0.2)', marginBottom: '8px' }} />
                                    <p style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', fontWeight: '700' }}>NO VIEWS YET</p>
                                </div>
                            ) : (
                                viewers.map((v, i) => (
                                    <Link key={v.viewer?.id || i}
                                        to={`/profile/${v.viewer?.username}`}
                                        onClick={() => { setShowViewers(false); onClose(); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px 20px', textDecoration: 'none', color: 'var(--black)',
                                            borderBottom: i < viewers.length - 1 ? '2px solid var(--black)' : 'none',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {v.viewer?.profile_image ? (
                                            <img src={v.viewer.profile_image} alt="" className="avatar" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
                                        ) : (
                                            <div className="avatar-text" style={{ width: '36px', height: '36px', fontSize: '14px', flexShrink: 0 }}>
                                                {v.viewer?.username?.charAt(0)}
                                            </div>
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {v.viewer?.username}
                                                </p>
                                                {v.has_liked && <Heart size={12} fill="#ff3c5a" color="#ff3c5a" />}
                                            </div>
                                            <p style={{ fontSize: '9px', letterSpacing: '1px', color: 'rgba(10,10,10,0.4)', textTransform: 'uppercase' }}>
                                                {formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ DELETE CONFIRMATION MODAL ══ */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px', animation: 'fadeIn 0.2s ease',
                }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div style={{
                        background: 'var(--black)',
                        border: '5px solid var(--yellow)',
                        boxShadow: '10px 10px 0 rgba(0,0,0,1)',
                        width: '100%', maxWidth: '320px',
                        padding: '32px 24px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: '56px', height: '56px', background: 'rgba(255,50,50,0.15)',
                            border: '3px solid #ff4444', margin: '0 auto 20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#ff4444', transform: 'rotate(-5deg)',
                        }}>
                            <Trash2 size={28} />
                        </div>

                        <h3 style={{
                            fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px',
                            fontWeight: '800', color: 'white', textTransform: 'uppercase',
                            letterSpacing: '1px', marginBottom: '12px',
                        }}>
                            DELETE STORY?
                        </h3>

                        <p style={{
                            fontSize: '11px', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)',
                            lineHeight: '1.6', textTransform: 'uppercase', marginBottom: '32px',
                        }}>
                            THIS ACTION CANNOT BE UNDONE. <br />
                            YOUR FOLLOWERS WILL NO LONGER BE ABLE TO VIEW IT.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="btn-brand"
                                style={{
                                    background: '#ff4444',
                                    borderColor: '#ff4444',
                                    color: 'white',
                                    width: '100%',
                                    padding: '14px',
                                    fontSize: '12px',
                                    letterSpacing: '2px',
                                }}
                            >
                                {isDeleting ? 'DELETING...' : 'YES, PERMANENTLY DELETE'}
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                style={{
                                    background: 'transparent',
                                    border: '2px solid rgba(255,255,255,0.2)',
                                    color: 'white',
                                    width: '100%',
                                    padding: '12px',
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    letterSpacing: '2px',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                }}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Styles and Keyframes */}
            <style>{`
                @keyframes floatUp {
                    0%   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                    60%  { opacity: 1; transform: translateX(-50%) translateY(-60px) scale(1.3); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-110px) scale(0.9); }
                }

                @keyframes badgePulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }

                @keyframes heartbeat {
                    0% { transform: scale(1); }
                    30% { transform: scale(1.3); }
                    60% { transform: scale(0.85); }
                    100% { transform: scale(1); }
                }

                .story-nav-btn {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 10;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #ffffff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), inset 1px 1px 2px rgba(255, 255, 255, 0.1);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .story-nav-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.35);
                    transform: translateY(-50%) scale(1.1);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.2);
                }
                .story-nav-btn:active {
                    transform: translateY(-50%) scale(0.95);
                }

                .story-header-btn {
                    background: rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: #ffffff;
                    cursor: pointer;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .story-header-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.35);
                    transform: scale(1.1);
                }
                .story-header-btn:active {
                    transform: scale(0.95);
                }

                .story-header-btn.delete-btn {
                    background: rgba(239, 68, 68, 0.12);
                    border-color: rgba(239, 68, 68, 0.25);
                    color: #ef4444;
                }
                .story-header-btn.delete-btn:hover {
                    background: rgba(239, 68, 68, 0.25);
                    border-color: rgba(239, 68, 68, 0.45);
                    color: #f87171;
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
                }

                .story-header-btn.viewers-btn {
                    background: rgba(59, 130, 246, 0.12);
                    border-color: rgba(59, 130, 246, 0.25);
                    color: var(--yellow);
                }
                .story-header-btn.viewers-btn:hover {
                    background: rgba(59, 130, 246, 0.25);
                    border-color: rgba(59, 130, 246, 0.45);
                    color: #60a5fa;
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
                }

                .story-views-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: var(--yellow);
                    color: #ffffff;
                    font-size: 8px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 10px;
                    border: 1.5px solid #0a0a0a;
                    line-height: 1;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    animation: badgePulse 2s infinite;
                }

                .reaction-btn {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    font-size: 20px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.25s, border-color 0.25s;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    outline: none;
                }
                .reaction-btn:hover {
                    transform: scale(1.25) translateY(-4px);
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.35);
                }
                .reaction-btn:active {
                    transform: scale(0.95);
                }

                .story-input-container {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(255, 255, 255, 0.06);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    transition: all 0.25s ease;
                    overflow: hidden;
                    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
                }
                .story-input-container.focused {
                    border-color: var(--yellow);
                    background: rgba(255, 255, 255, 0.1);
                    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 0 10px rgba(59, 130, 246, 0.25);
                }

                .story-like-btn {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: rgba(255, 255, 255, 0.6);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    outline: none;
                }
                .story-like-btn:hover {
                    background: rgba(255, 255, 255, 0.18);
                    border-color: rgba(255, 255, 255, 0.3);
                    color: #ffffff;
                    transform: scale(1.1);
                }
                .story-like-btn.liked {
                    background: rgba(239, 68, 68, 0.12);
                    border-color: rgba(239, 68, 68, 0.4);
                    color: #ef4444;
                    animation: heartbeat 0.4s ease;
                }
                .story-like-btn.liked:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: rgba(239, 68, 68, 0.5);
                    color: #ff6b6b;
                }

                .story-send-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.3);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: default;
                    flex-shrink: 0;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    outline: none;
                }
                .story-send-btn.active {
                    background: var(--yellow);
                    border-color: var(--yellow);
                    color: #ffffff;
                    cursor: pointer;
                }
                .story-send-btn.active:hover {
                    transform: scale(1.1) rotate(5deg);
                    box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
                }
                .story-send-btn.active:active {
                    transform: scale(0.95);
                }

                .story-owner-views-btn {
                    position: absolute;
                    bottom: 76px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 5;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: white;
                    cursor: pointer;
                    border-radius: 24px;
                    padding: 8px 18px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    font-family: "'Space Mono', monospace";
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    outline: none;
                }
                .story-owner-views-btn:hover {
                    background: rgba(255, 255, 255, 0.18);
                    border-color: rgba(255, 255, 255, 0.3);
                    transform: translateX(-50%) scale(1.05);
                }
            `}</style>
        </div>,
        document.body
    );
};

export default StoryViewer;
