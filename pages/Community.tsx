import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/ui/Avatar'; // Assume we'll inline it or it's somewhere. Wait, I will inline Avatar.
import { Link } from 'react-router-dom';
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
  Image as ImageIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Pulse {
  id: string;
  author_id: string;
  author_handle: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  content: string;
  media_url?: string;
  type: 'text' | 'media' | 'deal';
  deal_price?: number;
  hearts: number;
  echoes: number;
  created_at: string;
}

const parseUTC = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);
    return new Date(dateStr.replace(' ', 'T') + 'Z');
};

const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - parseUTC(dateStr).getTime()) / 1000);
    if (seconds < 5) return 'just now';
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
            className={`w-${size} h-${size} rounded-full object-cover border border-white/10 flex-shrink-0 ${className}`}
            alt={name}
        />
    );
};

export default function Community() {
  const { user, session } = useAuth();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [marketEchoes, setMarketEchoes] = useState<Pulse[]>([]);
  const [vector, setVector] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [newPulseContent, setNewPulseContent] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pulseResp, leaderResp, marketResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses?vector=${vector}`),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/leaders`),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses?vector=marketplace`)
      ]);
      
      const [pulseData, leaderData, marketData] = await Promise.all([
        pulseResp.json(),
        leaderResp.json(),
        marketResp.json()
      ]);

      setPulses(pulseData);
      setLeaders(leaderData);
      setMarketEchoes(marketData);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPulses = async () => {
    try {
      const pulseResp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses?vector=${vector}`);
      setPulses(await pulseResp.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchData();
  }, [vector]);

  const handlePost = async () => {
    if (!newPulseContent.trim()) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({
          content: newPulseContent,
          type: 'text'
        })
      });
      if (resp.ok) {
        setNewPulseContent('');
        fetchPulses();
      }
    } catch (e) {
      console.error('Post error:', e);
    }
  };

  const reactToPulse = async (id: string, type: 'heart' | 'echo') => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({ type })
      });
      fetchPulses();
    } catch (e) {}
  };

  return (
    <div className="pt-24 pb-12 min-h-screen">
      {/* Background layer exactly like old UI */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
        
        {/* Old Header Layout */}
        <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4">
                Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">Hub</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl">Share updates, talk music, buy & sell with the DJ Flowerz community.</p>
        </div>

        {/* Old Feed Tabs Layout */}
        <div className="flex border-b border-white/10 mb-8 overflow-x-auto custom-scrollbar">
            {[
              { id: 'latest', label: 'Latest Posts', icon: Activity },
              { id: 'trending', label: 'Trending', icon: TrendingUp },
              { id: 'marketplace', label: 'Buy & Sell', icon: ShoppingBag }
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVector(v.id)}
                className={`flex items-center space-x-2 px-8 py-4 whitespace-nowrap border-b-2 font-bold text-sm transition-all ${
                  vector === v.id ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <v.icon className="w-4 h-4" />
                <span>{v.label}</span>
              </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Old Left Sidebar */}
          <div className="hidden lg:block lg:col-span-3 space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group bg-[#0A0A0A]/50 backdrop-blur-xl shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-brand-purple/20 to-brand-cyan/20" />
                <div className="relative flex flex-col items-center mt-8">
                    <UserAvatar src={user?.avatarUrl} name={user?.name} size={24} className="border-4 border-[#0B0B0F] mb-4 shadow-xl" />
                    <h3 className="text-lg font-black text-white">{user?.name}</h3>
                    <p className="text-gray-500 text-sm mb-4">@{user?.handle?.replace('@', '')}</p>
                    
                    <div className="w-full flex justify-center gap-4 pt-4 border-t border-white/5 text-center mt-2 group-hover:border-brand-cyan/20 transition-colors">
                        <div className="flex-1">
                            <p className="font-black text-white">Level</p>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">{user?.auraTier || 'Member'}</p>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div className="flex-1">
                            <p className="font-black text-white">Points</p>
                            <p className="text-xs text-brand-cyan uppercase tracking-widest">{user?.auraPoints || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#0A0A0A]/50 backdrop-blur-xl shadow-2xl">
                <h4 className="font-black text-white mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-brand-purple" />
                    Top Members
                </h4>
                <div className="space-y-4">
                  {leaders.slice(0, 5).map((leader, i) => (
                      <Link to={`/op/${leader.handle}`} key={leader.handle} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                          <UserAvatar src={leader.avatar_url} name={leader.full_name} size={10} />
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate group-hover:text-brand-cyan transition-colors">{leader.full_name}</p>
                              <p className="text-xs text-gray-500 truncate">@{leader.handle}</p>
                          </div>
                      </Link>
                  ))}
                </div>
            </div>
          </div>

          {/* Center Feed */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Old Composer Layout */}
            <div className="glass-card rounded-[2rem] border border-white/5 p-5 mb-8 relative overflow-hidden group shadow-2xl bg-[#0A0A0A]/50 backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[50px] rounded-full group-focus-within:bg-brand-purple/15 transition-all" />
                <div className="flex gap-4 relative z-10">
                    <UserAvatar src={user?.avatarUrl} name={user?.name} size={11} className="mt-1" />
                    <div className="flex-1">
                        <textarea
                            value={newPulseContent}
                            onChange={e => setNewPulseContent(e.target.value)}
                            placeholder="What's on your mind? Share something with the community..."
                            className="w-full bg-transparent border-none text-white text-lg placeholder-gray-500 focus:outline-none resize-none pt-2 min-h-[80px]"
                            rows={3}
                        />
                        <div className="flex items-center justify-between mt-4 border-t border-white/[0.06] pt-4">
                            <div className="flex items-center gap-1">
                                <button className="p-2.5 text-brand-purple hover:bg-brand-purple/10 rounded-full transition-all" title="Add a photo">
                                    <ImageIcon size={20} />
                                </button>
                                <button className="p-2.5 text-brand-cyan hover:bg-brand-cyan/10 rounded-full transition-all" title="List something for sale">
                                    <ShoppingBag size={20} />
                                </button>
                            </div>
                            <button
                                onClick={handlePost}
                                disabled={!newPulseContent.trim()}
                                className="bg-brand-purple text-white px-8 py-2.5 rounded-full font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-purple/20 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                            >
                                <Send size={18} /> Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Posts Loop with Old PostCard Styling */}
            {loading ? (
                <div className="flex justify-center p-12">
                   <div className="w-12 h-12 border-4 border-[#A349F5]/20 border-t-[#A349F5] rounded-full animate-spin" />
                </div>
            ) : pulses.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl border border-white/5 hover:border-brand-purple/20 transition-all duration-300 overflow-hidden group mb-6 shadow-2xl bg-[#0A0A0A]/50 backdrop-blur-xl"
                >
                    <div className="flex items-start justify-between p-5 pb-3">
                        <div className="flex items-center gap-3">
                            <UserAvatar src={p.author_avatar} name={p.author_name} size={11} />
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Link to={`/op/${p.author_handle?.replace('@', '')}`} className="font-bold text-white text-sm hover:text-brand-purple transition">{p.author_name}</Link>
                                    {p.author_tier !== 'none' && (
                                        <div className="bg-brand-purple/10 text-brand-purple text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase border border-brand-purple/20">
                                            {p.author_tier}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                    <span>@{p.author_handle?.replace('@', '')}</span>
                                    <span>•</span>
                                    <span>{timeAgo(p.created_at)}</span>
                                </div>
                            </div>
                        </div>
                        <button className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    {p.content && (
                        <div className="px-5 pb-4 text-gray-100 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                            {p.content}
                        </div>
                    )}

                    {p.media_url && (
                        <div className="px-5 pb-4">
                            <img src={p.media_url} className="w-full rounded-2xl object-cover border border-white/5 shadow-inner max-h-[500px]" alt="media" loading="lazy" />
                        </div>
                    )}

                    <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2 bg-white/[0.01]">
                        <button onClick={() => reactToPulse(p.id, 'heart')} title="Like" className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition">
                            <Heart size={18} className={p.hearts > 0 ? "fill-red-400" : ""} />
                            <span>{p.hearts} Likes</span>
                        </button>
                        <button title="Comment" className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition">
                            <MessageSquare size={18} />
                            <span>{Math.floor(p.echoes / 2)} Comments</span>
                        </button>
                        <button onClick={() => reactToPulse(p.id, 'echo')} title="Repost" className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-green-400 hover:bg-green-400/5 transition">
                            <Repeat size={18} />
                            <span>{p.echoes} Reposts</span>
                        </button>
                        <button title="Share" className="ml-auto p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition">
                            <Share2 size={18} />
                        </button>
                    </div>
                </motion.div>
            ))}
          </div>

          {/* Old Right Sidebar */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#0A0A0A]/50 backdrop-blur-xl shadow-2xl">
                <h4 className="font-black text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-brand-cyan" />
                    Items for Sale
                </h4>
                <div className="space-y-4">
                  {marketEchoes.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Nothing listed for sale yet.</p>
                  ) : marketEchoes.slice(0, 4).map(echo => (
                      <div key={echo.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-brand-cyan/20 transition-all cursor-pointer">
                          <p className="text-xs text-gray-300 line-clamp-2 mb-2">{echo.content}</p>
                          <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">@{echo.author_handle?.replace('@', '')}</span>
                              <span className="text-[10px] font-bold text-brand-cyan">FOR SALE</span>
                          </div>
                      </div>
                  ))}
                </div>
            </div>
            
            <div className="glass-card p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-brand-purple/10 to-transparent">
              <h3 className="font-black text-white mb-2">Need Help?</h3>
              <p className="text-xs text-gray-400 mb-4">Having an issue with a purchase, a post, or another member? We're here to help.</p>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                  Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
