import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, Send, MoreHorizontal, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { OnlineDot } from '../context/OnlineContext';
import ConfirmModal from './ConfirmModal';
import api from '../lib/api';
import toast from 'react-hot-toast';

const PostCard = ({ post, onDelete }) => {
    const { user } = useAuth();
    const [liked, setLiked] = useState(post.liked_by_me || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [likeAnimate, setLikeAnimate] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const commentInputRef = useRef(null);
    const postUser = post.user || {};
    const isOwner = user?.id === postUser.id;
    const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

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
        setCommentLoading(true);
        try {
            const { data } = await api.post(`/posts/${post.id}/comments`, { comment_text: commentText.trim() });
            setComments(prev => [...prev, data.comment]);
            setCommentsCount(c => c + 1); setCommentText('');
        } catch (err) { toast.error(err.response?.data?.error || 'FAILED'); }
        finally { setCommentLoading(false); }
    };

    const handleDelete = async () => {
        try { await api.delete(`/posts/${post.id}`); toast.success('POST DELETED'); onDelete(post.id); }
        catch { toast.error('FAILED TO DELETE'); }
        setShowMenu(false);
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
                    style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block' }}
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
                    {likesCount} {liked ? 'LIKED' : 'LIKE'}
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

            {/* Caption */}
            <div style={{ padding: '14px 20px', borderBottom: showComments ? '3px solid var(--black)' : 'none', background: 'var(--white)' }}>
                <p style={{ fontSize: '13px', lineHeight: '1.7' }}>
                    <Link to={`/profile/${postUser.username}`} style={{
                        fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
                        color: 'var(--black)', textDecoration: 'none', textTransform: 'uppercase',
                        marginRight: '8px', letterSpacing: '0.5px',
                    }}>
                        {postUser.username}
                    </Link>
                    {post.caption}
                </p>
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
                                disabled={commentLoading} />
                            <button type="submit" disabled={!commentText.trim() || commentLoading}
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
