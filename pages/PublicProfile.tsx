import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    MapPin, Calendar, Users, ShoppingBag, Grid, 
    MessageSquare, Share2, ShieldCheck, UserPlus, 
    UserCheck, Loader, ChevronLeft, ExternalLink,
    CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

const parseUTC = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.endsWith('Z') || dateStr.includes('+')) return new Date(dateStr);
    return new Date(dateStr + 'Z');
};

const timeAgo = (date: string) => {
    const now = new Date();
    const past = parseUTC(date);
    const ms = now.getTime() - past.getTime();
    const sc = Math.floor(ms / 1000);
    const mn = Math.floor(sc / 60);
    const hr = Math.floor(mn / 60);
    const dy = Math.floor(hr / 24);

    if (sc < 60) return 'Just now';
    if (mn < 60) return `${mn}m`;
    if (hr < 24) return `${hr}h`;
    if (dy < 7) return `${dy}d`;
    return past.toLocaleDateString();
};

const profileSlug = (id: string, name: string, username?: string) => {
    if (username && username.trim()) return username.trim();
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') : 'user';
    return `${slug}-${id.substring(0, 8)}`;
};


interface ProfileData {
    profile: {
        id: string;
        name: string;
        username: string;
        bio: string | null;
        avatar_url: string | null;
        location: string | null;
        role: string;
        created_at: string;
    };
    stats: {
        followers: number;
        following: number;
        posts: number;
    };
    posts: any[];
}

