import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
    MapPin, Link as LinkIcon, Calendar, Twitter, Instagram, 
    Music2, CheckCircle2, Heart, MessageSquare, Share2,
    ArrowLeft, Loader, Crown, Zap, UserPlus, UserCheck,
    Edit3, X, Save, Camera, RefreshCw, AtSign, Globe,
    MoreHorizontal, ShieldCheck, Mail, Send, Pin, Star,
    Activity, Play, Grid3X3, ShoppingBag, Users2, Settings,
    ArrowUpRight, Loader2, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile, useProfilePosts } from '../hooks/useProfile';
import { useLike, useComposer } from '../hooks/useSocial';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

type AuraTier = 'legendary' | 'prime' | 'standard';

// ─── Helpers ──────────────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

const formatJoined = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
};

const fmt = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
};

// ─── AuraAvatar ────────────────────────────────────────────────────────
function AuraAvatar({ src, name, tier, isVerified }: { src: string; name: string; tier: AuraTier; isVerified: boolean }) {
    const isLegendary = tier === 'legendary';
    const isPrime = tier === 'prime';

    return (
        <div className="relative inline-block group">
            <motion.div
                animate={{
                    scale: isLegendary ? [1, 1.05, 1] : 1,
                    boxShadow: isLegendary
                        ? ['0 0 20px rgba(245,158,11,0.3)', '0 0 50px rgba(245,158,11,0.6)', '0 0 20px rgba(245,158,11,0.3)']
                        : isPrime
                        ? ['0 0 20px rgba(168,85,247,0.3)', '0 0 50px rgba(6,182,212,0.5)', '0 0 20px rgba(168,85,247,0.3)']
                        : 'none'
                }}
                transition={{ repeat: Infinity, duration: 4 }}
                className={`p-1.5 rounded-[3rem] inline-block shadow-2xl relative z-10 ${
                    isLegendary
                        ? 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600 ring-4 ring-amber-400/50'
                        : isPrime
                        ? 'bg-gradient-to-br from-brand-purple to-brand-cyan ring-4 ring-brand-purple/50'
                        : 'bg-white/10 border-2 border-white/10'
                }`}
            >
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] overflow-hidden bg-gray-900">
                    <img
                        src={src || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111&color=fff`}
                        alt={name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111&color=fff`; }}
                    />
                </div>
            </motion.div>

            {isLegendary && (
                <motion.div
                    animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)]"
                >
                    <Crown size={28} fill="currentColor" />
                </motion.div>
            )}

            {isVerified && (
                <div className="absolute -bottom-2 -right-2 z-30">
                    <div className="bg-gradient-to-tr from-brand-purple to-brand-cyan p-1.5 rounded-2xl border-4 border-[#050508] shadow-2xl">
                        <CheckCircle2 size={18} className="text-white" />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Pulse Rate Chart ─────────────────────────────────────────────────
function PulseRateChart({ data }: { data: number[] }) {
    const max = Math.max(...data, 1);
    const total = data.reduce((a, b) => a + b, 0);

    return (
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-red-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pulse Rate (30D)</span>
                </div>
                <span className="text-[10px] font-black text-white/60">{total.toLocaleString()} SIGNALS</span>
            </div>
            <div className="flex items-end gap-[3px] h-12">
                {data.map((val, i) => (
                    <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${(val / max) * 100}%` }}
                        transition={{ delay: i * 0.02, duration: 0.5 }}
                        className="flex-1 bg-white/10 rounded-t-sm hover:bg-brand-purple transition-colors cursor-default"
                        title={`${val} signals`}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Badge Trophy Case ─────────────────────────────────────────────────
function BadgeCase({ badges }: { badges: { id: string; name: string; icon: React.ReactNode; color: string }[] }) {
    if (!badges?.length) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {badges.map(badge => (
                <div key={badge.id} className="group relative">
                    <div className={`p-2.5 rounded-2xl text-white shadow-lg hover:scale-110 transition-transform cursor-help ${badge.color}`}>
                        {badge.icon}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-black/90 text-white text-[9px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-white/10 shadow-xl">
                        {badge.name}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Avatar ────────────────────────────────────────────────────────────
const Avatar = ({ src, name, size = 12, className = "" }: { src?: string; name?: string; size?: number; className?: string }) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
    return (
        <div className={`relative flex-shrink-0 w-${size} h-${size} ${className}`}>
            <img
                src={src || fallback}
                onError={e => { (e.target as HTMLImageElement).src = fallback; }}
                className="w-full h-full rounded-full object-cover border-2 border-white/10"
                alt={name}
            />
        </div>
    );
};

// ─── Post Card ─────────────────────────────────────────────────────────
function ProfilePostCard({ post, currentUserId, pinnedPostId, onPinToggle, profile }: { post: any; currentUserId?: string; pinnedPostId?: string; onPinToggle?: (id: string) => void; profile: any }) {
    const { liked, count, toggle } = useLike(!!post.viewer_liked, post.like_count ?? post.likes_count ?? 0);
    const { deletePost } = useComposer();
    const isOwn = currentUserId === post.author_id;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || 'U')}&background=7C3AED&color=fff`;
    const auraTier: AuraTier = profile?.aura_tier || 'standard';

    let mediaUrls: string[] = [];
    try { mediaUrls = JSON.parse(post.media_urls || '[]'); } catch { if (post.image_url) mediaUrls = [post.image_url]; }
    if (!mediaUrls.length && post.image_url) mediaUrls = [post.image_url];

    const isPinned = pinnedPostId === post.id;

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, scale: 1.005 }}
            className={`bg-[#0c0c12] border rounded-[2.5rem] overflow-hidden transition-all hover:shadow-2xl hover:shadow-brand-purple/5 group ${
                isPinned ? 'border-brand-purple/30 ring-1 ring-brand-purple/20' : 'border-white/5'
            }`}
        >
            {/* Post Header */}
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-[1.25rem] overflow-hidden bg-gray-900 shadow-inner ring-2 ring-offset-2 ring-offset-[#0c0c12] ${
                        auraTier === 'legendary' ? 'ring-amber-400/60' :
                        auraTier === 'prime' ? 'ring-brand-purple/60' :
                        'ring-transparent'
                    }`}>
                        <img src={post.author_avatar || fallback} alt={post.author_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = fallback; }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 leading-tight">
                            <span className="font-black text-[15px] tracking-tight text-white">{post.author_name}</span>
                            {profile?.is_verified === 1 && <CheckCircle2 size={13} className="text-brand-cyan fill-brand-cyan/10" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">@{post.author_username}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="text-[10px] text-gray-500 font-bold">{timeAgo(post.created_at)}</span>
                            {isPinned && (
                                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-lg ml-1">
                                    <Pin size={8} fill="currentColor" /> Pinned
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isOwn && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button title="Pin to top" onClick={() => onPinToggle?.(post.id)} className={`p-2 rounded-xl transition-all ${isPinned ? 'text-brand-purple bg-brand-purple/10' : 'text-gray-600 hover:text-brand-purple hover:bg-brand-purple/10'}`}>
                                <Pin size={16} />
                            </button>
                            <button onClick={async () => { if (confirm('Delete this broadcast?')) await deletePost(post.id); }} className="p-2 hover:bg-red-500/10 text-gray-600 hover:text-red-500 rounded-xl transition-all">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    <button className="p-2 hover:bg-white/5 rounded-xl transition-all group/more">
                        <MoreHorizontal size={20} className="text-gray-600 group-hover/more:text-white" />
                    </button>
                </div>
            </div>

            {/* Post Content */}
            {post.content && (
                <div className="px-6 pb-4">
                    <p className="text-gray-300 text-[15px] leading-relaxed font-medium whitespace-pre-wrap break-words">{post.content}</p>
                </div>
            )}

            {/* Media Grid */}
            {mediaUrls.length > 0 && (
                <div className={`mx-4 mb-4 rounded-[2rem] overflow-hidden ring-1 ring-black/30 ${mediaUrls.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-0.5'}`}>
                    {mediaUrls.slice(0, 4).map((u, i) => (
                        <img key={i} src={u} className="w-full aspect-video object-cover hover:scale-105 transition-transform duration-700" alt="" loading="lazy" />
                    ))}
                </div>
            )}

            {/* Action Bar */}
            <div className="px-6 py-5 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-2 group/btn cursor-pointer text-gray-500 hover:text-brand-purple transition-colors text-sm font-bold">
                        <div className="p-2.5 transition-all group-hover/btn:bg-brand-purple/10 group-active/btn:scale-90 rounded-xl">
                            <MessageSquare size={18} />
                        </div>
                        <span className="tabular-nums text-xs font-black tracking-widest">{post.comment_count ?? post.comments_count ?? 0}</span>
                    </button>
                    <button onClick={() => toggle(post.id)} className={`flex items-center gap-2 transition-colors text-sm font-bold group/btn ${liked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'}`}>
                        <div className={`p-2.5 rounded-xl group-hover/btn:bg-pink-500/10 group-active/btn:scale-90 transition-all ${liked ? 'bg-pink-500/10' : ''}`}>
                            <Heart size={18} className={liked ? 'fill-pink-500' : ''} />
                        </div>
                        <span className="tabular-nums text-xs font-black tracking-widest">{count}</span>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/community?post=${post.id}`); toast.success('Link copied!'); }} className="p-2.5 hover:bg-brand-cyan/10 hover:text-brand-cyan text-gray-600 rounded-xl transition-all cursor-pointer opacity-60 hover:opacity-100">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>
        </motion.article>
    );
}

// ─── Edit Profile Modal ────────────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSave }: { profile: any; onClose: () => void; onSave: () => void }) {
    const { session } = useAuth();
    const [form, setForm] = useState({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        avatar_url: profile.avatar_url || '',
        aura_tier: profile.aura_tier || 'standard',
    });
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        const toastId = toast.loading('Uploading avatar...');
        try {
            const res = await fetch(`${API}/api/social/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'x-file-name': encodeURIComponent(file.name),
                    'x-folder': 'avatars',
                    'content-type': file.type
                },
                body: await file.arrayBuffer()
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setForm(f => ({ ...f, avatar_url: data.url }));
            toast.success('Avatar updated', { id: toastId });
        } catch (err: any) {
            toast.error('Upload failed', { description: err.message, id: toastId });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/profiles/${profile.username}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify(form)
            });
            if (!res.ok) throw new Error('Failed to save');
            toast.success('Identity Synchronized!');
            onSave();
            onClose();
        } catch {
            toast.error('Protocol transmission failure');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-xl bg-[#090910] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-8 border-b border-white/5">
                        <div>
                            <h2 className="font-black text-2xl text-white uppercase tracking-tighter">Adjust Profile</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1">Operator Identity Modulation</p>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-gray-400"><X size={20} /></button>
                    </div>

                    <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto">
                        {/* Avatar Upload */}
                        <div className="flex items-center gap-5">
                            <label className="relative group cursor-pointer flex-shrink-0">
                                <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={uploadingAvatar} />
                                <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 relative">
                                    {uploadingAvatar && (
                                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                                            <Loader2 size={20} className="text-brand-purple animate-spin" />
                                        </div>
                                    )}
                                    {form.avatar_url ? (
                                        <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            <Camera size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/60 rounded-[1.5rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Camera size={18} className="text-white" />
                                </div>
                            </label>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Avatar</p>
                                <p className="text-[11px] text-gray-600">Click to upload a new avatar image</p>
                            </div>
                        </div>

                        {/* Display Name */}
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2 block">Display Name</label>
                            <input type="text" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2 block">Biography</label>
                            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all resize-none text-sm" />
                        </div>

                        {/* Location */}
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2 block">Location</label>
                            <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                        </div>

                        {/* Website */}
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2 block">Website</label>
                            <input type="text" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                        </div>

                        {/* Aura Tier */}
                        <div>
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-3 block">Aura Tier</label>
                            <div className="flex gap-2">
                                {(['standard', 'prime', 'legendary'] as AuraTier[]).map(t => (
                                    <button key={t} onClick={() => setForm(f => ({ ...f, aura_tier: t }))}
                                        className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${
                                            form.aura_tier === t
                                                ? t === 'legendary' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-amber-500/50'
                                                : t === 'prime' ? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white border-brand-purple/50'
                                                : 'bg-white text-black border-white/50'
                                                : 'bg-white/[0.03] text-gray-500 border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 pt-4 flex gap-4 border-t border-white/5">
                        <button onClick={onClose} className="flex-1 py-4 rounded-2xl border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                        <button onClick={save} disabled={saving}
                            className="flex-1 py-4 rounded-2xl bg-brand-purple text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-purple/30 disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                            {saving ? 'Syncing...' : 'Save Alterations'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// ─── Direct Message Modal ──────────────────────────────────────────────
function DirectMessageModal({ targetUserId, targetUserName, targetAvatar, onClose }: { targetUserId: string; targetUserName: string; targetAvatar: string; onClose: () => void }) {
    const { session, user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchMsgs = async () => {
            try {
                const res = await fetch(`${API}/api/social/messages/${targetUserId}`, {
                    headers: { 'Authorization': `Bearer ${session?.access_token}`, 'X-Actor-Id': user?.id || '' }
                });
                const data = await res.json();
                if (data.messages) setMessages(data.messages);
            } catch (e) {} finally { setLoading(false); }
        };
        fetchMsgs();
        const int = setInterval(fetchMsgs, 5000);
        return () => clearInterval(int);
    }, [targetUserId, session, user]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const send = async () => {
        if (!text.trim()) return;
        const newMsg = { id: Date.now().toString(), content: text, sender_id: user?.id, created_at: new Date().toISOString() };
        setMessages(m => [...m, newMsg]);
        setText('');
        try {
            await fetch(`${API}/api/social/messages/${targetUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'X-Actor-Id': user?.id || '' },
                body: JSON.stringify({ content: newMsg.content })
            });
        } catch { toast.error('Failed to send'); }
    };

    return (
        <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-md bg-[#0B0B0F] h-full flex flex-col border-l border-white/10 shadow-2xl">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <Avatar src={targetAvatar} name={targetUserName} size={10} />
                        <div>
                            <h3 className="text-white font-black uppercase tracking-tighter leading-none">{targetUserName}</h3>
                            <p className="text-[10px] text-brand-cyan font-bold uppercase tracking-widest mt-1">Encrypted Uplink</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} className="text-gray-400" /></button>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-brand-purple" /></div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center h-full opacity-40">
                            <MessageSquare className="mb-4 text-gray-600" size={32} />
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">No prior transmissions</p>
                        </div>
                    ) : messages.map(msg => {
                        const isMine = msg.sender_id === user?.id;
                        return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${isMine ? 'bg-brand-purple text-white rounded-br-sm' : 'bg-white/10 text-gray-200 rounded-bl-sm border border-white/5'}`}>
                                    {msg.content}
                                    <span className={`text-[9px] mt-2 block font-bold tracking-widest uppercase ${isMine ? 'text-white/50' : 'text-gray-600'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-white/5">
                    <div className="flex gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-2 focus-within:border-brand-purple/50 transition-colors">
                        <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()}
                            placeholder="Encode message..." className="flex-1 bg-transparent border-none text-white text-sm px-3 focus:outline-none placeholder-gray-600 font-medium" />
                        <button onClick={send} disabled={!text.trim()} className="p-3 bg-brand-purple rounded-xl text-white disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Profile Feed ──────────────────────────────────────────────────────
function ProfileFeed({ profile, tab, currentUserId, onSettingsRefresh }: { profile: any; tab: string; currentUserId?: string; onSettingsRefresh: () => void }) {
    const { posts, loading, loadingMore, hasMore, loadMore, error } = useProfilePosts(profile.username, tab);
    const { session } = useAuth();
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loaderRef.current || !hasMore) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { threshold: 0.1 });
        obs.observe(loaderRef.current);
        return () => obs.disconnect();
    }, [hasMore, loadMore, tab]);

    if (loading) return (
        <div className="space-y-4 p-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#0c0c12] border border-white/5 rounded-[2.5rem] p-5 animate-pulse flex gap-5">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                        <div className="h-4 bg-white/10 rounded-lg w-1/3" />
                        <div className="h-3 bg-white/5 rounded-lg w-full" />
                        <div className="h-3 bg-white/5 rounded-lg w-4/5" />
                    </div>
                </div>
            ))}
        </div>
    );

    if (error) return (
        <div className="py-32 text-center">
            <RefreshCw size={40} className="mx-auto text-gray-800 mb-6" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Signal Interference Detected</p>
        </div>
    );

    if (posts.length === 0) return (
        <div className="py-40 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center">
                <Zap size={28} className="text-gray-700" />
            </div>
            <div className="space-y-2">
                <h3 className="font-black text-white text-lg uppercase tracking-tighter">No Activity Logged</h3>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">This channel is currently silent</p>
            </div>
        </div>
    );

    const pinAction = async (postId: string) => {
        try {
            const res = await fetch(`${API}/api/social/posts/${postId}/pin`, { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token || ''}` } });
            if (res.ok) onSettingsRefresh();
        } catch (e) {}
    };

    const sortedPosts = [...posts].sort((a, b) => {
        if (a.id === profile.pinned_post_id) return -1;
        if (b.id === profile.pinned_post_id) return 1;
        return 0;
    });

    return (
        <div className="space-y-4 p-4">
            <LayoutGroup>
                <AnimatePresence initial={false}>
                    {sortedPosts.map(post => (
                        <ProfilePostCard
                            key={post.id}
                            post={post}
                            currentUserId={currentUserId}
                            pinnedPostId={profile.pinned_post_id}
                            onPinToggle={pinAction}
                            profile={profile}
                        />
                    ))}
                </AnimatePresence>
            </LayoutGroup>
            <div ref={loaderRef} className="py-16 flex items-center justify-center">
                {loadingMore ? (
                    <div className="flex items-center gap-4 text-brand-purple">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Loading More...</span>
                    </div>
                ) : !hasMore && posts.length > 0 ? (
                    <div className="flex items-center gap-4 text-gray-700">
                        <div className="w-8 h-px bg-white/5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.5em]">End of Transmissions</span>
                        <div className="w-8 h-px bg-white/5" />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// ─── Main Public Profile Page ──────────────────────────────────────────
export default function PublicProfile() {
    const { username: rawUsername } = useParams<{ username: string }>();
    const username = rawUsername?.startsWith('@') ? rawUsername.substring(1) : rawUsername;
    const { profile, stats, viewer, mutuals, loading, error, reload: refresh } = useProfile(username || '');
    const { user, isAuthenticated, session } = useAuth();
    const navigate = useNavigate();
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const [showEdit, setShowEdit] = useState(false);
    const [showChat, setShowChat] = useState(false);

    const handleForceSync = async () => {
        if (!user || !session) return;
        setIsSyncing(true);
        const tid = toast.loading("Broadcasting sync signal...");
        try {
            const res = await fetch(`${API}/api/user/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-Actor-Id': user.id
                },
                body: JSON.stringify({
                    display_name: user.name,
                    avatar_url: user.avatarUrl
                })
            });
            if (res.ok) {
                toast.success("Identity synchronized with D1", { id: tid });
                setTimeout(() => window.location.reload(), 1000);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Sync failed", { id: tid });
            }
        } catch (e) {
            toast.error("Network interface error", { id: tid });
        } finally {
            setIsSyncing(false);
        }
    };

    const isOwner = !!(user && profile && (user.username === profile.username || viewer.is_owner));
    const auraTier: AuraTier = profile?.aura_tier || 'standard';

    // Build a synthetic pulse data from stats (30 points)
    const pulseData = Array.from({ length: 30 }, (_, i) => Math.max(1, Math.round(Math.random() * 50 + 5)));

    // Build badges from profile role / verification
    const badges = [
        profile?.is_verified === 1 && { id: 'verified', name: 'Verified Operator', icon: <ShieldCheck size={14} />, color: 'bg-brand-cyan' },
        profile?.role === 'admin' && { id: 'admin', name: 'Platform Admin', icon: <Crown size={14} />, color: 'bg-amber-500' },
        profile?.role === 'dj' && { id: 'dj', name: 'DJ Pro', icon: <Music2 size={14} />, color: 'bg-brand-purple' },
        auraTier === 'legendary' && { id: 'legendary', name: 'Legendary Aura', icon: <Star size={14} />, color: 'bg-gradient-to-r from-orange-500 to-amber-500' },
        auraTier === 'prime' && { id: 'prime', name: 'Prime Operator', icon: <Zap size={14} />, color: 'bg-gradient-to-r from-brand-purple to-brand-cyan' },
    ].filter(Boolean) as { id: string; name: string; icon: React.ReactNode; color: string }[];

    if (loading && !profile) return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-brand-purple/20 border-t-brand-purple animate-spin" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border border-brand-purple/10 blur-xl animate-pulse" />
                </div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Syncing Identity...</p>
            </div>
        </div>
    );

    const isOwnFailedProfile = isAuthenticated && (
        username === user?.id || 
        username === user?.username || 
        username === 'me' || 
        (user?.role === 'admin' && (username === 'djflowerz' || username === 'user_djflowerz' || username === '3361e605-645a-40a2-9d33-35619cc41470'))
    );

    if (error || !profile) return (
        <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-32 h-32 bg-white/[0.02] rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-2xl relative">
                <AtSign size={48} className="text-gray-800" />
                <div className="absolute inset-0 bg-red-500/5 blur-3xl rounded-full" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-3">Unknown Operator</h1>
            <p className="text-gray-500 mb-10 font-bold uppercase tracking-widest text-xs">
                {isOwnFailedProfile ? "Your profile identity needs synchronization." : "This frequency is currently unassigned."}
            </p>
            {isOwnFailedProfile ? (
                <div className="flex flex-col gap-4 items-center">
                    <button 
                        onClick={handleForceSync}
                        disabled={isSyncing}
                        className="bg-brand-purple text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-purple/20 border border-white/10 flex items-center gap-3 disabled:opacity-50"
                    >
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {isSyncing ? "Syncing Identity..." : "Force Sync Identity"}
                    </button>
                    <Link to="/account?tab=profile" className="text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-[10px] py-2">
                        Account Settings
                    </Link>
                </div>
            ) : (
                <Link to="/community" className="bg-brand-purple text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-purple/20 border border-white/10">
                    Return to Network
                </Link>
            )}
        </div>
    );

    const tabs = [
        { id: 'posts', label: 'Transmissions', icon: <ImageIcon size={14} /> },
        { id: 'media', label: 'Visuals', icon: <Grid3X3 size={14} /> },
        { id: 'hardware', label: 'Hardware', icon: <ShoppingBag size={14} /> },
        { id: 'replies', label: 'Network', icon: <Users2 size={14} /> },
    ];

    return (
        <div className="min-h-screen bg-[#050508] text-white selection:bg-brand-purple/30">
            {/* ── Fixed Header ─────────────────────────────────────────── */}
            <div className="sticky top-0 z-[60] bg-[#050508]/70 backdrop-blur-3xl border-b border-white/[0.04] transition-all">
                <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl transition-all group">
                            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h2 className="font-black text-sm text-white leading-none uppercase tracking-tight flex items-center gap-2">
                                {profile.display_name || profile.username}
                                {profile.is_verified === 1 && <CheckCircle2 size={14} className="text-brand-cyan" />}
                            </h2>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{stats.posts || 0} transmissions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOwner ? (
                            <button onClick={() => setShowEdit(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                                <Settings size={14} />
                                <span className="hidden sm:inline">Adjust</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button onClick={toggleFollow} disabled={followLoading}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${
                                        following
                                            ? 'bg-white/10 border border-white/20 text-white hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                            : 'bg-white text-black hover:scale-105 active:scale-95'
                                    }`}>
                                    {followLoading ? <Loader2 size={14} className="animate-spin" /> : following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                                    {following ? 'Connected' : 'Connect'}
                                </button>
                                <button className="p-2.5 bg-white/[0.03] border border-brand-purple/30 rounded-2xl text-brand-purple hover:bg-brand-purple hover:text-white transition-all" onClick={() => setShowChat(true)}>
                                    <MessageSquare size={16} />
                                </button>
                            </div>
                        )}
                        <button className="p-2.5 bg-white/[0.03] border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all">
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto">
                {/* ── Cover Banner ─────────────────────────────────────── */}
                <section className="relative h-44 md:h-64 overflow-hidden">
                    {profile.banner_url ? (
                        <img src={profile.banner_url} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full relative overflow-hidden">
                            <div className={`absolute -inset-1/2 blur-[80px] opacity-50 rounded-full ${
                                auraTier === 'legendary' ? 'bg-amber-500/40' :
                                auraTier === 'prime' ? 'bg-brand-purple/40' :
                                'bg-brand-cyan/20'
                            }`} />
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050508] to-transparent" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent" />
                </section>

                {/* ── Profile Info Section ──────────────────────────────── */}
                <section className="px-5 relative pb-6">
                    {/* Avatar floated up over cover */}
                    <div className="absolute -top-16 left-5">
                        <AuraAvatar
                            src={profile.avatar_url || ''}
                            name={profile.display_name || profile.username}
                            tier={auraTier}
                            isVerified={profile.is_verified === 1}
                        />
                    </div>

                    {/* Action Buttons row */}
                    <div className="flex justify-end pt-4 mb-14 gap-2">
                        {isOwner ? (
                            <button onClick={() => setShowEdit(true)}
                                className="p-2.5 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95">
                                <Settings size={18} />
                                <span className="hidden sm:inline">Edit Profile</span>
                            </button>
                        ) : (
                            <>
                                <button onClick={() => setShowChat(true)}
                                    className="p-2.5 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/10 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95">
                                    <MessageSquare size={18} />
                                    <span className="hidden sm:inline">Message</span>
                                </button>
                                <button onClick={toggleFollow} disabled={followLoading}
                                    className={`min-w-[120px] px-6 py-2.5 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-xl flex items-center justify-center gap-2 active:scale-95 ${
                                        following
                                            ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                            : 'bg-white text-black hover:bg-gray-100'
                                    }`}>
                                    {followLoading ? <Loader2 size={16} className="animate-spin" /> : following ? 'Connected' : 'Connect'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Name + Handle */}
                    <div className="mt-2">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h1 className="text-3xl font-black tracking-tighter text-white">{profile.display_name || profile.username}</h1>
                            {profile.is_verified === 1 && <CheckCircle2 size={22} className="text-brand-cyan fill-brand-cyan/10" />}
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border tracking-widest ${
                                auraTier === 'legendary' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                auraTier === 'prime' ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/20' :
                                'bg-white/5 text-gray-500 border-white/10'
                            }`}>{auraTier}</span>
                        </div>
                        <p className="text-gray-500 font-bold mb-4 tracking-tight">@{profile.username}</p>

                        {profile.bio && (
                            <p className="text-gray-300 leading-relaxed mb-5 font-medium text-[15px]">
                                {profile.bio}
                            </p>
                        )}

                        {/* Badge Trophy Case */}
                        {badges.length > 0 && (
                            <div className="mb-5">
                                <BadgeCase badges={badges} />
                            </div>
                        )}

                        {/* Pulse Rate Chart */}
                        <div className="mb-5">
                            <PulseRateChart data={pulseData} />
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-x-5 gap-y-3 text-gray-500 text-sm font-semibold mb-5">
                            {profile.location && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={15} className="text-gray-600" /> {profile.location}
                                </span>
                            )}
                            {profile.website && (
                                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1.5 text-brand-cyan hover:text-brand-cyan/80 transition-colors">
                                    <LinkIcon size={15} /> {profile.website.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                            <span className="flex items-center gap-1.5 opacity-70">
                                <Calendar size={15} /> Joined {formatJoined(profile.joined_at)}
                            </span>
                        </div>

                        {/* Network Stats */}
                        <div className="flex gap-3 mb-5">
                            <button className="flex flex-col items-start px-4 py-3 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 hover:shadow-xl hover:shadow-black/10 transition-all min-w-[100px]">
                                <span className="font-black text-lg text-white">{fmt(stats.followers || 0)}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Followers</span>
                            </button>
                            <button className="flex flex-col items-start px-4 py-3 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 hover:shadow-xl hover:shadow-black/10 transition-all min-w-[100px]">
                                <span className="font-black text-lg text-white">{fmt(stats.following || 0)}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Following</span>
                            </button>
                        </div>

                        {/* Mutual Connections */}
                        {mutuals?.count > 0 && !isOwner && (
                            <div className="flex items-center gap-3 mb-5 px-1">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[#050508] overflow-hidden bg-gray-800 ring-1 ring-white/10">
                                            <div className="w-full h-full bg-brand-purple/30" />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] font-bold text-gray-500">{mutuals.text}</p>
                            </div>
                        )}

                        {/* Social Links */}
                        <div className="flex items-center gap-2">
                            {[
                                { icon: Twitter, href: profile.twitter_handle ? `https://twitter.com/${profile.twitter_handle}` : null, hover: 'hover:bg-blue-500/10 hover:text-blue-400' },
                                { icon: Instagram, href: profile.instagram_handle ? `https://instagram.com/${profile.instagram_handle}` : null, hover: 'hover:bg-pink-500/10 hover:text-pink-400' },
                                { icon: Music2, href: profile.soundcloud_handle ? `https://soundcloud.com/${profile.soundcloud_handle}` : null, hover: 'hover:bg-orange-500/10 hover:text-orange-400' },
                                { icon: Mail, href: profile.email ? `mailto:${profile.email}` : null, hover: 'hover:bg-white/10 hover:text-white' },
                            ].filter(s => s.href).map((social, i) => (
                                <a key={i} href={social.href!} target="_blank" rel="noreferrer"
                                    className={`p-2.5 bg-white/[0.03] border border-white/10 rounded-2xl text-gray-500 transition-all ${social.hover}`}>
                                    <social.icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Tab Navigation ────────────────────────────────────── */}
                <section className="sticky top-16 z-40 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5">
                    <div className="flex px-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center gap-1.5 py-4 relative transition-all ${
                                    activeTab === tab.id ? 'text-white' : 'text-gray-600 hover:text-gray-400'
                                }`}
                            >
                                <span className="font-black text-[10px] uppercase tracking-widest">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTabBar"
                                        className="absolute bottom-0 left-4 right-4 h-[2px] bg-white rounded-t-full"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                {/* ── Feed Content ──────────────────────────────────────── */}
                <section className="px-4 py-6 pb-32 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                        >
                            <ProfileFeed
                                profile={profile}
                                tab={activeTab}
                                currentUserId={currentUser?.id}
                                onSettingsRefresh={refreshProfile}
                            />
                        </motion.div>
                    </AnimatePresence>
                </section>
            </main>

            {/* ── Floating Mobile Nav ───────────────────────────────────── */}
            <div className="md:hidden fixed bottom-6 left-0 right-0 px-4 pointer-events-none z-50">
                <nav className="max-w-xs mx-auto bg-[#0c0c12]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] h-16 pointer-events-auto shadow-2xl flex items-center justify-around px-6">
                    <button onClick={() => navigate('/community')} className="text-gray-500 hover:text-white p-2 transition-colors">
                        <Users2 size={22} />
                    </button>
                    <button onClick={() => setActiveTab('posts')} className={`p-3 rounded-2xl transition-all ${activeTab === 'posts' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>
                        <Grid3X3 size={22} />
                    </button>
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white p-2 transition-colors">
                        <ArrowLeft size={22} />
                    </button>
                    <button onClick={() => setShowEdit(true)}>
                        <div className={`w-8 h-8 rounded-xl overflow-hidden border-2 ring-2 ring-offset-2 ring-offset-[#0c0c12] ${
                            auraTier === 'legendary' ? 'ring-amber-400 border-amber-400' :
                            auraTier === 'prime' ? 'ring-brand-purple border-brand-purple' :
                            'ring-transparent border-white/20'
                        }`}>
                            <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || profile.username)}&background=111&color=fff`}
                                alt="me" className="w-full h-full object-cover" />
                        </div>
                    </button>
                </nav>
            </div>

            {/* Edit Modal */}
            {showEdit && <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} onSave={refreshProfile} />}

            {/* DM Modal */}
            <AnimatePresence>
                {showChat && currentUser && (
                    <DirectMessageModal
                        targetUserId={profile.id}
                        targetUserName={profile.display_name || profile.username}
                        targetAvatar={profile.avatar_url}
                        onClose={() => setShowChat(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
