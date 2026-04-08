import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { Music, Plus, Edit2, Trash2, Headphones, Play, X, Save, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Mixtape {
    id?: string;
    title: string;
    artist?: string;
    genre: string;
    duration: string;
    coverUrl: string;
    audioUrl: string;
    downloadUrl: string;
    videoUrl: string;
    videoDownloadUrl: string;
    tags: string[];
    isFeatured: boolean;
    status?: 'published' | 'draft' | 'archived';
}

const EMPTY: Mixtape = { 
    title: '', 
    genre: '', 
    duration: '', 
    coverUrl: '', 
    audioUrl: '', 
    downloadUrl: '',
    videoUrl: '',
    videoDownloadUrl: '',
    tags: [], 
    isFeatured: false,
    status: 'published' 
};

const Mixtapes: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [mixtapes, setMixtapes] = useState<any[]>([]);
    const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data: Mixtape }>({
        open: false, mode: 'add', data: EMPTY
    });
    const [saving, setSaving] = useState(false);
    const [tagsInput, setTagsInput] = useState('');

    useEffect(() => {
        if (session) loadMixtapes();
    }, [session]);

    const loadMixtapes = async () => {
        try {
            const data = await request('/api/admin/mixtapes');
            setMixtapes(Array.isArray(data) ? data : (data?.results || []));
        } catch (e) { }
    };

    const openAdd = () => {
        setModal({ open: true, mode: 'add', data: EMPTY });
        setTagsInput('');
    };

    const openEdit = (mx: any) => {
        setModal({ open: true, mode: 'edit', data: { ...mx } });
        setTagsInput((mx.tags || []).join(', '));
    };

    const closeModal = () => setModal(m => ({ ...m, open: false }));

    const handleChange = (field: keyof Mixtape, value: any) => {
        setModal(m => ({ ...m, data: { ...m.data, [field]: value } }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, folder: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        // The endpoint handleR2Upload expects request.body (raw file)
        // and headers for name/folder
        
        setSaving(true);
        try {
            const response = await fetch('/api/admin/r2-upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'x-file-name': file.name,
                    'x-folder': folder,
                    'content-type': file.type
                },
                body: file
            });

            const result = await response.json();
            if (result.success) {
                if (folder === 'mixtapes-covers') handleChange('coverUrl', result.url);
                else if (folder === 'mixtapes-audio') {
                    handleChange('audioUrl', result.url);
                    handleChange('downloadUrl', result.url); // Set download URL same as audio URL by default
                }
                else if (folder === 'mixtapes-video') {
                    handleChange('videoUrl', result.url);
                    handleChange('videoDownloadUrl', result.url);
                }
                toast.success('File uploaded successfully!');
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast.error('Upload failed: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!modal.data.title.trim()) {
            toast.error('Title is required');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...modal.data,
                tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
            };

            if (modal.mode === 'add') {
                await request('/api/admin/mixtapes', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Mixtape added!');
            } else {
                await request(`/api/admin/mixtapes/${modal.data.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Mixtape updated!');
            }
            closeModal();
            loadMixtapes();
        } catch (e: any) {
            toast.error(e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (mx: any) => {
        if (!window.confirm(`Delete "${mx.title}"?`)) return;
        try {
            await request(`/api/admin/mixtapes/${mx.id}`, { method: 'DELETE' });
            toast.success('Mixtape deleted');
            loadMixtapes();
        } catch (e: any) {
            toast.error(e.message || 'Delete failed');
        }
    };

    return (
        <AdminLayout title="Sound Oracle">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex gap-4">
                    <button
                        onClick={openAdd}
                        className="bg-brand-purple text-white px-10 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                    >
                        <Plus size={18} />
                        Add New Mixtape
                    </button>
                </div>

                <div className="flex gap-6">
                    <div className="flex flex-col items-end">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Mixtapes</p>
                        <p className="text-xl font-black text-white tracking-tighter">{mixtapes.length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {loading ? (
                    <div className="col-span-full py-32 flex flex-col items-center gap-6">
                        <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Synchronizing Audio Waves...</span>
                    </div>
                ) : mixtapes.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-[#0B0B0F] border border-white/5 rounded-[4rem]">
                        <div className="flex flex-col items-center gap-6 opacity-30">
                            <Headphones size={64} className="text-gray-500" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">No mixtapes yet — add one above.</span>
                        </div>
                    </div>
                ) : mixtapes.map((mx) => (
                    <div key={mx.id} className="group bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden hover:border-brand-purple/30 transition-all duration-500 shadow-xl hover:shadow-brand-purple/5">
                        <div className="aspect-[16/10] relative overflow-hidden">
                            <img
                                src={mx.coverUrl || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products/placeholder.jpg'}
                                alt={mx.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-80" />

                            <div className="absolute top-6 right-6">
                                <div className="px-5 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${mx.isFeatured ? 'bg-orange-500 animate-pulse' : 'bg-gray-500'}`} />
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">{mx.genre || 'UNIDENTIFIED'}</span>
                                </div>
                            </div>

                            <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-brand-purple text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-500 shadow-2xl shadow-brand-purple/40 pointer-events-none">
                                <Play size={24} fill="currentColor" />
                            </div>
                        </div>

                        <div className="p-10">
                            <h3 className="text-lg font-black text-white tracking-tighter mb-4 group-hover:text-brand-purple transition-colors line-clamp-1">{mx.title}</h3>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {(mx.tags || []).slice(0, 3).map((tag: string) => (
                                    <span key={tag} className="text-[8px] font-black text-gray-500 uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => openEdit(mx)}
                                        className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-purple/30 transition-all"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(mx)}
                                        className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-gray-400/30 hover:text-red-500 hover:border-red-500/30 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="flex flex-col items-end">
                                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none mb-1">Duration</p>
                                    <p className="text-sm font-black text-white tracking-tighter">{mx.duration || '--:--'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add / Edit Modal */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                    <div
                        className="relative z-10 bg-[#0D0D12] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl shadow-brand-purple/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
                                    <Music size={22} />
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-lg tracking-tighter">
                                        {modal.mode === 'add' ? 'New Mixtape' : 'Edit Mixtape'}
                                    </h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                        {modal.mode === 'add' ? 'Add to the archive' : 'Update details'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-10 h-10 rounded-2xl border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Title *</label>
                                <input
                                    type="text"
                                    placeholder="Mixtape title..."
                                    value={modal.data.title}
                                    onChange={e => handleChange('title', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Genre</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Afrobeats"
                                        value={modal.data.genre || ''}
                                        onChange={e => handleChange('genre', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Duration</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1:23:45"
                                        value={modal.data.duration || ''}
                                        onChange={e => handleChange('duration', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Cover Image</label>
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            value={modal.data.coverUrl || ''}
                                            onChange={e => handleChange('coverUrl', e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                                        />
                                    </div>
                                    <label className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple hover:bg-brand-purple hover:text-white transition-all cursor-pointer">
                                        <Upload size={20} />
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'mixtapes-covers')} />
                                    </label>
                                </div>
                                {modal.data.coverUrl && (
                                    <div className="mt-3 relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                                        <img src={modal.data.coverUrl} className="w-full h-full object-cover" alt="Preview" />
                                        <button 
                                            onClick={() => handleChange('coverUrl', '')}
                                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Audio Stream & Download</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Audio URL..."
                                                value={modal.data.audioUrl || ''}
                                                onChange={e => {
                                                    handleChange('audioUrl', e.target.value);
                                                    if (!modal.data.downloadUrl) handleChange('downloadUrl', e.target.value);
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-mono text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                                            />
                                        </div>
                                        <label className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple hover:bg-brand-purple hover:text-white transition-all cursor-pointer">
                                            <Upload size={20} />
                                            <input type="file" className="hidden" accept="audio/*" onChange={e => handleFileUpload(e, 'mixtapes-audio')} />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Direct Download URL (if different)..."
                                        value={modal.data.downloadUrl || ''}
                                        onChange={e => handleChange('downloadUrl', e.target.value)}
                                        className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2 mt-2 text-[10px] font-mono text-gray-400 outline-none focus:border-brand-purple/30 transition-all placeholder:text-gray-800"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Video Stream & Download</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Video URL..."
                                                value={modal.data.videoUrl || ''}
                                                onChange={e => {
                                                    handleChange('videoUrl', e.target.value);
                                                    if (!modal.data.videoDownloadUrl) handleChange('videoDownloadUrl', e.target.value);
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-mono text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                                            />
                                        </div>
                                        <label className="w-14 h-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple hover:bg-brand-purple hover:text-white transition-all cursor-pointer">
                                            <Upload size={20} />
                                            <input type="file" className="hidden" accept="video/*" onChange={e => handleFileUpload(e, 'mixtapes-video')} />
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Video Download URL (if different)..."
                                        value={modal.data.videoDownloadUrl || ''}
                                        onChange={e => handleChange('videoDownloadUrl', e.target.value)}
                                        className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2 mt-2 text-[10px] font-mono text-gray-400 outline-none focus:border-brand-purple/30 transition-all placeholder:text-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Publish Status</label>
                                    <select
                                        value={modal.data.status}
                                        onChange={e => setModal({ ...modal, data: { ...modal.data, status: e.target.value as any } })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                    >
                                        <option value="published">Published (Visible)</option>
                                        <option value="draft">Draft (Hidden)</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div className="space-y-3 flex items-end pb-5">
                                    <button
                                        type="button"
                                        onClick={() => setModal({ ...modal, data: { ...modal.data, isFeatured: !modal.data.isFeatured } })}
                                        className={`w-full border rounded-2xl py-5 px-8 flex items-center justify-between transition-all ${modal.data.isFeatured
                                            ? 'bg-brand-purple/10 border-brand-purple/50 text-brand-purple'
                                            : 'bg-white/[0.03] border-white/10 text-gray-500'
                                            }`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">Featured Status</span>
                                        <div className={`w-2 h-2 rounded-full ${modal.data.isFeatured ? 'bg-brand-purple animate-pulse' : 'bg-gray-600'}`} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="afrobeats, dancehall, 2024"
                                    value={tagsInput}
                                    onChange={e => setTagsInput(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 mt-10">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-4 rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:border-white/20 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-4 rounded-2xl bg-brand-purple text-white text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : modal.mode === 'add' ? 'Add Mixtape' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Mixtapes;
