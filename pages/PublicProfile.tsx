import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MapPin, Link as LinkIcon, Calendar, Twitter, Instagram, 
    Music2, CheckCircle2, ShieldCheck, MoreHorizontal, 
    MessageSquare, Heart, RefreshCw, Share2, Edit3, 
    ArrowLeft, Image as ImageIcon, X, Loader, Users, 
    AtSign, ExternalLink, Globe, Zap, Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile, useProfilePosts, useProfileEdit } from '../hooks/useProfile';
import { useComposer, useLike, useFollow } from '../hooks/useSocial';
import { toast } from 'sonner';
import { uploadFileToR2 } from '../utils/r2';

// ─── Constants ────────────────────────────────────────────────────────
const DISPLAY = "'Barlow Condensed', 'Impact', sans-serif";
const BODY    = "'Barlow', 'Helvetica Neue', sans-serif";

// ─── Helpers ──────────────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};

const formatJoined = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
};

const Avatar = ({ src, name, size = 20, className = "" }: { src?: string; name?: string; size?: number; className?: string }) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
    return (
        <img loading="lazy" src={src || fallback}
            onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
            className={`w-${size} h-${size} rounded-full object-cover border-4 border-[#0B0B0F] flex-shrink-0 ${className}`}
            alt={name}
        />
    );
};

