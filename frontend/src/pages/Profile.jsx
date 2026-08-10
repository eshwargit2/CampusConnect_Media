import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Camera, Edit3, Save, X, UserCheck, UserPlus, Loader2, AlertCircle, Grid3X3, List, Image, MapPin, Globe, Instagram, Github, Linkedin, Twitter, Users, MessageSquare, Settings, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OnlineDot } from '../context/OnlineContext';
import useIsMobile from '../hooks/useIsMobile';
import PostCard from '../components/PostCard';
import ConfirmModal from '../components/ConfirmModal';
import api from '../lib/api';
import toast from 'react-hot-toast';

const Profile = () => {
    const { username } = useParams();
    const { user: currentUser, updateUser } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [profileData, setProfileData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOwner, setIsOwner] = useState(false);
    const [followStatus, setFollowStatus] = useState('none');
    const [followLoading, setFollowLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null
    const [followList, setFollowList] = useState([]);
    const [followListLoading, setFollowListLoading] = useState(false);

    useEffect(() => { fetchProfile(); }, [username]);

    const fetchProfile = async () => {
        setLoading(true); setError('');
        try {
            const { data } = await api.get(`/users/${username}`);
            setProfileData(data.user); setPosts(data.posts || []);
            const ownerCheck = currentUser?.username === data.user.username;
            setIsOwner(ownerCheck);
            if (!ownerCheck && currentUser) {
                const { data: fd } = await api.get(`/users/${data.user.id}/is-following`);
                setFollowStatus(fd.status || 'none');
            }
        } catch { setError('USER NOT FOUND'); }
        finally { setLoading(false); }
    };

    const handleFollow = async () => {
        if (!currentUser) return navigate('/login');
        setFollowLoading(true);
        try {
            const { data } = await api.post(`/users/${profileData.id}/follow`);
            setFollowStatus(data.status);
            setProfileData(prev => ({ ...prev, followers_count: data.following ? prev.followers_count + 1 : prev.followers_count - (followStatus === 'accepted' ? 1 : 0) }));
        } catch { toast.error('FAILED'); }
        finally { setFollowLoading(false); }
    };

    const handleDeletePost = (postId) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    const openFollowModal = async (type) => {
        setFollowModal(type); setFollowListLoading(true); setFollowList([]);
        try {
            const endpoint = type === 'requests' ? `/users/auth/follow-requests` : `/users/${profileData.id}/${type}`;
            const { data } = await api.get(endpoint);
            setFollowList(type === 'requests' ? data.requests : data.users || []);
        } catch { toast.error('FAILED TO LOAD'); }
        finally { setFollowListLoading(false); }
    };

    const handleRequestAction = async (id, action) => {
        try {
            if (action === 'accept') await api.put(`/users/auth/follow-requests/${id}/accept`);
            else await api.delete(`/users/auth/follow-requests/${id}/reject`);
            setFollowList(prev => prev.filter(req => req.request_id !== id));
            if (action === 'accept') {
                setProfileData(prev => ({ ...prev, followers_count: (prev.followers_count || 0) + 1 }));
            }
            toast.success(action === 'accept' ? 'ACCEPTED' : 'REJECTED');
        } catch { toast.error('FAILED TO PROCESS REQUEST'); }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
            <div className="spinner" style={{ width: '48px', height: '48px' }} />
        </div>
    );

    if (error) return (
        <div className="page-container" style={{ paddingTop: '60px' }}>
            <div style={{ background: 'var(--red)', border: 'var(--border-thick)', padding: '40px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
                <AlertCircle size={40} color="var(--white)" style={{ margin: '0 auto 16px', display: 'block' }} />
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: '700', color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                    USER NOT FOUND
                </h2>
            </div>
        </div>
    );

    const displayAvatar = profileData.profile_image;

    // Social links config
    const socialLinks = [
        { key: 'link_instagram', label: 'Instagram', icon: <Instagram size={14} />, prefix: 'https://instagram.com/', color: '#E1306C' },
        { key: 'link_twitter', label: 'X / Twitter', icon: <Twitter size={14} />, prefix: 'https://x.com/', color: '#fff' },
        { key: 'link_linkedin', label: 'LinkedIn', icon: <Linkedin size={14} />, prefix: 'https://linkedin.com/in/', color: '#0077B5' },
        { key: 'link_github', label: 'GitHub', icon: <Github size={14} />, prefix: 'https://github.com/', color: '#fff' },
    ];

    const hasSocials = socialLinks.some(s => profileData[s.key]);
    const hasWebsite = !!profileData.website;
    const hasAddress = !!profileData.address;

    return (
        <div className="page-container">
            {/* Profile card */}
            <div style={{
                background: 'var(--white)', color: 'var(--black)', border: 'var(--border-thick)',
                borderRadius: '28px',
                boxShadow: 'var(--shadow-lg)', marginBottom: '32px',
                overflow: 'hidden',
            }} className="animate-fade-in-up">

                {/* Banner */}
                <div style={{
                    height: '100px', background: 'var(--primary-tint)',
                    borderBottom: '1px solid var(--border-color)', position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,224,0,0.04) 0, rgba(255,224,0,0.04) 1px, transparent 0, transparent 50%)',
                        backgroundSize: '40px 40px',
                    }} />
                    <div style={{
                        position: 'absolute', top: '12px', right: '20px',
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '72px', fontWeight: '800', color: 'var(--yellow)',
                        opacity: 0.12,
                        lineHeight: '1', userSelect: 'none', letterSpacing: '-4px',
                    }}>CC</div>
                </div>

                <div style={{ padding: isMobile ? '0 16px 20px' : '0 28px 28px' }}>
                    {/* Avatar row */}
                    <div style={{ display: 'flex', alignItems: isMobile ? 'center' : 'flex-end', justifyContent: 'space-between', marginTop: '-48px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            {displayAvatar
                                ? <img src={displayAvatar} alt={profileData.username} className="avatar" style={{ width: '96px', height: '96px', border: '3px solid var(--white)', borderRadius: '50%', boxShadow: 'var(--shadow)' }} />
                                : <div className="avatar-text" style={{ width: '96px', height: '96px', fontSize: '36px', border: '3px solid var(--white)', borderRadius: '50%', boxShadow: 'var(--shadow)' }}>{profileData.username?.charAt(0)}</div>
                            }
                            <OnlineDot userId={profileData.id} size={14} />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px', flexWrap: 'wrap' }}>
                            {isOwner ? (
                                <>
                                    <button onClick={() => navigate('/settings')} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 14px' }}>
                                        <Settings size={13} /> SETTINGS
                                    </button>
                                    {profileData?.is_private && (
                                        <button onClick={() => openFollowModal('requests')} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 14px' }}>
                                            <Users size={13} /> REQUESTS
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button onClick={handleFollow} className={followStatus !== 'none' ? 'btn-ghost' : 'btn-brand'} style={{ fontSize: '11px', padding: '8px 14px' }} disabled={followLoading}>
                                        {followLoading ? <Loader2 size={13} className="animate-spin" /> : followStatus === 'accepted' ? <><UserCheck size={13} /> FOLLOWING</> : followStatus === 'pending' ? <><UserCheck size={13} /> REQUESTED</> : <><UserPlus size={13} /> FOLLOW</>}
                                    </button>
                                    {(!profileData.is_private || followStatus === 'accepted' || isOwner) && (
                                        <button onClick={() => navigate(`/messages/${profileData.id}`)} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 14px' }}>
                                            <MessageSquare size={13} /> MESSAGE
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── DISPLAY MODE ── */}
                    <div style={{ marginBottom: '24px' }}>
                        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                            {profileData.username}
                        </h1>


                        {profileData.bio && (
                            <p style={{ fontSize: '13px', lineHeight: '1.7', maxWidth: '400px', borderLeft: '4px solid var(--yellow)', paddingLeft: '12px', marginBottom: '14px', color: 'var(--black)' }}>
                                {profileData.bio}
                            </p>
                        )}

                        {(hasAddress || hasWebsite) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
                                {hasAddress && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <MapPin size={13} color="var(--red)" /> {profileData.address}
                                    </span>
                                )}
                                {hasWebsite && (
                                    <a href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
                                        target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--blue)', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationThickness: '2px', fontWeight: '700' }}>
                                        <Globe size={13} /> {profileData.website.replace(/^https?:\/\//, '')}
                                    </a>
                                )}
                            </div>
                        )}

                        {hasSocials && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                                {socialLinks.map(s => {
                                    const val = profileData[s.key];
                                    if (!val) return null;
                                    const url = val.startsWith('http') ? val : `${s.prefix}${val}`;
                                    return (
                                        <a key={s.key} href={url} target="_blank" rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                background: 'var(--white)', color: s.color,
                                                border: 'var(--border)',
                                                padding: '6px 14px',
                                                borderRadius: '12px',
                                                fontFamily: "'Outfit', sans-serif",
                                                fontSize: '11px', fontWeight: '600',
                                                letterSpacing: '0.5px', textTransform: 'uppercase',
                                                textDecoration: 'none', transition: 'all 0.15s',
                                                boxShadow: 'var(--clay-btn-shadow)',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-tint)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.transform = 'none'; }}
                                        >
                                            {s.icon} {val.replace(/^https?:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com|linkedin\.com\/in|github\.com)\/?/, '')}
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: 'var(--border)', borderRadius: '16px', boxShadow: 'var(--clay-btn-shadow)', overflow: 'hidden' }}>
                        {[
                            { label: 'POSTS', value: posts.length, action: null },
                            { label: 'FOLLOWERS', value: profileData.followers_count || 0, action: () => openFollowModal('followers') },
                            { label: 'FOLLOWING', value: profileData.following_count || 0, action: () => openFollowModal('following') },
                        ].map((s, i, arr) => (
                            <button key={s.label} onClick={s.action || undefined}
                                style={{
                                    padding: '16px', textAlign: 'center',
                                    border: 'none', background: 'transparent',
                                    cursor: s.action ? 'pointer' : 'default',
                                    transition: 'background 0.15s',
                                    borderRight: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    color: 'var(--black)',
                                }}
                                onMouseEnter={e => { if (s.action) e.currentTarget.style.background = 'var(--primary-tint)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{s.value}</p>
                                <p style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600', fontFamily: "'Outfit', sans-serif" }}>{s.label}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Posts section */}
            {profileData.is_private && !isOwner && followStatus !== 'accepted' ? (
                <div style={{ padding: '60px 24px', textAlign: 'center', margin: '24px 0', border: 'var(--border-thick)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', background: 'var(--white)', color: 'var(--black)' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--primary-tint)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'var(--clay-btn-shadow)' }}>
                        <span style={{ fontSize: '24px' }}>🔒</span>
                    </div>
                    <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.3px', marginBottom: '6px' }}>THIS ACCOUNT IS PRIVATE</p>
                    <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                        FOLLOW TO SEE THEIR POSTS AND STORIES
                    </p>
                </div>
            ) : (
            <div style={{ border: 'var(--border-thick)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', background: 'var(--white)', color: 'var(--black)', overflow: 'hidden' }}>
                {/* Posts header with view toggle */}
                <div style={{
                    background: 'var(--primary-tint)', padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Grid3X3 size={14} color="var(--yellow)" />
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                            POSTS — {posts.length}
                        </span>
                    </div>

                    {/* Grid / List toggle */}
                    {posts.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setViewMode('grid')} style={{
                                background: viewMode === 'grid' ? 'var(--yellow)' : 'transparent',
                                border: '1px solid var(--border-color)', cursor: 'pointer',
                                padding: '5px 8px', display: 'flex', alignItems: 'center',
                                borderRadius: '10px', boxShadow: 'var(--clay-btn-shadow)',
                                transition: 'all 0.15s',
                            }}>
                                <Grid3X3 size={13} color={viewMode === 'grid' ? '#ffffff' : 'var(--yellow)'} />
                            </button>
                            <button onClick={() => setViewMode('list')} style={{
                                background: viewMode === 'list' ? 'var(--yellow)' : 'transparent',
                                border: '1px solid var(--border-color)', cursor: 'pointer',
                                padding: '5px 8px', display: 'flex', alignItems: 'center',
                                borderRadius: '10px', boxShadow: 'var(--clay-btn-shadow)',
                                transition: 'all 0.15s',
                            }}>
                                <List size={13} color={viewMode === 'list' ? '#ffffff' : 'var(--yellow)'} />
                            </button>
                        </div>
                    )}
                </div>

                {posts.length === 0 ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                        <div style={{ width: '56px', height: '56px', background: 'var(--primary-tint)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'var(--clay-btn-shadow)' }}>
                            <Image size={28} color="var(--yellow)" />
                        </div>
                        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.3px', marginBottom: '6px' }}>NO POSTS YET</p>
                        <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                            {isOwner ? 'START SHARING YOUR COLLEGE MOMENTS' : 'THIS USER HAS NOT POSTED YET'}
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ── GRID VIEW (thumbnails) ── */
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '0' }}>
                        {posts.map((post, i) => (
                            <button key={post.id} onClick={() => setViewMode('list')} style={{
                                aspectRatio: '1', border: 'none',
                                borderBottom: '1px solid var(--border-color)',
                                borderRight: (isMobile ? (i + 1) % 2 !== 0 : (i + 1) % 3 !== 0) ? '1px solid var(--border-color)' : 'none',
                                padding: 0, cursor: 'crosshair', overflow: 'hidden',
                                position: 'relative', background: 'var(--bg-body)',
                            }}>
                                <img src={post.image_url} alt={post.caption} style={{
                                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                    filter: 'grayscale(30%)', transition: 'filter 0.25s, transform 0.3s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(30%)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                />
                                {post.image_urls && post.image_urls.length > 1 && (
                                    <div style={{
                                        position: 'absolute', top: '12px', right: '12px',
                                        background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)',
                                        color: '#ffffff', padding: '5px', borderRadius: '6px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 2, pointerEvents: 'none'
                                    }}>
                                        <Layers size={12} />
                                    </div>
                                )}
                                <div style={{
                                    position: 'absolute', inset: 0, background: 'rgba(15,23,42,0)', opacity: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--yellow)', fontWeight: '700', fontSize: '11px',
                                    letterSpacing: '1px', textTransform: 'uppercase', gap: '12px',
                                    transition: 'all 0.2s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.background = 'rgba(15,23,42,0)'; }}
                                >
                                    ❤ {post.likes_count || 0} &nbsp;💬 {post.comments_count || 0}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* ── LIST VIEW (full PostCard with likes + comments) ── */
                    <div style={{ padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                        ))}
                    </div>
                )}
            </div>
            )}
            {/* Follow/Following Modal */}
            {followModal && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(15,23,42,0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                }} onClick={e => e.target === e.currentTarget && setFollowModal(null)}>
                    <div className="animate-scale-in" style={{
                        background: 'var(--white)', color: 'var(--black)', maxWidth: '420px', width: '100%',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                        border: 'var(--border-thick)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            background: 'var(--primary-tint)', padding: '16px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {followModal === 'followers' ? <Users size={14} color="var(--yellow)" /> : <UserCheck size={14} color="var(--yellow)" />}
                                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                                    {followModal}
                                </span>
                            </div>
                            <button onClick={() => setFollowModal(null)} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--black)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={13} />
                            </button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {followListLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                    <div className="spinner" style={{ width: '32px', height: '32px' }} />
                                </div>
                            ) : followList.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', fontWeight: '700' }}>
                                        NO {followModal} YET
                                    </p>
                                </div>
                            ) : (
                                followList.map((u, i) => (
                                    <div key={u.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '14px 20px', textDecoration: 'none',
                                            borderBottom: i < followList.length - 1 ? '1px solid var(--border-color)' : 'none',
                                            transition: 'background 0.15s', color: 'var(--black)',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-tint)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Link to={`/profile/${u.username}`} onClick={() => setFollowModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                                            {u.profile_image ? <img src={u.profile_image} alt={u.username} className="avatar" style={{ width: '40px', height: '40px', flexShrink: 0 }} /> : <div className="avatar-text" style={{ width: '40px', height: '40px', fontSize: '15px', flexShrink: 0 }}>{u.username?.charAt(0)}</div>}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{u.username}</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.bio || 'COLLEGE MEMBER'}</p>
                                            </div>
                                        </Link>
                                        
                                        {followModal === 'requests' ? (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => handleRequestAction(u.request_id, 'accept')} style={{ background: 'var(--yellow)', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '6px 12px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: 'var(--clay-btn-shadow)' }}>ACCEPT</button>
                                                <button onClick={() => handleRequestAction(u.request_id, 'reject')} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '8px', padding: '6px 12px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>REJECT</button>
                                            </div>
                                        ) : (
                                            <Link to={`/profile/${u.username}`} onClick={() => setFollowModal(null)} style={{ fontSize: '10px', letterSpacing: '1px', color: 'var(--yellow)', fontWeight: '700', textTransform: 'uppercase', textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>VIEW →</Link>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            background: 'var(--primary-tint)', padding: '10px 20px',
                            borderTop: '1px solid var(--border-color)',
                            font: "700 11px/1 'Outfit', sans-serif",
                            letterSpacing: '1.5px', textTransform: 'uppercase',
                            display: 'flex', justifyContent: 'space-between',
                            color: 'var(--yellow)',
                            flexShrink: 0,
                        }}>
                            <span>{profileData.username}</span>
                            <span>★ {followModal?.toUpperCase() || ''}</span>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default Profile;
