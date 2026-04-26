import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, ShoppingBag, Repeat, MessageSquare, Heart, Share2, MoreHorizontal, UserPlus, UserCheck, ArrowLeft,
  X, Instagram, Facebook, Camera, Globe, ShieldCheck, ExternalLink, MapPin, Calendar,
  Trash2, AlertTriangle, Edit3, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { TrustBadge } from '../components/community/TrustBadge';
import { SellerScorecard } from '../components/community/SellerScorecard';
import { VerificationJourney } from '../components/community/VerificationJourney';
import { SafeTradePopup } from '../components/community/SafeTradePopup';
import { FollowerListModal } from '../components/community/FollowerListModal';

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
  followsViewer?: boolean;
}

interface Post {
  id: string;
  content: string;
  media_urls?: string;
  created_at: string;
  hearts: number;
  echoes: number;
  comments_count: number;
  is_marketplace: boolean;
  deal_metadata?: string;
  has_hearted?: string;
  has_echoed?: string;
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
  const { user, session, updateProfile, isAuthenticated, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'posts' | 'media' | 'likes' | 'marketplace'>('posts');
  const [safeTradeOpen, setSafeTradeOpen] = useState(false);
  const [safeTradeTarget, setSafeTradeTarget] = useState<any>(null);
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
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [socialListModal, setSocialListModal] = useState<{ isOpen: boolean; type: 'followers' | 'following' }>({
    isOpen: false,
    type: 'followers'
  });

  const handleShare = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/post/${p.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
      
      if (navigator.share) {
        const shareData = {
          title: `Post from @${profile?.handle}`,
          text: p.content.substring(0, 100),
          url: shareUrl,
        };
        try {
          await navigator.share(shareData);
        } catch (sErr) {
          // Ignore
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cleanHandle = handle?.replace(/^@/, '').toLowerCase();
  const userHandle = user?.handle?.replace(/^@/, '').toLowerCase();
  // Own profile: match by handle OR by D1 profile id matching the auth user id
  const isOwnProfile = !!user && (
    (userHandle && userHandle === cleanHandle) ||
    (profile?.id && user.id && profile.id === user.id)
  );

  const fetchData = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const cleanHandle = handle?.replace(/^@/, '');
      const authHeader: any = session?.access_token ? { 
        'Authorization': `Bearer ${session.access_token}`,
        'X-Actor-Id': user?.id || ''
      } : {};
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/handle/${cleanHandle}`, {
        headers: authHeader
      });
      const data = await resp.json();
      if (data && data.id && !data.available) {
        setProfile(data);
        setPosts(data.posts || data.pulses || []);
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
    if (!isAuthenticated) {
        toast.error("Please sign in to follow users");
        navigate('/login');
        return;
    }
    if (!isProfileComplete) {
        toast.error("Complete your profile to follow users");
        navigate('/setup-profile');
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

  const handleSendContactOtp = async () => {
    if (!verifContact.trim()) return toast.error(`Please enter your ${verifMethod}.`);
    setRequestingVerif(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/profiles/contact/send-otp`, {
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
      
      toast.success(`OTP sent via ${verifMethod}! (Simulated: ${data.simulated_otp})`);
      setShowVerifOtp(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP');
    } finally {
      setRequestingVerif(false);
    }
  };

  const handleSubmitOtp = async () => {
    if (verifOtpInput.length !== 6) return toast.error('Enter 6-digit OTP');
    setVerifyingOtp(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/profiles/contact/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': profile?.id || ''
        },
        body: JSON.stringify({ otp_code: verifOtpInput }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      toast.success('Reachability verified!');
      setShowVerifOtp(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Invalid code');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRequestBadge = async () => {
     try {
       const resp = await fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/profiles/request-badge`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${session?.access_token}`,
           'X-Actor-Id': profile?.id || ''
         }
       });
       if (!resp.ok) {
         const d = await resp.json();
         throw new Error(d.error);
       }
       toast.success('Badge request submitted!');
       fetchData();
     } catch (e: any) {
       toast.error(e.message);
     }
  };

  const handleInteract = async (pulseId: string, type: 'heart' | 'echo') => {
    if (!isAuthenticated) {
      toast.error(`Sign in to ${type === 'heart' ? 'like' : 'share'} posts`);
      navigate('/login');
      return;
    }
    if (!isProfileComplete) {
      toast.error("Complete your profile to interact with the community");
      navigate('/setup-profile');
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
        const isAdding = data.reacted;
        
        if (isAdding) {
          toast.success(type === 'heart' ? 'Liked post' : 'Post shared to your profile!');
        }

        setPosts(prev => prev.map((p: any) => {
          if (p.id === pulseId) {
            return {
              ...p,
              [type === 'heart' ? 'hearts' : 'echoes']: p[type === 'heart' ? 'hearts' : 'echoes'] + (isAdding ? 1 : -1),
              [type === 'heart' ? 'has_hearted' : 'has_echoed']: isAdding ? 'yes' : null
            };
          }
          return p;
        }));
      }
    } catch (e) {
      toast.error('Interaction failed');
    }
  };

  const handleBuyClick = (pulse: any) => {
    if (!isAuthenticated) {
      toast.error("Sign in to buy securely via Escrow");
      navigate('/login');
      return;
    }
    if (!isProfileComplete) {
      toast.error("Please complete your profile to trade on the marketplace");
      navigate('/setup-profile');
      return;
    }
    setSafeTradeTarget(pulse);
    setSafeTradeOpen(true);
  };

  const initiateEscrow = async (pulse: any) => {
    const metadata = parseJSON(pulse.deal_metadata);
    const amount = Number(metadata?.price) || 0;

    toast.promise(async () => {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/create-deal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
                'X-Actor-Id': user?.id || ''
            },
            body: JSON.stringify({
                pulse_id: pulse.id,
                amount: amount
            })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error);
        return data;
    }, {
        loading: 'Initiating secure escrow...',
        success: (data) => {
          if (data.authorizationUrl) {
            setTimeout(() => window.location.href = data.authorizationUrl, 1500);
            return `Deal #${data.dealId.slice(0,8)} created! Redirecting to Paystack...`;
          }
          setTimeout(() => navigate('/marketplace/dashboard'), 2000);
          return `Secure deal #${data.dealId.slice(0,8)} created! Check your dashboard for payment instructions.`;
        },
        error: (err) => `Escrow failed: ${err.message}`
    });
  };
  const handleDeletePost = async (pulseId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${pulseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        }
      });
      
      if (resp.ok) {
        toast.success("Post deleted");
        setPosts(prev => prev.filter(p => p.id !== pulseId));
      } else {
        const data = await resp.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch (e) {
      toast.error("Deletion failed");
    }
  };

  const handleReportPost = (pulseId: string) => {
    toast.success("Post reported. Our team will review it.");
    setMenuOpenId(null);
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
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center gap-6 text-center px-4">
        {!isAuthenticated ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl"
          >
            <div className="w-24 h-24 rounded-3xl bg-brand-purple/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
              <User size={48} className="text-brand-purple" />
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Join the Community</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Sign in or create an account to view full profiles, follow DJs, and trade securely on the marketplace.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-purple/20"
              >
                SIGN IN / REGISTER
              </button>
              <Link to="/community" className="text-gray-500 hover:text-white transition-colors text-sm font-bold py-2">
                Continue Exploring as Guest
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4 text-4xl">🔍</div>
            <h1 className="text-2xl font-black text-white">Profile Not Found</h1>
            <p className="text-gray-400 max-w-sm">This account doesn't exist or hasn't set up their profile yet.</p>
            <Link to="/community" className="mt-4 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-sm hover:bg-white/10 transition-all">
              Back to Community
            </Link>
          </>
        )}
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
                {isFollowing ? (
                  <>
                    <UserCheck size={18} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>{profile.followsViewer ? 'Follow Back' : 'Follow'}</span>
                  </>
                )}
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
            <button 
              onClick={() => setSocialListModal({ isOpen: true, type: 'following' })}
              className="hover:underline flex gap-1 items-center transition-all active:scale-95"
            >
              <span className="font-black text-white">{profile.following_count || 0}</span>
              <span className="text-gray-500">Following</span>
            </button>
            <button 
              onClick={() => setSocialListModal({ isOpen: true, type: 'followers' })}
              className="hover:underline flex gap-1 items-center transition-all active:scale-95"
            >
              <span className="font-black text-white">{profile.followers_count || 0}</span>
              <span className="text-gray-500">Followers</span>
            </button>
            <div className="ml-auto flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-xl">
               <div className="text-right">
                 <div className="text-[9px] uppercase font-black text-[#7c3aed] tracking-[0.2em] mb-1">Aura Status</div>
                 <div className="text-[11px] font-black text-white uppercase tracking-tighter">{profile.aura_tier || 'Elite'}</div>
               </div>
               <div className="w-[1px] h-8 bg-white/10" />
               <div className="text-2xl font-black text-[#7c3aed] font-['Space_Grotesk'] drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]">
                 {profile.aura_points}
               </div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-white/5 mt-10 mb-2">
          {['posts', 'media', 'likes', 'marketplace'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 py-5 text-[11px] uppercase tracking-[0.2em] font-black transition-all relative ${
                tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}>
              {t}
              {tab === t && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#7c3aed] mx-8 rounded-t-full shadow-[0_-2px_15px_rgba(124,58,237,0.8)]" />}
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
            <div className="py-32 text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-700">
                <MessageSquare size={32} />
              </div>
              <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">No posts yet</p>
            </div>
          ) : (
              posts.filter(p => {
                  if (tab === 'media') return p.media_urls && parseJSON(p.media_urls, []).length > 0;
                  if (tab === 'marketplace') return p.is_marketplace;
                  return true;
              }).map((p) => {
                const mediaItems = parseJSON(p.media_urls, []);
                const dealMeta = parseJSON(p.deal_metadata, {});
                
                return (
                <div key={p.id} className="py-8 px-4 hover:bg-white/[0.01] transition-all group">
                   <div className="flex gap-6">
                     <Avatar src={profile.avatar_url} name={profile.full_name} size={10} className="group-hover:ring-4 ring-[#7c3aed]/20 transition-all" />
                     <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white group-hover:text-[#7c3aed] transition-colors uppercase tracking-tight text-base">{profile.full_name}</span>
                            <span className="text-gray-500 text-[11px] font-bold">@{profile.handle} · {timeAgo(p.created_at)}</span>
                          </div>

                          <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
                                className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors"
                            >
                                <MoreHorizontal size={18} />
                            </button>

                            <AnimatePresence>
                                {menuOpenId === p.id && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            className="absolute right-0 mt-2 w-48 bg-[#050508] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                                        >
                                            {isOwnProfile ? (
                                                <>
                                                    <button 
                                                        onClick={() => { setMenuOpenId(null); navigate(`/post/${p.id}`); }}
                                                        className="w-full px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                    >
                                                        <Edit3 size={16} className="text-[#7c3aed]" /> Edit Post
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeletePost(p.id)}
                                                        className="w-full px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                                    >
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleReportPost(p.id)}
                                                    className="w-full px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                >
                                                    <AlertTriangle size={16} /> Report
                                                </button>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <p className="text-white/90 text-[15px] leading-relaxed mb-6 whitespace-pre-wrap font-medium">{p.content}</p>
                        
                        {mediaItems.length > 0 && (
                          <div className={`mb-6 grid gap-3 rounded-3xl overflow-hidden border border-white/10 ${mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                             {mediaItems.slice(0, 4).map((url: string, i: number) => (
                               <div key={i} className="relative cursor-zoom-in group/img" onClick={() => setViewingImage(url)}>
                                 <img src={url} className="w-full h-auto object-contain max-h-[500px] bg-white/[0.02] hover:opacity-90 transition-all duration-500 group-hover/img:scale-[1.02]" />
                               </div>
                             ))}
                          </div>
                        )}

                        {p.is_marketplace && (
                          <div className="mb-6 bg-white/[0.03] border border-white/10 rounded-3xl p-6 flex items-center justify-between shadow-2xl backdrop-blur-md">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-[#4cd7f6]/10 flex items-center justify-center border border-[#4cd7f6]/20">
                                <ShieldCheck className="text-[#4cd7f6]" size={24} />
                              </div>
                              <div>
                                <p className="text-2xl font-black text-white font-['Space_Grotesk'] leading-tight">KES {Number(dealMeta?.price || 0).toLocaleString()}</p>
                                <p className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">{dealMeta?.location || 'Location'}</p>
                              </div>
                            </div>
                            {!isOwnProfile && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleBuyClick(p); }}
                                className="px-8 py-3 bg-[#4cd7f6] text-[#003640] rounded-xl font-black text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-[#4cd7f6]/20"
                              >
                                BUY SECURELY
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-6 text-gray-500 mt-2">
                           <button onClick={() => navigate(`/post/${p.id}`)} className="flex items-center gap-2 text-xs hover:text-brand-purple transition-colors p-2 rounded-full hover:bg-brand-purple/10">
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

                           <button 
                             onClick={(e) => handleShare(p, e)}
                             className="flex items-center gap-2 text-xs hover:text-brand-cyan transition-colors p-2 rounded-full hover:bg-brand-cyan/10"
                           >
                             <Share2 size={16} />
                           </button>
                        </div>
                     </div>
                   </div>
                </div>
                );
              })
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
                    <h2 className="text-xl font-black">Edit Profile</h2>
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
                     <input placeholder="Full Name" value={editData.full_name} onChange={e => setEditData({...editData, full_name: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 focus:border-brand-purple outline-none transition-all" />
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">Bio</label>
                     <textarea placeholder="Tell your story..." value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 min-h-[100px] focus:border-brand-purple outline-none transition-all resize-none" />
                   </div>
                   <div>
                     <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">Location</label>
                     <input placeholder="e.g. Nairobi, Kenya" value={editData.location} onChange={e => setEditData({...editData, location: e.target.value})} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 focus:border-brand-purple outline-none transition-all" />
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
                         <ShieldCheck size={16} className="text-brand-purple" /> Member Safety & Trust
                      </h3>
                      <div className="p-5 rounded-2xl bg-brand-purple/5 border border-brand-purple/15 text-center">
                         <p className="text-sm text-gray-400 mb-4">Complete your verification journey directly from your profile page.</p>
                         <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 bg-brand-purple text-white rounded-xl font-black text-xs uppercase">
                            View Profile Journey
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setViewingImage(null)}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          >
            <button className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white">
                <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              src={viewingImage} 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" 
              alt="Full view"
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modals */}
      <SafeTradePopup 
        isOpen={safeTradeOpen} 
        sellerName={profile?.handle}
        amount={parseJSON(safeTradeTarget?.deal_metadata)?.price}
        onClose={() => { setSafeTradeOpen(false); setSafeTradeTarget(null); }}
        onConfirm={() => {
          setSafeTradeOpen(false);
          if (safeTradeTarget) initiateEscrow(safeTradeTarget);
          setSafeTradeTarget(null);
        }}
      />

      <FollowerListModal 
        userId={profile?.id || ''}
        userName={profile?.full_name || profile?.handle || ''}
        type={socialListModal.type}
        isOpen={socialListModal.isOpen}
        onClose={() => setSocialListModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
