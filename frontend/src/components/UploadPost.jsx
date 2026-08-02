import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, ImagePlus, Loader2, Upload } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const UploadPost = ({ onClose, onPostCreated }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);

    const onDrop = useCallback((acceptedFiles) => {
        const f = acceptedFiles[0]; if (!f) return;
        setFile(f); setPreview(URL.createObjectURL(f));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'image/*': [], 'video/*': [] }, maxFiles: 1, disabled: loading,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('SELECT MEDIA FIRST');
        if (!caption.trim()) return toast.error('CAPTION REQUIRED');
        setLoading(true);
        try {
            const isVideo = file.type.startsWith('video/');
            let videoUrl = null;

            if (isVideo) {
                const { data: signData } = await api.get('/posts/cloudinary-signature');
                const { signature, timestamp, apiKey, cloudName } = signData;

                const cloudFormData = new FormData();
                cloudFormData.append('file', file);
                cloudFormData.append('api_key', apiKey);
                cloudFormData.append('timestamp', timestamp);
                cloudFormData.append('signature', signature);
                cloudFormData.append('folder', 'posts');

                const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
                    method: 'POST', body: cloudFormData
                });
                if (!cloudRes.ok) throw new Error('Cloudinary upload failed');
                
                const cloudJson = await cloudRes.json();
                videoUrl = cloudJson.secure_url;
            }

            const formData = new FormData();
            if (videoUrl) {
                formData.append('videoUrl', videoUrl);
            } else {
                formData.append('image', file);
            }
            formData.append('caption', caption.trim());
            
            const { data } = await api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('POST SHARED ✦');
            onPostCreated(data.post); onClose();
        } catch (err) {
            toast.error(err.response?.data?.error?.toUpperCase() || 'UPLOAD FAILED');
        } finally { setLoading(false); }
    };

    return (
        <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="animate-scale-in" style={{
                background: 'var(--white)', width: '100%', maxWidth: '500px',
                border: 'var(--border-thick)', borderRadius: '24px',
                boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    background: 'var(--primary-tint)', padding: '16px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-color)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--yellow)', fontWeight: '700' }}>✦</span>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '13px', letterSpacing: '1.5px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                            NEW POST
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: '1px solid var(--border-color)',
                        color: 'var(--black)', cursor: 'pointer', width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '12px',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-tint)'; e.currentTarget.style.color = 'var(--red)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--black)'; }}
                    >
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Drop zone */}
                    {!preview ? (
                        <div {...getRootProps()} style={{
                            border: `2px dashed var(--yellow)`,
                            borderRadius: '16px',
                            padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                            background: isDragActive ? 'var(--primary-tint)' : 'var(--bg-body)',
                            transition: 'all 0.15s',
                            boxShadow: 'var(--clay-input-shadow)',
                        }}>
                            <input {...getInputProps()} />
                            <div style={{
                                width: '56px', height: '56px', background: 'var(--primary-tint)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px',
                            }}>
                                <ImagePlus size={26} color="var(--yellow)" />
                            </div>
                            <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', color: 'var(--black)' }}>
                                {isDragActive ? 'DROP IT HERE' : 'DRAG & DROP OR CLICK'}
                            </p>
                            <p style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                PNG · JPG · GIF · MP4 — MAX 200MB
                            </p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', border: 'var(--border-thick)', borderRadius: '16px', overflow: 'hidden' }}>
                            {file?.type.startsWith('video/') ? (
                                <video src={preview} controls style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
                            ) : (
                                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
                            )}
                            <button type="button" onClick={() => { setFile(null); setPreview(null); }} style={{
                                position: 'absolute', top: '10px', right: '10px',
                                background: 'var(--white)', border: '1px solid var(--border-color)',
                                color: 'var(--black)', cursor: 'pointer', width: '32px', height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '50%', boxShadow: 'var(--clay-btn-shadow)',
                            }}>
                                <X size={15} />
                            </button>
                            {/* Yellow corner tag */}
                            <div style={{
                                position: 'absolute', bottom: '0', left: '0',
                                background: 'var(--yellow)', padding: '4px 10px',
                                fontSize: '9px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase',
                                color: '#ffffff',
                                borderTopRightRadius: '12px',
                                fontFamily: "'Outfit', sans-serif",
                            }}>MEDIA READY</div>
                        </div>
                    )}

                    {/* Caption */}
                    <div>
                        <label className="field-label">Caption</label>
                        <textarea className="input-field" value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="WRITE YOUR CAPTION..." rows={3}
                            maxLength={500} style={{ resize: 'vertical' }} disabled={loading} />
                        <div style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                            {caption.length}/500
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn-brand"
                        style={{ width: '100%', justifyContent: 'center', padding: '16px !important', fontSize: '13px' }}
                        disabled={loading}>
                        {loading
                            ? <><Loader2 size={16} className="animate-spin" /> UPLOADING...</>
                            : <><Upload size={16} /> SHARE POST</>
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};

export default UploadPost;
