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
                background: 'var(--black)', padding: '24px 28px',
                border: 'var(--border-thick)', borderBottom: '5px solid var(--yellow)',
                boxShadow: 'var(--shadow-lg)',
                marginBottom: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{ fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(245,240,232,0.4)', marginBottom: '6px' }}>
                        001 / GLOBAL FEED
                    </div>
                    <h1 style={{
                        fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: '700',
                        color: 'var(--white)', letterSpacing: '-1px', textTransform: 'uppercase',
                        lineHeight: '1',
                    }}>
                        COLLEGE<span style={{ color: 'var(--yellow)' }}>FEED</span>
                    </h1>
                </div>
                <button onClick={() => fetchPosts(1, true)} className="btn-brand"
                    style={{ padding: '10px 16px', fontSize: '11px' }} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    REFRESH
                </button>
            </div>

            {/* Ticker */}
            <div className="ticker-bar" style={{ border: 'var(--border-thick)', marginBottom: '32px', boxShadow: '4px 4px 0 var(--black)' }}>
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
                    boxShadow: 'var(--shadow-lg)', textAlign: 'center', padding: '80px 24px',
                }}>
                    <div style={{
                        width: '64px', height: '64px', background: 'var(--yellow)',
                        border: 'var(--border)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 20px',
                        boxShadow: '4px 4px 0 var(--black)',
                    }}>
                        <Inbox size={32} color="var(--black)" />
                    </div>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                        NO POSTS YET
                    </p>
                    <p style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
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
                                fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase',
                                color: 'rgba(10,10,10,0.4)', fontWeight: '700',
                                borderTop: '3px solid var(--black)', paddingTop: '16px', width: '100%', textAlign: 'center',
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
        background: 'var(--white)', border: '5px solid var(--black)',
        boxShadow: '10px 10px 0 var(--black)', marginBottom: '32px',
    }}>
        <div style={{ background: '#111', padding: '8px 16px', height: '32px' }} className="skeleton" />
        <div style={{ padding: '16px 20px', display: 'flex', gap: '12px', borderBottom: '3px solid var(--black)' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--black)', flexShrink: 0 }} className="skeleton" />
            <div style={{ flex: 1 }}>
                <div style={{ width: '120px', height: '12px', marginBottom: '8px', border: '2px solid var(--black)' }} className="skeleton" />
                <div style={{ width: '80px', height: '10px' }} className="skeleton" />
            </div>
        </div>
        <div style={{ height: '320px', borderBottom: '3px solid var(--black)' }} className="skeleton" />
        <div style={{ padding: '16px 20px' }}>
            <div style={{ width: '200px', height: '12px', marginBottom: '10px' }} className="skeleton" />
            <div style={{ width: '100%', height: '12px' }} className="skeleton" />
        </div>
    </div>
);

export default Feed;
