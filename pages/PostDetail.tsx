import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/user/UserAvatar';
import { 
  ArrowLeft, 
  MessageSquare, 
  Heart, 
  Repeat, 
  Share2, 
  MoreHorizontal,
  Image as ImageIcon,
  Smile,
  Send,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Activity,
  Bell,
  User,
  Trash2, 
  Edit, 
  Flag, 
  X, 
  ExternalLink,
  Gavel,
  Clock,
  ShieldCheck,
  Info,
  Lock,
  UserPlus,
  UserCheck,
  Loader2
} from 'lucide-react';
import { SafeTradePopup } from '../components/community/SafeTradePopup';
import { AuctionTimer } from '../components/community/AuctionTimer';
import { BidModal } from '../components/community/BidModal';
import { InterestModal } from '../components/community/InterestModal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Post {
  id: string;
  author_id: string;
  author_handle: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  author_verified: boolean;
  content: string;
  media_urls?: string;
  poll_data?: string;
  type: 'text' | 'media' | 'deal' | 'poll';
  is_marketplace: boolean;
  deal_metadata?: string;
  hearts: number;
  echoes: number;
  comments_count: number;
  has_hearted?: string;
  has_echoed?: string;
  created_at: string;

  // Marketplace expansions
  listing_type?: 'fixed' | 'auction';
  listing_status?: 'available' | 'reserved' | 'sold';
  auction_end_at?: string;
  auction_start_price?: number;
  highest_bid?: number;
  highest_bidder_id?: string;
  bid_count?: number;
}

const parseJSON = (str: string | undefined, fallback: any = null) => {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (e) { return fallback; }
};

const parseUTC = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);
    return new Date(dateStr.replace(' ', 'T') + 'Z');
};

