import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, Send, MoreHorizontal, Edit2, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { OnlineDot } from '../context/OnlineContext';
import ConfirmModal from './ConfirmModal';
import api from '../lib/api';
import toast from 'react-hot-toast';
import useIsMobile from '../hooks/useIsMobile';

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

const PDFSlideViewer = ({ url, onDoubleClick, onClick, height = '520px' }) => {
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef(null);
    const pdfDocRef = useRef(null);

    useEffect(() => {
        let active = true;
        setLoading(true);

        const loadPdf = async () => {
            try {
                if (!window.pdfjsLib) {
                    await new Promise((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
                        script.onload = () => {
                            window.pdfjsLib = window['pdfjs-dist/build/pdf'];
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                            resolve();
                        };
                        document.head.appendChild(script);
                    });
                } else {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                }

                const loadingTask = window.pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;
                if (!active) return;
                pdfDocRef.current = pdf;
                setNumPages(pdf.numPages);
                setLoading(false);
                setTimeout(() => renderPage(pdf, 1), 50);
            } catch (err) {
                console.error("Error loading PDF: ", err);
                if (active) setLoading(false);
            }
        };

        loadPdf();

        return () => {
            active = false;
        };
    }, [url]);

    const renderPage = async (pdfDoc, pageNum) => {
        const doc = pdfDoc || pdfDocRef.current;
        if (!doc || !canvasRef.current) return;
        try {
            const page = await doc.getPage(pageNum);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Fit inside parent container height and match width dynamically
            const unscaledViewport = page.getViewport({ scale: 1.0 });
            const containerHeight = canvas.parentElement ? canvas.parentElement.clientHeight : 520;
            const containerWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
            
            const scaleHeight = (containerHeight * 0.85) / unscaledViewport.height;
            const scaleWidth = containerWidth / unscaledViewport.width;
            const baseScale = Math.min(scaleHeight, scaleWidth);
            
            // Support high DPI screens for crisp text and clear image rendering (minimum 3.0x scale multiplier)
            const pixelRatio = Math.max(window.devicePixelRatio || 1, 3.0);
            const renderScale = baseScale * pixelRatio;
            
            const viewport = page.getViewport({ scale: renderScale });
            
            // Set backing store dimensions (drawing resolution)
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Set CSS display dimensions (layout size)
            const cssWidth = unscaledViewport.width * baseScale;
            const cssHeight = unscaledViewport.height * baseScale;
            canvas.style.width = `${cssWidth}px`;
            canvas.style.height = `${cssHeight}px`;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            await page.render(renderContext).promise;
        } catch (err) {
            console.error("Error rendering PDF page: ", err);
        }
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        if (currentPage > 1) {
            const nextP = currentPage - 1;
            setCurrentPage(nextP);
            renderPage(null, nextP);
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (currentPage < numPages) {
            const nextP = currentPage + 1;
            setCurrentPage(nextP);
            renderPage(null, nextP);
        }
    };

    if (loading) {
        return (
            <div style={{ height: height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-tint)' }}>
                <div className="spinner" style={{ width: '28px', height: '28px' }} />
            </div>
        );
    }

    return (
        <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: height, 
            overflow: 'hidden', 
            background: 'var(--bg-body)', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center' 
        }}>
            <canvas 
                ref={canvasRef} 
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                style={{ 
                    maxWidth: '90%', 
                    maxHeight: '82%', 
                    objectFit: 'contain', 
                    display: 'block', 
                    cursor: 'zoom-in',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: '#ffffff'
                }} 
            />
            
            {numPages > 1 && (
                <div style={{
                    position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(15, 23, 42, 0.75)',
                    padding: '6px 12px', borderRadius: '20px', color: '#fff', fontSize: '10px', fontFamily: "'Outfit', sans-serif", fontWeight: '700',
                    zIndex: 10, backdropFilter: 'blur(4px)', pointerEvents: 'auto'
                }}>
                    <button type="button" onClick={handlePrev} disabled={currentPage === 1} style={{ background: 'none', border: 'none', color: '#fff', cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.3 : 1, outline: 'none' }}>◀</button>
                    <span style={{ userSelect: 'none' }}>PAGE {currentPage} / {numPages}</span>
                    <button type="button" onClick={handleNext} disabled={currentPage === numPages} style={{ background: 'none', border: 'none', color: '#fff', cursor: currentPage === numPages ? 'default' : 'pointer', opacity: currentPage === numPages ? 0.3 : 1, outline: 'none' }}>▶</button>
                </div>
            )}
        </div>
    );
};

