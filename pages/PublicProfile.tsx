import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MapPin, Link as LinkIcon, Calendar, Twitter, Instagram, 
    Music2, CheckCircle2, Heart, MessageSquare, Share2,
    ArrowLeft, Loader, Crown, Zap, UserPlus, UserCheck,
    Edit3, X, Save, Camera, RefreshCw, AtSign, Globe,
    ChevronRight, MoreHorizontal, ShieldCheck, Mail, Send, Pin, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile, useProfilePosts } from '../hooks/useProfile';
import { useLike, useComposer } from '../hooks/useSocial';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

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

// ─── Components ───────────────────────────────────────────────────────

/**
 * Premium Post Card for the profile feed
 */
function ProfilePostCard({ post, currentUserId, pinnedPostId, onPinToggle }: { post: any; currentUserId?: string; pinnedPostId?: string; onPinToggle?: (id:string)=>void }) {
    const { liked, count, toggle } = useLike(!!post.viewer_liked, post.like_count ?? post.likes_count ?? 0);
    const { deletePost } = useComposer();
    const isOwn = currentUserId === post.author_id;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || 'U')}&background=7C3AED&color=fff`;
    
    let mediaUrls: string[] = [];
    try { mediaUrls = JSON.parse(post.media_urls || '[]'); } catch { if (post.image_url) mediaUrls = [post.image_url]; }
    if (!mediaUrls.length && post.image_url) mediaUrls = [post.image_url];

    const isPinned = pinnedPostId === post.id;
    const isHardware = post.is_marketplace === 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl -z-10" />
            <div className="px-6 py-8 flex gap-5 border-b border-white/5 last:border-0 hover:bg-white/[0.01] transition-all">
                <Avatar src={post.author_avatar || fallback} name={post.author_name} size={12} />
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-base tracking-tight">{post.author_name}</span>
                            <span className="text-gray-500 text-sm">@{post.author_username}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-700" />
                            <span className="text-gray-500 text-sm">{timeAgo(post.created_at)}</span>
                            {isPinned && <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-md ml-1"><Pin size={10} /> Pinned</span>}
                        </div>
                        {isOwn && (
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button title="Pin to top" onClick={() => onPinToggle && onPinToggle(post.id)} className="p-2 hover:bg-brand-purple/10 text-gray-500 hover:text-brand-purple rounded-xl transition-all mr-1">
                                    <Pin size={16} />
                                </button>
                                <button 
                                    onClick={async () => { if (confirm('Erase this transmission?')) await deletePost(post.id); }}
                                    className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-xl transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {isHardware && (
                        <div className="mt-3 p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-brand-cyan font-black uppercase tracking-[0.2em] mb-1">Hardware Listing</p>
                                <p className="text-white font-medium text-sm w-3/4 truncate">{post.content?.split('\n')[0] || 'Unknown Item'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-white">${post.price?.toFixed(2) || '0.00'}</p>
                                <div className="flex items-center justify-end gap-1 text-[10px] text-yellow-500 mt-1">
                                    {Array.from({ length: Math.min(5, Math.ceil((post.likes_count||0)/2) || 1) }).map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isHardware && post.content && (
                        <p className="text-gray-300 text-[15px] leading-relaxed mt-2 whitespace-pre-wrap break-words">
                            {post.content}
                        </p>
                    )}

                    {mediaUrls.length > 0 && (
                        <div className={`grid gap-2 mt-4 rounded-2xl overflow-hidden border border-white/5 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {mediaUrls.slice(0, 4).map((u, i) => (
                                <img key={i} src={u} className="w-full aspect-video object-cover hover:scale-105 transition-transform duration-700" alt="" loading="lazy" />
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-8 mt-6">
                        <button className="flex items-center gap-2 text-gray-500 hover:text-brand-purple transition-colors text-sm font-bold group/btn">
                            <div className="p-2 rounded-xl group-hover/btn:bg-brand-purple/10 transition-all">
                                <MessageSquare size={18} />
                            </div>
                            <span>{post.comment_count ?? post.comments_count ?? 0}</span>
                        </button>
                        <button 
                            onClick={() => toggle(post.id)} 
                            className={`flex items-center gap-2 transition-colors text-sm font-bold group/btn ${liked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'}`}
                        >
                            <div className={`p-2 rounded-xl group-hover/btn:bg-pink-500/10 transition-all ${liked ? 'bg-pink-500/10' : ''}`}>
                                <Heart size={18} className={liked ? 'fill-pink-500' : ''} />
                            </div>
                            <span>{count}</span>
                        </button>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/community?post=${post.id}`); toast.success('Frequency Link Copied!'); }}
                            className="flex items-center gap-2 text-gray-500 hover:text-brand-cyan transition-colors text-sm font-bold group/btn"
                        >
                            <div className="p-2 rounded-xl group-hover/btn:bg-brand-cyan/10 transition-all">
                                <Share2 size={18} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

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

/**
 * Edit Profile Modal - Improved design
 */
function EditProfileModal({ profile, onClose, onSave }: { profile: any; onClose: () => void; onSave: () => void }) {
    const { session } = useAuth();
    const [form, setForm] = useState({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        avatar_url: profile.avatar_url || '',
    });
    const [saving, setSaving] = useState(false);

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#0B0B0F] border border-white/10 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-8 border-b border-white/5">
                    <div>
                        <h2 className="font-black text-2xl text-white uppercase tracking-tighter">Identity Config</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Operator Profile Modulation</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6">
                    {(['display_name', 'bio', 'avatar_url', 'location', 'website'] as const).map(field => (
                        <div key={field} className="relative group">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 block mb-2 ml-1">
                                {field.replace('_', ' ')}
                            </label>
                            {field === 'bio' ? (
                                <textarea 
                                    value={form[field]} 
                                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} 
                                    rows={4}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all resize-none shadow-inner" 
                                />
                            ) : (
                                <input 
                                    value={form[field]} 
                                    onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all shadow-inner" 
                                />
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-8 pt-0 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-5 rounded-2xl border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                    <button onClick={save} disabled={saving}
                        className="flex-1 py-5 rounded-2xl bg-brand-purple text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-purple/30 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <Loader size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                        {saving ? 'Syncing...' : 'Confirm Changes'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Public Profile Page ─────────────────────────────────────────

export default function PublicProfile() {
    const { username: rawUsername } = useParams<{ username: string }>();
    const username = rawUsername?.startsWith('@') ? rawUsername.substring(1) : rawUsername;
    const { profile, stats, viewer, mutuals, loading, error, reload: refreshProfile, following, followLoading, toggleFollow } = useProfile(username || '');
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('posts');
    const [showEdit, setShowEdit] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const navigate = useNavigate();

    const isOwner = !!(currentUser && profile && (currentUser.username === profile.username || viewer.is_owner));

    if (loading && !profile) return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-brand-purple/20 border-t-brand-purple animate-spin" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border border-brand-purple/10 blur-xl animate-pulse" />
                </div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Syncing User Identity...</p>
            </div>
        </div>
    );

    if (error || !profile) return (
        <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-32 h-32 bg-white/[0.02] rounded-full flex items-center justify-center mb-8 border border-white/5 shadow-2xl relative">
                <AtSign size={48} className="text-gray-800" />
                <div className="absolute inset-0 bg-red-500/5 blur-3xl rounded-full" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-3">Unknown Operator</h1>
            <p className="text-gray-500 mb-10 font-bold uppercase tracking-widest text-xs">This frequency is currently unassigned.</p>
            <Link to="/community" className="bg-brand-purple text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-purple/20 border border-white/10">
                Return to Network
            </Link>
        </div>
    );

    const tabs = [
        { id: 'posts', label: 'Transmissions' },
        { id: 'replies', label: 'Interactions' },
        { id: 'media', label: 'Visuals' },
        { id: 'hardware', label: 'Hardware' },
    ];

    return (
        <div className="min-h-screen bg-[#050508] text-white selection:bg-brand-purple/30">
            {/* ── Fixed Header ── */}
            <div className="sticky top-0 z-[60] bg-[#050508]/60 backdrop-blur-3xl border-b border-white/[0.03] transition-all">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl transition-all group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="font-black text-lg text-white leading-none uppercase tracking-tighter flex items-center gap-2">
                                {profile.display_name || profile.username}
                                {profile.is_verified === 1 && <CheckCircle2 size={16} className="text-brand-purple" />}
                            </h2>
                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Status: Active Operator</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isOwner ? (
                            <button onClick={() => setShowEdit(true)} 
                                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl">
                                <Edit3 size={14} />
                                Adjust Profile
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleFollow}
                                    disabled={followLoading}
                                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl ${
                                        following
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20'
                                            : 'bg-white text-black hover:scale-105 active:scale-95'
                                    }`}
                                >
                                    {followLoading ? <Loader size={14} className="animate-spin" /> : following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                                    {following ? 'Disconnect' : 'Connect'}
                                </button>
                                <button className="p-3.5 bg-white/[0.03] border border-brand-purple/30 rounded-2xl text-brand-purple hover:bg-brand-purple hover:text-white transition-all shadow-xl shadow-brand-purple/10" onClick={() => setShowChat(true)}>
                                    <MessageSquare size={16} />
                                </button>
                            </div>
                        )}
                        <button className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-12">
                    
                    {/* ── Profile Column ── */}
                    <div className="lg:col-span-4 space-y-10 lg:sticky lg:top-32 h-fit">
                        
                        {/* Profile Card */}
                        <div className="relative group mt-16 lg:mt-0">
                            {/* Ambient Glow */}
                            <div className="absolute -inset-4 bg-brand-purple/5 blur-[60px] rounded-[4rem] group-hover:bg-brand-purple/10 transition-all duration-1000 -z-10" />
                            
                            <div className="bg-[#0B0B0F]/80 backdrop-blur-2xl border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl relative">
                                
                                {/* Cover Banner Region */}
                                {profile.banner_url ? (
                                    <div className="absolute top-0 left-0 w-full h-48 bg-[#050508] z-0">
                                        <img src={profile.banner_url} className="w-full h-full object-cover opacity-60 mix-blend-screen" alt="Cover Header" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent" />
                                    </div>
                                ) : (
                                    <div className="absolute top-0 left-0 w-full h-48 bg-[#050508] z-0 overflow-hidden">
                                        <div className={`absolute -inset-1/2 blur-[80px] opacity-40 rounded-full ${
                                            profile.aura_tier === 'legendary' ? 'bg-orange-500/30' :
                                            profile.aura_tier === 'prime' ? 'bg-brand-purple/30' :
                                            'bg-brand-cyan/20'
                                        }`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-[#0B0B0F]/50 to-transparent" />
                                    </div>
                                )}

                                <div className="p-10 relative z-10 pt-24">
                                    {/* Profile Pic with Aura */}
                                    <div className="mb-8 relative inline-block">
                                        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[3rem] p-1.5 shadow-2xl transition-all duration-700 hover:scale-105 ${
                                            profile.aura_tier === 'legendary' ? 'bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600 shadow-orange-500/40 animate-[pulse_3s_infinite]' :
                                            profile.aura_tier === 'prime' ? 'bg-gradient-to-br from-brand-purple to-brand-cyan shadow-brand-purple/40' :
                                            'bg-white/10 border border-white/5'
                                        }`}>
                                            <img 
                                                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || profile.username)}&background=111&color=fff`}
                                                className="w-full h-full object-cover rounded-[2.8rem] border-4 border-[#0B0B0F]"
                                                alt={profile.display_name}
                                            />
                                        </div>
                                        {profile.is_verified === 1 && (
                                            <div className="absolute -bottom-2 -right-2 bg-brand-cyan p-2.5 rounded-2xl border-4 border-[#0B0B0F] shadow-2xl">
                                                <CheckCircle2 size={16} className="text-[#0B0B0F]" />
                                            </div>
                                        )}
                                        {profile.aura_tier === 'legendary' && (
                                            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-orange-500 to-amber-500 p-2.5 rounded-2xl border-4 border-[#0B0B0F] shadow-2xl animate-bounce">
                                                <Crown size={16} className="text-white" />
                                            </div>
                                        )}
                                    </div>

                                <div className="space-y-6">
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mb-2">
                                            {profile.display_name || profile.username}
                                        </h1>
                                        <p className="text-brand-purple font-black text-xs uppercase tracking-[0.2em]">@{profile.username}</p>
                                    </div>

                                    {profile.bio && (
                                        <p className="text-gray-400 text-sm leading-relaxed font-medium">
                                            {profile.bio}
                                        </p>
                                    )}

                                    {/* Location / Join Date */}
                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                        {profile.location && (
                                            <div className="flex items-center gap-3 text-gray-500 text-xs font-bold uppercase tracking-widest">
                                                <MapPin size={14} className="text-brand-purple" />
                                                {profile.location}
                                            </div>
                                        )}
                                        {profile.website && (
                                            <a href={profile.website} target="_blank" rel="noopener noreferrer" 
                                                className="flex items-center gap-3 text-brand-cyan text-xs font-bold uppercase tracking-widest hover:underline">
                                                <Globe size={14} />
                                                {profile.website.replace(/(^\w+:|^)\/\//, '')}
                                            </a>
                                        )}
                                        <div className="flex items-center gap-3 text-gray-500 text-xs font-bold uppercase tracking-widest">
                                            <Calendar size={14} />
                                            Joined {formatJoined(profile.joined_at)}
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 hover:bg-white/[0.05] transition-all">
                                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Followers</p>
                                            <p className="text-2xl font-black text-white tracking-tight">{fmt(stats.followers || 0)}</p>
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 hover:bg-white/[0.05] transition-all">
                                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Following</p>
                                            <p className="text-2xl font-black text-white tracking-tight">{fmt(stats.following || 0)}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Mutual Connections String */}
                                    {mutuals?.count > 0 && !isOwner && (
                                        <div className="mt-4 px-1 py-2">
                                            <p className="text-[10px] text-gray-500 font-bold tracking-wider">{mutuals.text}</p>
                                        </div>
                                    )}
                                </div>
                                </div>{/* close p-10 */}
                            </div>
                        </div>

                        {/* Social Links Sub-Bar */}
                        <div className="flex items-center gap-3 px-6">
                            {[
                                { icon: Twitter, href: profile.twitter_handle ? `https://twitter.com/${profile.twitter_handle}` : null },
                                { icon: Instagram, href: profile.instagram_handle ? `https://instagram.com/${profile.instagram_handle}` : null },
                                { icon: Music2, href: profile.soundcloud_handle ? `https://soundcloud.com/${profile.soundcloud_handle}` : null },
                                { icon: Mail, href: profile.email ? `mailto:${profile.email}` : null },
                            ].filter(s => s.href).map((social, i) => (
                                <a key={i} href={social.href!} target="_blank" className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-brand-purple hover:text-white transition-all shadow-xl group">
                                    <social.icon size={18} className="transition-transform group-hover:scale-110" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* ── Content Column ── */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Tab Navigation */}
                        <div className="bg-[#0B0B0F]/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 flex overflow-hidden shadow-xl">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                                        activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="active-profile-tab" className="absolute inset-0 bg-white/[0.05] rounded-3xl -z-10" />
                                    )}
                                    {activeTab === tab.id && (
                                        <motion.div layoutId="tab-dot" className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Feed Content */}
                        <div className="bg-[#0B0B0F]/40 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] overflow-hidden shadow-2xl">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ProfileFeed profile={profile} tab={activeTab} currentUserId={currentUser?.id} onSettingsRefresh={refreshProfile} />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Info */}
                        <div className="text-center py-10">
                            <p className="text-gray-700 text-[10px] font-black uppercase tracking-[0.4em]">End of Frequency Access</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Modal */}
            {showEdit && <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} onSave={refreshProfile} />}

            {/* Direct Message Sliding Modal */}
            {showChat && currentUser && (
                <DirectMessageModal 
                    targetUserId={profile.id} 
                    targetUserName={profile.display_name || profile.username} 
                    targetAvatar={profile.avatar_url}
                    onClose={() => setShowChat(false)} 
                />
            )}
        </div>
    );
}

