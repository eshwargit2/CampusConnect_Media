import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Camera, Edit3, Save, X, UserCheck, UserPlus, Loader2, AlertCircle, Grid3X3, List, Image, MapPin, Globe, Instagram, Github, Linkedin, Twitter, Users, MessageSquare, Settings } from 'lucide-react';
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
    const fileInputRef = useRef(null);

    const isMobile = useIsMobile();
    const [profileData, setProfileData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOwner, setIsOwner] = useState(false);
    const [followStatus, setFollowStatus] = useState('none');
    const [followLoading, setFollowLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        username: '', bio: '', address: '', website: '',
        link_instagram: '', link_twitter: '', link_linkedin: '', link_github: '',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [followModal, setFollowModal] = useState(null); // 'followers' | 'following' | null
    const [followList, setFollowList] = useState([]);
    const [followListLoading, setFollowListLoading] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);

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

    const startEdit = () => {
        setEditForm({
            username: profileData.username,
            bio: profileData.bio || '',
            address: profileData.address || '',
            website: profileData.website || '',
            link_instagram: profileData.link_instagram || '',
            link_twitter: profileData.link_twitter || '',
            link_linkedin: profileData.link_linkedin || '',
            link_github: profileData.link_github || '',
        });
        setAvatarFile(null); setAvatarPreview(null); setEditing(true);
    };

    const handleAvatarChange = (e) => {
        const f = e.target.files[0]; if (!f) return;
        setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f));
    };

    const handleSave = async () => {
        setSaveLoading(true);
        try {
            const formData = new FormData();
            formData.append('username', editForm.username);
            formData.append('bio', editForm.bio);
            formData.append('address', editForm.address);
            formData.append('website', editForm.website);
            formData.append('link_instagram', editForm.link_instagram);
            formData.append('link_twitter', editForm.link_twitter);
            formData.append('link_linkedin', editForm.link_linkedin);
            formData.append('link_github', editForm.link_github);
            if (avatarFile) formData.append('profile_image', avatarFile);
            const { data } = await api.put('/users/profile/update', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setProfileData(prev => ({ ...prev, ...data.user }));
            updateUser(data.user); toast.success('PROFILE UPDATED ✦'); setEditing(false);
            if (data.user.username !== username) navigate(`/profile/${data.user.username}`, { replace: true });
        } catch (err) { toast.error(err.response?.data?.error?.toUpperCase() || 'UPDATE FAILED'); }
        finally { setSaveLoading(false); }
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

    const handleDeleteAccount = async () => {
        setDeleteAccountLoading(true);
        try {
            await api.delete('/users/account');
            toast.success('ACCOUNT DELETED');
            // Logout and redirect
            localStorage.removeItem('token');
            updateUser(null);
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.error?.toUpperCase() || 'FAILED TO DELETE ACCOUNT');
            setDeleteAccountLoading(false);
        }
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

    const togglePrivacy = async (field, value) => {
        const oldValue = profileData[field];
        setProfileData(prev => ({ ...prev, [field]: value }));
        try {
            const formData = new FormData();
            formData.append(field, value);
            await api.put('/users/profile/update', formData);
            toast.success('SETTINGS UPDATED ✦');
        } catch {
            setProfileData(prev => ({ ...prev, [field]: oldValue }));
            toast.error('FAILED TO UPDATE SETTINGS');
        }
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

    const displayAvatar = avatarPreview || profileData.profile_image;

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
                background: 'var(--white)', border: 'var(--border-thick)',
                boxShadow: 'var(--shadow-lg)', marginBottom: '32px',
            }} className="animate-fade-in-up">

                {/* Banner */}
                <div style={{
                    height: '100px', background: 'var(--black)',
                    borderBottom: '5px solid var(--yellow)', position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,224,0,0.08) 0, rgba(255,224,0,0.08) 1px, transparent 0, transparent 50%)',
                        backgroundSize: '40px 40px',
                    }} />
                    <div style={{
                        position: 'absolute', top: '12px', right: '20px',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '72px', fontWeight: '700', color: 'rgba(255,224,0,0.06)',
                        lineHeight: '1', userSelect: 'none', letterSpacing: '-4px',
                    }}>CC</div>
                </div>

                <div style={{ padding: isMobile ? '0 16px 20px' : '0 28px 28px' }}>
                    {/* Avatar row */}
                    <div style={{ display: 'flex', alignItems: isMobile ? 'center' : 'flex-end', justifyContent: 'space-between', marginTop: '-44px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            {displayAvatar
                                ? <img src={displayAvatar} alt={profileData.username} className="avatar" style={{ width: '96px', height: '96px', border: '5px solid var(--black)', boxShadow: '4px 4px 0 var(--yellow)' }} />
                                : <div className="avatar-text" style={{ width: '96px', height: '96px', fontSize: '36px', border: '5px solid var(--black)', boxShadow: '4px 4px 0 var(--yellow)' }}>{profileData.username?.charAt(0)}</div>
                            }
                            {isOwner && editing && (
                                <button onClick={() => fileInputRef.current?.click()} style={{
                                    position: 'absolute', bottom: '-4px', right: '-4px',
                                    background: 'var(--yellow)', border: '3px solid var(--black)',
                                    cursor: 'pointer', width: '30px', height: '30px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '2px 2px 0 var(--black)',
                                }}>
                                    <Camera size={14} color="var(--black)" />
                                </button>
                            )}
                            {!editing && <OnlineDot userId={profileData.id} size={14} />}
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px', flexWrap: 'wrap' }}>
                            {isOwner ? (
                                editing ? (
                                    <>
                                        <button onClick={() => setEditing(false)} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 14px' }} disabled={saveLoading}>
                                            <X size={13} /> CANCEL
                                        </button>
                                        <button onClick={handleSave} className="btn-brand" style={{ fontSize: '11px', padding: '8px 14px' }} disabled={saveLoading}>
                                            {saveLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} SAVE
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={startEdit} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 14px' }}>
                                            <Edit3 size={13} /> EDIT PROFILE
                                        </button>
                                        {profileData?.is_private && (
                                            <button onClick={() => openFollowModal('requests')} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 14px' }}>
                                                <Users size={13} /> REQUESTS
                                            </button>
                                        )}
                                        <button onClick={() => setShowSettingsModal(true)} className="btn-ghost" style={{ fontSize: '11px', padding: '8px 14px' }}>
                                            <Settings size={13} /> SETTINGS
                                        </button>
                                    </>
                                )
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

                    {/* ── EDITING FORM ── */}
                    {editing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: isMobile ? '100%' : '400px', marginBottom: '24px' }}>
                            <div>
                                <label className="field-label">Username</label>
                                <input className="input-field" value={editForm.username}
                                    onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))}
                                    placeholder="USERNAME" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }} maxLength={30} />
                            </div>
                            <div>
                                <label className="field-label">Bio</label>
                                <textarea className="input-field" value={editForm.bio}
                                    onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                                    placeholder="Tell something about yourself..." rows={2} style={{ resize: 'none' }} maxLength={150} />
                            </div>
                            <div>
                                <label className="field-label">📍 Address / Location</label>
                                <input className="input-field" value={editForm.address}
                                    onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                                    placeholder="e.g. Chennai, India" maxLength={100} />
                            </div>
                            <div>
                                <label className="field-label">🌐 Website</label>
                                <input className="input-field" value={editForm.website}
                                    onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))}
                                    placeholder="https://yourwebsite.com" maxLength={200} />
                            </div>
                            <div style={{ borderTop: '3px solid var(--black)', paddingTop: '12px', marginTop: '4px' }}>
                                <label className="field-label" style={{ marginBottom: '12px' }}>🔗 Social Links</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {socialLinks.map(s => (
                                        <div key={s.key} style={{ position: 'relative' }}>
                                            <div style={{
                                                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                color: 'rgba(10,10,10,0.4)', fontSize: '10px', fontWeight: '700',
                                                letterSpacing: '1px', textTransform: 'uppercase',
                                                pointerEvents: 'none',
                                            }}>
                                                {s.icon}
                                            </div>
                                            <input className="input-field" value={editForm[s.key]}
                                                onChange={e => setEditForm(p => ({ ...p, [s.key]: e.target.value }))}
                                                placeholder={`${s.label} username`}
                                                style={{ paddingLeft: '34px' }} maxLength={100} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── DISPLAY MODE ── */
                        <div style={{ marginBottom: '24px' }}>
                            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '26px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                                {profileData.username}
                            </h1>
                            <p style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', marginBottom: '10px' }}>
                                {profileData.email}
                            </p>

                            {profileData.bio && (
                                <p style={{ fontSize: '13px', lineHeight: '1.7', maxWidth: '400px', borderLeft: '4px solid var(--yellow)', paddingLeft: '12px', marginBottom: '14px' }}>
                                    {profileData.bio}
                                </p>
                            )}

                            {(hasAddress || hasWebsite) && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
                                    {hasAddress && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(10,10,10,0.6)' }}>
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
                                                    background: 'var(--black)', color: s.color,
                                                    border: '3px solid var(--black)',
                                                    padding: '6px 12px',
                                                    fontFamily: "'Space Mono', monospace",
                                                    fontSize: '10px', fontWeight: '700',
                                                    letterSpacing: '1px', textTransform: 'uppercase',
                                                    textDecoration: 'none', transition: 'all 0.15s',
                                                    boxShadow: '3px 3px 0 var(--yellow)',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--yellow)'; e.currentTarget.style.color = 'var(--black)'; e.currentTarget.style.boxShadow = '3px 3px 0 var(--black)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--black)'; e.currentTarget.style.color = s.color; e.currentTarget.style.boxShadow = '3px 3px 0 var(--yellow)'; }}
                                            >
                                                {s.icon} {val.replace(/^https?:\/\/(www\.)?(instagram\.com|x\.com|twitter\.com|linkedin\.com\/in|github\.com)\/?/, '')}
                                            </a>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: 'var(--border)', boxShadow: '4px 4px 0 var(--black)' }}>
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
                                    borderRight: i < arr.length - 1 ? '3px solid var(--black)' : 'none',
                                }}
                                onMouseEnter={e => { if (s.action) e.currentTarget.style.background = 'rgba(255,224,0,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '28px', fontWeight: '700', lineHeight: 1 }}>{s.value}</p>
                                <p style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', marginTop: '4px', fontWeight: '700' }}>{s.label}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Posts section */}
            {profileData.is_private && !isOwner && followStatus !== 'accepted' ? (
                <div style={{ padding: '60px 24px', textAlign: 'center', margin: '24px 0', border: 'var(--border-thick)', boxShadow: 'var(--shadow-lg)', background: 'var(--white)' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--yellow)', border: '3px solid var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '4px 4px 0 var(--black)' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '24px', fontWeight: '700' }}>🔒</span>
                    </div>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.3px', marginBottom: '6px' }}>THIS ACCOUNT IS PRIVATE</p>
                    <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
                        FOLLOW TO SEE THEIR POSTS AND STORIES
                    </p>
                </div>
            ) : (
            <div style={{ border: 'var(--border-thick)', boxShadow: 'var(--shadow-lg)', background: 'var(--white)' }}>
                {/* Posts header with view toggle */}
                <div style={{
                    background: 'var(--black)', padding: '12px 20px',
                    borderBottom: '5px solid var(--yellow)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Grid3X3 size={14} color="var(--yellow)" />
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                            POSTS — {posts.length}
                        </span>
                    </div>

                    {/* Grid / List toggle */}
                    {posts.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setViewMode('grid')} style={{
                                background: viewMode === 'grid' ? 'var(--yellow)' : 'transparent',
                                border: '2px solid var(--yellow)', cursor: 'pointer',
                                padding: '5px 8px', display: 'flex', alignItems: 'center',
                                transition: 'all 0.15s',
                            }}>
                                <Grid3X3 size={13} color={viewMode === 'grid' ? 'var(--black)' : 'var(--yellow)'} />
                            </button>
                            <button onClick={() => setViewMode('list')} style={{
                                background: viewMode === 'list' ? 'var(--yellow)' : 'transparent',
                                border: '2px solid var(--yellow)', cursor: 'pointer',
                                padding: '5px 8px', display: 'flex', alignItems: 'center',
                                transition: 'all 0.15s',
                            }}>
                                <List size={13} color={viewMode === 'list' ? 'var(--black)' : 'var(--yellow)'} />
                            </button>
                        </div>
                    )}
                </div>

                {posts.length === 0 ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                        <div style={{ width: '56px', height: '56px', background: 'var(--yellow)', border: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '4px 4px 0 var(--black)' }}>
                            <Image size={28} color="var(--black)" />
                        </div>
                        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.3px', marginBottom: '6px' }}>NO POSTS YET</p>
                        <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
                            {isOwner ? 'START SHARING YOUR COLLEGE MOMENTS' : 'THIS USER HAS NOT POSTED YET'}
                        </p>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* ── GRID VIEW (thumbnails) ── */
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '0' }}>
                        {posts.map((post, i) => (
                            <button key={post.id} onClick={() => setViewMode('list')} style={{
                                aspectRatio: '1', border: 'none',
                                borderBottom: '3px solid var(--black)',
                                borderRight: (isMobile ? (i + 1) % 2 !== 0 : (i + 1) % 3 !== 0) ? '3px solid var(--black)' : 'none',
                                padding: 0, cursor: 'crosshair', overflow: 'hidden',
                                position: 'relative', background: '#ddd',
                            }}>
                                <img src={post.image_url} alt={post.caption} style={{
                                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                                    filter: 'grayscale(60%)', transition: 'filter 0.25s, transform 0.3s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(60%)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                />
                                <div style={{
                                    position: 'absolute', inset: 0, background: 'rgba(10,10,10,0)', opacity: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--yellow)', fontWeight: '700', fontSize: '11px',
                                    letterSpacing: '2px', textTransform: 'uppercase', gap: '12px',
                                    transition: 'all 0.2s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(10,10,10,0.7)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.background = 'rgba(10,10,10,0)'; }}
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
                    background: 'rgba(10,10,10,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                }} onClick={e => e.target === e.currentTarget && setFollowModal(null)}>
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
                                {followModal === 'followers' ? <Users size={14} color="var(--yellow)" /> : <UserCheck size={14} color="var(--yellow)" />}
                                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                                    {followModal}
                                </span>
                            </div>
                            <button onClick={() => setFollowModal(null)} style={{ background: 'none', border: '2px solid rgba(245,240,232,0.3)', color: 'var(--white)', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                            borderBottom: i < followList.length - 1 ? '3px solid var(--black)' : 'none',
                                            transition: 'background 0.15s', color: 'var(--black)',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,224,0,0.12)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Link to={`/profile/${u.username}`} onClick={() => setFollowModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, textDecoration: 'none', color: 'inherit' }}>
                                            {u.profile_image ? <img src={u.profile_image} alt={u.username} className="avatar" style={{ width: '40px', height: '40px', flexShrink: 0 }} /> : <div className="avatar-text" style={{ width: '40px', height: '40px', fontSize: '15px', flexShrink: 0 }}>{u.username?.charAt(0)}</div>}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{u.username}</p>
                                                <p style={{ fontSize: '11px', color: 'rgba(10,10,10,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.bio || 'COLLEGE MEMBER'}</p>
                                            </div>
                                        </Link>
                                        
                                        {followModal === 'requests' ? (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => handleRequestAction(u.request_id, 'accept')} style={{ background: 'var(--yellow)', border: '2px solid var(--black)', padding: '6px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}>ACCEPT</button>
                                                <button onClick={() => handleRequestAction(u.request_id, 'reject')} style={{ background: 'var(--white)', border: '2px solid var(--red)', color: 'var(--red)', padding: '6px 10px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}>REJECT</button>
                                            </div>
                                        ) : (
                                            <Link to={`/profile/${u.username}`} onClick={() => setFollowModal(null)} style={{ fontSize: '9px', letterSpacing: '2px', color: 'rgba(10,10,10,0.3)', fontWeight: '700', textTransform: 'uppercase', textDecoration: 'none' }}>VIEW →</Link>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            background: 'var(--yellow)', padding: '8px 20px',
                            borderTop: '3px solid var(--black)',
                            font: "700 9px/1 'Space Mono', monospace",
                            letterSpacing: '3px', textTransform: 'uppercase',
                            display: 'flex', justifyContent: 'space-between',
                            flexShrink: 0,
                        }}>
                            <span>{profileData.username}</span>
                            <span>★ {followModal?.toUpperCase() || ''}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="animate-fade-in" style={{
                    position: 'fixed', inset: 0, zIndex: 100,
                    background: 'rgba(10,10,10,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
                }} onClick={e => e.target === e.currentTarget && setShowSettingsModal(false)}>
                    <div className="animate-scale-in" style={{
                        background: 'var(--white)', maxWidth: '420px', width: '100%',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
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
                                <Settings size={14} color="var(--yellow)" />
                                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: '700', letterSpacing: '3px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                                    SETTINGS
                                </span>
                            </div>
                            <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: '2px solid rgba(245,240,232,0.3)', color: 'var(--white)', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={13} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Privacy Section */}
                            <div>
                                <label className="field-label" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>🔒</span> PRIVACY
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'flex-start' }}>
                                        <input type="checkbox" checked={profileData.is_private || false} onChange={e => togglePrivacy('is_private', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--black)', marginTop: '2px' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '14px' }}>PRIVATE ACCOUNT</span>
                                            <span style={{ fontSize: '11px', color: 'rgba(10,10,10,0.6)', lineHeight: 1.4 }}>If enabled, only approved followers can see your posts and stories.</span>
                                        </div>
                                    </label>
                                    <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', alignItems: 'flex-start' }}>
                                        <input type="checkbox" checked={profileData.hide_likes || false} onChange={e => togglePrivacy('hide_likes', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--black)', marginTop: '2px' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '14px' }}>HIDE LIKE COUNTS</span>
                                            <span style={{ fontSize: '11px', color: 'rgba(10,10,10,0.6)', lineHeight: 1.4 }}>If enabled, the total number of likes on your posts and stories will be hidden from everyone else.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                            {/* Delete Account Section */}
                            <div style={{ borderTop: '2px solid rgba(10,10,10,0.1)', paddingTop: '24px' }}>
                                <label className="field-label" style={{ color: 'var(--red)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    ⚠ DANGER ZONE
                                </label>
                                <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.6)', marginBottom: '16px', lineHeight: '1.6' }}>
                                    Once you delete your account, there is no going back. All your posts, comments, and profile data will be permanently deleted.
                                </p>
                                <button onClick={() => { setShowSettingsModal(false); setShowDeleteAccountModal(true); }} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    width: '100%', padding: '14px 20px', background: 'var(--white)',
                                    border: '3px solid var(--red)', color: 'var(--red)', cursor: 'pointer',
                                    fontFamily: "'Space Mono', monospace", fontSize: '12px', fontWeight: '700',
                                    letterSpacing: '2px', textTransform: 'uppercase', transition: 'all 0.15s',
                                    boxShadow: '4px 4px 0 var(--red)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.color = 'var(--white)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--red)'; }}>
                                    <AlertCircle size={15} /> DELETE ACCOUNT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Delete Account Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteAccountModal}
                onClose={() => setShowDeleteAccountModal(false)}
                onConfirm={handleDeleteAccount}
                title="DELETE ACCOUNT"
                message="Are you absolutely sure you want to delete your account? This will permanently delete all your posts, comments, messages, and profile data. This action cannot be undone."
                confirmText="DELETE ACCOUNT"
                cancelText="CANCEL"
                isDangerous={true}
            />
        </div>
    );
};

export default Profile;
