import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Camera, Save, ArrowLeft, Loader2, AlertCircle, Shield, LogOut } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const Settings = () => {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [loadingProfile, setLoadingProfile] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [saveLoading, setSaveLoading] = useState(false);
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Profile state
    const [profile, setProfile] = useState(null);
    const [editForm, setEditForm] = useState({
        username: '', bio: '', address: '', website: '',
        link_instagram: '', link_twitter: '', link_linkedin: '', link_github: '',
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    // Load theme setting
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    // Load full profile details
    useEffect(() => {
        if (!user) return;
        setLoadingProfile(true);
        api.get(`/users/${user.username}`)
            .then(({ data }) => {
                const u = data.user;
                setProfile(u);
                setEditForm({
                    username: u.username || '',
                    bio: u.bio || '',
                    address: u.address || '',
                    website: u.website || '',
                    link_instagram: u.link_instagram || '',
                    link_twitter: u.link_twitter || '',
                    link_linkedin: u.link_linkedin || '',
                    link_github: u.link_github || '',
                });
            })
            .catch(() => {
                toast.error('FAILED TO LOAD SETTINGS');
            })
            .finally(() => {
                setLoadingProfile(false);
            });
    }, [user]);

    const handleAvatarChange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setAvatarFile(f);
        setAvatarPreview(URL.createObjectURL(f));
    };

    const handleSaveProfile = async () => {
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
            if (avatarFile) {
                formData.append('profile_image', avatarFile);
            }

            const { data } = await api.put('/users/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            updateUser(data.user);
            setProfile(prev => ({ ...prev, ...data.user }));
            toast.success('PROFILE SAVED ✦');
        } catch (err) {
            toast.error(err.response?.data?.error?.toUpperCase() || 'SAVE FAILED');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleTogglePrivacy = async (field, value) => {
        if (!profile) return;
        const oldVal = profile[field];
        setProfile(prev => ({ ...prev, [field]: value }));
        try {
            const formData = new FormData();
            formData.append(field, value);
            await api.put('/users/profile/update', formData);
            toast.success('PRIVACY UPDATED ✦');
        } catch {
            setProfile(prev => ({ ...prev, [field]: oldVal }));
            toast.error('FAILED TO SAVE PRIVACY SETTING');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleDeleteAccount = async () => {
        setDeleteAccountLoading(true);
        try {
            await api.delete('/users/account');
            toast.success('ACCOUNT DELETED PERMANENTLY');
            localStorage.removeItem('cc_token');
            updateUser(null);
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.error?.toUpperCase() || 'FAILED TO DELETE ACCOUNT');
            setDeleteAccountLoading(false);
        }
    };

    if (loadingProfile) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: '120px' }}>
                <div className="spinner" style={{ width: '48px', height: '48px' }} />
            </div>
        );
    }

    const displayAvatar = avatarPreview || profile?.profile_image;

    return (
        <div className="page-container" style={{ paddingBottom: '120px' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '28px',
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'var(--white)',
                        border: 'var(--border-thick)',
                        color: 'var(--black)',
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--clay-btn-shadow)',
                    }}
                >
                    <ArrowLeft size={18} />
                </button>
                <h1 style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '24px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.5px',
                    color: 'var(--black)',
                }}>
                    Profile Settings
                </h1>
            </div>

            {/* Content Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* 1. Theme and Preferences */}
                <div style={{
                    background: 'var(--white)',
                    border: 'var(--border-thick)',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: 'var(--shadow)',
                }}>
                    <label className="field-label" style={{ marginBottom: '16px' }}>Theme Preference</label>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '15px', color: 'var(--black)' }}>
                                {theme === 'light' ? 'LIGHT MODE' : 'DARK MODE'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Switch between light and dark backgrounds.
                            </p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: theme === 'light' ? 'var(--primary-tint)' : 'var(--yellow)',
                                color: theme === 'light' ? 'var(--yellow)' : '#ffffff',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                padding: '10px 18px',
                                borderRadius: '16px',
                                fontFamily: "'Outfit', sans-serif",
                                fontWeight: '700',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: 'var(--clay-btn-shadow)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
                            TOGGLE
                        </button>
                    </div>
                </div>

                {/* 2. Edit Profile Details */}
                <div style={{
                    background: 'var(--white)',
                    border: 'var(--border-thick)',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: 'var(--shadow)',
                }}>
                    <label className="field-label" style={{ marginBottom: '20px' }}>Profile Information</label>
                    
                    {/* Avatar edit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                        <div style={{ position: 'relative' }}>
                            {displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt=""
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '3px solid var(--white)',
                                        boxShadow: 'var(--shadow)',
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    background: 'var(--primary-tint)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '32px',
                                    fontWeight: '700',
                                    color: 'var(--yellow)',
                                    border: '3px solid var(--white)',
                                    boxShadow: 'var(--shadow)',
                                }}>
                                    {profile?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    position: 'absolute',
                                    bottom: '-4px',
                                    right: '-4px',
                                    background: 'var(--yellow)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'var(--clay-btn-shadow)',
                                }}
                            >
                                <Camera size={13} color="#ffffff" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <div>
                            <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '14px', color: 'var(--black)' }}>
                                PROFILE PICTURE
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                JPG, PNG, or GIF. Max size 2MB.
                            </p>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className="field-label">Username</label>
                            <input
                                className="input-field"
                                value={editForm.username}
                                onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))}
                                placeholder="USERNAME"
                                maxLength={30}
                            />
                        </div>
                        <div>
                            <label className="field-label">Bio</label>
                            <textarea
                                className="input-field"
                                value={editForm.bio}
                                onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))}
                                placeholder="Tell the circle about yourself..."
                                rows={3}
                                style={{ resize: 'none' }}
                                maxLength={150}
                            />
                        </div>
                        <div>
                            <label className="field-label">📍 Address / Location</label>
                            <input
                                className="input-field"
                                value={editForm.address}
                                onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                                placeholder="e.g. Chennai, India"
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <label className="field-label">🌐 Website</label>
                            <input
                                className="input-field"
                                value={editForm.website}
                                onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))}
                                placeholder="https://yourwebsite.com"
                                maxLength={200}
                            />
                        </div>

                        {/* Social Links */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                            <label className="field-label" style={{ marginBottom: '12px' }}>🔗 Social Connections</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>INSTAGRAM USERNAME</label>
                                    <input
                                        className="input-field"
                                        value={editForm.link_instagram}
                                        onChange={e => setEditForm(p => ({ ...p, link_instagram: e.target.value }))}
                                        placeholder="Instagram handle"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>X / TWITTER USERNAME</label>
                                    <input
                                        className="input-field"
                                        value={editForm.link_twitter}
                                        onChange={e => setEditForm(p => ({ ...p, link_twitter: e.target.value }))}
                                        placeholder="X handle"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>LINKEDIN USERNAME</label>
                                    <input
                                        className="input-field"
                                        value={editForm.link_linkedin}
                                        onChange={e => setEditForm(p => ({ ...p, link_linkedin: e.target.value }))}
                                        placeholder="LinkedIn public profile identifier"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>GITHUB USERNAME</label>
                                    <input
                                        className="input-field"
                                        value={editForm.link_github}
                                        onChange={e => setEditForm(p => ({ ...p, link_github: e.target.value }))}
                                        placeholder="GitHub username"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveProfile}
                            className="btn-brand"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '12px !important',
                                marginTop: '12px',
                            }}
                            disabled={saveLoading}
                        >
                            {saveLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            SAVE CHANGES
                        </button>
                    </div>
                </div>

                {/* 3. Privacy Settings */}
                <div style={{
                    background: 'var(--white)',
                    border: 'var(--border-thick)',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: 'var(--shadow)',
                }}>
                    <label className="field-label" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={14} color="var(--yellow)" /> Privacy Control
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <label style={{ display: 'flex', gap: '14px', cursor: 'pointer', alignItems: 'flex-start' }}>
                            <input
                                type="checkbox"
                                checked={profile?.is_private || false}
                                onChange={e => handleTogglePrivacy('is_private', e.target.checked)}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--yellow)', marginTop: '2px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '14px', color: 'var(--black)' }}>PRIVATE ACCOUNT</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    Only approved followers can view your feed posts and stories.
                                </span>
                            </div>
                        </label>

                        <label style={{ display: 'flex', gap: '14px', cursor: 'pointer', alignItems: 'flex-start' }}>
                            <input
                                type="checkbox"
                                checked={profile?.hide_likes || false}
                                onChange={e => handleTogglePrivacy('hide_likes', e.target.checked)}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--yellow)', marginTop: '2px' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '14px', color: 'var(--black)' }}>HIDE LIKE COUNTS</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                    Hide the total number of likes on your posts and stories from other accounts.
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* 4. Log Out and Danger Zone */}
                <div style={{
                    background: 'var(--white)',
                    border: 'var(--border-thick)',
                    borderRadius: '24px',
                    padding: '24px',
                    boxShadow: 'var(--shadow)',
                }}>
                    <label className="field-label" style={{ marginBottom: '16px' }}>Account Control</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="btn-ghost"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '12px !important',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            <LogOut size={15} /> LOG OUT
                        </button>

                        {/* Danger zone */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '4px' }}>
                            <p style={{
                                fontSize: '11px',
                                color: 'var(--red)',
                                fontWeight: '700',
                                fontFamily: "'Outfit', sans-serif",
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                ⚠️ Danger Zone
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                                Permanently delete your account. This action is irreversible and deletes all posts, comments, messages, and profile data.
                            </p>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="btn-red"
                                style={{
                                    width: '100%',
                                    justifyContent: 'center',
                                    padding: '12px !important',
                                }}
                            >
                                <AlertCircle size={15} /> DELETE ACCOUNT
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm modal for delete account */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
                title="DELETE ACCOUNT"
                message="Are you absolutely sure you want to delete your account? This will permanently erase your posts, comments, messages, and profile details. This cannot be undone."
                confirmText="DELETE PERMANENTLY"
                cancelText="CANCEL"
                isDangerous={true}
            />
        </div>
    );
};

export default Settings;
