import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  MessageSquare, 
  Heart, 
  Repeat, 
  Share2, 
  TrendingUp, 
  ShoppingBag,
  Send,
  MoreHorizontal,
  Image as ImageIcon,
  BarChart2,
  Smile,
  Calendar,
  MapPin,
  X,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Plus,
  ArrowLeft,
  Bell,
  User,
  Flag,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SafeTradePopup } from '../components/community/SafeTradePopup';
import { ReportModal } from '../components/community/ReportModal';
import { TrustBadge } from '../components/community/TrustBadge';

interface Pulse {
  id: string;
  author_id: string;
  author_handle: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  author_verified: boolean;
  content: string;
  media_urls?: string; // JSON string
  poll_data?: string; // JSON string
  type: 'text' | 'media' | 'deal' | 'poll';
  is_marketplace: boolean;
  deal_metadata?: string; // JSON string
  parent_id?: string;
  hearts: number;
  echoes: number;
  comments_count: number;
  has_hearted?: string;
  has_echoed?: string;
  created_at: string;
}

const parseJSON = (str: string | undefined, fallback: any = null) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
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

const UserAvatar = ({ src, name, size = 10, className = "" }: { src?: string; name?: string; size?: number; className?: string }) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
    return (
        <img loading="lazy" src={src || fallback}
            onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
            className={`w-${size} h-${size} rounded-full object-cover ring-1 ring-white/10 flex-shrink-0 ${className}`}
            alt={name}
        />
    );
};

// Mask phone numbers in rendered content
const maskPhoneNumbers = (text: string): string => {
  return text.replace(/(?:07|01|2547|2541)\d{8}/g, '[📵 Contact via platform]');
};

