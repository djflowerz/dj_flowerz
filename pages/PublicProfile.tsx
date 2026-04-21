import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { 
  ShieldCheck, 
  Zap, 
  Trophy, 
  Activity, 
  MapPin, 
  Link as LinkIcon,
  MessageSquare,
  Repeat,
  Heart
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
}

interface Pulse {
  id: string;
  content: string;
  media_url?: string;
  created_at: string;
  hearts: number;
  echoes: number;
}

export default function PublicProfile() {
  const { handle } = useParams();
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const cleanHandle = handle?.replace(/^@/, '');
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/handle/${cleanHandle}`);
        const data = await resp.json();
        
        if (data && !data.available) {
          setProfile(data);
          setPulses(data.pulses || []);
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error("Profile resolution failure:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [handle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00F5FF]/20 border-t-[#00F5FF] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] font-sans pb-20">
      {/* Banner */}
      <div className="h-80 w-full relative overflow-hidden bg-[#111]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505] z-10" />
        <img 
          src={profile?.banner_url || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=2070'} 
          className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700" 
          alt="Banner" 
        />
        <div className="absolute inset-0 bg-[#A349F5]/10 mix-blend-overlay" />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-32 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Identity Card */}
          <div className="lg:col-span-4 space-y-6">
            <GlassCard className="p-8 group hover:border-[#00F5FF]/30">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#00F5FF]/20 rounded-full blur-2xl animate-pulse"></div>
                  <img 
                    src={profile?.avatar_url || 'https://via.placeholder.com/150'} 
                    className="w-32 h-32 rounded-full border-4 border-[#050505] relative z-10 p-1 bg-[#050505] shadow-[0_0_40px_rgba(0,245,255,0.2)]" 
                    alt="Avatar" 
                  />
                  {profile?.is_verified && (
                    <div className="absolute bottom-1 right-1 bg-[#00F5FF] p-2 rounded-full border-4 border-[#050505] z-30">
                      <ShieldCheck className="w-4 h-4 text-[#050505]" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h1 className="text-3xl font-heading tracking-tight">{profile?.full_name}</h1>
                  <p className="text-[#00F5FF] font-bold text-sm tracking-[0.2em] italic">@{profile?.handle}</p>
                </div>

                <div className="flex bg-white/5 rounded-2xl p-4 w-full border border-white/5 space-x-4">
                  <div className="flex-1 border-r border-white/5">
                    <p className="text-[10px] text-white/30 uppercase font-black mb-1">Aura Level</p>
                    <p className="text-xl font-heading text-white">{profile?.aura_points}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-[#A349F5] uppercase font-black mb-1">Tier Status</p>
                    <p className="text-xl font-heading text-[#A349F5]">{profile?.aura_tier}</p>
                  </div>
                </div>

                <p className="text-white/50 text-sm leading-relaxed px-2">
                  {profile?.bio || "No synchronization broadcast yet. This operator is actively monitoring the Pulse hub."}
                </p>

                <div className="w-full space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center text-white/40 text-xs px-2">
                    <MapPin className="w-3 h-3 mr-2" />
                    <span>{profile?.location || 'Undisclosed Node'}</span>
                  </div>
                  <div className="flex items-center text-white/40 text-xs px-2">
                    <LinkIcon className="w-3 h-3 mr-2" />
                    <span className="text-[#00F5FF] truncate cursor-pointer hover:underline">djflowerz.co.ke/op/{profile?.handle}</span>
                  </div>
                </div>

                <NeonButton variant="cyan" className="w-full" size="md">Transmit Signal</NeonButton>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4 flex items-center">
                <Trophy className="w-3 h-3 mr-2" />
                Verified Badges
              </h4>
              <div className="flex flex-wrap gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#A349F5]/10 border border-[#A349F5]/20 flex items-center justify-center p-2" title="Early Adopter">
                   <Zap className="w-full h-full text-[#A349F5]" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 opacity-20 flex items-center justify-center p-2">
                   <Activity className="w-full h-full text-white" />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Signal History */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex space-x-8">
                <button className="text-white border-b-2 border-[#00F5FF] pb-4 px-2 font-bold tracking-widest text-xs uppercase">Broadcasts</button>
                <button className="text-white/30 hover:text-white pb-4 px-2 font-bold tracking-widest text-xs uppercase transition-colors">Echoes</button>
                <button className="text-white/30 hover:text-white pb-4 px-2 font-bold tracking-widest text-xs uppercase transition-colors">Media</button>
              </div>
            </div>

            <div className="space-y-6">
              {pulses.length === 0 ? (
                <div className="text-center py-24 bg-white/[0.01] rounded-[2.5rem] border border-dashed border-white/5">
                  <Activity className="w-12 h-12 mx-auto text-white/10 mb-4" />
                  <p className="text-white/20 font-heading italic text-xl">No active signals detected from this operator.</p>
                </div>
              ) : (
                pulses.map((p) => (
                  <GlassCard key={p.id} className="p-8">
                    <p className="text-white/80 text-lg leading-relaxed">{p.content}</p>
                    <div className="flex items-center space-x-6 mt-6 pt-6 border-t border-white/5">
                      <div className="flex items-center space-x-2 text-white/40">
                         <Heart className="w-4 h-4" />
                         <span className="text-xs font-bold">{p.hearts}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-white/40">
                         <Repeat className="w-4 h-4" />
                         <span className="text-xs font-bold">{p.echoes}</span>
                      </div>
                      <span className="text-white/10 text-[10px] font-bold tracking-widest uppercase ml-auto">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
