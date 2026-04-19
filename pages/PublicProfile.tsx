import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MapPin, Link as LinkIcon, Calendar, Twitter, Instagram, 
    Music2, CheckCircle2, Heart, MessageSquare, Share2,
    ArrowLeft, Loader, Crown, Zap, UserPlus, UserCheck,
    Edit3, X, Save, Camera, RefreshCw, AtSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile, useProfilePosts } from '../hooks/useProfile';
import { useLike, useComposer } from '../hooks/useSocial';
import { toast } from 'sonner';
import { uploadFileToR2 } from '../utils/r2';

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

// ─── Mini PostCard for profile feed ──────────────────────────────────
function MiniPostCard({ post, currentUserId }: { post: any; currentUserId?: string }) {
    const { liked, count, toggle } = useLike(!!post.viewer_liked, post.like_count ?? post.likes_count ?? 0);
    const { deletePost } = useComposer();
    const isOwn = currentUserId === post.author_id;
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || 'U')}&background=7C3AED&color=fff`;
    let mediaUrls: string[] = [];
    try { mediaUrls = JSON.parse(post.media_urls || '[]'); } catch { if (post.image_url) mediaUrls = [post.image_url]; }
    if (!mediaUrls.length && post.image_url) mediaUrls = [post.image_url];

    return (
        <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-white/[0.04] px-5 py-4 hover:bg-white/[0.015] transition-colors group"
        >
            <div className="flex gap-3">
                <img src={post.author_avatar || fallback} onError={e => { (e.target as HTMLImageElement).src = fallback; }}
                    className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0" alt={post.author_name} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white text-sm">{post.author_name}</span>
                        <span className="text-gray-500 text-xs">@{post.author_username}</span>
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="text-gray-500 text-xs">{timeAgo(post.created_at)}</span>
                    </div>
                    {post.content && <p className="text-gray-200 text-sm leading-relaxed mt-1 whitespace-pre-wrap break-words">{post.content}</p>}
                    {mediaUrls.length > 0 && (
                        <div className={`grid gap-0.5 mt-2 rounded-2xl overflow-hidden border border-white/5 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {mediaUrls.slice(0, 4).map((u, i) => (
                                <img key={i} src={u} className="w-full aspect-video object-cover" alt="" loading="lazy" />
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-5 mt-3 text-gray-600">
                        <button onClick={() => toast.info('Open post to reply')} className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors text-xs group/btn">
                            <MessageSquare size={14} className="group-hover/btn:stroke-brand-cyan" />
                            <span>{post.comment_count ?? post.comments_count ?? 0}</span>
                        </button>
                        <button onClick={() => toggle(post.id)} className={`flex items-center gap-1.5 transition-colors text-xs group/btn ${liked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                            <Heart size={14} className={liked ? 'fill-pink-500' : ''} />
                            <span>{count}</span>
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/community?post=${post.id}`); toast.success('Link copied!'); }}
                            className="flex items-center gap-1.5 hover:text-brand-purple transition-colors text-xs">
                            <Share2 size={14} />
                        </button>
                        {isOwn && (
                            <button onClick={async () => { if (window.confirm('Delete this post?')) { await deletePost(post.id); toast.success('Deleted'); } }}
                                className="ml-auto text-gray-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────
function EditProfileModal({ profile, onClose, onSave }: { profile: any; onClose: () => void; onSave: () => void }) {
    const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
    const { session } = useAuth();
    const [form, setForm] = useState({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
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
            toast.success('Profile updated!');
            onSave();
            onClose();
        } catch {
            toast.error('Could not save changes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111118] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h2 className="font-black text-white text-lg uppercase tracking-tight">Edit Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    {(['display_name', 'bio', 'location', 'website'] as const).map(field => (
                        <div key={field}>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                                {field.replace('_', ' ')}
                            </label>
                            {field === 'bio' ? (
                                <textarea value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-purple/50 resize-none" />
                            ) : (
                                <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-purple/50" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-5 pt-0 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-full border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                    <button onClick={save} disabled={saving}
                        className="flex-1 py-3 rounded-full bg-brand-purple text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-purple/30 disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main Profile Page ────────────────────────────────────────────────
export default function PublicProfile() {
    const { handle } = useParams<{ handle: string }>();
    const username = handle?.startsWith('@') ? handle.substring(1) : handle;
    const { profile, stats, viewer, loading, error, reload: refreshProfile, following, followLoading, toggleFollow } = useProfile(username || '');
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('posts');
    const [showEdit, setShowEdit] = useState(false);
    const navigate = useNavigate();

    const isOwner = !!(currentUser && profile && (currentUser.username === profile.username || viewer.is_owner));

    // ── Loading State ──────────────────────────────────────────────
    if (loading && !profile) return (
        <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Tuning frequency...</p>
            </div>
        </div>
    );

    // ── Error / Not Found ──────────────────────────────────────────
    if (error || !profile) return (
        <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-white/[0.03] rounded-full flex items-center justify-center mb-6 border border-white/5">
                <AtSign size={36} className="text-gray-700" />
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Signal Lost</h1>
            <p className="text-gray-500 mb-8 font-medium">This profile doesn't exist on this frequency.</p>
            <Link to="/community" className="bg-brand-purple text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-purple/20">
                Return to Hub
            </Link>
        </div>
    );

    const tabs = [
        { id: 'posts', label: 'Posts' },
        { id: 'replies', label: 'Replies' },
        { id: 'media', label: 'Media' },
    ];

    return (
        <div className="min-h-screen bg-[#0B0B0F] text-white">
            {/* ── Sticky Nav Bar ── */}
            <div className="sticky top-0 z-50 bg-[#0B0B0F]/80 backdrop-blur-2xl border-b border-white/[0.04] h-14 flex items-center gap-4 px-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors flex-shrink-0">
                    <ArrowLeft size={20} />
                </button>
                {profile && (
                    <div className="min-w-0">
                        <p className="font-black text-white truncate leading-tight flex items-center gap-1.5">
                            {profile.display_name || profile.username}
                            {profile.is_verified === 1 && <CheckCircle2 size={14} className="text-brand-purple flex-shrink-0" />}
                            {profile.role === 'admin' && <Crown size={14} className="text-brand-purple flex-shrink-0" />}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{fmt(stats.posts || 0)} Posts</p>
                    </div>
                )}
            </div>

            {/* ── Banner + Avatar ── */}
            <div className="relative">
                {/* Banner */}
                <div className="h-44 md:h-64 relative overflow-hidden">
                    {profile.banner_url ? (
                        <img src={profile.banner_url} className="w-full h-full object-cover" alt="banner" />
                    ) : (
                        <div className="w-full h-full relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/30 via-[#0B0B0F] to-brand-cyan/20" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(124,58,237,0.4)_0%,transparent_60%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.2)_0%,transparent_60%)]" />
                            {/* Animated grid lines */}
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
                                backgroundSize: '40px 40px'
                            }} />
                        </div>
                    )}
                    {/* Gradient fade to page bg */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent" style={{ background: 'linear-gradient(to top, #0B0B0F 0%, transparent 50%)' }} />
                </div>

                {/* Avatar + Actions Row */}
                <div className="px-5 md:px-8 -mt-14 md:-mt-16 relative z-10">
                    <div className="flex items-end justify-between gap-4">
                        {/* Avatar */}
                        <div className="relative group/av">
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full ring-4 ring-[#0B0B0F] overflow-hidden flex-shrink-0 bg-[#1a1a24]">
                                <img
                                    src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || profile.username)}&background=7C3AED&color=fff`}
                                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.display_name || 'U')}&background=7C3AED&color=fff`; }}
                                    className="w-full h-full object-cover"
                                    alt={profile.display_name}
                                />
                            </div>
                            {/* Role badge */}
                            {profile.role === 'admin' && (
                                <div className="absolute -bottom-1 -right-1 bg-brand-purple p-2 rounded-xl border-2 border-[#0B0B0F] shadow-xl shadow-brand-purple/50">
                                    <Crown size={12} />
                                </div>
                            )}
                            {profile.role === 'dj' && (
                                <div className="absolute -bottom-1 -right-1 bg-brand-cyan/20 border border-brand-cyan/40 p-2 rounded-xl border-2 border-[#0B0B0F]">
                                    <Zap size={12} className="text-brand-cyan" />
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pb-2 flex items-center gap-2 flex-shrink-0">
                            {isOwner ? (
                                <button onClick={() => setShowEdit(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white font-black text-xs uppercase tracking-widest hover:bg-white/5 hover:border-white/40 transition-all">
                                    <Edit3 size={14} />
                                    Edit Profile
                                </button>
                            ) : (
                                <button
                                    onClick={toggleFollow}
                                    disabled={followLoading}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                                        following
                                            ? 'bg-transparent border border-white/20 text-white hover:border-red-500/50 hover:text-red-400'
                                            : 'bg-white text-black hover:bg-white/90 shadow-white/10'
                                    }`}
                                >
                                    {followLoading ? <Loader size={14} className="animate-spin" /> : following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                                    {following ? 'Following' : 'Follow'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Identity Info */}
                    <div className="mt-4 space-y-2">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2 leading-tight">
                                {profile.display_name || profile.username}
                                {profile.is_verified === 1 && <CheckCircle2 size={20} className="text-brand-purple" />}
                            </h1>
                            <p className="text-gray-500 font-bold">@{profile.username}</p>
                        </div>

                        {profile.bio && (
                            <p className="text-gray-200 leading-relaxed max-w-xl whitespace-pre-wrap text-sm">{profile.bio}</p>
                        )}

                        {/* Meta Info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-gray-500 text-sm">
                            {profile.location && (
                                <span className="flex items-center gap-1.5"><MapPin size={14} />{profile.location}</span>
                            )}
                            {profile.website && (
                                <a href={profile.website} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-brand-purple hover:underline font-medium">
                                    <LinkIcon size={14} />
                                    {(() => { try { return new URL(profile.website).hostname; } catch { return profile.website; } })()}
                                </a>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Calendar size={14} />Joined {formatJoined(profile.joined_at)}
                            </span>
                        </div>

                        {/* Social Links Icons */}
                        {(profile.twitter_handle || profile.instagram_handle || profile.soundcloud_handle) && (
                            <div className="flex gap-2 pt-1">
                                {profile.twitter_handle && (
                                    <a href={`https://twitter.com/${profile.twitter_handle}`} target="_blank"
                                        className="p-2 bg-white/5 hover:bg-brand-purple/20 rounded-xl border border-white/10 hover:border-brand-purple/40 transition-all group">
                                        <Twitter size={16} className="group-hover:text-brand-purple transition-colors" />
                                    </a>
                                )}
                                {profile.instagram_handle && (
                                    <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank"
                                        className="p-2 bg-white/5 hover:bg-brand-purple/20 rounded-xl border border-white/10 hover:border-brand-purple/40 transition-all group">
                                        <Instagram size={16} className="group-hover:text-brand-purple transition-colors" />
                                    </a>
                                )}
                                {profile.soundcloud_handle && (
                                    <a href={`https://soundcloud.com/${profile.soundcloud_handle}`} target="_blank"
                                        className="p-2 bg-white/5 hover:bg-brand-purple/20 rounded-xl border border-white/10 hover:border-brand-purple/40 transition-all group">
                                        <Music2 size={16} className="group-hover:text-brand-purple transition-colors" />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Follower / Following Stats */}
                        <div className="flex gap-6 pt-1 pb-4">
                            <button className="group hover:opacity-80 transition-opacity">
                                <span className="font-black text-white text-base">{fmt(stats.following || 0)}</span>
                                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest ml-1.5">Following</span>
                            </button>
                            <button className="group hover:opacity-80 transition-opacity">
                                <span className="font-black text-white text-base">{fmt(stats.followers || 0)}</span>
                                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest ml-1.5">Followers</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sticky Tab Bar ── */}
            <div className="sticky top-14 z-40 bg-[#0B0B0F]/90 backdrop-blur-2xl border-b border-white/[0.04]">
                <div className="flex max-w-2xl mx-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] relative transition-colors ${
                                activeTab === tab.id ? 'text-white' : 'text-gray-600 hover:text-gray-400'
                            }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="profile-tab-indicator"
                                    className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-brand-purple rounded-full"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Feed ── */}
            <div className="max-w-2xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <ProfileFeed username={profile.username} tab={activeTab} currentUserId={currentUser?.id} />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Edit Modal */}
            {showEdit && <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} onSave={refreshProfile} />}
        </div>
    );
}

// ─── Profile Feed ─────────────────────────────────────────────────────
function ProfileFeed({ username, tab, currentUserId }: { username: string; tab: string; currentUserId?: string }) {
    const { posts, loading, loadingMore, hasMore, loadMore, error } = useProfilePosts(username, tab);
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loaderRef.current || !hasMore) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { threshold: 0.1 });
        obs.observe(loaderRef.current);
        return () => obs.disconnect();
    }, [hasMore, loadMore]);

    if (loading) return (
        <div className="divide-y divide-white/[0.04]">
            {[1,2,3].map(i => (
                <div key={i} className="p-5 animate-pulse flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 bg-white/10 rounded w-1/3" />
                        <div className="h-3 bg-white/5 rounded w-3/4" />
                        <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );

    if (error) return (
        <div className="py-16 text-center text-gray-600">
            <p className="font-bold">Failed to load posts</p>
        </div>
    );

    if (posts.length === 0) return (
        <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
                <span className="text-2xl opacity-40">
                    {tab === 'media' ? '📷' : tab === 'replies' ? '💬' : '📻'}
                </span>
            </div>
            <div>
                <p className="font-black text-white text-sm uppercase tracking-wide">No {tab} yet</p>
                <p className="text-gray-600 text-xs mt-1">This frequency is silent for now</p>
            </div>
        </div>
    );

    return (
        <div>
            <div className="divide-y divide-white/[0.04]">
                {posts.map(post => (
                    <MiniPostCard key={post.id} post={post} currentUserId={currentUserId} />
                ))}
            </div>
            <div ref={loaderRef} className="py-6 flex items-center justify-center">
                {loadingMore && <Loader size={18} className="animate-spin text-brand-purple" />}
                {!hasMore && posts.length > 0 && (
                    <p className="text-gray-700 text-[10px] font-bold uppercase tracking-widest">End of transmission</p>
                )}
            </div>
        </div>
    );
}