const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - parseUTC(dateStr).getTime()) / 1000);
    if (seconds < 5) return 'now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
};

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session, isAuthenticated, isProfileComplete } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [safeTradeOpen, setSafeTradeOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsViewer, setFollowsViewer] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [interestPulse, setInterestPulse] = useState<Post | null>(null);
  const [bidPulse, setBidPulse] = useState<Post | null>(null);

  const handleMarketplaceAction = (e: React.MouseEvent, action: () => void) => {
      e.stopPropagation();
      if (!isAuthenticated) {
          toast.error("Please login to use marketplace features");
          navigate('/login');
          return;
      }
      if (!isProfileComplete) {
          toast.error("Please complete your profile first");
          navigate('/setup-profile');
          return;
      }
      action();
  };

  useEffect(() => {
    fetchPost();
    if (session) {
        fetchUnread();
        fetchUserInterests();
    }
  }, [id, session]);

  const fetchUserInterests = async () => {
      try {
          const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/marketplace/interests/my`, {
              headers: { 
                  'Authorization': `Bearer ${session?.access_token}`,
                  'X-Actor-Id': user?.id || ''
              }
          });
          const data = await resp.json();
          if (resp.ok) setUserInterests(data.interests || []);
      } catch (e) {}
  };

  const fetchUnread = async () => {
    try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/notifications/unread`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const data = await resp.json();
        setUnreadCount(data.unread || 0);
    } catch (e) {}
  };

  const fetchPost = async () => {
    try {
      const headers: HeadersInit = {};
      if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          headers['X-Actor-Id'] = user?.id || '';
      }
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${id}`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setPost(data.pulse);
        setReplies(data.replies);
        setIsFollowing(data.pulse.isFollowing);
        setFollowsViewer(data.pulse.followsViewer);
      } else {
        toast.error("Post not found");
        navigate('/community');
      }
    } catch (e) {
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const handleInteract = async (postId: string, type: 'heart' | 'echo') => {
    if (!isAuthenticated) {
      toast.error(`Please sign in to ${type === 'heart' ? 'like' : 'share'} posts`);
      navigate('/login');
      return;
    }
    if (!isProfileComplete) {
      toast.error("Complete your profile to interact with the community");
      navigate('/setup-profile');
      return;
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${postId}/react`, {
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
        // Update local state for main post or replies
        if (post?.id === postId) {
            setPost(prev => prev ? {
                ...prev,
                [type === 'heart' ? 'hearts' : 'echoes']: data.reacted ? prev[type === 'heart' ? 'hearts' : 'echoes'] + 1 : prev[type === 'heart' ? 'hearts' : 'echoes'] - 1,
                [type === 'heart' ? 'has_hearted' : 'has_echoed']: data.reacted ? 'yes' : null
            } : null);
        } else {
            setReplies(prev => prev.map(p => p.id === postId ? {
                ...p,
                [type === 'heart' ? 'hearts' : 'echoes']: data.reacted ? p[type === 'heart' ? 'hearts' : 'echoes'] + 1 : p[type === 'heart' ? 'hearts' : 'echoes'] - 1,
                [type === 'heart' ? 'has_hearted' : 'has_echoed']: data.reacted ? 'yes' : null
            } : p));
        }

        if (data.reacted) {
          toast.success(type === 'heart' ? "Post liked!" : "Post shared!");
        }
      }
    } catch (e) {}
  };

  const handleFollow = async () => {
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
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/${post?.author_id}/follow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'X-Actor-Id': user?.id || ''
            }
        });
        const data = await resp.json();
        if (resp.ok) {
            setIsFollowing(data.following);
            toast.success(data.following ? `Following ${post?.author_name}` : `Unfollowed ${post?.author_name}`);
        }
    } catch (e) {
        toast.error("Failed to update follow status");
    } finally {
        setFollowLoading(false);
    }
  };

  const postReply = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to join the conversation");
      navigate('/login');
      return;
    }
    if (!isProfileComplete) {
      toast.error("Complete your profile to post replies");
      navigate('/setup-profile');
      return;
    }
    if (!replyContent.trim() || isPosting) return;
    setIsPosting(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({
          content: replyContent,
          parent_id: id,
          type: 'text'
        })
      });

      if (resp.ok) {
        setReplyContent('');
        fetchPost();
        toast.success("Reply posted");
      } else {
        const errorData = await resp.json();
        toast.error(errorData.error || "Failed to post reply");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to post reply");
    } finally {
      setIsPosting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
      
      if (navigator.share) {
        const shareData = {
          title: 'Check out this post on DJ Flowerz',
          text: post?.content,
          url: shareUrl
        };
        try {
          await navigator.share(shareData);
        } catch (sErr) {
          // Ignore
        }
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${post?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        }
      });
      if (resp.ok) {
        toast.success("Post deleted");
        navigate('/community');
      } else {
        const d = await resp.json();
        throw new Error(d.error || 'Failed to delete');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEdit = () => {
    if (!post) return;
    setEditContent(post.content);
    setIsEditing(true);
    setShowMenu(false);
  };

  const saveEdit = async () => {
    if (!post || !editContent.trim()) return;
    setIsPosting(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({ content: editContent })
      });
      if (resp.ok) {
        setPost(prev => prev ? { ...prev, content: editContent } : null);
        setIsEditing(false);
        toast.success("Post updated");
      }
    } catch (e) {
      toast.error("Failed to update post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleReport = () => {
    toast.success("Post reported to moderators");
    setShowMenu(false);
  };

  const initiateEscrow = async () => {
    const metadata = parseJSON(post?.deal_metadata);
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
                pulse_id: post?.id,
                amount: amount
            })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error);
        return data;
    }, {
        loading: 'Initiating secure escrow...',
        success: (data: any) => {
          if (data.authorizationUrl) {
            setTimeout(() => window.location.href = data.authorizationUrl, 1500);
            return `Deal #${data.id?.slice(0,8) || 'created'} created! Redirecting to Paystack...`;
          }
          setTimeout(() => navigate('/marketplace'), 2000);
          return `Secure deal created! Check your dashboard for payment instructions.`;
        },
        error: (err: any) => `Escrow failed: ${err.message}`
    });
  };

  if (loading) return <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center"><Activity className="animate-spin text-brand-purple" /></div>;
  if (!post) return null;

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      <div className="max-w-7xl mx-auto flex justify-center">
        {/* Main Feed */}
        <main className="w-full max-w-[600px] min-h-screen border-x border-white/5">
          <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0B0B0F]/80 border-b border-white/5 p-4 flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-black">Post Thread</h1>
          </header>

          <div className="p-4 border-b border-white/5">
            <div className="flex gap-4">
              <UserAvatar src={post.author_avatar} name={post.author_name} size={12} onClick={() => navigate(`/member/${post.author_handle}`)} className="cursor-pointer" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-white hover:underline cursor-pointer" onClick={() => navigate(`/member/${post.author_handle}`)}>{post.author_name}</p>
                        <p className="text-sm text-gray-500">@{post.author_handle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative z-50">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className={`p-2 rounded-full transition-all relative z-50 ${showMenu ? 'text-brand-purple bg-brand-purple/10' : 'text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10'}`}
                            >
                                <MoreHorizontal size={20} />
                            </button>
                            
                            <AnimatePresence>
                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            className="absolute right-0 top-10 w-48 bg-[#16161D] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                        >
                                            {user?.id === post.author_id && (
                                                <button onClick={handleEdit} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors">
                                                    <Edit size={16} /> Edit Post
                                                </button>
                                            )}
                                            {user?.id === post.author_id && (
                                                <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-400/10 transition-colors">
                                                    <Trash2 size={16} /> Delete Post
                                                </button>
                                            )}
                                            <button onClick={handleReport} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/5 transition-colors">
                                                <Flag size={16} /> Report Post
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {user?.id !== post.author_id && (
                            <button 
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                                    isFollowing 
                                        ? 'bg-white/10 text-white hover:bg-red-500/10 hover:text-red-500' 
                                        : 'bg-white text-black hover:bg-white/90'
                                }`}
                            >
                                {followLoading ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : isFollowing ? (
                                    <UserCheck size={14} />
                                ) : (
                                    <UserPlus size={14} />
                                )}
                                {isFollowing ? 'Following' : (followsViewer ? 'Follow Back' : 'Follow')}
                            </button>
                        )}
                    </div>
                </div>
              </div>
            </div>

            {isEditing ? (
                <div className="mt-4 space-y-4">
                    <textarea 
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-purple/50 min-h-[120px] resize-none"
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-2 rounded-full border border-white/10 text-sm font-bold hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveEdit}
                            disabled={isPosting}
                            className="px-6 py-2 bg-brand-purple text-white rounded-full font-black text-sm hover:scale-105 transition-all"
                        >
                            {isPosting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-4 text-[17px] leading-relaxed text-gray-100 whitespace-pre-wrap">
                  {post.content.split(/(\s+)/).map((part, i) => {
                    if (part.startsWith('#') && part.length > 1) {
                      return (
                        <Link 
                          key={i} 
                          to={`/community?q=${encodeURIComponent(part)}`}
                          className="text-brand-cyan hover:underline"
                        >
                          {part}
                        </Link>
                      );
                    }
                    return part;
                  })}
                </div>
            )}

            {/* Media Rendering */}
            {parseJSON(post.media_urls, []).length > 0 && (
              <div className={`mt-4 grid gap-2 ${parseJSON(post.media_urls).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {parseJSON(post.media_urls).map((url: string, i: number) => (
                  <div key={url} className="relative aspect-auto min-h-[300px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0B0B0F] cursor-zoom-in" onClick={() => window.open(url, '_blank')}>
                    <img src={url} className="w-full h-auto object-contain max-h-[800px] hover:scale-[1.02] transition-transform duration-700" alt="" />
                  </div>
                ))}
              </div>
            )}

            {/* Marketplace Metadata */}
            {(post.is_marketplace || post.type === 'marketplace' || post.deal_metadata) && (
                <div className="mt-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-3xl p-6 flex flex-col gap-4 group/deal relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-cyan/10 rounded-2xl">
                                <ShoppingBag className="text-brand-cyan" size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-brand-cyan tracking-wider">
                                    {post.listing_type === 'auction' ? 'LIVE AUCTION' : 'Verified Seller Deal'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <p className="text-2xl font-black text-white">
                                        {post.listing_type === 'auction' 
                                            ? `KES ${Number(post.highest_bid || post.auction_start_price || 0).toLocaleString()}`
                                            : `KES ${Number(parseJSON(post.deal_metadata)?.price || 0).toLocaleString()}`
                                        }
                                    </p>
                                    {parseJSON(post.deal_metadata)?.condition && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20">
                                            {parseJSON(post.deal_metadata).condition}
                                        </span>
                                    )}
                                </div>
                                {parseJSON(post.deal_metadata)?.location && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <MapPin size={12} />
                                        <span>{parseJSON(post.deal_metadata).location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {post.listing_type === 'auction' && post.auction_end_at && (
                            <AuctionTimer expiryDate={post.auction_end_at} />
                        )}
                    </div>

                    {user?.id !== post.author_id && post.listing_status !== 'sold' && (
                        <div className="flex gap-3">
                            {post.listing_type === 'auction' ? (
                                <button 
                                    onClick={(e) => handleMarketplaceAction(e, () => setBidPulse(post))}
                                    className="flex-1 py-4 bg-brand-cyan text-black rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-cyan/20 flex items-center justify-center gap-2"
                                >
                                    <Gavel size={18} />
                                    Place Bid
                                </button>
                            ) : (
                                <button 
                                    onClick={(e) => handleMarketplaceAction(e, () => {
                                        if (userInterests.some(i => i.pulse_id === post.id && i.status === 'accepted')) {
                                            setSafeTradeOpen(true);
                                        } else {
                                            setInterestPulse(post);
                                        }
                                    })}
                                    className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                        userInterests.some(i => i.pulse_id === post.id && i.status === 'accepted')
                                            ? 'bg-green-500 text-white shadow-xl shadow-green-500/20'
                                            : 'bg-brand-cyan text-black shadow-xl shadow-brand-cyan/20 hover:scale-[1.02]'
                                    }`}
                                >
                                    {userInterests.some(i => i.pulse_id === post.id && i.status === 'accepted') ? (
                                        <>
                                            <CheckCircle2 size={18} />
                                            Deal Accepted - Buy Safely
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare size={18} />
                                            Chat to Buy
                                        </>
                                    )}
                                </button>
                            )}
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); }} // Could open info modal
                                className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-brand-cyan transition-all border border-brand-cyan/20"
                                title="Safety Guidelines"
                            >
                                <ShieldCheck size={20} />
                            </button>
                        </div>
                    )}
                    
                    {post.listing_status === 'sold' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <div className="px-8 py-3 bg-red-500 text-white font-black uppercase tracking-widest rounded-full rotate-[-5deg] border-4 border-white shadow-2xl">
                                Sold Out
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 py-4 border-y border-white/5 flex items-center gap-6 text-sm text-gray-500">
                <span><span className="text-white font-bold">{post.hearts}</span> Likes</span>
                <span><span className="text-white font-bold">{post.echoes}</span> Shares</span>
                <span><span className="text-white font-bold">{post.comments_count}</span> Replies</span>
            </div>

            <div className="pt-2 flex items-center justify-between max-w-sm text-gray-500">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleInteract(post.id, 'echo'); }}
                    className={`flex items-center gap-2 p-3 rounded-full transition-all ${post.has_echoed ? 'text-green-500 bg-green-500/10' : 'hover:text-green-500 hover:bg-green-500/10'}`}
                >
                    <Repeat size={22} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleInteract(post.id, 'heart'); }}
                    className={`flex items-center gap-2 p-3 rounded-full transition-all ${post.has_hearted ? 'text-red-500 bg-red-500/10' : 'hover:text-red-500 hover:bg-red-500/10'}`}
                >
                    <Heart size={22} className={post.has_hearted ? 'fill-current' : ''} />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                    className="p-3 rounded-full hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                >
                    <Share2 size={22} />
                </button>
            </div>
          </div>

          {/* Reply Composer */}
          <div className="p-4 border-b border-white/5 flex gap-4">
            <UserAvatar src={user?.avatarUrl} name={user?.name} size={11} />
            <div className="flex-1">
                <textarea 
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Reply to this post..."
                    className="w-full bg-transparent border-none text-lg outline-none placeholder:text-gray-600 resize-none min-h-[60px]"
                />
                <div className="flex justify-end items-center mt-2 pt-2 border-t border-white/5">
                    <button 
                        onClick={postReply}
                        disabled={!replyContent.trim() || isPosting}
                        className="px-6 py-2 bg-brand-purple disabled:opacity-50 text-white rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all"
                    >
                        {isPosting ? 'Sending...' : 'Reply'}
                    </button>
                </div>
            </div>
          </div>

          {/* Replies List */}
          <div className="divide-y divide-white/5">
            {replies.map((reply) => (
              <div key={reply.id} className="p-4 hover:bg-white/[0.02] transition-all">
                <div className="flex gap-4">
                    <UserAvatar src={reply.author_avatar} name={reply.author_name} size={10} onClick={() => navigate(`/member/${reply.author_handle}`)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-white">@{reply.author_handle}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500">{timeAgo(reply.created_at)}</span>
                        </div>
                        <div className="mt-1 text-gray-200">
                            {reply.content}
                        </div>
                        <div className="mt-3 flex items-center gap-6 text-gray-500">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleInteract(reply.id, 'heart'); }}
                                className={`flex items-center gap-1.5 transition-all ${reply.has_hearted ? 'text-red-500' : 'hover:text-red-500'}`}
                            >
                                <Heart size={16} className={reply.has_hearted ? 'fill-current' : ''} />
                                <span className="text-xs font-bold">{reply.hearts}</span>
                            </button>
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar Placeholder */}
        <aside className="hidden lg:block w-80 sticky top-0 h-screen p-8">
            {/* Trends or suggestions can go here */}
        </aside>
      </div>
      
      <SafeTradePopup 
        isOpen={safeTradeOpen}
        onClose={() => setSafeTradeOpen(false)}
        sellerName={post.author_name}
        amount={parseJSON(post.deal_metadata)?.price}
        onConfirm={() => {
            setSafeTradeOpen(false);
            initiateEscrow();
        }}
      />

      {/* Marketplace Modals */}
      {interestPulse && (
        <InterestModal
          pulse={interestPulse}
          existingInterest={userInterests.find(i => i.pulse_id === interestPulse.id)}
          onClose={() => setInterestPulse(null)}
          onInterestSent={(id) => {
            fetchUserInterests();
            setInterestPulse(null);
          }}
          onProceedToEscrow={() => {
            setInterestPulse(null);
            setSafeTradeOpen(true);
          }}
        />
      )}

      {bidPulse && (
        <BidModal
          pulse={bidPulse}
          onClose={() => setBidPulse(null)}
          onBidPlaced={() => {
            setBidPulse(null);
            fetchPost();
          }}
        />
      )}
    </div>
  );
}
