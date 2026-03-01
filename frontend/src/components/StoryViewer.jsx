import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Trash2, Eye, Clock, Send, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ── Quick emoji reactions (Instagram-style) ──────────────────────────
const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👏'];

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

    // Like state — initialized from story data
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [likeAnimating, setLikeAnimating] = useState(false);

    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const elapsedRef = useRef(0);
    const replyInputRef = useRef(null);

    const STORY_DURATION = 5000;

    const currentGroup = storyGroups[groupIdx];
    const currentStory = currentGroup?.stories?.[storyIdx];
    const isOwner = user?.id === currentGroup?.user?.id;

    // Pause timer when reply bar is focused, reactions open, or delete confirmation is shown
    const isInputActive = replyFocused || showReactions || showDeleteConfirm;

    // Record view
    useEffect(() => {
        if (currentStory && user) {
            api.post(`/stories/${currentStory.id}/view`).catch(() => { });
        }
    }, [currentStory?.id, user]);

    // Reset reply + like when story changes
    useEffect(() => {
        setReplyText('');
        setSentReaction(null);
        setShowReactions(false);
        // Sync like state from story data
        if (currentStory) {
            setLiked(currentStory.liked_by_me || false);
            setLikesCount(currentStory.likes_count || 0);
        }
    }, [currentStory?.id]);

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
        if (!paused && !showViewers && !isInputActive) {
            elapsedRef.current = 0;
            setProgress(0);
            startTimer();
        }
        return () => stopTimer();
    }, [groupIdx, storyIdx, paused, showViewers, isInputActive]);

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
                <button onClick={goPrev} style={{
                    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                    zIndex: 10, background: 'rgba(255,224,0,0.15)',
                    border: '2px solid var(--yellow)', color: 'var(--yellow)',
                    cursor: 'pointer', padding: '12px 8px',
                    display: 'flex', transition: 'all 0.2s',
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--yellow)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,224,0,0.15)'}
                >
                    <ChevronLeft size={20} />
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

                    <div style={{ display: 'flex', gap: '6px' }}>
                        {isOwner && (
                            <>
                                <button onClick={() => setShowDeleteConfirm(true)} style={{
                                    background: 'rgba(255,0,0,0.2)', border: '2px solid rgba(255,100,100,0.5)',
                                    color: '#ff6b6b', cursor: 'pointer', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}><Trash2 size={14} /></button>
                                <button onClick={loadViewers} style={{
                                    background: 'rgba(255,224,0,0.2)', border: '2px solid rgba(255,224,0,0.5)',
                                    color: 'var(--yellow)', cursor: 'pointer', width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative',
                                }}>
                                    <Eye size={14} />
                                    {currentStory.views_count > 0 && (
                                        <span style={{
                                            position: 'absolute', top: '-6px', right: '-6px',
                                            background: 'var(--yellow)', color: 'var(--black)',
                                            fontSize: '8px', fontWeight: '700', padding: '1px 4px', lineHeight: '1.3',
                                        }}>{currentStory.views_count}</span>
                                    )}
                                </button>
                            </>
                        )}
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)',
                            color: 'white', cursor: 'pointer', width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><X size={14} /></button>
                    </div>
                </div>

                {/* Story image */}
                <img src={currentStory.image_url} alt={currentStory.caption || 'Story'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    draggable={false}
                />

                {/* Tap zones (only when not typing) */}
                {!isInputActive && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 3 }}>
                        <div onClick={goPrev} style={{ flex: 1, cursor: 'pointer' }} />
                        <div onClick={goNext} style={{ flex: 2, cursor: 'pointer' }} />
                    </div>
                )}

                {/* Caption overlay */}
                {currentStory.caption && (
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
                        }}>{currentStory.caption}</p>
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
                    <button onClick={loadViewers} style={{
                        position: 'absolute', bottom: '76px', left: '50%',
                        transform: 'translateX(-50%)', zIndex: 5,
                        background: 'rgba(10,10,10,0.7)', border: '2px solid rgba(255,255,255,0.2)',
                        color: 'white', cursor: 'pointer',
                        padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                        fontSize: '10px', fontWeight: '700', letterSpacing: '2px',
                        textTransform: 'uppercase', fontFamily: "'Space Mono', monospace",
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={12} color="var(--yellow)" /> {currentStory.views_count}
                        </div>
                        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Heart size={12} fill="#ff3c5a" color="#ff3c5a" /> {currentStory.likes_count}
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
                            display: 'flex', gap: '6px',
                            marginBottom: '8px',
                            justifyContent: 'center',
                            opacity: replyFocused ? 0 : 1,
                            maxHeight: replyFocused ? '0px' : '40px',
                            overflow: 'hidden',
                            transition: 'opacity 0.2s, max-height 0.2s',
                        }}>
                            {QUICK_REACTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => sendReaction(emoji)}
                                    style={{
                                        background: 'rgba(255,255,255,0.12)',
                                        border: '1.5px solid rgba(255,255,255,0.2)',
                                        borderRadius: '50%',
                                        width: '38px', height: '38px',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'transform 0.15s, background 0.15s',
                                        WebkitTapHighlightColor: 'transparent',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                                >{emoji}</button>
                            ))}
                        </div>

                        {/* Text input row */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            {/* My avatar */}
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt=""
                                    style={{ width: '30px', height: '30px', border: '2px solid rgba(255,255,255,0.4)', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                                <div style={{
                                    width: '30px', height: '30px', flexShrink: 0,
                                    background: 'var(--yellow)', border: '2px solid rgba(255,255,255,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: '700', fontSize: '13px', color: 'var(--black)',
                                }}>
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}

                            {/* Input */}
                            <div style={{
                                flex: 1,
                                display: 'flex', alignItems: 'center',
                                border: replyFocused
                                    ? '2px solid var(--yellow)'
                                    : '2px solid rgba(255,255,255,0.35)',
                                background: 'rgba(255,255,255,0.08)',
                                transition: 'border-color 0.2s',
                                overflow: 'hidden',
                            }}>
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
                                        fontSize: '13px', padding: '10px 12px',
                                        '::placeholder': { color: 'rgba(255,255,255,0.4)' },
                                    }}
                                />
                            </div>

                            {/* ❤️ Like button */}
                            <button
                                onClick={handleLike}
                                style={{
                                    background: liked ? 'rgba(255,60,90,0.2)' : 'rgba(255,255,255,0.08)',
                                    border: '2px solid ' + (liked ? 'rgba(255,60,90,0.7)' : 'rgba(255,255,255,0.25)'),
                                    color: liked ? '#ff3c5a' : 'rgba(255,255,255,0.6)',
                                    width: '42px', height: '42px',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', flexShrink: 0, gap: '1px',
                                    transition: 'background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s',
                                    transform: likeAnimating ? 'scale(1.35)' : 'scale(1)',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <Heart
                                    size={17}
                                    fill={liked ? '#ff3c5a' : 'none'}
                                    stroke={liked ? '#ff3c5a' : 'rgba(255,255,255,0.6)'}
                                    strokeWidth={2}
                                />
                                {likesCount > 0 && (
                                    <span style={{
                                        fontSize: '8px', fontWeight: '700', lineHeight: 1,
                                        color: liked ? '#ff3c5a' : 'rgba(255,255,255,0.5)',
                                        fontFamily: "'Space Mono', monospace",
                                    }}>{likesCount > 999 ? '999+' : likesCount}</span>
                                )}
                            </button>

                            {/* Send button */}
                            <button
                                onClick={() => sendReply()}
                                disabled={!replyText.trim() || replySending}
                                style={{
                                    background: replyText.trim() ? 'var(--yellow)' : 'rgba(255,255,255,0.1)',
                                    border: '2px solid ' + (replyText.trim() ? 'var(--yellow)' : 'rgba(255,255,255,0.2)'),
                                    color: replyText.trim() ? 'var(--black)' : 'rgba(255,255,255,0.3)',
                                    width: '38px', height: '38px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: replyText.trim() ? 'pointer' : 'default',
                                    flexShrink: 0,
                                    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                {replySending
                                    ? <div className="spinner" style={{ width: '14px', height: '14px', borderColor: 'rgba(0,0,0,0.2)', borderTopColor: 'var(--black)' }} />
                                    : <Send size={15} />
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Next button */}
            {(groupIdx < storyGroups.length - 1 || storyIdx < currentGroup.stories.length - 1) && (
                <button onClick={goNext} style={{
                    position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                    zIndex: 10, background: 'rgba(255,224,0,0.15)',
                    border: '2px solid var(--yellow)', color: 'var(--yellow)',
                    cursor: 'pointer', padding: '12px 8px',
                    display: 'flex', transition: 'all 0.2s',
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--yellow)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,224,0,0.15)'}
                >
                    <ChevronRight size={20} />
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

            {/* Float-up keyframes injected once */}
            <style>{`
                @keyframes floatUp {
                    0%   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                    60%  { opacity: 1; transform: translateX(-50%) translateY(-60px) scale(1.3); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-110px) scale(0.9); }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default StoryViewer;