export default function Community() {
  const { user, session, isAuthenticated, isProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [vector, setVector] = useState('latest');
  const [loading, setLoading] = useState(true);
  
  // Composer State
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isMarketplace, setIsMarketplace] = useState(false);
  const [dealPrice, setDealPrice] = useState('');
  const [dealLocation, setDealLocation] = useState('');
  const [dealCondition, setDealCondition] = useState('new');
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<'latest' | 'following' | 'marketplace' | 'profile'>('latest');
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe Trade Popup state
  const [safeTradeTarget, setSafeTradeTarget] = useState<Pulse | null>(null);
  const [safeTradeOpen, setSafeTradeOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL || '/api'}/pulses?vector=${vector}`;
      if (tab === 'marketplace') url += '&marketplace=true';
      if (tab === 'following' && user?.id) url += `&following_only=true&actor=${user.id}`;
      else if (user?.id) url += `&actor=${user.id}`;

      const authHeader = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const [pulseResp, leaderResp] = await Promise.all([
        fetch(url, { headers: authHeader }),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/leaders`)
      ]);
      
      setPulses(await pulseResp.json());
      setLeaders(await leaderResp.json());
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (session) fetchUnread();
  }, [vector, tab, session]);

  const fetchUnread = async () => {
    try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/notifications/unread`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const data = await resp.json();
        setUnreadCount(data.unread || 0);
    } catch (e) {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    const fileName = `${Date.now()}_${file.name}`;
    
    toast.promise(async () => {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-file-name': fileName,
          'x-folder': 'pulse-media'
        },
        body: await file.arrayBuffer()
      });
      const data = await resp.json();
      if (data.url) setMediaUrls(prev => [...prev, data.url].slice(0, 4));
      return data;
    }, {
      loading: 'Uploading media...',
      success: 'Media attached',
      error: 'Upload failed'
    });
  };

  const handlePost = async () => {
    if (!content.trim() && mediaUrls.length === 0) return;
    if (!isAuthenticated) {
        toast.error("Please sign in to post");
        return;
    }

    // ── Keyword blacklist scan before posting ──
    const BLACKLIST_QUICK = [
      'whatsapp', 'watsap', 'inbox me', 'dm me on', 'direct mpesa',
      'direct m-pesa', 'send to my number', 'tuma kwa hii number',
      'pay me directly', 'personal mpesa', 'tuma fare',
      'reverse the money', 'deposit first', 'registration fee',
      'you have won', 'you are a winner',
    ];
    const lowerContent = content.toLowerCase();
    const triggerWord = BLACKLIST_QUICK.find(w => lowerContent.includes(w));
    if (triggerWord) {
      toast.warning(
        `⚠️ Your post contains "${triggerWord}" which violates our community safety guidelines. Posts asking users to pay off-platform are not allowed.`,
        { duration: 6000 }
      );
      // Still allow user to proceed after warning (flag flagged server-side)
    }

    const payload = {
      content,
      media_urls: mediaUrls,
      type: showPoll ? 'poll' : (mediaUrls.length > 0 ? 'media' : 'text'),
      is_marketplace: isMarketplace ? 1 : 0,
      deal_metadata: isMarketplace ? { price: dealPrice, location: dealLocation, condition: dealCondition } : null,
      poll_data: showPoll ? { options: pollOptions.filter(o => o.trim()), votes: [] } : null
    };

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify(payload)
      });
      
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      // If flagged, log it server-side in background
      if (triggerWord && data.id) {
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/community/flag-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ content, post_id: data.id, user_id: user?.id, user_handle: user?.handle })
        }).catch(() => {});
      }

      setContent('');
      setMediaUrls([]);
      setIsMarketplace(false);
      setDealPrice('');
      setDealLocation('');
      setDealCondition('new');
      setShowPoll(false);
      setPollOptions(['', '']);
      setIsComposerExpanded(false);
      fetchData();
      toast.success("Post broadcasted!");
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    }
  };

  const handleInteract = async (pulseId: string, type: 'heart' | 'echo') => {
    if (!isAuthenticated) {
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
        setPulses(prev => prev.map(p => {
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

  const handleDeletePulse = async (pulseId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${pulseId}`, {
        method: 'DELETE',
        headers: { 
            'Authorization': `Bearer ${session?.access_token}`,
            'X-Actor-Id': user?.id || ''
        }
      });
      if (resp.ok) {
        setPulses(prev => prev.filter(p => p.id !== pulseId));
        toast.success("Post deleted");
      }
    } catch (e) { toast.error("Failed to delete"); }
  };

  const handleEditPulse = async (pulseId: string, content: string) => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${pulseId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({ content })
      });
      if (resp.ok) {
        setPulses(prev => prev.map(p => p.id === pulseId ? { ...p, content } : p));
        toast.success("Post updated");
      }
    } catch (e) { toast.error("Failed to update"); }
  };

  // Show safe trade popup first, then proceed with escrow
  const handleBuyClick = (pulse: Pulse) => {
    if (!isAuthenticated) {
      toast.error("Sign in to purchase items");
      return;
    }
    setSafeTradeTarget(pulse);
    setSafeTradeOpen(true);
  };

  const initiateEscrow = async (pulse: Pulse) => {
    const metadata = parseJSON(pulse.deal_metadata);
    toast.promise(async () => {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/create-deal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                pulse_id: pulse.id,
                amount: metadata?.price || 0
            })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error);
        return data;
    }, {
        loading: 'Initiating secure escrow...',
        success: (data) => `Secure deal #${data.dealId.slice(0,8)} created! Check your dashboard for payment instructions.`,
        error: (err) => `Escrow failed: ${err.message}`
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      <div className="max-w-7xl mx-auto flex justify-center pb-20 md:pb-0">
        
        {/* Main Feed Container */}
        <main className="w-full max-w-[600px] min-h-screen border-x border-white/5 bg-[#0B0B0F]">
          
          {/* Top Navigation Header */}
          <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0B0B0F]/80 border-b border-white/5">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Activity className="text-brand-purple" size={28} />
                <span className="text-xl font-black tracking-tighter uppercase">Community</span>
              </div>
              <div className="flex items-center gap-2">
                 <Link to="/notifications" className="p-2.5 hover:bg-white/5 rounded-full transition-all relative">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0B0B0F]" />
                    )}
                 </Link>
                 <Link to={`/op/${user?.handle}`} className="p-1 hover:ring-2 ring-brand-purple rounded-full transition-all">
                    <UserAvatar src={user?.avatarUrl} name={user?.name} size={8} />
                 </Link>
              </div>
            </div>

            {/* Sub-Nav Tabs */}
            <div className="flex overflow-x-auto scrollbar-hide border-t border-white/5">
              {[
                  { id: 'latest', label: 'Latest', icon: <TrendingUp size={16} /> },
                  { id: 'notifications', label: 'Alerts', icon: <Bell size={16} />, path: '/notifications' },
                  { id: 'marketplace', label: 'Market', icon: <ShoppingBag size={16} />, path: '/marketplace' },
                  { id: 'profile', label: 'Profile', icon: <User size={16} />, path: `/op/${user?.handle}` }
              ].map((nav) => (
                <button 
                  key={nav.id} 
                  onClick={() => nav.path ? navigate(nav.path) : setTab(nav.id as any)}
                  className={`flex-1 min-w-[100px] flex flex-col items-center gap-1.5 py-3 transition-all relative group ${
                    tab === nav.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${tab === nav.id ? 'bg-brand-purple/10 text-brand-purple' : 'group-hover:bg-white/5'}`}>
                    {nav.icon}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${tab === nav.id ? 'opacity-100' : 'opacity-40'}`}>
                    {nav.label}
                  </span>
                  {tab === nav.id && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-4 right-4 h-1 bg-brand-purple rounded-t-full shadow-[0_-4px_10px_rgba(124,58,237,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          </header>

          {/* Composer */}
          <div className="p-4 border-b border-white/5">
            <div className="flex gap-4">
              <UserAvatar src={user?.avatarUrl} name={user?.name} size={11} />
              <div className="flex-1">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setIsComposerExpanded(true)}
                  placeholder="What's on your mind? Share an update..."
                  className="w-full bg-transparent border-none text-xl placeholder-gray-600 focus:outline-none resize-none pt-2 min-h-[50px]"
                />
                
                {mediaUrls.length > 0 && (
                  <div className={`grid gap-2 mb-4 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {mediaUrls.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                        <img src={url} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => setMediaUrls(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showPoll && (
                   <div className="mb-4 bg-white/5 p-5 rounded-3xl border border-white/10 relative">
                     <button onClick={() => { setShowPoll(false); setPollOptions(['', '']); }} className="absolute -top-2 -right-2 p-1.5 bg-gray-800 text-gray-400 rounded-full border border-white/10 hover:text-white transition-all">
                        <X size={14} />
                     </button>
                     <div className="flex items-center gap-2 mb-3 text-brand-purple">
                        <BarChart2 size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Public Opinion Poll</span>
                     </div>
                     <div className="space-y-2">
                       {pollOptions.map((opt, i) => (
                         <input 
                           key={i} 
                           value={opt} 
                           onChange={(e) => {
                             const newOpts = [...pollOptions];
                             newOpts[i] = e.target.value;
                             setPollOptions(newOpts);
                           }}
                           placeholder={`Option ${i+1}`}
                           className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-brand-purple outline-none transition-all"
                         />
                       ))}
                       {pollOptions.length < 4 && (
                         <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-brand-purple text-xs font-black hover:underline px-1">+ Add Outcome</button>
                       )}
                     </div>
                   </div>
                )}

                {isMarketplace && (
                  <div className="mb-4 bg-brand-cyan/5 p-5 rounded-3xl border border-brand-cyan/20 relative">
                    <button onClick={() => { setIsMarketplace(false); setDealPrice(''); }} className="absolute -top-2 -right-2 p-1.5 bg-gray-800 text-gray-400 rounded-full border border-white/10 hover:text-white transition-all">
                        <X size={14} />
                    </button>
                    <div className="flex items-center gap-2 mb-4 text-brand-cyan">
                        <ShoppingBag size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Marketplace Listing</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-black text-brand-cyan/60 mb-2 block tracking-widest">Price (KES)</label>
                        <input 
                          type="number" 
                          value={dealPrice} 
                          onChange={e => setDealPrice(e.target.value)}
                          placeholder="Amount"
                          className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-cyan transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-brand-cyan/60 mb-2 block tracking-widest">Condition</label>
                        <select 
                          value={dealCondition}
                          onChange={e => setDealCondition(e.target.value)}
                          className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-cyan transition-all appearance-none"
                        >
                          <option value="new">Brand New</option>
                          <option value="used">Used / Good</option>
                          <option value="refurbished">Refurbished</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] uppercase font-black text-brand-cyan/60 mb-2 block tracking-widest">Location Sector</label>
                        <input 
                          value={dealLocation} 
                          onChange={e => setDealLocation(e.target.value)}
                          placeholder="e.g. Westlands, Nairobi"
                          className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 text-white outline-none focus:border-brand-cyan transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className={`flex items-center justify-between border-t border-white/5 pt-4 ${isComposerExpanded ? 'opacity-100' : 'opacity-0 h-0 hidden'}`}>
                  <div className="flex items-center text-brand-purple">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-brand-purple/10 rounded-full transition-all">
                      <ImageIcon size={20} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                    <button onClick={() => setShowPoll(!showPoll)} className={`p-2 hover:bg-brand-purple/10 rounded-full transition-all ${showPoll ? 'text-brand-cyan' : ''}`}>
                      <BarChart2 size={20} />
                    </button>
                    <button onClick={() => setIsMarketplace(!isMarketplace)} className={`p-2 hover:bg-brand-purple/10 rounded-full transition-all ${isMarketplace ? 'text-brand-cyan' : ''}`}>
                      <ShoppingBag size={20} />
                    </button>
                    <button className="p-2 hover:bg-brand-purple/10 rounded-full transition-all">
                      <MapPin size={20} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-bold text-gray-500">{content.length}/1500</div>
                    <button 
                      onClick={handlePost}
                      disabled={!content.trim() && mediaUrls.length === 0}
                      className="px-6 py-2 bg-brand-purple text-white rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-50"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Nudge for new users */}
          {isAuthenticated && !user?.handle && (
            <motion.div 
               initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
               className="mb-8 p-8 bg-gradient-to-r from-brand-purple/20 via-brand-cyan/10 to-brand-purple/20 rounded-[2.5rem] border border-white/10 relative overflow-hidden group"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/20 blur-[60px] animate-pulse" />
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div>
                    <h3 className="text-xl font-black text-white tracking-tighter mb-2">COMPLETE YOUR IDENTITY</h3>
                    <p className="text-sm text-gray-400 font-medium">You're currently broadcasting as a guest. Claim your handle to start building Aura and following other operators.</p>
                 </div>
                 <Link to="/setup-profile" className="px-8 py-4 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl whitespace-nowrap">
                   Claim Handle
                 </Link>
               </div>
            </motion.div>
          )}

          {/* Post Feed */}
          {loading ? (
            <div className="flex justify-center p-12">
               <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {pulses.map((p) => (
                <PostCard 
                    key={p.id} 
                    pulse={p} 
                    onReact={handleInteract} 
                    onBuy={handleBuyClick}
                    onDelete={handleDeletePulse}
                    onEdit={handleEditPulse}
                    currentUser={user!}
                    session={session}
                    maskPhoneNumbers={maskPhoneNumbers}
                />
              ))}
            </div>
          )}

          {/* Safe Trade Popup */}
          <SafeTradePopup
            isOpen={safeTradeOpen}
            sellerName={safeTradeTarget?.author_handle}
            amount={parseJSON(safeTradeTarget?.deal_metadata)?.price}
            onClose={() => { setSafeTradeOpen(false); setSafeTradeTarget(null); }}
            onConfirm={() => {
              setSafeTradeOpen(false);
              if (safeTradeTarget) initiateEscrow(safeTradeTarget);
              setSafeTradeTarget(null);
            }}
          />
        </main>

        {/* Right Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-80 h-screen sticky top-0 py-8 gap-6 pl-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
            <h3 className="text-lg font-black mb-4">Top Operators</h3>
            <div className="space-y-4">
              {leaders.slice(0, 5).map((leader) => (
                <div key={leader.handle} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/op/${leader.handle}`)}>
                    <UserAvatar src={leader.avatar_url} name={leader.full_name} size={10} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-brand-purple transition-colors">{leader.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">@{leader.handle}</p>
                    </div>
                  </div>
                  {user?.handle?.replace('@', '') !== leader.handle && (
                    <button className="px-4 py-1.5 bg-white text-black rounded-full text-xs font-black shadow-lg hover:scale-105 transition-all">Follow</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
             <h3 className="text-lg font-black mb-4">Trending Posts</h3>
             <div className="space-y-4">
                {[
                    { tag: '#EscrowTrust', signals: '2.4k' },
                    { tag: '#NairobiBeats', signals: '1.8k' },
                    { tag: '#Sector7Status', signals: '840' },
                    { tag: '#SignalBoost', signals: '420' }
                ].map(trend => (
                    <div key={trend.tag} className="hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all cursor-pointer group">
                        <p className="text-brand-purple font-black text-sm">{trend.tag}</p>
                        <p className="text-[10px] text-gray-500 font-bold">{trend.signals} posts</p>
                    </div>
                ))}
             </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-brand-purple/5 to-transparent">
             <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-brand-cyan" size={18} />
                <h4 className="font-black text-brand-cyan uppercase text-xs tracking-widest">Escrow Protected</h4>
             </div>
             <p className="text-sm text-gray-400 mb-4">Marketplace deals are held in a secure pool until you confirm receipt. Zero risk for buyers.</p>
             <Link to="/governance" className="text-xs font-bold text-gray-300 hover:text-white underline">Learn more about our trust framework</Link>
          </div>
        </aside>

      </div>
    </div>
  );
}

function PostCard({ pulse, onReact, onBuy, currentUser, onDelete, onEdit, session, maskPhoneNumbers }: { 
  pulse: Pulse, onReact: any, onBuy: any, currentUser: any, onDelete: any, onEdit: any, session: any, maskPhoneNumbers: (t: string) => string
}) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(pulse.content);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const mediaItems = parseJSON(pulse.media_urls, []);
  const pollData = parseJSON(pulse.poll_data);
  const dealMeta = parseJSON(pulse.deal_metadata);
  const isAuthor = currentUser?.id === pulse.author_id;
  const isCaution = pulse.author_tier === 'CAUTION';
  const isSuspended = pulse.author_tier === 'SUSPENDED';

  return (
    <>
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 hover:bg-white/[0.02] transition-all cursor-pointer group relative"
      onClick={() => !isEditing && navigate(`/pulse/${pulse.id}`)}
    >
      {/* Caution / Suspended banner on post */}
      {(isCaution || isSuspended) && (
        <div className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
          isSuspended
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
        }`}>
          <AlertTriangle size={12} />
          {isSuspended ? '🚫 This account is currently suspended' : '⚠️ Caution: This user has multiple reports — use Escrow for transactions'}
        </div>
      )}

      <div className="flex gap-4">
        <UserAvatar 
            src={pulse.author_avatar} 
            name={pulse.author_name} 
            size={11} 
            className="hover:scale-105 transition-transform" 
            onClick={(e) => { e.stopPropagation(); navigate(`/op/${pulse.author_handle}`); }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-white hover:underline decoration-white/30 truncate" onClick={(e) => { e.stopPropagation(); navigate(`/op/${pulse.author_handle}`); }}>{pulse.author_name}</span>
              {pulse.author_verified && <CheckCircle2 size={14} className="text-brand-cyan fill-brand-cyan/10" />}
              {isCaution && <TrustBadge type="caution" size="xs" showLabel={false} />}
              <span className="text-sm text-gray-500">@{pulse.author_handle}</span>
              <span className="text-sm text-gray-600">·</span>
              <span className="text-sm text-gray-500 whitespace-nowrap">{timeAgo(pulse.created_at)}</span>
            </div>
            
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className="text-gray-600 hover:text-brand-purple p-1 rounded-full hover:bg-brand-purple/10 transition-all"
              >
                  <MoreHorizontal size={18} />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-[#0B0B0F] border border-white/10 rounded-2xl shadow-2xl z-40 overflow-hidden"
                    >
                      {isAuthor && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
                            className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-3"
                          >
                            Edit Post
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(pulse.id); setShowMenu(false); }}
                            className="w-full px-4 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-3"
                          >
                            Delete Post
                          </button>
                        </>
                      )}
                      {!isAuthor && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowReport(true); setShowMenu(false); }}
                          className="w-full px-4 py-3 text-left text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-all flex items-center gap-3"
                        >
                          <Flag size={12} /> Report Post
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-1">
            {isEditing ? (
              <div className="space-y-3 mt-2" onClick={e => e.stopPropagation()}>
                <textarea 
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-brand-purple outline-none min-h-[100px]"
                  maxLength={1500}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => { onEdit(pulse.id, editContent); setIsEditing(false); }}
                    className="px-4 py-2 bg-brand-purple rounded-full text-[10px] font-black uppercase tracking-widest"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[15px] leading-relaxed text-gray-200 whitespace-pre-wrap">
                {maskPhoneNumbers(pulse.content)}
              </div>
            )}
          </div>

          {/* Media Grid */}
          {mediaItems.length > 0 && !isEditing && (
            <div className={`mt-3 grid gap-2 rounded-2xl overflow-hidden border border-white/5 ${mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {mediaItems.map((url: string, idx: number) => (
                <img 
                    key={idx} 
                    src={url} 
                    loading="lazy"
                    className="w-full h-full object-cover aspect-video hover:opacity-90 transition-opacity" 
                    alt="" 
                />
              ))}
            </div>
          )}

          {/* Poll Display */}
          {pollData && !isEditing && (
             <div className="mt-3 space-y-2">
                {pollData.options.map((opt: string, i: number) => (
                   <div key={i} className="relative h-10 w-full bg-white/5 rounded-lg border border-white/10 flex items-center px-4 group/opt overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 bg-brand-purple/20 w-0 group-hover/opt:w-[10%] transition-all" />
                      <span className="relative z-10 font-bold text-sm">{opt}</span>
                   </div>
                ))}
             </div>
          )}

          {/* Marketplace Banner */}
          {pulse.is_marketplace && !isEditing && (
            <div className="mt-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl p-4 flex items-center justify-between group/deal">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-cyan/10 rounded-xl">
                  <ShoppingBag className="text-brand-cyan" size={24} />
                </div>
                <div>
                   <p className="text-[10px] uppercase font-black text-brand-cyan tracking-wider">Verified Seller Deal</p>
                   <div className="flex items-center gap-3">
                      <p className="text-lg font-black text-white">KES {Number(dealMeta?.price).toLocaleString()}</p>
                      {dealMeta?.condition && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20">
                          {dealMeta.condition}
                        </span>
                      )}
                   </div>
                   {dealMeta?.location && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                        <MapPin size={10} />
                        <span>{dealMeta.location}</span>
                      </div>
                   )}
                </div>
              </div>
              {!isAuthor && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onBuy(pulse); }}
                  className="px-6 py-2 bg-brand-cyan text-black rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-cyan/20"
                >
                  🛡️ Buy Safely
                </button>
              )}
            </div>
          )}

          {/* Interaction Bar */}
          {!isEditing && (
            <div className="mt-4 flex items-center justify-between max-w-md text-gray-500">
              <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/pulse/${pulse.id}`); }}
                  className="flex items-center gap-2 hover:text-brand-purple transition-colors p-2 rounded-full hover:bg-brand-purple/10"
              >
                <MessageSquare size={18} />
                <span className="text-xs font-bold">{pulse.comments_count || 0}</span>
              </button>
              
              <button 
                  onClick={(e) => { e.stopPropagation(); onReact(pulse.id, 'echo'); }}
                  className={`flex items-center gap-2 transition-colors p-2 rounded-full ${pulse.has_echoed ? 'text-green-500 bg-green-500/10' : 'hover:text-green-500 hover:bg-green-500/10'}`}
              >
                <Repeat size={18} />
                <span className="text-xs font-bold">{pulse.echoes || 0}</span>
              </button>

              <button 
                  onClick={(e) => { e.stopPropagation(); onReact(pulse.id, 'heart'); }}
                  className={`flex items-center gap-2 transition-colors p-2 rounded-full ${pulse.has_hearted ? 'text-red-500 bg-red-500/10' : 'hover:text-red-500 hover:bg-red-500/10'}`}
              >
                <Heart size={18} className={pulse.has_hearted ? "fill-current" : ""} />
                <span className="text-xs font-bold">{pulse.hearts || 0}</span>
              </button>

              <button className="flex items-center gap-2 hover:text-brand-cyan transition-colors p-2 rounded-full hover:bg-brand-cyan/10">
                <Share2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>

    {/* Report Modal */}
    {showReport && (
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={pulse.author_id}
        reportedHandle={pulse.author_handle}
        postId={pulse.id}
        session={session}
      />
    )}
    </>
  );
}
