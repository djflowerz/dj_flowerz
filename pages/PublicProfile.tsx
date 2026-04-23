import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, MapPin, Calendar, Heart, MessageSquare,
  Repeat, Share2, MoreHorizontal, UserPlus, UserCheck, ArrowLeft,
  Instagram, Facebook, Mail, ExternalLink, Camera, X, Globe,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { TrustBadge } from '../components/community/TrustBadge';
import { SellerScorecard } from '../components/community/SellerScorecard';
import { VerificationJourney } from '../components/community/VerificationJourney';

interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  website?: string;
}

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
  social_links?: string | SocialLinks; // JSON string from DB
  payout_account?: string;
  created_at: string;
  followers_count?: number;
  following_count?: number;
}

interface Post {
  id: string;
  content: string;
  media_urls?: string;
  created_at: string;
  hearts: number;
  echoes: number;
  comments_count: number;
}

const parseJSON = (str: string | undefined | null | object, fallback: any = {}) => {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

const parseUTC = (d: any) => {
  if (!d || typeof d !== 'string' || d === 'undefined' || d === 'null') return new Date();
  try {
     return new Date(d);
  } catch {
     return new Date();
  }
};

const formatDate = (d: any) => {
    if (!d || d === 'undefined' || d === 'null') return 'Recently';
    try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return 'Recently';
        return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
        return 'Recently';
    }
};

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - parseUTC(d).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const Avatar = ({ src, name, size = 20, className = "" }: { src?: string; name?: string; size?: number; className?: string }) => {
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
  return (
    <img src={src || fb} onError={e => { (e.target as HTMLImageElement).src = fb; }}
      className={`rounded-full object-cover border-4 border-[#0B0B0F] shadow-2xl ${className}`} style={{ width: size === 24 ? '128px' : '96px', height: size === 24 ? '128px' : '96px' }} alt={name} />
  );
};

