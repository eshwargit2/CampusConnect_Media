import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, Play, FileText, Layers, Heart, MessageCircle, X, Inbox, BadgeCheck } from 'lucide-react';
import api from '../lib/api';
import PostCard from '../components/PostCard';

const renderVerificationBadge = (postCount) => {
    if (postCount === undefined || postCount === null) return null;
    if (postCount >= 50) {
        return (
            <span title="Premium Gold Creator (50+ Posts)" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
                <BadgeCheck size={16} color="#ffffff" fill="#eab308" style={{ filter: 'drop-shadow(0 1px 2px rgba(234,179,8,0.2))' }} />
            </span>
        );
    }
    if (postCount >= 15) {
        return (
            <span title="Verified Blue Creator (15+ Posts)" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: '4px', flexShrink: 0 }}>
                <BadgeCheck size={16} color="#ffffff" fill="#3b82f6" style={{ filter: 'drop-shadow(0 1px 2px rgba(59,130,246,0.2))' }} />
            </span>
        );
    }
    return null;
};

const Search = () => {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const [randomPosts, setRandomPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [activePost, setActivePost] = useState(null);

    const debounceRef = useRef(null);

    // Fetch random discovery posts
    const fetchRandomPosts = useCallback(async () => {
        setLoadingPosts(true);
        try {
            const { data } = await api.get('/posts/random?limit=30');
            setRandomPosts(data.posts || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPosts(false);
        }
    }, []);

    // Load random posts on mount
    useEffect(() => {
        fetchRandomPosts();
    }, [fetchRandomPosts]);

    // Handle user search API call
    const doUserSearch = useCallback(async (q) => {
        if (!q.trim()) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        try {
            const { data } = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
            setSearchResults(data.users || []);
        } catch (err) {
            console.error(err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, []);

    // Handle input query changes with debounce
    const handleQueryChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setSearching(true);
        clearTimeout(debounceRef.current);
        if (!val.trim()) {
            setSearchResults([]);
            setSearching(false);
            return;
        }
        debounceRef.current = setTimeout(() => {
            doUserSearch(val);
        }, 300);
    };

    // Clear search
    const handleClearSearch = () => {
        setQuery('');
        setSearchResults([]);
        setSearching(false);
    };

    const handleDeletePost = (postId) => {
        setRandomPosts(prev => prev.filter(p => p.id !== postId));
        if (activePost?.id === postId) {
            setActivePost(null);
        }
    };

    // Scroll lock for open modal
    useEffect(() => {
        if (activePost) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [activePost]);

    return (
        <div className="page-container" style={{ paddingBottom: '120px' }}>
            {/* Inline CSS styling for the Explore Grid */}
            <style>{`
                .media-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    width: 100%;
                }
                @media (max-width: 768px) {
                    .media-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 6px;
                    }
                }
                .media-grid-item {
                    position: relative;
                    aspect-ratio: 1 / 1;
                    overflow: hidden;
                    border-radius: 16px;
                    border: var(--border-thick);
                    cursor: pointer;
                    background: var(--white);
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
                    box-shadow: var(--shadow);
                }
                .media-grid-item:hover {
                    transform: scale(1.03) translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }
                .media-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                    color: #ffffff;
                    font-family: 'Outfit', sans-serif;
                    font-size: 15px;
                    font-weight: 700;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    backdrop-filter: blur(3px);
                    z-index: 3;
                }
                .media-grid-item:hover .media-overlay {
                    opacity: 1;
                }
                .media-stat {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .media-type-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(4px);
                    color: #ffffff;
                    padding: 6px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
            `}</style>

            {/* Search Header Input */}
            <div style={{
                background: 'var(--white)',
                padding: '16px 24px',
                border: 'var(--border-thick)',
                borderRadius: '24px',
                boxShadow: 'var(--shadow)',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <SearchIcon size={20} color="var(--yellow)" style={{ flexShrink: 0 }} />
                <input
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Search users by name or bio..."
                    style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--black)',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '16px',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        padding: '8px 0'
                    }}
                />
                {query && (
                    <button
                        onClick={handleClearSearch}
                        style={{
                            background: 'var(--primary-tint)',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '6px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Content Section */}
            {query.trim() ? (
                /* User Search Results */
                <div style={{
                    background: 'var(--white)',
                    border: 'var(--border-thick)',
                    borderRadius: '24px',
                    boxShadow: 'var(--shadow)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '10px',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: '700'
                    }}>
                        Search Results
                    </div>

                    {searching ? (
                        <div style={{
                            padding: '48px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <Loader2 className="animate-spin" size={24} color="var(--yellow)" />
                            <span style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                                Searching database...
                            </span>
                        </div>
                    ) : searchResults.length === 0 ? (
                        <div style={{
                            padding: '48px 24px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'var(--primary-tint)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Inbox size={24} color="var(--yellow)" />
                            </div>
                            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                                No Users Found
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                                Try searching for another keyword
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {searchResults.map((u) => (
                                <Link
                                    key={u.id}
                                    to={`/profile/${u.username}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px 24px',
                                        textDecoration: 'none',
                                        borderBottom: '1px solid var(--border-color)',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-tint)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* User Profile Image */}
                                    {u.profile_image ? (
                                        <img
                                            src={u.profile_image}
                                            alt=""
                                            style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                flexShrink: 0,
                                                border: '1px solid var(--border-color)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            background: 'var(--primary-tint)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontFamily: "'Outfit', sans-serif",
                                            fontWeight: '700',
                                            fontSize: '20px',
                                            color: 'var(--yellow)',
                                            flexShrink: 0
                                        }}>
                                            {u.username?.charAt(0).toUpperCase()}
                                        </div>
                                    )}

                                    {/* User Details */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontFamily: "'Outfit', sans-serif",
                                            fontWeight: '700',
                                            fontSize: '15px',
                                            color: 'var(--black)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {u.username}
                                            {renderVerificationBadge(u.posts_count)}
                                        </p>
                                        {u.bio && (
                                            <p style={{
                                                fontSize: '12px',
                                                color: 'var(--text-muted)',
                                                marginTop: '2px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {u.bio}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action indicator */}
                                    <span style={{
                                        fontSize: '18px',
                                        color: 'var(--yellow)',
                                        fontWeight: '700',
                                        flexShrink: 0
                                    }}>→</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Discover Feed (Instagram Explore Style Media Grid) */
                <div>
                    {loadingPosts ? (
                        <div style={{
                            padding: '64px',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <Loader2 className="animate-spin" size={28} color="var(--yellow)" />
                            <span style={{ fontSize: '12px', letterSpacing: '2px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                                Loading Explore Grid...
                            </span>
                        </div>
                    ) : randomPosts.length === 0 ? (
                        <div style={{
                            background: 'var(--white)',
                            border: 'var(--border-thick)',
                            borderRadius: '24px',
                            boxShadow: 'var(--shadow)',
                            textAlign: 'center',
                            padding: '64px 24px'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'var(--primary-tint)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Inbox size={24} color="var(--yellow)" />
                            </div>
                            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                                No Media Found
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                                Try again later
                            </p>
                        </div>
                    ) : (
                        <div className="media-grid">
                            {randomPosts.map(post => {
                                const slides = post.image_urls && post.image_urls.length > 0 
                                    ? post.image_urls 
                                    : (post.image_url ? [post.image_url] : []);
                                const firstMedia = slides[0];

                                const isVideo = firstMedia?.includes('/video/') || firstMedia?.endsWith('.mp4');
                                const isPdf = firstMedia?.toLowerCase().includes('.pdf') || firstMedia?.toLowerCase().includes('/pdf');
                                const isDoc = firstMedia?.toLowerCase().includes('.ppt') || firstMedia?.toLowerCase().includes('.pptx') || 
                                              firstMedia?.toLowerCase().includes('.doc') || firstMedia?.toLowerCase().includes('.docx');
                                const hasMultiple = slides.length > 1;

                                return (
                                    <div 
                                        key={post.id} 
                                        className="media-grid-item"
                                        onClick={() => setActivePost(post)}
                                    >
                                        {/* Render Media content */}
                                        {firstMedia ? (
                                            isVideo ? (
                                                <video src={firstMedia} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : isPdf || isDoc ? (
                                                <div style={{
                                                    width: '100%', height: '100%', background: 'var(--primary-tint)',
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--yellow)', gap: '8px'
                                                }}>
                                                    <FileText size={32} />
                                                    <span style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                                        {isPdf ? 'PDF' : 'DOC'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <img src={firstMedia} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                            )
                                        ) : (
                                            /* Text-only fallback card with nice neomorphic look */
                                            <div style={{
                                                width: '100%', height: '100%', background: 'var(--primary-tint)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '16px', textAlign: 'center', overflow: 'hidden',
                                                fontSize: '11px', fontWeight: '700', color: 'var(--black)',
                                                fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
                                                lineHeight: '1.4'
                                            }}>
                                                <div style={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}>
                                                    {post.caption}
                                                </div>
                                            </div>
                                        )}

                                        {/* Badge indicators */}
                                        {hasMultiple && (
                                            <div className="media-type-badge">
                                                <Layers size={14} />
                                            </div>
                                        )}
                                        {!hasMultiple && isVideo && (
                                            <div className="media-type-badge">
                                                <Play size={14} fill="white" />
                                            </div>
                                        )}

                                        {/* Hover stats overlay */}
                                        <div className="media-overlay">
                                            <div className="media-stat">
                                                <Heart size={18} fill="white" />
                                                <span>{post.likes_count}</span>
                                            </div>
                                            <div className="media-stat">
                                                <MessageCircle size={18} fill="white" />
                                                <span>{post.comments_count}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Post Lightbox Modal */}
            {activePost && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                    onClick={() => setActivePost(null)}
                >
                    <div 
                        style={{
                            width: '100%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            background: 'var(--white)',
                            borderRadius: '24px',
                            border: 'var(--border-thick)',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close bar */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '12px 18px',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <span style={{ fontSize: '11px', letterSpacing: '1px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
                                Explore Detail
                            </span>
                            <button 
                                onClick={() => setActivePost(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Full PostCard */}
                        <PostCard 
                            post={activePost} 
                            onDelete={(deletedId) => handleDeletePost(deletedId)} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Search;
