import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, MapPin, Calendar, Heart, MessageSquare,
  Repeat, Share2, MoreHorizontal, UserPlus, UserCheck, ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileData {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string;
  banner_url: string;
  aura_tier: string;
  aura_points: number;
  primary_role: string;
  is_verified: boolean;
  bio: string;
  location: string;
  created_at: string;
  followers_count?: number;
  following_count?: number;
}

interface Post {
  id: string;
  content: string;
  media_url?: string;
  created_at: string;
  hearts: number;
  echoes: number;
}

const parseUTC = (d: string) => {
  if (!d) return new Date();
  if (d.includes('Z') || d.includes('+')) return new Date(d);
  return new Date(d.replace(' ', 'T') + 'Z');
};

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - parseUTC(d).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const Avatar = ({ src, name, size = 20 }: { src?: string; name?: string; size?: number }) => {
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
  return (
    <img src={src || fb} onError={e => { (e.target as HTMLImageElement).src = fb; }}
      className={`w-${size} h-${size} rounded-full object-cover border-4 border-[#0B0B0F]`} alt={name} />
  );
};

export default function PublicProfile() {
  const { handle } = useParams();
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'posts' | 'likes'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile = user?.handle?.replace('@', '') === handle?.replace('@', '');

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const cleanHandle = handle?.replace(/^@/, '');
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/handle/${cleanHandle}`);
        const data = await resp.json();
        if (data && !data.available) {
          setProfile(data);
          setPosts(data.pulses || []);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [handle]);

  const toggleFollow = async () => {
    if (!session) return;
    setFollowLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/${profile?.id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'X-Actor-Id': user?.id || '' }
      });
      setIsFollowing(f => !f);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <span className="text-4xl">🔍</span>
        </div>
        <h1 className="text-2xl font-black text-white">Profile Not Found</h1>
        <p className="text-gray-400 max-w-sm">This account doesn't exist or hasn't set up their profile yet.</p>
        <Link to="/community" className="mt-4 px-6 py-3 bg-brand-purple text-white rounded-full font-bold text-sm hover:bg-brand-purple/90 transition-all">
          Back to Community
        </Link>
      </div>
    );
  }

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white font-sans pb-20">

      {/* Top nav bar like X */}
      <div className="sticky top-20 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-4">
        <Link to="/community" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="font-black text-white text-base leading-tight">{profile.full_name}</p>
          <p className="text-gray-500 text-xs">{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-48 md:h-64 w-full relative overflow-hidden bg-gradient-to-r from-brand-purple/30 to-brand-cyan/30">
        {profile.banner_url && (
          <img src={profile.banner_url} className="w-full h-full object-cover" alt="Banner" />
        )}
      </div>

      {/* Profile identity section — X-style */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative -mt-16 mb-4 flex items-end justify-between">
          {/* Avatar */}
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.full_name} size={24} />
            {profile.is_verified && (
              <div className="absolute bottom-1 right-1 bg-brand-cyan p-1.5 rounded-full border-2 border-[#0B0B0F]">
                <ShieldCheck className="w-3 h-3 text-black" />
              </div>
            )}
          </div>

          {/* Follow / Edit button */}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <Link to="/account"
                className="px-5 py-2 rounded-full border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-all">
                Edit Profile
              </Link>
            ) : session ? (
              <button onClick={toggleFollow} disabled={followLoading}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-black transition-all ${
                  isFollowing
                    ? 'border border-white/20 text-white hover:border-red-400/50 hover:text-red-400'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}>
                {isFollowing ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
              </button>
            ) : (
              <Link to="/login"
                className="px-5 py-2 rounded-full bg-white text-black text-sm font-black hover:bg-gray-200 transition-all">
                Follow
              </Link>
            )}
          </div>
        </div>

        {/* Name, handle, bio, stats */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">{profile.full_name}</h1>
              {profile.is_verified && <ShieldCheck size={18} className="text-brand-cyan" />}
            </div>
            <p className="text-gray-500 text-sm">@{profile.handle}</p>
          </div>

          {profile.bio && (
            <p className="text-white/80 text-[15px] leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm">
            {profile.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {profile.location}
              </span>
            )}
            {profile.primary_role && (
              <span className="flex items-center gap-1.5 text-brand-purple font-bold text-xs uppercase tracking-widest">
                {profile.primary_role}
              </span>
            )}
            {joinedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> Joined {joinedDate}
              </span>
            )}
          </div>

          {/* Followers / Following counts */}
          <div className="flex items-center gap-5 text-sm">
            <button className="hover:underline">
              <span className="font-black text-white">{profile.following_count ?? 0}</span>
              <span className="text-gray-500 ml-1">Following</span>
            </button>
            <button className="hover:underline">
              <span className="font-black text-white">{profile.followers_count ?? 0}</span>
              <span className="text-gray-500 ml-1">Followers</span>
            </button>
            <div className="ml-auto">
              <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest bg-brand-purple/10 px-2 py-1 rounded-full border border-brand-purple/20">
                {profile.aura_tier || 'Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mt-6">
          {(['posts', 'likes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-4 text-sm font-bold transition-all capitalize ${
                tab === t
                  ? 'border-b-2 border-brand-purple text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}>
              {t === 'posts' ? 'Posts' : 'Likes'}
            </button>
          ))}
        </div>

        {/* Posts feed — X-style */}
        <div className="divide-y divide-white/5">
          {posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-600 text-sm">No posts yet.</p>
            </div>
          ) : (
            posts.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="py-4 hover:bg-white/[0.02] transition-colors px-2 rounded-xl">
                <div className="flex gap-3">
                  <Avatar src={profile.avatar_url} name={profile.full_name} size={10} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-white text-sm">{profile.full_name}</span>
                      <span className="text-gray-500 text-sm">@{profile.handle}</span>
                      <span className="text-gray-600 text-sm">· {timeAgo(p.created_at)}</span>
                    </div>
                    <p className="text-white/80 text-[15px] leading-relaxed whitespace-pre-wrap mb-3">{p.content}</p>
                    {p.media_url && (
                      <img src={p.media_url} className="w-full rounded-2xl border border-white/10 max-h-80 object-cover mb-3" alt="post media" loading="lazy" />
                    )}
                    <div className="flex items-center gap-6 text-gray-500 text-sm -ml-2">
                      <button className="flex items-center gap-2 p-2 rounded-full hover:text-red-400 hover:bg-red-400/10 transition-all">
                        <Heart size={16} /> <span>{p.hearts}</span>
                      </button>
                      <button className="flex items-center gap-2 p-2 rounded-full hover:text-white hover:bg-white/10 transition-all">
                        <MessageSquare size={16} />
                      </button>
                      <button className="flex items-center gap-2 p-2 rounded-full hover:text-green-400 hover:bg-green-400/10 transition-all">
                        <Repeat size={16} /> <span>{p.echoes}</span>
                      </button>
                      <button className="ml-auto p-2 rounded-full hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all">
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