/**
 * Profile Feed Component - Optimized for the new design
 */
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
        <div className="divide-y divide-white/5">
            {[1,2,3].map(i => (
                <div key={i} className="p-8 animate-pulse flex gap-5">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-4">
                        <div className="h-4 bg-white/10 rounded-lg w-1/3" />
                        <div className="space-y-2">
                            <div className="h-3 bg-white/5 rounded-lg w-full" />
                            <div className="h-3 bg-white/5 rounded-lg w-5/6" />
                        </div>
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
        <div className="py-40 text-center flex flex-col items-center gap-8">
            <div className="relative">
                <div className="w-24 h-24 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center relative overflow-hidden">
                    <zap size={32} className="text-gray-800" />
                    <div className="absolute inset-0 bg-brand-purple/5 blur-2xl" />
                </div>
            </div>
            <div className="space-y-2">
                <h3 className="font-black text-white text-lg uppercase tracking-tighter">No Activity Logged</h3>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">This channel is currently silent</p>
            </div>
        </div>
    );

    const pinAction = async (postId: string) => {
        try {
            const res = await fetch(`${API}/api/social/posts/${postId}/pin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
            });
            if (res.ok) onSettingsRefresh();
        } catch(e) {}
    };

    const sortedPosts = [...posts].sort((a, b) => {
        if (a.id === profile.pinned_post_id) return -1;
        if (b.id === profile.pinned_post_id) return 1;
        return 0;
    });

    return (
        <div className="divide-y divide-white/5">
            {sortedPosts.map(post => (
                <ProfilePostCard 
                    key={post.id} 
                    post={post} 
                    currentUserId={currentUserId} 
                    pinnedPostId={profile.pinned_post_id} 
                    onPinToggle={pinAction}
                />
            ))}
            <div ref={loaderRef} className="py-20 flex items-center justify-center">
                {loadingMore ? (
                    <div className="flex items-center gap-4 text-brand-purple">
                        <Loader size={16} className="animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Decoding More...</span>
                    </div>
                ) : !hasMore && posts.length > 0 ? (
                    <div className="flex items-center gap-4 text-gray-700">
                        <div className="w-8 h-px bg-white/5" />
                        <span className="text-[9px] font-black uppercase tracking-[0.5em]">Transmission End</span>
                        <div className="w-8 h-px bg-white/5" />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

/**
 * Direct Message Modal - Sliding Drawer
 */
function DirectMessageModal({ targetUserId, targetUserName, targetAvatar, onClose }: { targetUserId: string, targetUserName: string, targetAvatar: string, onClose: () => void }) {
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
        const tempId = Date.now().toString();
        const newMsg = { id: tempId, content: text, sender_id: user?.id, created_at: new Date().toISOString() };
        setMessages(m => [...m, newMsg]);
        setText('');
        try {
            await fetch(`${API}/api/social/messages/${targetUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'X-Actor-Id': user?.id || '' },
                body: JSON.stringify({ content: newMsg.content })
            });
        } catch(e) {
            toast.error('Failed to send message');
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                className="w-full max-w-md bg-[#0B0B0F] h-full flex flex-col border-l border-white/10 shadow-2xl">
                
                {/* Header */}
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

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full"><Loader size={24} className="animate-spin text-brand-purple" /></div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center h-full opacity-50">
                            <MessageSquare className="mb-4 text-gray-600" size={32} />
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">No prior transmissions.</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMine = msg.sender_id === user?.id;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] p-4 rounded-2xl ${
                                        isMine 
                                        ? 'bg-brand-purple text-white rounded-br-sm' 
                                        : 'bg-white/10 text-gray-200 rounded-bl-sm border border-white/5'
                                    }`}>
                                        <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                                        <span className={`text-[9px] mt-2 block font-bold tracking-widest uppercase ${isMine ? 'text-white/60' : 'text-gray-500'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                    <div className="flex gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-2 focus-within:border-brand-purple/50 transition-colors">
                        <input 
                            type="text" 
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            onKeyPress={e => e.key === 'Enter' && send()}
                            placeholder="Encode message..." 
                            className="flex-1 bg-transparent border-none text-white text-sm px-3 focus:outline-none placeholder-gray-600 font-medium"
                        />
                        <button onClick={send} disabled={!text.trim()} className="p-3 bg-brand-purple rounded-xl text-white disabled:opacity-50 hover:bg-brand-purple border border-white/10 shadow-lg shadow-brand-purple/20 transition-all">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
