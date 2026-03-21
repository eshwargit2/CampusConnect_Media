import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, Send, MoreHorizontal, Edit2, X, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { OnlineDot } from '../context/OnlineContext';
import ConfirmModal from './ConfirmModal';
import api from '../lib/api';
import toast from 'react-hot-toast';

const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" 
                   style={{ color: 'var(--black)', textDecoration: 'underline', pointerEvents: 'auto', fontWeight: 'bold' }} 
                   onClick={(e) => e.stopPropagation()}>
                    {part}
                </a>
            );
        }
        return part;
    });
};

const PostCard = ({ post, onDelete }) => {
    const { user } = useAuth();
    const [liked, setLiked] = useState(post.liked_by_me || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [likeAnimate, setLikeAnimate] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editCaptionText, setEditCaptionText] = useState(post.caption || '');
    const [captionText, setCaptionText] = useState(post.caption || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // Likers modal state
    const [showLikesModal, setShowLikesModal] = useState(false);
    const [likers, setLikers] = useState([]);
    const [likersLoading, setLikersLoading] = useState(false);

    const [expandedCaption, setExpandedCaption] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const commentInputRef = useRef(null);
    const postUser = post.user || {};
    const isOwner = user?.id === postUser.id;
    const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    const hasCaption = captionText.trim().length > 0;

    useEffect(() => {
        if (!showImageModal) return;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') setShowImageModal(false);
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [showImageModal]);

    const handleLike = async () => {
        if (!user) return toast.error('LOGIN TO LIKE POSTS');
        const prevLiked = liked; const prevCount = likesCount;
        setLiked(!liked); setLikesCount(liked ? likesCount - 1 : likesCount + 1);
        if (!liked) { setLikeAnimate(true); setTimeout(() => setLikeAnimate(false), 400); }
        try {
            const { data } = await api.post(`/posts/${post.id}/like`);
            setLiked(data.liked); setLikesCount(data.likes_count);
        } catch { setLiked(prevLiked); setLikesCount(prevCount); toast.error('FAILED'); }
    };

    const loadComments = async () => {
        setLoadingComments(true);
        try { const { data } = await api.get(`/posts/${post.id}/comments`); setComments(data.comments); }
        catch { toast.error('FAILED TO LOAD COMMENTS'); }
        finally { setLoadingComments(false); }
    };

    const toggleComments = () => {
        const next = !showComments; setShowComments(next);
        if (next && comments.length === 0) loadComments();
        if (next) setTimeout(() => commentInputRef.current?.focus(), 200);
    };

    const handleComment = async (e) => {
        e.preventDefault();
        if (!user) return toast.error('LOGIN TO COMMENT');
        if (!commentText.trim()) return;
        setSubmittingComment(true);
        try {
            const { data } = await api.post(`/posts/${post.id}/comments`, { comment_text: commentText.trim() });
            setComments(prev => [...prev, data.comment]);
            setCommentsCount(c => c + 1); setCommentText('');
        } catch (err) { toast.error(err.response?.data?.error || 'FAILED'); }
        finally { setSubmittingComment(false); }
    };

    const handleDelete = async () => {
        try { await api.delete(`/posts/${post.id}`); toast.success('POST DELETED'); onDelete(post.id); }
        catch { toast.error('FAILED TO DELETE'); }
        setShowMenu(false);
    };

    const handleEditSave = async () => {
        if (!editCaptionText.trim()) return toast.error('CAPTION CANNOT BE EMPTY');
        setIsSaving(true);
        try {
            const { data } = await api.put(`/posts/${post.id}`, { caption: editCaptionText });
            setCaptionText(data.post.caption);
            setIsEditing(false);
            toast.success('POST UPDATED');
        } catch {
            toast.error('FAILED TO UPDATE');
        } finally {
            setIsSaving(false);
        }
    };

    const openLikers = async () => {
        if (postUser.hide_likes && !isOwner) return;
        setShowLikesModal(true);
        setLikersLoading(true);
        setLikers([]);
        try {
            const { data } = await api.get(`/posts/${post.id}/likes`);
            setLikers(data.likes || []);
        } catch {
            toast.error('FAILED TO LOAD LIKES');
        } finally {
            setLikersLoading(false);
        }
    };

    return (
        <article className="post-card animate-fade-in-up">
            {/* Tag bar */}
            <div style={{
                background: 'var(--black)', padding: '6px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '3px solid var(--black)',
            }}>
                <span style={{ fontSize: '9px', letterSpacing: '3px', color: 'var(--yellow)', textTransform: 'uppercase', fontWeight: '700' }}>
                    ■ POST
                </span>
                <span style={{ fontSize: '9px', letterSpacing: '2px', color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase' }}>
                    {timeAgo}
                </span>
            </div>

            {/* Header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid var(--black)' }}>
                <Link to={`/profile/${postUser.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        {postUser.profile_image
                            ? <img src={postUser.profile_image} alt={postUser.username} className="avatar" style={{ width: '40px', height: '40px' }} />
                            : <div className="avatar-text" style={{ width: '40px', height: '40px', fontSize: '16px' }}>{postUser.username?.charAt(0)}</div>
                        }
                        <OnlineDot userId={postUser.id} size={10} />
                    </div>
                    <div>
                        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '15px', color: 'var(--black)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {postUser.username}
                        </p>
                        <p style={{ fontSize: '9px', letterSpacing: '2px', color: 'rgba(10,10,10,0.4)', textTransform: 'uppercase' }}>
                            COLLEGE MEMBER
                        </p>
                    </div>
                </Link>

                {isOwner && (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowMenu(!showMenu)} style={{
                            background: 'none', border: '3px solid var(--black)', cursor: 'pointer',
                            padding: '4px 8px', width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--black)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        {showMenu && (
                            <div className="animate-scale-in" style={{
                                position: 'absolute', right: 0, top: '42px',
                                background: 'var(--white)', border: '3px solid var(--black)',
                                boxShadow: 'var(--shadow)', zIndex: 10, minWidth: '160px',
                            }}>
                                <button onClick={() => { setIsEditing(true); setEditCaptionText(captionText); setShowMenu(false); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                                    borderBottom: '2px solid var(--black)',
                                    width: '100%', textAlign: 'left', fontSize: '11px', fontWeight: '700',
                                    letterSpacing: '2px', textTransform: 'uppercase',
                                    fontFamily: "'Space Mono', monospace",
                                    color: 'var(--black)', transition: 'background 0.15s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.5)'}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                                >
                                    <Edit2 size={13} /> EDIT POST
                                </button>
                                <button onClick={() => { setShowDeleteModal(true); setShowMenu(false); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                                    width: '100%', textAlign: 'left', fontSize: '11px', fontWeight: '700',
                                    letterSpacing: '2px', textTransform: 'uppercase',
                                    fontFamily: "'Space Mono', monospace",
                                    color: 'var(--red)', transition: 'background 0.15s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--red)'}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--red)'; }}
                                >
                                    <Trash2 size={13} /> DELETE POST
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image */}
            <div style={{ position: 'relative', borderBottom: '3px solid var(--black)' }}>
                <img src={post.image_url} alt={post.caption}
                    style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                    onClick={() => setShowImageModal(true)}
                    onDoubleClick={handleLike} loading="lazy" />
            </div>

            {/* Actions row */}
            <div style={{ display: 'flex', borderBottom: '3px solid var(--black)' }}>
                <button onClick={handleLike} style={{
                    flex: 1, padding: '14px 20px', background: liked ? 'var(--black)' : 'var(--white)',
                    border: 'none', borderRight: '3px solid var(--black)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: "'Space Mono', monospace", fontSize: '12px', fontWeight: '700',
                    letterSpacing: '2px', textTransform: 'uppercase',
                    color: liked ? 'var(--yellow)' : 'var(--black)',
                    transition: 'all 0.15s',
                }}>
                    <Heart size={18} className={likeAnimate ? 'heart-animate' : ''}
                        fill={liked ? 'currentColor' : 'none'} />
                    {postUser.hide_likes && !isOwner ? '' : likesCount} {liked ? 'LIKED' : 'LIKE'}
                </button>

                <button onClick={toggleComments} style={{
                    flex: 1, padding: '14px 20px', background: showComments ? 'var(--yellow)' : 'var(--white)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: "'Space Mono', monospace", fontSize: '12px', fontWeight: '700',
                    letterSpacing: '2px', textTransform: 'uppercase',
                    color: 'var(--black)', transition: 'all 0.15s',
                }}>
                    <MessageCircle size={18} /> {commentsCount} COMMENTS
                </button>
            </div>

            {/* Caption & Metadata */}
            <div style={{ padding: '16px 20px', borderBottom: showComments ? '3px solid var(--black)' : 'none', background: 'var(--white)' }}>
                {likesCount > 0 && (!postUser.hide_likes || isOwner) && (
                    <div style={{ marginBottom: captionText ? '8px' : '0px' ,textDecorationLine:'underline'}}>
                        <button onClick={openLikers} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: '700',
                            color: 'var(--black)', display: 'flex', alignItems: 'center', gap: '6px',
                            textTransform: 'uppercase'
                        }}>
                            
                            VIEW LIKES
                        </button>
                    </div>
                )}

                {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <textarea
                            value={editCaptionText}
                            onChange={(e) => setEditCaptionText(e.target.value)}
                            style={{
                                width: '100%', padding: '10px', fontSize: '13px',
                                fontFamily: "'Space Mono', monospace", border: '2px solid var(--black)',
                                background: 'rgba(255,224,0,0.05)', outline: 'none', resize: 'vertical', minHeight: '60px',
                                color: 'var(--black)',
                            }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsEditing(false)} disabled={isSaving} style={{
                                background: 'none', border: '2px solid var(--black)', color: 'var(--black)',
                                padding: '6px 12px', fontSize: '10px', fontWeight: '700', cursor: 'pointer',
                                fontFamily: "'Space Mono', monospace", letterSpacing: '1px', textTransform: 'uppercase'
                            }}>CANCEL</button>
                            <button onClick={handleEditSave} disabled={isSaving} style={{
                                background: 'var(--yellow)', border: '2px solid var(--black)', color: 'var(--black)',
                                padding: '6px 12px', fontSize: '10px', fontWeight: '700', cursor: 'pointer',
                                fontFamily: "'Space Mono', monospace", letterSpacing: '1px', textTransform: 'uppercase'
                            }}>{isSaving ? 'SAVING...' : 'SAVE'}</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: captionText ? '8px' : 0 }}>
                            <Link to={`/profile/${postUser.username}`} style={{
                                fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
                                color: 'var(--black)', textDecoration: 'none', textTransform: 'uppercase',
                                marginRight: '8px', letterSpacing: '0.5px',
                            }}>
                                {postUser.username}
                            </Link>
                            <span
                                onClick={() => hasCaption && setExpandedCaption(v => !v)}
                                style={{
                                    cursor: hasCaption ? 'pointer' : 'default',
                                    display: expandedCaption ? 'inline' : '-webkit-box',
                                    WebkitLineClamp: expandedCaption ? 'unset' : 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: expandedCaption ? 'visible' : 'hidden',
                                    textOverflow: 'ellipsis',
                                    verticalAlign: 'top',
                                    whiteSpace: expandedCaption ? 'normal' : 'pre-wrap',
                                }}
                            >
                                {renderTextWithLinks(captionText)}
                            </span>
                        </p>
                        {hasCaption && (
                            <button
                                onClick={() => setExpandedCaption(v => !v)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    fontFamily: "'Space Mono', monospace",
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase',
                                    color: 'rgba(10,10,10,0.6)',
                                }}
                            >
                                {expandedCaption ? 'Show less' : 'Show more'}
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Comments */}
            {showComments && (
                <div className="animate-fade-in">
                    <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f0ebe3' }}>
                        {loadingComments
                            ? <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><div className="spinner" style={{ width: '28px', height: '28px' }} /></div>
                            : comments.length === 0
                                ? <p style={{ textAlign: 'center', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', padding: '16px 0' }}>NO COMMENTS YET — BE FIRST</p>
                                : comments.map(c => <Comment key={c.id} comment={c} />)
                        }
                    </div>

                    {user ? (
                        <form onSubmit={handleComment} style={{
                            display: 'flex', borderTop: '3px solid var(--black)',
                        }}>
                            <input ref={commentInputRef} value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                placeholder="WRITE A COMMENT..."
                                style={{
                                    flex: 1, background: 'var(--white)', border: 'none',
                                    padding: '14px 16px', fontFamily: "'Space Mono', monospace",
                                    fontSize: '12px', outline: 'none', color: 'var(--black)',
                                    letterSpacing: '0.5px',
                                }}
                                disabled={submittingComment} />
                            <button type="submit" disabled={!commentText.trim() || submittingComment}
                                style={{
                                    background: commentText.trim() ? 'var(--yellow)' : '#ddd',
                                    border: 'none', borderLeft: '3px solid var(--black)',
                                    cursor: 'pointer', padding: '14px 20px',
                                    display: 'flex', alignItems: 'center',
                                    transition: 'background 0.15s',
                                }}>
                                <Send size={16} color="var(--black)" />
                            </button>
                        </form>
                    ) : (
                        <div style={{ padding: '14px 20px', borderTop: '3px solid var(--black)', textAlign: 'center', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                            <Link to="/login" style={{ color: 'var(--black)', fontWeight: '700', textDecoration: 'underline', textDecorationThickness: '2px' }}>LOGIN</Link> TO COMMENT
                        </div>
                    )}
                </div>
            )}
            
            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="DELETE POST"
                message="Are you sure you want to delete this post? This action cannot be undone."
                confirmText="DELETE"
                cancelText="CANCEL"
                isDangerous={true}
            />

            {/* Likers Modal */}
            {showLikesModal && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(10,10,10,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                }} onClick={e => e.target === e.currentTarget && setShowLikesModal(false)}>
                    <div className="animate-scale-in" style={{
                        background: 'var(--white)', maxWidth: '420px', width: '100%',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                        border: 'var(--border-thick)', boxShadow: '12px 12px 0 var(--yellow)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            background: 'var(--black)', padding: '14px 20px',
                            borderBottom: '5px solid var(--yellow)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Heart size={14} fill="currentColor" color="var(--red)" />
                                <span style={{
                                    fontFamily: "'Space Mono', monospace", fontSize: '11px',
                                    fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)',
                                    textTransform: 'uppercase',
                                }}>
                                    LIKES {postUser.hide_likes && !isOwner ? '' : `— ${likesCount}`}
                                </span>
                            </div>
                            <button onClick={() => setShowLikesModal(false)} style={{
                                background: 'none', border: '2px solid rgba(245,240,232,0.3)',
                                color: 'var(--white)', cursor: 'pointer',
                                width: '28px', height: '28px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <X size={13} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {likersLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                    <div className="spinner" style={{ width: '32px', height: '32px' }} />
                                </div>
                            ) : likers.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <p style={{
                                        fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase',
                                        color: 'rgba(10,10,10,0.4)', fontWeight: '700',
                                    }}>
                                        NO LIKES YET
                                    </p>
                                </div>
                            ) : (
                                likers.map((u, i) => (
                                    <Link key={u.id} to={`/profile/${u.username}`}
                                        onClick={() => setShowLikesModal(false)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '14px 20px', textDecoration: 'none',
                                            borderBottom: i < likers.length - 1 ? '3px solid var(--black)' : 'none',
                                            transition: 'background 0.15s',
                                            color: 'var(--black)',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.12)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {u.profile_image
                                            ? <img src={u.profile_image} alt={u.username} className="avatar" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                                            : <div className="avatar-text" style={{ width: '40px', height: '40px', fontSize: '15px', flexShrink: 0 }}>{u.username?.charAt(0)}</div>
                                        }
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontFamily: "'Space Grotesk', sans-serif",
                                                fontWeight: '700', fontSize: '14px',
                                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                            }}>
                                                {u.username}
                                            </p>
                                        </div>
                                        <div style={{
                                            fontSize: '9px', letterSpacing: '2px', color: 'rgba(10,10,10,0.3)',
                                            fontWeight: '700', textTransform: 'uppercase',
                                        }}>VIEW →</div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showImageModal && createPortal(
                <div
                    className="animate-fade-in"
                    onClick={() => setShowImageModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        background: '#000',
                    }}
                >
                    <img
                        onClick={() => setShowImageModal(false)}
                        src={post.image_url}
                        alt={post.caption}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            width: '100vw',
                            height: '100vh',
                            objectFit: 'contain',
                            display: 'block',
                            cursor: 'zoom-out',
                        }}
                    />
                </div>,
                document.body
            )}
        </article>
    );
};

const Comment = ({ comment }) => {
    const cu = comment.user || {};
    const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            {cu.profile_image
                ? <img src={cu.profile_image} alt={cu.username} className="avatar" style={{ width: '28px', height: '28px', flexShrink: 0 }} />
                : <div className="avatar-text" style={{ width: '28px', height: '28px', fontSize: '11px', flexShrink: 0 }}>{cu.username?.charAt(0)}</div>
            }
            <div style={{ background: 'var(--white)', border: '2px solid var(--black)', padding: '8px 12px', flex: 1, boxShadow: '2px 2px 0 var(--black)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cu.username}</span>
                    <span style={{ fontSize: '9px', letterSpacing: '1px', color: 'rgba(10,10,10,0.4)', textTransform: 'uppercase' }}>{timeAgo}</span>
                </div>
                <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--black)' }}>{comment.comment_text}</p>
            </div>
        </div>
    );
};

export default PostCard;
