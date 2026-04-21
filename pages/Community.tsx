import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { 
  Activity, 
  MessageSquare, 
  Heart, 
  Repeat, 
  Share2, 
  TrendingUp, 
  ShoppingBag,
  Plus,
  Search,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function Community() {
  const { user, session } = useAuth();
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [marketEchoes, setMarketEchoes] = useState<Pulse[]>([]);
  const [vector, setVector] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
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
          'Authorization': `Bearer ${session.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({
          content: newPulseContent,
          type: 'text'
        })
      });
      if (resp.ok) {
        setNewPulseContent('');
        setComposerOpen(false);
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
          'Authorization': `Bearer ${session.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({ type })
      });
      fetchPulses();
    } catch (e) {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans bg-[#050505]">
      {/* Header / Vector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-5xl font-heading tracking-tighter bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent italic">
            The Pulse
          </h1>
          <p className="text-white/30 text-sm tracking-[0.2em] font-medium uppercase">Community Signal Center</p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
          {[
            { id: 'latest', label: 'Signal', icon: Activity },
            { id: 'trending', label: 'Flow', icon: TrendingUp },
            { id: 'marketplace', label: 'Nodes', icon: ShoppingBag }
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setVector(v.id)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-full transition-all duration-300 text-sm font-semibold tracking-wide ${
                vector === v.id ? 'bg-[#A349F5] text-white shadow-[0_0_15px_rgba(163,73,245,0.4)]' : 'text-white/40 hover:text-white'
              }`}
            >
              <v.icon className="w-4 h-4" />
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar Left: Operator Stat */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          <GlassCard className="p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-[#A349F5]/30 rounded-full blur-2xl group-hover:bg-[#00F5FF]/30 transition-all"></div>
                <img 
                  src={user?.avatarUrl || 'https://via.placeholder.com/150'} 
                  className="w-24 h-24 rounded-full border-2 border-white/20 relative z-10 p-1 bg-[#050505]"
                  alt="Avatar"
                />
                <div className="absolute -bottom-1 -right-1 bg-[#00F5FF] w-6 h-6 rounded-full border-4 border-[#050505] z-20" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-heading text-xl">{user?.name}</h3>
                <p className="text-[#00F5FF] text-xs font-bold tracking-[0.2em] uppercase italic">{user?.handle}</p>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="text-left">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Aura Tier</p>
                  <p className="text-sm font-semibold text-[#A349F5]">{user?.auraTier}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Points</p>
                  <p className="text-sm font-semibold text-white">{user?.auraPoints}</p>
                </div>
              </div>

              <NeonButton variant="ghost" className="w-full text-xs" size="sm">Modify Identity</NeonButton>
            </div>
          </GlassCard>

          <div className="px-4">
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mb-4">Aura Leaders</h4>
            {leaders.length === 0 ? (
              <p className="text-[9px] text-white/10 uppercase font-black italic tracking-widest">Scanning Neural Mesh...</p>
            ) : (
              leaders.map((leader, i) => (
                <div key={leader.handle} className="flex items-center space-x-3 mb-4 last:mb-0 group cursor-pointer">
                  <img src={leader.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(leader.full_name)}&background=random&color=fff`} className="w-8 h-8 rounded-full border border-white/10 grayscale group-hover:grayscale-0 transition-all" alt="" />
                  <div className="flex-grow">
                    <p className="text-[10px] font-heading text-white/60 group-hover:text-white transition-colors">@{leader.handle}</p>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest">{leader.aura_tier}</p>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold",
                    i === 0 ? "text-[#FFD700]" : i === 1 ? "text-[#C0C0C0]" : i === 2 ? "text-[#CD7F32]" : "text-white/20"
                  )}>#{i + 1}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: The Feed */}
        <div className="lg:col-span-6 space-y-8">
          {/* Quick Composer Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setComposerOpen(true)}
              className="bg-[#A349F5]/10 hover:bg-[#A349F5]/20 border border-[#A349F5]/30 rounded-2xl p-6 text-left transition-all group"
            >
              <Plus className="text-[#A349F5] mb-4 group-hover:scale-125 transition-transform" />
              <h4 className="font-heading text-lg text-white">Broadcast Signal</h4>
              <p className="text-white/40 text-xs mt-1 italic">Share updates, links, or drops.</p>
            </button>
            <button className="bg-[#00F5FF]/10 hover:bg-[#00F5FF]/20 border border-[#00F5FF]/30 rounded-2xl p-6 text-left transition-all group">
              <ShoppingBag className="text-[#00F5FF] mb-4 group-hover:scale-125 transition-transform" />
              <h4 className="font-heading text-lg text-white">Market Protocol</h4>
              <p className="text-white/40 text-xs mt-1 italic">Launch a trade or escrow bid.</p>
            </button>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-12 h-12 border-4 border-[#A349F5]/20 border-t-[#A349F5] rounded-full animate-spin"></div>
              </div>
            ) : pulses.length === 0 ? (
              <div className="text-center p-12 text-white/20">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="font-heading italic">No active signals found in the {vector} vector.</p>
              </div>
            ) : (
              pulses.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <GlassCard className="p-8 group">
                    <div className="flex items-start space-x-4">
                      <img src={p.author_avatar} className="w-12 h-12 rounded-full border border-white/10" alt="" />
                      <div className="flex-grow space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                             <span className="font-heading text-white">{p.author_name}</span>
                             <span className="text-[#00F5FF] text-[10px] font-bold uppercase italic opacity-60">@{p.author_handle}</span>
                          </div>
                          <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        
                        <p className="text-white/70 leading-relaxed text-lg">{p.content}</p>

                        {p.media_url && (
                          <div className="rounded-2xl overflow-hidden border border-white/10 mt-4">
                            <img src={p.media_url} className="w-full object-cover max-h-96" alt="Pulse Content" />
                          </div>
                        )}

                        <div className="flex items-center space-x-8 pt-4 border-t border-white/5">
                           <button onClick={() => reactToPulse(p.id, 'heart')} className="flex items-center space-x-2 group/btn">
                             <Heart className="w-4 h-4 text-white/40 group-hover/btn:text-[#FF2E2E] transition-colors" />
                             <span className="text-[10px] font-bold text-white/40 group-hover/btn:text-white">{p.hearts}</span>
                           </button>
                           <button onClick={() => reactToPulse(p.id, 'echo')} className="flex items-center space-x-2 group/btn">
                             <Repeat className="w-4 h-4 text-white/40 group-hover/btn:text-[#00F5FF] transition-colors" />
                             <span className="text-[10px] font-bold text-white/40 group-hover/btn:text-white">{p.echoes}</span>
                           </button>
                           <button className="flex items-center space-x-2 group/btn">
                             <MessageSquare className="w-4 h-4 text-white/40 group-hover/btn:text-[#A349F5] transition-colors" />
                           </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Right: Node Intelligence */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          <GlassCard className="p-6 border-[#00F5FF]/20">
            <h4 className="flex items-center space-x-2 text-[#00F5FF] font-heading mb-4">
              <ShoppingBag className="w-4 h-4" />
              <span>MARKET ECHOES</span>
            </h4>
            <div className="space-y-4">
               {marketEchoes.length === 0 ? (
                 <div className="p-4 bg-white/5 rounded-xl border border-white/5 italic text-[9px] text-white/10 text-center uppercase tracking-widest">
                   Waiting for trade signals...
                 </div>
               ) : (
                 marketEchoes.slice(0, 3).map(echo => (
                   <div key={echo.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-[#00F5FF]/20 transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-black text-[#00F5FF] uppercase tracking-widest">{echo.type} Signal</span>
                        <span className="text-[8px] text-white/20">{new Date(echo.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-white/60 line-clamp-2 group-hover:text-white transition-colors">{echo.content}</p>
                      {echo.deal_price && (
                        <p className="mt-2 text-[11px] font-black text-white">KES {echo.deal_price.toLocaleString()}</p>
                      )}
                   </div>
                 ))
               )}
            </div>
          </GlassCard>

          <GlassCard className="p-0 overflow-hidden bg-[#A349F5]/30">
            <div className="p-6 space-y-4">
              <h4 className="font-heading text-white italic">Aura Tier: {user?.auraTier || 'Standard'}</h4>
              <p className="text-white/60 text-xs leading-relaxed">
                {user?.auraPoints || 0} Points. 
                {user?.auraTier === 'legendary' 
                  ? 'Ultimate identity status achieved.' 
                  : 'Acquire more points to unlock higher identity nodes.'}
              </p>
              <NeonButton variant="purple" size="sm" className="w-full">
                {user?.auraTier === 'legendary' ? 'Identity Optimized' : 'Initiate Upgrade'}
              </NeonButton>
            </div>
            <div className="h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          </GlassCard>
        </div>
      </div>

      {/* Composer Modal */}
      <AnimatePresence>
        {composerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComposerOpen(false)}
              className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl"
            >
              <GlassCard className="p-8 border-[#A349F5]/50 shadow-[0_0_50px_rgba(163,73,245,0.2)]">
                <h3 className="text-2xl font-heading mb-6 italic">Broadcast Signal</h3>
                <textarea 
                  value={newPulseContent}
                  onChange={(e) => setNewPulseContent(e.target.value)}
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-xl placeholder:text-white/10 focus:border-[#A349F5] focus:ring-4 focus:ring-[#A349F5]/10 outline-none transition-all resize-none"
                  placeholder="What is the community signal?"
                />
                <div className="flex items-center justify-between mt-8">
                  <div className="flex items-center space-x-2">
                    <button className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all"><LayoutGrid className="w-5 h-5"/></button>
                    <button className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all"><Share2 className="w-5 h-5"/></button>
                  </div>
                  <div className="flex space-x-4">
                    <button onClick={() => setComposerOpen(false)} className="text-white/40 hover:text-white font-semibold text-sm">Discard</button>
                    <NeonButton onClick={handlePost} variant="purple">Transmit Signal</NeonButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
