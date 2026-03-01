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
        onDrop, accept: { 'image/*': [] }, maxFiles: 1, disabled: loading,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('SELECT AN IMAGE FIRST');
        if (!caption.trim()) return toast.error('CAPTION REQUIRED');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
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
            background: 'rgba(10,10,10,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="animate-scale-in" style={{
                background: 'var(--white)', width: '100%', maxWidth: '500px',
                border: 'var(--border-thick)', boxShadow: '16px 16px 0 var(--yellow)',
            }}>
                {/* Header */}
                <div style={{
                    background: 'var(--black)', padding: '16px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '5px solid var(--yellow)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', background: 'var(--yellow)' }} />
                        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: '700', fontSize: '12px', letterSpacing: '3px', color: 'var(--yellow)', textTransform: 'uppercase' }}>
                            NEW POST
                        </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: '2px solid rgba(245,240,232,0.3)',
                        color: 'var(--white)', cursor: 'pointer', width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'rgba(245,240,232,0.3)'; }}
                    >
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Drop zone */}
                    {!preview ? (
                        <div {...getRootProps()} style={{
                            border: `4px dashed ${isDragActive ? 'var(--yellow)' : 'var(--black)'}`,
                            padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                            background: isDragActive ? 'rgba(255,224,0,0.06)' : '#f0ebe3',
                            transition: 'all 0.15s',
                            boxShadow: isDragActive ? 'inset 0 0 0 4px var(--yellow)' : 'none',
                        }}>
                            <input {...getInputProps()} />
                            <div style={{
                                width: '56px', height: '56px', background: 'var(--black)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', border: '3px solid var(--yellow)',
                            }}>
                                <ImagePlus size={26} color="var(--yellow)" />
                            </div>
                            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                                {isDragActive ? 'DROP IT HERE' : 'DRAG & DROP OR CLICK'}
                            </p>
                            <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
                                PNG · JPG · GIF — MAX 10MB
                            </p>
                        </div>
                    ) : (
                        <div style={{ position: 'relative', border: 'var(--border-thick)' }}>
                            <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
                            <button type="button" onClick={() => { setFile(null); setPreview(null); }} style={{
                                position: 'absolute', top: '10px', right: '10px',
                                background: 'var(--black)', border: '2px solid var(--white)',
                                color: 'var(--white)', cursor: 'pointer', width: '32px', height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <X size={15} />
                            </button>
                            {/* Yellow corner tag */}
                            <div style={{
                                position: 'absolute', bottom: '0', left: '0',
                                background: 'var(--yellow)', padding: '4px 10px',
                                fontSize: '9px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase',
                                borderTop: '2px solid var(--black)', borderRight: '2px solid var(--black)',
                            }}>IMAGE READY</div>
                        </div>
                    )}

                    {/* Caption */}
                    <div>
                        <label className="field-label">Caption</label>
                        <textarea className="input-field" value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="WRITE YOUR CAPTION..." rows={3}
                            maxLength={500} style={{ resize: 'vertical' }} disabled={loading} />
                        <div style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)', marginTop: '6px' }}>
                            {caption.length}/500
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn-brand"
                        style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '13px' }}
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
