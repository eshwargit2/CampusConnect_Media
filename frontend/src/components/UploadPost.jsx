import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, ImagePlus, Loader2, Upload, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const UploadPost = ({ onClose, onPostCreated }) => {
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);

    const onDrop = useCallback((acceptedFiles) => {
        if (!acceptedFiles || acceptedFiles.length === 0) return;

        // Check if there is any video
        const videoFile = acceptedFiles.find(f => f.type.startsWith('video/'));

        if (videoFile) {
            // Video: only allow single video post
            // Clean up old previews to avoid leaks
            previews.forEach(p => URL.revokeObjectURL(p.url));
            setFiles([videoFile]);
            setPreviews([{ url: URL.createObjectURL(videoFile), type: 'video', name: videoFile.name, size: videoFile.size }]);
            setActiveIndex(0);
            toast.success('VIDEO SELECTED');
        } else {
            // Images and documents: allow up to 10
            // If the existing files contains a video, replace it entirely
            const cleanExistingFiles = files.filter(f => !f.type.startsWith('video/'));
            const acceptedDocs = acceptedFiles.filter(f => 
                f.type.startsWith('image/') || 
                f.type === 'application/pdf' || 
                f.type.includes('presentation') || f.type.includes('powerpoint') || 
                f.type.includes('word') || f.type.includes('msword')
            );
            const updatedFiles = [...cleanExistingFiles, ...acceptedDocs].slice(0, 10);

            // Clean up old previews
            previews.forEach(p => URL.revokeObjectURL(p.url));
            const updatedPreviews = updatedFiles.map(f => {
                let fileType = 'image';
                if (f.type === 'application/pdf') {
                    fileType = 'pdf';
                } else if (f.type.includes('presentation') || f.type.includes('powerpoint')) {
                    fileType = 'ppt';
                } else if (f.type.includes('word') || f.type.includes('msword')) {
                    fileType = 'doc';
                }

                return {
                    url: URL.createObjectURL(f),
                    type: fileType,
                    name: f.name,
                    size: f.size
                };
            });

            setFiles(updatedFiles);
            setPreviews(updatedPreviews);
            setActiveIndex(0);
        }
    }, [files, previews]);

    // Clean up previews on unmount
    React.useEffect(() => {
        return () => {
            previews.forEach(p => URL.revokeObjectURL(p.url));
        };
    }, []);

    const handleRemoveFile = (indexToRemove, e) => {
        e.stopPropagation();
        const updatedFiles = files.filter((_, i) => i !== indexToRemove);
        
        // Clean up preview
        if (previews[indexToRemove]) {
            URL.revokeObjectURL(previews[indexToRemove].url);
        }
        const updatedPreviews = previews.filter((_, i) => i !== indexToRemove);

        setFiles(updatedFiles);
        setPreviews(updatedPreviews);

        // Adjust activeIndex
        if (activeIndex >= updatedFiles.length) {
            setActiveIndex(Math.max(0, updatedFiles.length - 1));
        }
    };

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: {
            'image/*': [],
            'video/*': [],
            'application/pdf': ['.pdf'],
            'application/vnd.ms-powerpoint': ['.ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc']
        },
        maxFiles: 10,
        disabled: loading,
        noClick: previews.length > 0 // only trigger file dialog on click when dropzone is empty
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) return toast.error('SELECT MEDIA FIRST');
        if (!caption.trim()) return toast.error('CAPTION REQUIRED');
        setLoading(true);
        try {
            const isVideo = files[0].type.startsWith('video/');
            let videoUrl = null;

            if (isVideo) {
                const file = files[0];
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
                files.forEach(file => {
                    formData.append('images', file);
                });
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
                    {/* Drop zone / Previews */}
                    {previews.length === 0 ? (
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
                                PNG · JPG · GIF · MP4 — MAX 200MB (UP TO 10 IMAGES)
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Main Preview */}
                            <div style={{ position: 'relative', border: 'var(--border-thick)', borderRadius: '16px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                                {previews[activeIndex]?.type === 'video' ? (
                                    <video src={previews[activeIndex]?.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : ['pdf', 'ppt', 'doc'].includes(previews[activeIndex]?.type) ? (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        gap: '16px', padding: '24px', background: 'var(--primary-tint)', width: '100%', height: '100%',
                                        color: 'var(--black)'
                                    }}>
                                        <div style={{
                                            width: '72px', height: '72px', borderRadius: '16px', 
                                            background: previews[activeIndex]?.type === 'pdf' ? '#ef4444' : previews[activeIndex]?.type === 'ppt' ? '#f97316' : '#3b82f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '800', fontSize: '18px',
                                            boxShadow: 'var(--clay-btn-shadow)'
                                        }}>
                                            {previews[activeIndex]?.type.toUpperCase()}
                                        </div>
                                        <div style={{ textAlign: 'center', maxWidth: '80%' }}>
                                            <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', wordBreak: 'break-all', marginBottom: '4px' }}>
                                                {previews[activeIndex]?.name}
                                            </p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif", fontWeight: '600' }}>
                                                {previews[activeIndex]?.size ? `${(previews[activeIndex]?.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <img src={previews[activeIndex]?.url} alt={`Preview ${activeIndex}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                )}
                                
                                {/* Arrows */}
                                {previews.length > 1 && (
                                    <>
                                        <button type="button" onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                                            disabled={activeIndex === 0}
                                            style={{
                                                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                                                background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%',
                                                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: activeIndex === 0 ? 'default' : 'pointer', opacity: activeIndex === 0 ? 0.3 : 1,
                                                color: 'var(--black)', zIndex: 3
                                            }}
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button type="button" onClick={() => setActiveIndex(prev => Math.min(previews.length - 1, prev + 1))}
                                            disabled={activeIndex === previews.length - 1}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%',
                                                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: activeIndex === previews.length - 1 ? 'default' : 'pointer', opacity: activeIndex === previews.length - 1 ? 0.3 : 1,
                                                color: 'var(--black)', zIndex: 3
                                            }}
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </>
                                )}

                                {/* Slide counter badge */}
                                <div style={{
                                    position: 'absolute', top: '10px', right: '10px',
                                    background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
                                    padding: '4px 8px', borderRadius: '12px', color: '#ffffff',
                                    fontFamily: "'Outfit', sans-serif", fontSize: '9px', fontWeight: '700',
                                    letterSpacing: '1px', zIndex: 2
                                }}>
                                    {activeIndex + 1} / {previews.length}
                                </div>

                                <button type="button" onClick={() => { previews.forEach(p => URL.revokeObjectURL(p.url)); setFiles([]); setPreviews([]); setActiveIndex(0); }} style={{
                                    position: 'absolute', top: '10px', left: '10px',
                                    background: 'var(--white)', border: '1px solid var(--border-color)',
                                    color: 'var(--black)', cursor: 'pointer', width: '28px', height: '28px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '50%', boxShadow: 'var(--clay-btn-shadow)', zIndex: 2
                                }}>
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Thumbnails Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '4px 2px' }}>
                                <input {...getInputProps()} />
                                {previews.map((p, idx) => (
                                    <div key={idx} onClick={() => setActiveIndex(idx)} style={{
                                        position: 'relative', width: '50px', height: '50px', borderRadius: '8px',
                                        border: idx === activeIndex ? '2px solid var(--yellow)' : '1px solid var(--border-color)',
                                        overflow: 'hidden', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s'
                                    }}>
                                        {p.type === 'video' ? (
                                            <video src={p.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : ['pdf', 'ppt', 'doc'].includes(p.type) ? (
                                            <div style={{
                                                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: p.type === 'pdf' ? '#fee2e2' : p.type === 'ppt' ? '#ffedd5' : '#dbeafe',
                                                color: p.type === 'pdf' ? '#ef4444' : p.type === 'ppt' ? '#f97316' : '#3b82f6',
                                                fontFamily: "'Outfit', sans-serif", fontSize: '9px', fontWeight: '800'
                                            }}>
                                                {p.type.toUpperCase()}
                                            </div>
                                        ) : (
                                            <img src={p.url} alt={`Thumbnail ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                        <button type="button" onClick={(e) => handleRemoveFile(idx, e)} style={{
                                            position: 'absolute', top: '2px', right: '2px',
                                            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                            width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', cursor: 'pointer'
                                        }}>
                                            <X size={8} />
                                        </button>
                                    </div>
                                ))}
                                {previews.length < 10 && previews[0]?.type !== 'video' && (
                                    <button type="button" onClick={open} style={{
                                        width: '50px', height: '50px', borderRadius: '8px',
                                        border: '1px dashed var(--yellow)', background: 'var(--primary-tint)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--yellow)', cursor: 'pointer', flexShrink: 0
                                    }}>
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>
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