const PublicProfile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const { user: currentUser } = useAuth();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_URL}/api/community/profile/${username}`);
                if (!res.ok) throw new Error('User not found');
                const d = await res.json();
                setData(d);

                // Check following status
                if (currentUser && d.profile.id !== currentUser.id) {
                    const fRes = await fetch(`${API_URL}/api/community/follows?followerId=${currentUser.id}&followingId=${d.profile.id}`);
                    const fData = await fRes.json();
                    setIsFollowing(fData.isFollowing);
                }
            } catch (err: any) {
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (username) fetchProfile();
    }, [username, currentUser]);

    const handleFollow = async () => {
        if (!currentUser) return toast.error('Log in to follow users');
        if (!data) return;
        setFollowLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/community/follows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    follower_id: currentUser.id,
                    following_id: data.profile.id,
                    following_name: data.profile.name,
                    following_avatar: data.profile.avatar_url
                })
            });
            const d = await res.json();
            setIsFollowing(d.followed);
            toast.success(d.followed ? `Following ${data.profile.name}` : `Unfollowed ${data.profile.name}`);
            
            // Update local stats
            setData(prev => prev ? {
                ...prev,
                stats: {
                    ...prev.stats,
                    followers: prev.stats.followers + (d.followed ? 1 : -1)
                }
            } : null);
        } catch {
            toast.error('Failed to update follow');
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader className="animate-spin text-brand-purple" size={40} />
                <p className="text-gray-500 animate-pulse">Loading artist profile...</p>
            </div>
        );
    }

    if (!data) return (
        <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <Link to="/community" className="text-brand-purple hover:underline flex items-center justify-center gap-2">
                <ChevronLeft size={16} /> Back to Community
            </Link>
        </div>
    );

    const { profile, stats, posts } = data;
    const isOwnProfile = currentUser?.id === profile.id;

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
            {/* Navigation / Header */}
            <div className="mb-6">
                <Link to="/community" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium w-fit mb-4">
                    <ChevronLeft size={16} /> Community
                </Link>
                
                {/* Profile Cover/Header */}
                <div className="relative rounded-3xl overflow-hidden glass-card border border-white/10 h-48 md:h-64 bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                </div>

                {/* Profile Info Overlay */}
                <div className="relative -mt-16 md:-mt-20 px-6 pb-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                            {/* Avatar */}
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0B0B0F] overflow-hidden shadow-2xl z-10 bg-[#1A1A1A]">
                                <img 
                                    src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7C3AED&color=fff&size=200`} 
                                    alt={profile.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                                    {profile.name}
                                    {profile.role === 'admin' && <CheckCircle className="text-brand-cyan fill-brand-cyan/20" size={20} />}
                                </h1>
                                <p className="text-brand-purple font-mono text-sm">@{profile.username || profileSlug(profile.id, profile.name)}</p>
                            </div>

                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {isOwnProfile ? (
                                <Link to="/account" className="bg-white/5 border border-white/10 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-white/10 transition shadow-lg">
                                    Edit Profile
                                </Link>
                            ) : (
                                <>
                                    <button 
                                        onClick={handleFollow}
                                        disabled={followLoading}
                                        className={`px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg transition flex items-center gap-2 ${
                                            isFollowing 
                                                ? 'bg-white/5 text-gray-400 hover:text-red-400 border border-white/10' 
                                                : 'bg-brand-purple text-white hover:bg-brand-purple/80'
                                        }`}
                                    >
                                        {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                    <button className="p-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition">
                                        <MessageSquare size={18} />
                                    </button>
                                </>
                            )}
                            <button className="p-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition">
                                <Share2 size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="mt-8 flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            {profile.bio && (
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap max-w-2xl">
                                    {profile.bio}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-4 text-gray-500 text-xs md:text-sm font-medium">
                                {profile.location && (
                                    <div className="flex items-center gap-1.5"><MapPin size={14} /> {profile.location}</div>
                                )}
                                <div className="flex items-center gap-1.5"><Calendar size={14} /> Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
                                <div className="flex items-center gap-1.5"><ExternalLink size={14} /> djflowerz.co.ke/community/@{profile.username || `user-${profile.id.substring(0, 8)}`}</div>
                            </div>
                        </div>

                        {/* Quick Stats Card */}
                        <div className="grid grid-cols-3 md:flex md:flex-col gap-4 bg-white/5 border border-white/5 rounded-2xl p-4 md:w-48 shadow-inner">
                            <div className="text-center md:text-left">
                                <span className="block text-xl md:text-2xl font-black text-white">{stats.posts}</span>
                                <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">Posts</span>
                            </div>
                            <div className="text-center md:text-left">
                                <span className="block text-xl md:text-2xl font-black text-white">{stats.followers}</span>
                                <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">Followers</span>
                            </div>
                            <div className="text-center md:text-left">
                                <span className="block text-xl md:text-2xl font-black text-white">{stats.following}</span>
                                <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider">Following</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Content Tabs */}
            <div className="flex gap-8 border-b border-white/5 mb-8">
                <button className="pb-4 border-b-2 border-brand-purple text-white font-bold text-sm px-2 flex items-center gap-2">
                    <Grid size={16} /> Feed
                </button>
                <button className="pb-4 text-gray-500 font-bold text-sm px-2 flex items-center gap-2 hover:text-gray-300 transition">
                    <ShoppingBag size={16} /> Store
                </button>
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
                {posts.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-3xl border border-dashed border-white/10">
                        <MessageSquare size={40} className="mx-auto mb-4 text-gray-700" />
                        <p className="text-gray-500 font-medium">No posts shared yet.</p>
                    </div>
                ) : (
                    posts.map(p => (
                        <div key={p.id} className="glass-card rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-brand-purple/20">
                             {/* Simplified Post Header */}
                            <div className="p-4 flex items-center gap-3">
                                <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=7C3AED&color=fff`} className="w-8 h-8 rounded-full bg-white/10" alt="" />
                                <div>
                                    <div className="text-sm font-bold text-white">{profile.name}</div>
                                    <div className="text-[10px] text-gray-500">{timeAgo(p.created_at)}</div>
                                </div>
                                {p.is_marketplace === 1 && (
                                    <span className="ml-auto bg-brand-cyan/10 text-brand-cyan text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase flex items-center gap-1">
                                        <ShieldCheck size={9} /> Marketplace
                                    </span>
                                )}
                            </div>
                            
                            {/* Post Content */}
                            {p.content && <p className="px-5 pb-4 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{p.content}</p>}
                            
                            {/* Reshared Content Card */}
                            {p.parent_id && (
                                <div className="mx-5 mb-4 border border-white/5 bg-black/40 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-xs text-brand-purple">{p.parent_author_name}</span>
                                        <span className="text-[10px] text-gray-500">• {timeAgo(p.parent_created_at || p.created_at)}</span>
                                    </div>
                                    <p className="text-gray-300 text-xs line-clamp-3">{p.parent_content}</p>
                                </div>
                            )}

                            {p.image_url && !p.parent_id && <img src={p.image_url} className="w-full max-h-[500px] object-cover" alt="" />}

                            {/* Engagement Bar */}
                            <div className="px-4 py-3 border-t border-white/5 flex gap-6 text-gray-500">
                                <div className="flex items-center gap-1.5 text-xs">
                                    <Users className={p.is_liked ? "text-brand-purple" : ""} size={14} /> {p.likes_count || 0}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <MessageSquare size={14} /> {p.comments_count || 0}
                                </div>
                                <button className="flex items-center gap-1.5 text-xs hover:text-green-400 transition-colors">
                                    <Users size={14} /> {p.reshare_count || 0}
                                </button>
                            </div>
                        </div>
                    ))

                )}
            </div>
        </div>
    );
};

export default PublicProfile;