export default function PublicProfile() {
  const { handle } = useParams();
  const { user, session, updateProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'posts' | 'media' | 'likes' | 'marketplace'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  // Verification State
  const [requestingVerif, setRequestingVerif] = useState(false);
  const [verifMethod, setVerifMethod] = useState<'email' | 'whatsapp'>('email');
  const [verifContact, setVerifContact] = useState('');
  const [verifOtpInput, setVerifOtpInput] = useState('');
  const [showVerifOtp, setShowVerifOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const isOwnProfile = user?.handle?.replace('@', '') === handle?.replace('@', '');

  const fetchData = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const cleanHandle = handle?.replace(/^@/, '');
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/handle/${cleanHandle}`);
      const data = await resp.json();
      if (data && !data.available) {
        setProfile(data);
        setPosts(data.pulses || []);
        setIsFollowing(data.isFollowing);
        setEditData({
            full_name: data.full_name,
            bio: data.bio || '',
            location: data.location || '',
            avatar_url: data.avatar_url,
            banner_url: data.banner_url,
            social_links: parseJSON(data.social_links)
        });
      } else {
        setNotFound(true);
      }
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [handle]);

  const toggleFollow = async () => {
    if (!session) {
        toast.error("Sign in to follow operators");
        return;
    }
    setFollowLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/follow`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`, 
            'X-Actor-Id': user?.id || '' 
        },
        body: JSON.stringify({ target_id: profile?.id })
      });
      const data = await resp.json();
      if (resp.ok) {
          setIsFollowing(data.followed);
          toast.success(data.followed ? `Following ${profile?.full_name}` : `Unfollowed ${profile?.full_name}`);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMediaUpload = async (type: 'avatar' | 'banner', file: File) => {
    setUploading(type);
    const formData = new FormData();
    const fileName = `${Date.now()}_${file.name}`;
    
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-file-name': fileName,
          'x-folder': 'profiles'
        },
        body: await file.arrayBuffer()
      });
      const data = await resp.json();
      if (data.url) {
        setEditData(prev => ({ ...prev, [type === 'avatar' ? 'avatar_url' : 'banner_url']: data.url }));
        toast.success(`${type} uploaded`);
      }
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleSaveProfile = async () => {
    toast.promise(async () => {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/user/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'X-Actor-Id': user?.id || ''
            },
            body: JSON.stringify({
                display_name: editData.full_name,
                bio: editData.bio,
                location: editData.location,
                avatar_url: editData.avatar_url,
                banner_url: editData.banner_url,
                social_links: editData.social_links
            })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error);
        
        // Update local state and global auth context
        setProfile({ ...profile!, ...data.profile });
        setIsEditModalOpen(false);
        if (updateProfile) updateProfile(data.profile);
        return data;
    }, {
        loading: 'Updating profile...',
        success: 'Profile updated successfully!',
        error: (err) => `Failed: ${err.message}`
    });
  };

  const handleRequestVerification = async () => {
    if (!verifContact.trim()) return toast.error('Please enter a valid email or WhatsApp number.');
    setRequestingVerif(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/profiles/request-verification`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': profile?.id || ''
        },
        body: JSON.stringify({ method: verifMethod, contact: verifContact })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      
      // Since backend auto-approves for testing, we can show the mock OTP
      toast.success(`Verification sent! (Mock OTP: ${data.simulated_otp})`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Request failed. Please try again.');
    } finally {
      setRequestingVerif(false);
    }
  };

  const handleInteract = async (pulseId: string, type: 'heart' | 'echo') => {
    if (!session) {
      toast.error("Sign in to interact with pulses");
      return;
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${pulseId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({ type })
      });
      
      if (resp.ok) {
        const data = await resp.json();
        setPosts(prev => prev.map((p: any) => {
          if (p.id === pulseId) {
            const isAdding = data.reacted;
            return {
              ...p,
              [type === 'heart' ? 'hearts' : 'echoes']: p[type === 'heart' ? 'hearts' : 'echoes'] + (isAdding ? 1 : -1),
              [type === 'heart' ? 'has_hearted' : 'has_echoed']: isAdding ? 'yes' : null
            };
          }
          return p;
        }));
      }
    } catch (e) {}
  };

  const handleSubmitOtp = async () => {
    if (verifOtpInput.length !== 6) {
      toast.error('Please enter the full 6-digit code.');
      return;
    }
    setVerifyingOtp(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/profiles/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': profile?.id || ''
        },
        body: JSON.stringify({ otp_code: verifOtpInput }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      toast.success('🎉 Email verified! Your badge is now active.');
      setShowVerifOtp(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Invalid or expired code.');
    } finally {
      setVerifyingOtp(false);
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
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4 text-4xl">🔍</div>
        <h1 className="text-2xl font-black text-white">Profile Not Found</h1>
        <p className="text-gray-400 max-w-sm">This account doesn't exist or hasn't set up their profile yet.</p>
        <Link to="/community" className="mt-4 px-6 py-3 bg-brand-purple text-white rounded-full font-bold text-sm hover:bg-brand-purple/90 transition-all">
          Back to Community
        </Link>
      </div>
    );
  }

  const socialLinks = parseJSON(profile.social_links);
  const hasSocials = Object.values(socialLinks).some(v => v);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white font-sans pb-20 overflow-x-hidden">
      
      {/* Top nav bar */}
      <div className="sticky top-20 z-30 bg-[#0B0B0F]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-6">
        <Link to="/community" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-1">
            <p className="font-black text-white text-base leading-tight truncate max-w-[200px]">{profile.full_name}</p>
            {profile.is_verified && <TrustBadge type="verified" size="xs" showLabel={false} />}
            {profile.aura_tier === 'CAUTION' && <TrustBadge type="caution" size="xs" showLabel={false} />}
          </div>
          <p className="text-gray-500 text-xs">{posts.length} posts</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-48 md:h-72 w-full relative group overflow-hidden bg-gradient-to-r from-brand-purple/20 via-[#0B0B0F] to-brand-cyan/20">
        {(profile.banner_url || editData.banner_url) && (
          <img src={profile.banner_url || editData.banner_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Banner" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0B0F]/60" />
      </div>

      {/* Profile Section */}
      <div className="max-w-2xl mx-auto px-4 relative">
        <div className="relative -mt-12 md:-mt-16 mb-4 flex items-end justify-between">
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.full_name} size={24} />
          </div>

          <div className="flex gap-2 mb-2">
            {hasSocials && (
              <div className="flex gap-2 mr-2 border-r border-white/10 pr-4">
                 {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" className="p-2 bg-white/5 rounded-full hover:text-brand-purple"><Instagram size={18} /></a>}
                 {socialLinks.tiktok && <a href={socialLinks.tiktok} target="_blank" className="p-2 bg-white/5 rounded-full hover:text-brand-cyan"><Globe size={18} /></a>}
                 {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" className="p-2 bg-white/5 rounded-full hover:text-blue-500"><Facebook size={18} /></a>}
              </div>
            )}
            
            {isOwnProfile ? (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-2 rounded-full border border-white/20 text-white text-sm font-black hover:bg-white/10 transition-all shadow-xl"
              >
                Edit Profile
              </button>
            ) : isAuthenticated && (
              <button 
                onClick={toggleFollow} 
                disabled={followLoading}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-black transition-all shadow-xl ${
                  isFollowing
                    ? 'border border-white/20 text-white hover:border-red-400/50 hover:text-red-400'
                    : 'bg-white text-black hover:scale-105 active:scale-95'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Identity/Trust Header */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white">{profile.full_name}</h1>
              {profile.is_verified && <TrustBadge type="verified" size="sm" />}
              {profile.aura_tier === 'CAUTION' && <TrustBadge type="caution" size="sm" />}
              {profile.aura_tier === 'SUSPENDED' && <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-md">Suspended</div>}
            </div>
            <p className="text-gray-500 font-medium">@{profile.handle}</p>
          </div>

          {/* Verification Journey for Owners */}
          {isOwnProfile && (
            <div className="py-2">
              <VerificationJourney 
                profile={profile} 
                session={session} 
                onRequestVerification={fetchData} 
                onEditProfile={() => setIsEditModalOpen(true)}
              />
            </div>
          )}

          {profile.bio && (
            <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
          )}

          {/* Trust Scorecard */}
          {!isOwnProfile && (
            <div className="py-2">
              <SellerScorecard userId={profile.id} handle={profile.handle} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-gray-500 text-sm">
            {profile.location && (
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-cyan" /> {profile.location}</span>
            )}
            <span className="flex items-center gap-1.5 text-brand-purple font-black text-xs uppercase tracking-widest bg-brand-purple/10 px-2 py-0.5 rounded-md border border-brand-purple/20">
                {profile.primary_role || 'Operator'}
            </span>
            <span className="flex items-center gap-1.5"><Calendar size={14} /> Joined {formatDate(profile.created_at)}</span>
          </div>

          <div className="flex items-center gap-6 text-sm py-2">
            <button className="hover:underline flex gap-1 items-center">
              <span className="font-black text-white">{profile.following_count || 0}</span>
              <span className="text-gray-500">Following</span>
            </button>
            <button className="hover:underline flex gap-1 items-center">
              <span className="font-black text-white">{profile.followers_count || 0}</span>
              <span className="text-gray-500">Followers</span>
            </button>
            <div className="ml-auto flex items-center gap-2">
               <div className="text-[10px] uppercase font-black text-brand-purple tracking-widest">{profile.aura_tier}</div>
               <div className="w-1 h-8 rounded-full bg-brand-purple/20" />
               <div className="text-lg font-black text-brand-purple">{profile.aura_points}</div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-white/5 mt-6 mb-2">
          {['posts', 'media', 'likes', 'marketplace'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 py-4 text-sm font-black transition-all capitalize relative ${
                tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}>
              {t}
              {tab === t && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-purple mx-8 rounded-t-full shadow-[0_-2px_10px_rgba(124,58,237,0.5)]" />}
            </button>
          ))}
        </div>

        {/* Post Feed */}
        <div className="divide-y divide-white/5">
          {(!Array.isArray(posts) || posts.filter(p => {
              if (tab === 'media') return p.media_urls && JSON.parse(p.media_urls).length > 0;
              if (tab === 'marketplace') return p.is_marketplace;
              return true;
          }).length === 0) ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="p-6 bg-white/5 rounded-full"><MessageSquare size={32} className="text-gray-700" /></div>
              <p className="text-gray-500 font-bold">No {tab} found.</p>
            </div>
          ) : (
            posts.filter(p => {
                if (tab === 'media') return p.media_urls && JSON.parse(p.media_urls).length > 0;
                if (tab === 'marketplace') return p.is_marketplace;
                return true;
            }).map((p) => (
              <div key={p.id} className="py-6 px-4 hover:bg-white/[0.01] transition-all group">
                 <div className="flex gap-4">
                   <Avatar src={profile.avatar_url} name={profile.full_name} size={10} className="group-hover:ring-2 ring-brand-purple/20" />
                   <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-brand-purple transition-colors">{profile.full_name}</span>
                          <span className="text-gray-500 text-xs text-sm">@{profile.handle} · {timeAgo(p.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-gray-200 text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">{p.content}</p>
                      
                      {p.media_urls && (
                        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-white/5">
                           {parseJSON(p.media_urls).slice(0, 4).map((url: string, i: number) => (
                             <img key={i} src={url} className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500" />
                           ))}
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-gray-500 mt-2">
                         <button className="flex items-center gap-2 text-xs hover:text-brand-purple transition-colors p-2 rounded-full hover:bg-brand-purple/10">
                            <MessageSquare size={16} /> 
                            <span className="font-bold">{p.comments_count || 0}</span>
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleInteract(p.id, 'echo'); }}
                            className={`flex items-center gap-2 text-xs transition-colors p-2 rounded-full ${p.has_echoed ? 'text-green-500 bg-green-500/10' : 'hover:text-green-500 hover:bg-green-500/10'}`}
                         >
                            <Repeat size={16} /> 
                            <span className="font-bold">{p.echoes || 0}</span>
                         </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleInteract(p.id, 'heart'); }}
                            className={`flex items-center gap-2 text-xs transition-colors p-2 rounded-full ${p.has_hearted ? 'text-red-500 bg-red-500/10' : 'hover:text-red-500 hover:bg-red-500/10'}`}
                         >
                            <Heart size={16} className={p.has_hearted ? "fill-current" : ""} /> 
                            <span className="font-bold">{p.hearts || 0}</span>
                         </button>
                      </div>
                   </div>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-[#0B0B0F] border border-white/10 rounded-[2.5rem] w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0B0B0F] z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={20} /></button>
                    <h2 className="text-xl font-black">Refine Identity</h2>
                </div>
                <button onClick={handleSaveProfile} className="px-6 py-2 bg-brand-purple text-white rounded-full font-black text-sm hover:scale-105 transition-all">Update</button>
              </div>

              <div className="flex-1 overflow-y-auto p-0 scrollbar-hide py-4">
                {/* Banner Edit */}
                <div className="relative h-44 bg-white/5 group mb-16">
                   {editData.banner_url && <img src={editData.banner_url} className={`w-full h-full object-cover ${uploading === 'banner' ? 'opacity-30' : ''}`} />}
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                        onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.onchange = (e:any) => handleMediaUpload('banner', e.target.files[0]); input.click(); }}
                        className="p-4 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all"
                    >
                        <Camera size={24} />
                    </button>
                   </div>
                   
                   {/* Avatar Edit Overlay */}
                   <div className="absolute -bottom-12 left-6">
                      <div className="relative group/avatar">
                        <Avatar src={editData.avatar_url} name={editData.full_name} size={24} className={`${uploading === 'avatar' ? 'opacity-30' : ''} ring-4 ring-[#0B0B0F] shadow-2xl`} />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                                onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.onchange = (e:any) => handleMediaUpload('avatar', e.target.files[0]); input.click(); }}
                                className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all"
                            >
                                <Camera size={20} />
                            </button>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="px-6 space-y-6 pt-4 pb-12">
                   <div>
                     <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">Display Name</label>
                     <input placeholder="Global ID" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 focus:border-brand-purple outline-none transition-all" />
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">Biological Description</label>
                     <textarea placeholder="Tell your story..." value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 min-h-[100px] focus:border-brand-purple outline-none transition-all resize-none" />
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">Geographical Sector</label>
                     <input placeholder="e.g. Sector-7, Nairobi" value={editData.location} onChange={e => setEditData({...editData, location: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 focus:border-brand-purple outline-none transition-all" />
                   </div>
                   
                   <div className="pt-6 border-t border-white/5">
                      <h3 className="font-black text-gray-400 text-xs uppercase tracking-[0.2em] mb-6">Social Integration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { name: 'Instagram', icon: <Instagram size={16} /> },
                            { name: 'TikTok', icon: <Globe size={16} /> },
                            { name: 'Facebook', icon: <Facebook size={16} /> },
                            { name: 'Twitter', icon: <ExternalLink size={16} /> },
                            { name: 'Website', icon: <Globe size={16} /> }
                        ].map(s => (
                           <div key={s.name}>
                              <label className="text-[10px] uppercase font-black text-gray-600 mb-2 block">{s.name}</label>
                              <div className="relative">
                                 <input 
                                   value={editData.social_links?.[s.name.toLowerCase()] || ''} 
                                   onChange={e => setEditData({...editData, social_links: {...editData.social_links, [s.name.toLowerCase()]: e.target.value}})}
                                   placeholder={`@username`}
                                   className="w-full bg-white/5 border border-white/5 rounded-xl p-3 pl-10 text-sm focus:border-brand-cyan outline-none transition-all" 
                                 />
                                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                                    {s.icon}
                                 </div>
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>

                   <div className="pt-6 border-t border-white/5">
                      <h3 className="font-black text-gray-400 text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                         <ShieldCheck size={16} className="text-emerald-400" /> Identity Verification
                      </h3>
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                         {profile?.is_verified || profile?.verification_status === 'verified' ? (
                            <div className="flex flex-col items-center justify-center text-center py-4">
                               <TrustBadge type="verified" size="lg" />
                               <h4 className="mt-3 font-black text-emerald-400">Fully Verified</h4>
                               <p className="text-xs text-gray-400 mt-1">Your account identity has been confirmed.</p>
                            </div>
                         ) : profile?.verification_status === 'requested' ? (
                            <div className="flex flex-col items-center justify-center text-center py-4">
                               <div className="w-12 h-12 rounded-full bg-brand-cyan/20 flex items-center justify-center mb-3">
                                  <ShieldCheck size={24} className="text-brand-cyan animate-pulse" />
                               </div>
                               <h4 className="font-black text-brand-cyan">Pending Review</h4>
                               <p className="text-xs text-gray-400 mt-1">Our exact team is reviewing your details.</p>
                            </div>
                         ) : profile?.verification_status === 'approved' ? (
                            <div className="space-y-4">
                               <div className="flex items-center gap-3 text-brand-cyan mb-2">
                                  <Mail size={20} />
                                  <p className="text-sm font-black">Verification Approved! Check your email.</p>
                               </div>
                               {showVerifOtp ? (
                                  <div className="flex gap-2">
                                     <input
                                        type="text"
                                        maxLength={6}
                                        value={verifOtpInput}
                                        onChange={(e) => setVerifOtpInput(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="flex-1 text-center bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-2xl font-black tracking-[0.5em] text-white focus:border-brand-cyan outline-none"
                                     />
                                     <button
                                        onClick={handleSubmitOtp}
                                        disabled={verifyingOtp}
                                        className="px-6 bg-brand-cyan text-black rounded-xl font-black text-xs uppercase hover:bg-brand-cyan/80 transition-all disabled:opacity-50"
                                     >
                                        {verifyingOtp ? '...' : 'Verify'}
                                     </button>
                                  </div>
                               ) : (
                                  <button
                                     onClick={() => setShowVerifOtp(true)}
                                     className="w-full py-3 bg-brand-cyan text-black rounded-xl font-black text-xs uppercase hover:bg-brand-cyan/80 transition-all"
                                  >
                                     Enter OTP Code
                                  </button>
                               )}
                            </div>
                         ) : (
                            <div className="space-y-4">
                               <p className="text-sm text-gray-400">
                                  Select an option to verify your account and receive your OTP code.
                               </p>
                               <div className="flex gap-2 mb-2">
                                  <button 
                                      onClick={() => setVerifMethod('email')}
                                      className={`flex-1 py-2 text-xs font-black uppercase rounded-xl border ${verifMethod === 'email' ? 'bg-brand-purple border-brand-purple text-white' : 'border-white/10 text-gray-400'}`}
                                  >
                                      Email
                                  </button>
                                  <button 
                                      onClick={() => setVerifMethod('whatsapp')}
                                      className={`flex-1 py-2 text-xs font-black uppercase rounded-xl border ${verifMethod === 'whatsapp' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/10 text-gray-400'}`}
                                  >
                                      WhatsApp
                                  </button>
                               </div>
                               <input 
                                  placeholder={verifMethod === 'email' ? 'Enter Email Address' : 'Enter WhatsApp (+254...)'}
                                  value={verifContact}
                                  onChange={e => setVerifContact(e.target.value)}
                                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm focus:border-brand-purple outline-none"
                               />
                               <button
                                  onClick={handleRequestVerification}
                                  disabled={requestingVerif}
                                  className={`w-full py-3 rounded-xl font-black text-xs uppercase transition-all disabled:opacity-50 ${verifMethod === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-brand-purple hover:bg-brand-purple/80 text-white'}`}
                               >
                                  {requestingVerif ? 'Sending...' : `Send OTP via ${verifMethod}`}
                               </button>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
