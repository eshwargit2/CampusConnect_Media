import React, { useState, useEffect, useCallback, useRef } from 'react';
import PostCard from '../components/PostCard';
import StoryBar from '../components/StoryBar';
import StoryViewer from '../components/StoryViewer';
import { Loader2, RefreshCw, Inbox } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const Feed = ({ newPost }) => {
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const loaderRef = useRef(null);
    const [viewerData, setViewerData] = useState(null); // { groups, idx }
    const [storyRefresh, setStoryRefresh] = useState(0);

    const fetchPosts = useCallback(async (pageNum = 1, replace = false) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        try {
            const { data } = await api.get(`/posts?page=${pageNum}&limit=10`);
            if (replace) setPosts(data.posts); else setPosts(prev => [...prev, ...data.posts]);
            setHasMore(data.hasMore); setPage(pageNum);
        } catch { toast.error('FAILED TO LOAD POSTS'); }
        finally { setLoading(false); setLoadingMore(false); }
    }, []);

    useEffect(() => { fetchPosts(1, true); }, [fetchPosts]);
    useEffect(() => { if (newPost) setPosts(prev => [newPost, ...prev]); }, [newPost]);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) fetchPosts(page + 1, false);
        }, { threshold: 0.1 });
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, page, fetchPosts]);

    const handleDelete = (postId) => setPosts(prev => prev.filter(p => p.id !== postId));

    return (
        <div className="page-container">
            {/* Stories */}
            <StoryBar
                onOpenViewer={(groups, idx) => setViewerData({ groups, idx })}
                onRefreshKey={storyRefresh}
            />

            {/* Story Viewer (fullscreen) */}
            {viewerData && (
                <StoryViewer
                    storyGroups={viewerData.groups}
                    initialGroupIndex={viewerData.idx}
                    onClose={() => { setViewerData(null); setStoryRefresh(k => k + 1); }}
                />
            )}

            {/* Header */}
            <div style={{
                background: 'var(--white)', padding: '24px 28px',
                border: 'var(--border-thick)',
                borderRadius: '24px',
                boxShadow: 'var(--shadow)',
                marginBottom: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                        001 / GLOBAL FEED
                    </div>
                    <h1 style={{
                        fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: '800',
                        color: 'var(--black)', letterSpacing: '-0.5px', textTransform: 'uppercase',
                        lineHeight: '1',
                    }}>
                        COLLEGE<span style={{ color: 'var(--yellow)' }}>FEED</span>
                    </h1>
                </div>
                <button onClick={() => fetchPosts(1, true)} className="btn-brand"
                    style={{ padding: '10px 16px !important', fontSize: '11px' }} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    REFRESH
                </button>
            </div>

            {/* Ticker */}
            <div className="ticker-bar" style={{ border: 'var(--border)', marginBottom: '32px' }}>
                <div className="ticker-track">
                    {['LATEST POSTS', 'COLLEGE NEWS', 'SHARE YOUR STORY', 'CONNECT WITH PEERS', 'LATEST POSTS', 'COLLEGE NEWS', 'SHARE YOUR STORY', 'CONNECT WITH PEERS'].map((t, i) => (
                        <span key={i} className="ticker-item">{t}</span>
                    ))}
                </div>
            </div>

            {/* Posts */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
                </div>
            ) : posts.length === 0 ? (
                <div style={{
                    background: 'var(--white)', border: 'var(--border-thick)',
                    borderRadius: '24px',
                    boxShadow: 'var(--shadow)', textAlign: 'center', padding: '80px 24px',
                }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'var(--primary-tint)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 20px',
                        boxShadow: 'var(--clay-btn-shadow)',
                    }}>
                        <Inbox size={32} color="var(--yellow)" />
                    </div>
                    <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                        NO POSTS YET
                    </p>
                    <p style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                        BE THE FIRST TO SHARE SOMETHING
                    </p>
                </div>
            ) : (
                <>
                    {posts.map(post => <PostCard key={post.id} post={post} onDelete={handleDelete} />)}
                    <div ref={loaderRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {loadingMore && <div className="spinner" />}
                        {!hasMore && posts.length > 0 && (
                            <div style={{
                                fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
                                color: 'var(--text-muted)', fontWeight: '700',
                                borderTop: '1px solid var(--border-color)', paddingTop: '16px', width: '100%', textAlign: 'center',
                                fontFamily: "'Outfit', sans-serif",
                            }}>
                                ■ END OF FEED ■
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const PostSkeleton = () => (
    <div style={{
        background: 'var(--white)', border: 'var(--border-thick)',
        borderRadius: '28px',
        boxShadow: 'var(--shadow)', marginBottom: '32px',
        overflow: 'hidden',
    }}>
        <div style={{ background: 'var(--primary-tint)', padding: '8px 16px', height: '32px' }} className="skeleton" />
        <div style={{ padding: '16px 20px', display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} className="skeleton" />
            <div style={{ flex: 1 }}>
                <div style={{ width: '120px', height: '12px', marginBottom: '8px', borderRadius: '6px' }} className="skeleton" />
                <div style={{ width: '80px', height: '10px', borderRadius: '5px' }} className="skeleton" />
            </div>
        </div>
        <div style={{ height: '320px', borderBottom: '1px solid var(--border-color)' }} className="skeleton" />
        <div style={{ padding: '16px 20px' }}>
            <div style={{ width: '200px', height: '12px', marginBottom: '10px', borderRadius: '6px' }} className="skeleton" />
            <div style={{ width: '100%', height: '12px', borderRadius: '6px' }} className="skeleton" />
        </div>
    </div>
);

export default Feed;