const DocumentIframeViewer = ({ url, height = '520px' }) => {
    return (
        <div style={{ position: 'relative', width: '100%', height: height, background: 'var(--bg-body)', overflow: 'hidden' }}>
            <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                style={{ 
                    position: 'absolute',
                    top: '-45px',
                    left: 0,
                    width: '100%', 
                    height: 'calc(100% + 45px)', 
                    border: 'none' 
                }}
                title="Document Viewer"
            />
            <div style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff',
                padding: '4px 8px', borderRadius: '10px', fontSize: '9px', fontWeight: '700',
                fontFamily: "'Outfit', sans-serif", letterSpacing: '1px', textTransform: 'uppercase',
                zIndex: 2, pointerEvents: 'none'
            }}>
                DOC/PPT
            </div>
        </div>
    );
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

    const isMobile = useIsMobile();

    // Carousel state & slides resolver
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = post.image_urls && post.image_urls.length > 0 
        ? post.image_urls 
        : (post.image_url ? [post.image_url] : []);

    // Touch swipe refs & handlers
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const handleTouchStart = (e) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        const threshold = 50;
        const distance = touchStartX.current - touchEndX.current;
        if (distance > threshold) {
            // swipe left -> next slide
            setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
        } else if (distance < -threshold) {
            // swipe right -> prev slide
            setCurrentSlide(prev => Math.max(0, prev - 1));
        }
    };

    useEffect(() => {
        if (!showImageModal) return;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') setShowImageModal(false);
            if (e.key === 'ArrowLeft') {
                setCurrentSlide(prev => Math.max(0, prev - 1));
            }
            if (e.key === 'ArrowRight') {
                setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
            }
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [showImageModal, slides.length]);

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
                background: 'var(--primary-tint)', padding: '8px 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-color)',
            }}>
                <span style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'var(--yellow)', textTransform: 'uppercase', fontWeight: '700', fontFamily: "'Outfit', sans-serif" }}>
                    ■ POST
                </span>
                <span style={{ fontSize: '9px', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                    {timeAgo}
                </span>
            </div>

            {/* Header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
                <Link to={`/profile/${postUser.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        {postUser.profile_image
                            ? <img src={postUser.profile_image} alt={postUser.username} className="avatar" style={{ width: '40px', height: '40px' }} />
                            : <div className="avatar-text" style={{ width: '40px', height: '40px', fontSize: '16px' }}>{postUser.username?.charAt(0)}</div>
                        }
                        <OnlineDot userId={postUser.id} size={10} />
                    </div>
                    <div>
                        <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '15px', color: 'var(--black)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {postUser.username}
                        </p>
                        <p style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                            COLLEGE MEMBER
                        </p>
                    </div>
                </Link>

                {isOwner && (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowMenu(!showMenu)} style={{
                            background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer',
                            padding: '4px 8px', width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '12px', boxShadow: 'var(--clay-btn-shadow)',
                            color: 'var(--black)',
                            transition: 'all 0.15s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-tint)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        {showMenu && (
                            <div className="animate-scale-in" style={{
                                position: 'absolute', right: 0, top: '42px',
                                background: 'var(--white)', border: '1px solid var(--border-color)',
                                borderRadius: '16px',
                                boxShadow: 'var(--shadow-lg)', zIndex: 10, minWidth: '160px',
                                overflow: 'hidden',
                            }}>
                                <button onClick={() => { setIsEditing(true); setEditCaptionText(captionText); setShowMenu(false); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                                    borderBottom: '1px solid var(--border-color)',
                                    width: '100%', textAlign: 'left', fontSize: '11px', fontWeight: '600',
                                    letterSpacing: '1px', textTransform: 'uppercase',
                                    fontFamily: "'Outfit', sans-serif",
                                    color: 'var(--black)', transition: 'background 0.15s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-tint)'}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                                >
                                    <Edit2 size={13} /> EDIT POST
                                </button>
                                <button onClick={() => { setShowDeleteModal(true); setShowMenu(false); }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                                    width: '100%', textAlign: 'left', fontSize: '11px', fontWeight: '600',
                                    letterSpacing: '1px', textTransform: 'uppercase',
                                    fontFamily: "'Outfit', sans-serif",
                                    color: 'var(--red)', transition: 'background 0.15s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-tint)'}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--red)'; }}
                                >
                                    <Trash2 size={13} /> DELETE POST
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Media Carousel */}
            <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}
            >
                <div style={{
                    display: 'flex',
                    transform: `translateX(-${currentSlide * 100}%)`,
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    width: '100%'
                }}>
                    {slides.map((url, index) => {
                        const isVideo = url?.includes('/video/') || url?.endsWith('.mp4');
                        const isPdf = url?.toLowerCase().includes('.pdf') || url?.toLowerCase().includes('/pdf');
                        const isDoc = url?.toLowerCase().includes('.ppt') || url?.toLowerCase().includes('.pptx') || 
                                      url?.toLowerCase().includes('.doc') || url?.toLowerCase().includes('.docx');

                        return (
                            <div key={index} style={{ width: '100%', flexShrink: 0, height: '100%', maxHeight: '520px' }}>
                                {isVideo ? (
                                    <video src={url} controls loop
                                        style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block' }}
                                        onClick={(e) => {
                                            if (e.detail === 2) handleLike();
                                        }}
                                    />
                                ) : isPdf ? (
                                    <PDFSlideViewer url={url} onDoubleClick={handleLike} onClick={() => setShowImageModal(true)} />
                                ) : isDoc ? (
                                    <DocumentIframeViewer url={url} />
                                ) : (
                                    <img src={url} alt={`${captionText || 'Post slide'} - ${index + 1}`}
                                        style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                                        onClick={() => setShowImageModal(true)}
                                        onDoubleClick={handleLike} loading="lazy" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {slides.length > 1 && (
                    <>
                        {!isMobile && (
                            <>
                                <button type="button" onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                                    disabled={currentSlide === 0}
                                    style={{
                                        position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)',
                                        background: 'rgba(255, 255, 255, 0.75)', border: 'none', cursor: currentSlide === 0 ? 'default' : 'pointer',
                                        width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: 'var(--black)', transition: 'all 0.2s',
                                        opacity: currentSlide === 0 ? 0 : 1, pointerEvents: currentSlide === 0 ? 'none' : 'auto',
                                        zIndex: 2,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)'}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button type="button" onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                                    disabled={currentSlide === slides.length - 1}
                                    style={{
                                        position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)',
                                        background: 'rgba(255, 255, 255, 0.75)', border: 'none', cursor: currentSlide === slides.length - 1 ? 'default' : 'pointer',
                                        width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)', color: 'var(--black)', transition: 'all 0.2s',
                                        opacity: currentSlide === slides.length - 1 ? 0 : 1, pointerEvents: currentSlide === slides.length - 1 ? 'none' : 'auto',
                                        zIndex: 2,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#ffffff'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.75)'}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </>
                        )}

                        {/* Counter badge */}
                        <div style={{
                            position: 'absolute', top: '16px', right: '16px',
                            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                            padding: '4px 8px', borderRadius: '12px', color: '#ffffff',
                            fontFamily: "'Outfit', sans-serif", fontSize: '10px', fontWeight: '700',
                            letterSpacing: '1px', zIndex: 2
                        }}>
                            {currentSlide + 1} / {slides.length}
                        </div>

                        {/* Dots */}
                        <div style={{
                            position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', gap: '6px', zIndex: 2, background: 'rgba(15, 23, 42, 0.3)',
                            padding: '6px 10px', borderRadius: '20px', backdropFilter: 'blur(4px)'
                        }}>
                            {slides.map((_, idx) => (
                                <div key={idx} onClick={() => setCurrentSlide(idx)}
                                    style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: idx === currentSlide ? 'var(--yellow)' : 'rgba(255, 255, 255, 0.5)',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        transform: idx === currentSlide ? 'scale(1.2)' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Actions row */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={handleLike} style={{
                    flex: 1, padding: '14px 20px', background: liked ? 'var(--danger-tint)' : 'transparent',
                    border: 'none', borderRight: '1px solid var(--border-color)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: '600',
                    letterSpacing: '1px', textTransform: 'uppercase',
                    color: liked ? 'var(--red)' : 'var(--black)',
                    transition: 'all 0.15s',
                }}>
                    <Heart size={18} className={likeAnimate ? 'heart-animate' : ''}
                        fill={liked ? 'currentColor' : 'none'} color={liked ? 'var(--red)' : 'currentColor'} />
                    {postUser.hide_likes && !isOwner ? '' : likesCount} {liked ? 'LIKED' : 'LIKE'}
                </button>

                <button onClick={toggleComments} style={{
                    flex: 1, padding: '14px 20px', background: showComments ? 'var(--primary-tint)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: '600',
                    letterSpacing: '1px', textTransform: 'uppercase',
                    color: showComments ? 'var(--yellow)' : 'var(--black)', transition: 'all 0.15s',
                }}>
                    <MessageCircle size={18} color={showComments ? 'var(--yellow)' : 'currentColor'} /> {commentsCount} COMMENTS
                </button>
            </div>

            {/* Caption & Metadata */}
            <div style={{ padding: '16px 20px', borderBottom: showComments ? '1px solid var(--border-color)' : 'none', background: 'var(--white)' }}>
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
                                width: '100%', padding: '12px', fontSize: '13px',
                                fontFamily: "'Inter', sans-serif", border: 'var(--border)',
                                borderRadius: '12px',
                                background: 'var(--primary-tint)', outline: 'none', resize: 'vertical', minHeight: '60px',
                                color: 'var(--black)',
                                boxShadow: 'var(--clay-input-shadow)',
                            }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsEditing(false)} disabled={isSaving} style={{
                                background: 'none', border: '1px solid var(--border-color)', color: 'var(--black)',
                                padding: '6px 14px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                                borderRadius: '10px', boxShadow: 'var(--clay-btn-shadow)',
                                fontFamily: "'Outfit', sans-serif", letterSpacing: '1px', textTransform: 'uppercase'
                            }}>CANCEL</button>
                            <button onClick={handleEditSave} disabled={isSaving} style={{
                                background: 'var(--yellow)', border: 'none', color: '#ffffff',
                                padding: '6px 14px', fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                                borderRadius: '10px', boxShadow: 'var(--clay-btn-shadow)',
                                fontFamily: "'Outfit', sans-serif", letterSpacing: '1px', textTransform: 'uppercase'
                            }}>{isSaving ? 'SAVING...' : 'SAVE'}</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p style={{ fontSize: '13px', lineHeight: '1.7', marginBottom: captionText ? '8px' : 0 }}>
                            <Link to={`/profile/${postUser.username}`} style={{
                                fontFamily: "'Outfit', sans-serif", fontWeight: '700',
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
                                    fontFamily: "'Outfit', sans-serif",
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px',
                                    textTransform: 'uppercase',
                                    color: 'var(--yellow)',
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
                    <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--primary-tint)' }}>
                        {loadingComments
                            ? <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><div className="spinner" style={{ width: '28px', height: '28px' }} /></div>
                            : comments.length === 0
                                ? <p style={{ textAlign: 'center', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '16px 0', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>NO COMMENTS YET — BE FIRST</p>
                                : comments.map(c => <Comment key={c.id} comment={c} />)
                        }
                    </div>

                    {user ? (
                        <form onSubmit={handleComment} style={{
                            display: 'flex', borderTop: '1px solid var(--border-color)',
                        }}>
                            <input ref={commentInputRef} value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                placeholder="WRITE A COMMENT..."
                                style={{
                                    flex: 1, background: 'var(--white)', border: 'none',
                                    padding: '14px 16px', fontFamily: "'Inter', sans-serif",
                                    fontSize: '12px', outline: 'none', color: 'var(--black)',
                                    letterSpacing: '0.5px',
                                }}
                                disabled={submittingComment} />
                            <button type="submit" disabled={!commentText.trim() || submittingComment}
                                style={{
                                    background: commentText.trim() ? 'var(--primary-tint)' : 'transparent',
                                    border: 'none', borderLeft: '1px solid var(--border-color)',
                                    cursor: commentText.trim() ? 'pointer' : 'default', padding: '14px 20px',
                                    display: 'flex', alignItems: 'center',
                                    transition: 'all 0.15s',
                                }}>
                                <Send size={16} color={commentText.trim() ? 'var(--yellow)' : 'var(--text-muted)'} />
                            </button>
                        </form>
                    ) : (
                        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                            <Link to="/login" style={{ color: 'var(--yellow)', fontWeight: '700', textDecoration: 'underline', textDecorationThickness: '2px' }}>LOGIN</Link> TO COMMENT
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
                    background: 'rgba(15,23,42,0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                }} onClick={e => e.target === e.currentTarget && setShowLikesModal(false)}>
                    <div className="animate-scale-in" style={{
                        background: 'var(--white)', maxWidth: '420px', width: '100%',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                        border: 'var(--border-thick)', borderRadius: '24px',
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            background: 'var(--primary-tint)', padding: '16px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Heart size={14} fill="currentColor" color="var(--red)" />
                                <span style={{
                                    fontFamily: "'Outfit', sans-serif", fontSize: '11px',
                                    fontWeight: '700', letterSpacing: '1.5px', color: 'var(--yellow)',
                                    textTransform: 'uppercase',
                                }}>
                                    LIKES {postUser.hide_likes && !isOwner ? '' : `— ${likesCount}`}
                                </span>
                            </div>
                            <button onClick={() => setShowLikesModal(false)} style={{
                                background: 'none', border: '1px solid var(--border-color)',
                                color: 'var(--black)', cursor: 'pointer',
                                width: '28px', height: '28px',
                                borderRadius: '12px',
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
                                        fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase',
                                        color: 'var(--text-muted)', fontWeight: '600', fontFamily: "'Outfit', sans-serif"
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
                                            borderBottom: i < likers.length - 1 ? '1px solid var(--border-color)' : 'none',
                                            transition: 'background 0.15s',
                                            color: 'var(--black)',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-tint)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {u.profile_image
                                            ? <img src={u.profile_image} alt={u.username} className="avatar" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                                            : <div className="avatar-text" style={{ width: '40px', height: '40px', fontSize: '15px', flexShrink: 0 }}>{u.username?.charAt(0)}</div>
                                        }
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                fontFamily: "'Outfit', sans-serif",
                                                fontWeight: '700', fontSize: '14px',
                                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                            }}>
                                                {u.username}
                                            </p>
                                        </div>
                                        <div style={{
                                            fontSize: '10px', letterSpacing: '1px', color: 'var(--yellow)',
                                            fontWeight: '600', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif"
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
                        background: 'rgba(0,0,0,0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Fullscreen slides wrapper */}
                    <div 
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                    >
                        {slides[currentSlide]?.includes('/video/') || slides[currentSlide]?.endsWith('.mp4') ? (
                            <video
                                onClick={(e) => e.stopPropagation()}
                                src={slides[currentSlide]}
                                controls autoPlay
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    zIndex: 10001
                                }}
                            />
                        ) : slides[currentSlide]?.toLowerCase().includes('.pdf') || slides[currentSlide]?.toLowerCase().includes('/pdf') ? (
                            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', height: '90%', zIndex: 10001 }}>
                                <PDFSlideViewer url={slides[currentSlide]} onDoubleClick={handleLike} onClick={() => setShowImageModal(false)} />
                            </div>
                        ) : slides[currentSlide]?.toLowerCase().includes('.ppt') || slides[currentSlide]?.toLowerCase().includes('.pptx') || 
                            slides[currentSlide]?.toLowerCase().includes('.doc') || slides[currentSlide]?.toLowerCase().includes('.docx') ? (
                            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', height: '90%', zIndex: 10001 }}>
                                <DocumentIframeViewer url={slides[currentSlide]} />
                            </div>
                        ) : (
                            <img
                                onClick={() => setShowImageModal(false)}
                                src={slides[currentSlide]}
                                alt={captionText}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain',
                                    cursor: 'zoom-out',
                                }}
                            />
                        )}
                        
                        {/* Fullscreen Navigation buttons */}
                        {slides.length > 1 && !isMobile && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => Math.max(0, prev - 1)); }}
                                    disabled={currentSlide === 0}
                                    style={{
                                        position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.2)',
                                        cursor: currentSlide === 0 ? 'default' : 'pointer', color: '#ffffff',
                                        width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: currentSlide === 0 ? 0.3 : 1, transition: 'all 0.2s', zIndex: 10002
                                    }}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1)); }}
                                    disabled={currentSlide === slides.length - 1}
                                    style={{
                                        position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.2)',
                                        cursor: currentSlide === slides.length - 1 ? 'default' : 'pointer', color: '#ffffff',
                                        width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        opacity: currentSlide === slides.length - 1 ? 0.3 : 1, transition: 'all 0.2s', zIndex: 10002
                                    }}
                                >
                                    <ChevronRight size={24} />
                                </button>
                                
                                <div style={{
                                    position: 'absolute', top: '24px', right: '24px',
                                    background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '16px',
                                    color: '#ffffff', fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: '700'
                                }}>
                                    {currentSlide + 1} / {slides.length}
                                </div>
                            </>
                        )}
                    </div>
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
            <div style={{ background: 'var(--white)', border: 'var(--border)', padding: '10px 14px', flex: 1, borderRadius: '16px', boxShadow: 'var(--clay-btn-shadow)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cu.username}</span>
                    <span style={{ fontSize: '9px', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>{timeAgo}</span>
                </div>
                <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--black)' }}>{comment.comment_text}</p>
            </div>
        </div>
    );
};

export default PostCard;