// ─── Main Component ──────────────────────────────────────────────────
export default function PublicProfile() {
    const { username } = useParams<{ username: string }>();
    const { profile, stats, viewer, loading, error, refreshProfile } = useProfile(username || '');
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('posts');
    const [showEditModal, setShowEditModal] = useState(false);

    if (loading && !profile) return (
        <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
            <Loader className="animate-spin text-brand-purple" size={32} />
        </div>
    );

    if (error || !profile) return (
        <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <AtSign size={32} className="text-gray-600" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Signal Lost</h1>
            <p className="text-gray-500 mb-8">The profile you're looking for doesn't exist on this frequency.</p>
            <Link to="/community" className="bg-brand-purple text-white px-8 py-3 rounded-full font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-purple/20">
                Return to Hub
            </Link>
        </div>
    );

    const isOwner = currentUser?.id === profile.id || viewer.is_owner;

    return (
        <div className="min-h-screen bg-[#0B0B0F] text-white">
            {/* Top Navigation Bar (Mobile Friendly) */}
            <div className="sticky top-0 z-50 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center gap-6">
                <Link to="/community" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h2 className="font-black text-lg truncate flex items-center gap-1.5 uppercase tracking-tight">
                        {profile.display_name || profile.username}
                        {profile.is_verified === 1 && <CheckCircle2 size={16} className="text-brand-purple" />}
                        {profile.aura_tier === 'LEGEND' && <Crown size={16} className="text-brand-purple" />}
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest -mt-0.5">
                        {stats.posts || 0} Broadcasts
                    </p>
                </div>
            </div>

            {/* Profile Header (Banner & Identity) */}
            <div className="relative">
                {/* Banner */}
                <div className="h-40 md:h-64 bg-zinc-900 overflow-hidden relative">
                    {profile.banner_url ? (
                        <img src={profile.banner_url} className="w-full h-full object-cover" alt="banner" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-purple/20 via-[#0B0B0F] to-brand-cyan/20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60" />
                </div>

                {/* Identity Info */}
                <div className="px-5 md:px-8 -mt-16 md:-mt-20 relative z-10 h-auto">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-end justify-between">
                            <div className="relative group/avatar">
                                <Avatar src={profile.avatar_url} name={profile.display_name} size={32} className="md:w-40 md:h-40" />
                                <div className="absolute inset-0 rounded-full border-4 border-brand-purple opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none" />
                            </div>

                            <div className="pb-2 flex gap-2">
                                {isOwner ? (
                                    <button 
                                        onClick={() => setShowEditModal(true)}
                                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Edit Profile
                                    </button>
                                ) : (
                                    <FollowButton profileId={profile.id} initialStatus={viewer.is_following} onToggle={refreshProfile} />
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                {profile.display_name || profile.username}
                                {profile.is_verified === 1 && <CheckCircle2 size={24} className="text-brand-purple" />}
                            </h1>
                            <p className="text-gray-500 font-bold text-lg">@{profile.username}</p>
                        </div>

                        {profile.bio && (
                            <p className="text-gray-200 text-base leading-relaxed max-w-2xl whitespace-pre-wrap">
                                {profile.bio}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {profile.location && (
                                <span className="flex items-center gap-1.5 font-medium">
                                    <MapPin size={16} /> {profile.location}
                                </span>
                            )}
                            {profile.website && (
                                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-purple hover:underline font-bold">
                                    <LinkIcon size={16} /> {new URL(profile.website).hostname}
                                </a>
                            )}
                            <span className="flex items-center gap-1.5 font-medium">
                                <Calendar size={16} /> Joined {formatJoined(profile.joined_at)}
                            </span>
                        </div>

                        {/* Social Links Badge Section */}
                        {(profile.twitter_handle || profile.instagram_handle || profile.soundcloud_handle) && (
                            <div className="flex gap-3 pt-2">
                                {profile.twitter_handle && (
                                    <a href={`https://twitter.com/${profile.twitter_handle}`} target="_blank" className="p-2 bg-white/5 hover:bg-brand-purple/20 rounded-xl transition-all border border-white/10 group">
                                        <Twitter size={18} className="group-hover:text-brand-purple transition-colors" />
                                    </a>
                                )}
                                {profile.instagram_handle && (
                                    <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" className="p-2 bg-white/5 hover:bg-brand-purple/20 rounded-xl transition-all border border-white/10 group">
                                        <Instagram size={18} className="group-hover:text-brand-purple transition-colors" />
                                    </a>
                                )}
                                {profile.soundcloud_handle && (
                                    <a href={`https://soundcloud.com/${profile.soundcloud_handle}`} target="_blank" className="p-2 bg-white/5 hover:bg-brand-purple/20 rounded-xl transition-all border border-white/10 group">
                                        <Music2 size={18} className="group-hover:text-brand-purple transition-colors" />
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="flex gap-6 pt-2 pb-6">
                            <button className="hover:underline">
                                <span className="font-black text-white">{stats.following || 0}</span>
                                <span className="text-gray-500 font-bold ml-1 uppercase text-[10px] tracking-widest">Following</span>
                            </button>
                            <button className="hover:underline">
                                <span className="font-black text-white">{stats.followers || 0}</span>
                                <span className="text-gray-500 font-bold ml-1 uppercase text-[10px] tracking-widest">Followers</span>
                            </button>
                            <div className="flex-1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Tabs Bar */}
            <div className="sticky top-14 z-40 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 flex">
                {['posts', 'replies', 'media', 'likes'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] relative transition-all ${
                            activeTab === t ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {t}
                        {activeTab === t && (
                            <motion.div 
                                layoutId="profile-tab-active"
                                className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-brand-purple rounded-t-full"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Profile Feed Content */}
            <div className="max-w-2xl mx-auto md:border-x md:border-white/5 min-h-screen">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'posts' && profile.pinned_post_id && (
                            <PinnedPost postId={profile.pinned_post_id} />
                        )}
                        <ProfileFeed username={profile.username} tab={activeTab} />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Modals */}
            {showEditModal && <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} onSave={refreshProfile} />}
        </div>
    );
}

// ─── Sub-Components ───────────────────────────────────────────────────

function FollowButton({ profileId, initialStatus, onToggle }: { profileId: string, initialStatus: boolean, onToggle: () => void }) {
    const { following, toggle, loading } = useFollow(profileId);
    
    // Use the hook state if available, fallback to initialStatus from profile fetch
    const isFollowing = following !== undefined ? following : initialStatus;

    return (
        <button
            onClick={() => { toggle(); onToggle(); }}
            disabled={loading}
            className={`px-8 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
                isFollowing 
                ? 'bg-[#0B0B0F] text-white border border-white/20 hover:border-red-500/50 hover:text-red-500' 
                : 'bg-white text-black hover:bg-white/90 shadow-xl'
            }`}
        >
            {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
        </button>
    );
}

function PinnedPost({ postId }: { postId: string }) {
    const { post, loading } = usePost(postId);

    if (loading || !post) return null;

    return (
        <div className="border-b border-white/5">
            <div className="px-5 py-2 flex items-center gap-3 text-gray-500">
                <Zap size={14} className="text-brand-purple fill-brand-purple/20" />
                <span className="text-[10px] font-black uppercase tracking-widest">Pinned Signal</span>
            </div>
            <PostCardSmall post={post} />
        </div>
    );
}

function ProfileFeed({ username, tab }: { username: string, tab: string }) {
    // We map 'posts' tab to default profile posts, 'replies' to replies, etc.
    const { posts, loading, loadingMore, hasMore, loadMore } = useProfilePosts(username, tab === 'likes' ? 'likes' : (tab === 'posts' ? 'posts' : tab));
    const observer = useRef<IntersectionObserver | null>(null);
    const lastPostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (loading || !hasMore) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                loadMore();
            }
        });

        if (lastPostRef.current) {
            observer.current.observe(lastPostRef.current);
        }

        return () => observer.current?.disconnect();
    }, [loading, hasMore, loadMore]);

    if (loading && posts.length === 0) {
        return (
            <div className="divide-y divide-white/5">
                {[1, 2, 3].map(i => (
                    <div key={i} className="p-6 animate-pulse">
                        <div className="flex gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-white/5" />
                            <div className="flex-1 space-y-3">
                                <div className="h-4 bg-white/5 rounded w-1/3" />
                                <div className="h-4 bg-white/5 rounded w-full" />
                                <div className="h-4 bg-white/5 rounded w-5/6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-24 px-6 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Music2 size={24} className="text-gray-700" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Silence Detected</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">This frequency hasn't broadcasted any content in this category yet.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-white/5">
            {posts.map((post, index) => (
                <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null}>
                    <PostCardSmall post={post} />
                </div>
            ))}
            {loadingMore && (
                <div className="p-8 text-center">
                    <Loader className="animate-spin text-brand-purple mx-auto" size={24} />
                </div>
            )}
            {!hasMore && posts.length > 5 && (
                <div className="p-12 text-center">
                    <p className="text-gray-700 text-[10px] font-black uppercase tracking-[0.3em]">End of Transmission</p>
                </div>
            )}
        </div>
    );
}

// Minimalist PostCard for Profile View
function PostCardSmall({ post }: { post: any }) {
    const { liked, count: likesCount, toggle: toggleLike } = useLike(!!post.viewer_liked, post.like_count || 0);

    const mediaUrls = (() => {
        try {
            if (typeof post.media_urls === 'string') return JSON.parse(post.media_urls);
            return post.media_urls || [];
        } catch { return []; }
    })();

    return (
        <article className="px-5 py-4 hover:bg-white/[0.01] transition-colors cursor-pointer group">
            <div className="flex gap-3">
                <div className="flex-shrink-0">
                    <Avatar src={post.author_avatar} name={post.author_name} size={11} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-white truncate">{post.author_name}</span>
                        <span className="text-gray-500 text-sm">@{post.author_username || 'user'} • {timeAgo(post.created_at)}</span>
                    </div>
                    {post.content && (
                        <p className="text-gray-200 text-[15px] leading-relaxed mb-3 break-words">{post.content}</p>
                    )}
                    {(mediaUrls.length > 0) && (
                        <div className="rounded-2xl overflow-hidden border border-white/5 mb-3">
                            <img src={mediaUrls[0]} className="w-full h-full object-cover max-h-96" alt="media" />
                        </div>
                    )}
                    
                    <div className="flex items-center gap-8 text-gray-500">
                        <span className="flex items-center gap-1.5 text-xs font-bold hover:text-brand-purple transition-colors">
                            <MessageSquare size={16} /> {post.comment_count || 0}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-bold hover:text-green-500 transition-colors">
                            <RefreshCw size={16} /> {post.reshare_count || 0}
                        </span>
                        <button 
                            onClick={(e) => { e.preventDefault(); toggleLike(post.id); }}
                            className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
                        >
                            <Heart size={16} className={liked ? 'fill-red-500' : ''} /> {likesCount}
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
}

function EditProfileModal({ profile, onClose, onSave }: { profile: any, onClose: () => void, onSave: () => void }) {
    const { update, loading } = useProfileEdit();
    const [form, setForm] = useState({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        twitter_handle: profile.twitter_handle || '',
        instagram_handle: profile.instagram_handle || '',
        soundcloud_handle: profile.soundcloud_handle || ''
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState(profile.banner_url);

    const handleUpdate = async () => {
        try {
            let avatar_url = profile.avatar_url;
            let banner_url = profile.banner_url;

            if (avatarFile) {
                const upload = await uploadFileToR2(avatarFile, 'avatars');
                if (upload) avatar_url = upload.url;
            }
            if (bannerFile) {
                const upload = await uploadFileToR2(bannerFile, 'banners');
                if (upload) banner_url = upload.url;
            }

            await update({ ...form, avatar_url, banner_url });
            toast.success('Profile Transmitted!');
            onSave();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Transmission failed');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0B0B0F] border border-white/10 w-full max-w-xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X size={20} /></button>
                        <h2 className="text-lg font-black uppercase tracking-tight">Modify Frequency</h2>
                    </div>
                    <button 
                        onClick={handleUpdate}
                        disabled={loading}
                        className="bg-white text-black px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Sending...' : 'Save'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Media Uploads */}
                    <div className="relative">
                        <div className="h-32 bg-zinc-900 rounded-2xl overflow-hidden relative cursor-pointer group">
                            <img src={bannerPreview || ''} className="w-full h-full object-cover opacity-50" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ImageIcon size={32} />
                            </div>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setBannerFile(file);
                                    setBannerPreview(URL.createObjectURL(file));
                                }
                            }} />
                        </div>
                        <div className="absolute -bottom-10 left-6">
                            <div className="relative group cursor-pointer">
                                <Avatar src={avatarPreview} name={profile.display_name} size={24} className="border-4 border-[#0B0B0F]" />
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ImageIcon size={24} />
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setAvatarFile(file);
                                        setAvatarPreview(URL.createObjectURL(file));
                                    }
                                }} />
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 space-y-6">
                        <InputField label="Display Name" value={form.display_name} onChange={v => setForm({...form, display_name: v})} placeholder="DJ Name" />
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Bio / Frequency</label>
                            <textarea 
                                value={form.bio} 
                                onChange={e => setForm({...form, bio: e.target.value})} 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-brand-purple transition-all resize-none h-24"
                                placeholder="Describe your signal..."
                            />
                        </div>
                        <InputField label="Location" value={form.location} onChange={v => setForm({...form, location: v})} placeholder="Nairobi, KE" />
                        <InputField label="Website" value={form.website} onChange={v => setForm({...form, website: v})} placeholder="https://djflowerz.com" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Twitter Handle" value={form.twitter_handle} onChange={v => setForm({...form, twitter_handle: v})} placeholder="@username" />
                            <InputField label="Instagram Handle" value={form.instagram_handle} onChange={v => setForm({...form, instagram_handle: v})} placeholder="@username" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function InputField({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">{label}</label>
            <input 
                type="text" 
                value={value} 
                onChange={e => onChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-brand-purple transition-all placeholder:text-gray-700"
                placeholder={placeholder}
            />
        </div>
    );
}
