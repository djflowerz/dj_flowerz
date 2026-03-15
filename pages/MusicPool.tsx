import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import {
  Search, Download, Play, Pause, X, ChevronDown,
  Music2, Radio, Filter, Zap, CheckCircle2, AlertCircle,
  Clock, SortAsc, SortDesc, Disc3, Fuel, ChevronRight,
  Star, Lock, Check, Crown, Flame, Rocket, Zap as ZapIcon,
  PlayCircle, Package
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Track } from '../types';
import { MONTHS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { fetchPoolTracks, trackPoolDownload, fetchPoolFilters } from '../utils/r2';
import AccessDenied from '../components/AccessDenied';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface PlayerState {
  track: Track | null;
  versionId?: string;
  isPlaying: boolean;
}

interface Filters {
  search: string;
  hub: string;
  genre: string;
  year: string;
  vibe: string;
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  hub: '',
  genre: '',
  year: '',
  vibe: '',
};

const GENRES = ['Afrobeats', 'Amapiano', 'Hip Hop', 'R&B', 'Dancehall', 'Drill', 'Gengetone', 'House', 'Edits / Mashups'];
const HUBS = ['All Hubs', 'Remix & Mashups Hub', 'Amapiano', 'Hype Edits', 'Kenyan Love Songs Hype', 'Bongo Flava (TBT) Hype', "Riddimz F'"];

// --- Helpers ---
const normalise = (s: string) => s.toLowerCase().trim();

function groupTracks(tracks: Track[]): Track[] {
  const map = new Map<string, Track>();
  tracks.forEach(t => {
    let baseTitle = t.title.trim();
    const versionRegex = /[\(\[]?(Remix|Club|Edit|Radio|Intro|Clean|Dirty|Hype|Acapella|Instrumental|Main|Extended|Dub|Refix|Bootleg|Mashup|VIP)[\)\]]?/i;
    let matchedVersion = '';
    const vMatch = baseTitle.match(versionRegex);
    if (vMatch) {
      matchedVersion = vMatch[0].replace(/[\(\)\[\]]/g, '').trim();
      baseTitle = baseTitle.replace(vMatch[0], '').replace(/\s+-\s*$/, '').replace(/\(\s*\)$/, '').trim();
    }

    const key = `${t.artist.trim().toLowerCase()}::${baseTitle.toLowerCase()}`;
    const trackVersions = [...(t.versions || [])].filter(v => v && v.id);

    if (trackVersions.length === 0) {
      trackVersions.push({
        id: t.id,
        type: matchedVersion || t.displayGenre || 'Main',
        previewUrl: t.previewUrl,
        downloadUrl: t.downloadUrl || t.previewUrl,
        label: matchedVersion || 'Main'
      });
    }

    if (!map.has(key)) {
      map.set(key, { ...t, title: baseTitle, versions: trackVersions });
    } else {
      const existing = map.get(key)!;
      trackVersions.forEach(nv => {
        if (!existing.versions!.some(ev => ev.id === nv.id || ev.previewUrl === nv.previewUrl)) {
          existing.versions!.push(nv);
        }
      });
    }
  });
  return Array.from(map.values());
}

// --- Components ---

const SubscriptionPlan = ({ 
  icon: Icon, 
  title, 
  price, 
  period, 
  savings, 
  features, 
  highlight, 
  onSelect 
}: any) => (
  <div className={`relative p-8 rounded-[2rem] border transition-all duration-500 group hover:shadow-2xl ${highlight ? 'bg-gradient-to-br from-[#15151A] to-[#1a1a22] border-brand-purple/50 shadow-brand-purple/10' : 'bg-white/[0.02] border-white/5 hover:border-brand-purple/30'}`}>
    {highlight && (
      <div className="absolute top-0 right-0 bg-brand-purple text-white text-[10px] uppercase font-bold px-4 py-1 rounded-bl-xl tracking-widest">
        Best Value
      </div>
    )}
    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-500">{Icon}</div>
    <h3 className="font-display font-bold text-xl text-white mb-2">{title}</h3>
    <div className="flex items-baseline gap-1 mb-1">
      <span className="text-3xl font-bold text-white">KES {price.toLocaleString()}</span>
      <span className="text-gray-500 text-sm">/{period}</span>
    </div>
    {savings && <p className={`text-xs font-bold mb-6 ${highlight ? 'text-green-400' : 'text-brand-purple italic'}`}>{savings}</p>}
    <ul className="text-sm text-gray-400 space-y-3 mb-8">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex items-center gap-2">
          <Check size={14} className="text-brand-cyan" />
          {f}
        </li>
      ))}
    </ul>
    <button 
      onClick={onSelect}
      className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${highlight ? 'bg-brand-purple text-white hover:shadow-[0_10px_30px_rgba(123,92,255,0.4)] hover:-translate-y-1' : 'border border-brand-purple/50 text-brand-purple hover:bg-brand-purple/10'}`}
    >
      Select Plan
    </button>
  </div>
);

const TrackItem = React.memo(({ track, player, onPlay, onDownload, isLocked }: any) => {
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
  const isActive = player.track?.id === track.id;
  const isPlaying = isActive && player.isPlaying;
  const currentVersion = track.versions[selectedVersionIdx] || track.versions[0];

  return (
    <div className={`group relative transition-all duration-300 ${isLocked ? 'opacity-75' : ''}`}>
      <div className="bg-[#15151A] border border-white/5 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center gap-6 hover:border-white/10 hover:bg-[#1a1a22] transition-all">
        {/* Track Main Info */}
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div 
            className={`relative group shrink-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !isLocked && onPlay(track, currentVersion.id)}
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 group-hover:border-brand-purple/50 transition-colors">
              <img src={track.image_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&h=120&fit=crop'} className={`w-full h-full object-cover transition-transform duration-700 ${!isLocked && 'group-hover:scale-110'} ${isLocked ? 'grayscale' : ''}`} alt={track.title} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-[2px]">
              {isLocked ? <Lock size={20} className="text-gray-400" /> : isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white fill-current" />}
            </div>
          </div>
          
          <div className="min-w-0">
            <h3 className="text-white font-bold text-lg truncate uppercase tracking-tight group-hover:text-brand-purple transition-colors">{track.title}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-gray-400 text-sm font-medium">{track.artist}</span>
              <span className="text-brand-cyan text-[10px] font-black px-2 py-0.5 bg-brand-cyan/5 rounded-full border border-brand-cyan/20 uppercase tracking-widest leading-none">
                {track.displayGenre || track.genre}
              </span>
              <span className="text-brand-purple text-[10px] font-black px-2 py-0.5 bg-brand-purple/5 rounded-full border border-brand-purple/20 uppercase tracking-widest leading-none">
                {track.vibe || 'Hype'}
              </span>
              <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded-full leading-none">
                {track.releaseYear || track.year}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {isLocked ? (
            <div className="bg-brand-purple/10 border border-brand-purple/20 px-6 py-3 rounded-2xl flex flex-col items-center">
              <p className="text-[10px] font-black text-brand-purple uppercase tracking-[0.2em]">Subscriber Area</p>
              <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold">Upgrade for Access</p>
            </div>
          ) : (
            <>
              {/* Version Selector */}
              {track.versions && track.versions.length > 1 && (
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 self-center">
                  {track.versions.map((v: any, idx: number) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersionIdx(idx)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${idx === selectedVersionIdx ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                      {v.type || v.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Download Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onDownload(track, currentVersion.id)}
                  className="bg-brand-purple text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-lg shadow-brand-purple/20 hover:shadow-brand-purple/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  Download {currentVersion.type || currentVersion.label}
                </button>
                <button 
                  onClick={() => onDownload(track, 'ALL')}
                  className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 transition-all group/bulk"
                  title="Download All Versions"
                >
                  <Package size={18} className="text-gray-400 group-hover/bulk:text-brand-cyan transition-colors" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default function MusicPool() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSubscriber = !!user?.publicMetadata?.subscriptionPlan || isAdmin;

  const [poolTracks, setPoolTracks] = useState<Track[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [usage, setUsage] = useState({ limit: 0, count: 0 });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeHub, setActiveHub] = useState('All Hubs');
  const [activeGenre, setActiveGenre] = useState('All Genres');
  
  const [player, setPlayer] = useState<PlayerState>({ track: null, isPlaying: false });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchGatedPool = useCallback(async () => {
    setPoolLoading(true);
    const poolResult = await fetchPoolTracks();
    if (poolResult.isAuthorized || isAdmin) {
      setPoolTracks(groupTracks(poolResult.tracks));
      setUsage({
        limit: isAdmin ? 999999 : (poolResult.downloadLimit || 0),
        count: poolResult.downloadsCount || 0
      });
    } else {
      // If not authorized, we still want to show a preview if possible
      // But the groupTracks logic expects authenticated data
      setPoolTracks(groupTracks(poolResult.tracks || []));
    }
    setPoolLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    fetchGatedPool();
  }, [fetchGatedPool]);

  // Derived filtered tracks
  const filteredTracks = useMemo(() => {
    let list = poolTracks;
    
    if (filters.search) {
      const q = normalise(filters.search);
      list = list.filter(t => 
        normalise(t.title).includes(q) || 
        normalise(t.artist).includes(q)
      );
    }

    if (activeHub !== 'All Hubs') {
      list = list.filter(t => t.collectionHub === activeHub);
    }

    if (activeGenre !== 'All Genres') {
      list = list.filter(t => t.displayGenre === activeGenre || t.genre === activeGenre);
    }
    
    return list;
  }, [poolTracks, filters.search, activeHub, activeGenre]);

  const handlePlay = useCallback((track: Track, versionId?: string) => {
    setPlayer(prev => {
      const vid = versionId || track.versions?.[0]?.id;
      if (prev.track?.id === track.id && prev.versionId === vid) {
        if (prev.isPlaying) audioRef.current?.pause();
        else audioRef.current?.play();
        return { ...prev, isPlaying: !prev.isPlaying };
      }
      return { track, versionId: vid, isPlaying: true };
    });
  }, []);

  const handleDownload = useCallback(async (track: Track, versionId?: string) => {
    if (!user) {
      toast.error("Please login to download tracks.");
      return;
    }

    if (!isSubscriber) {
      toast.error("Subscription required for downloads.");
      return;
    }

    if (versionId === 'ALL') {
      toast.success(`Broadcasting bulk download for ${track.title}...`);
      track.versions?.forEach((v, i) => {
        setTimeout(async () => {
          const url = v.downloadUrl || v.previewUrl;
          if (url) {
            if (!isAdmin) await trackPoolDownload(track.id);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${track.artist} - ${track.title} (${v.type}).mp3`;
            a.click();
          }
        }, i * 1500);
      });
      return;
    }

    const version = track.versions?.find(v => v.id === versionId);
    const url = version?.downloadUrl || track.downloadUrl || track.previewUrl;
    
    if (url) {
      if (!isAdmin) {
        const ok = await trackPoolDownload(track.id);
        if (!ok) return;
        setUsage(u => ({ ...u, count: u.count + 1 }));
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.artist} - ${track.title} (${version?.type || 'Edit'}).mp3`;
      a.click();
      toast.success(`Downloading ${track.title}`);
    }
  }, [user, isSubscriber, isAdmin]);

  return (
    <div className="bg-[#0B0B0F] min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-[3rem] overflow-hidden mb-16 border border-white/10 group min-h-[450px]"
        >
          <div className="absolute inset-0 bg-[#0A0A0F]/60 z-10 transition-colors group-hover:bg-[#0A0A0F]/50"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0F] via-[#0B0B0F]/80 to-transparent z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=1600&h=600&fit=crop&q=80" 
            alt="Music Pool Hero" 
            className="w-full h-full object-cover absolute inset-0 opacity-40 group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="relative z-20 p-12 md:p-24 flex flex-col justify-center min-h-[450px]">
             <span className="text-brand-cyan font-bold uppercase tracking-[0.4em] text-[10px] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
                Fresh Selection Updated Weekly
             </span>
             <h1 className="font-display font-black text-6xl md:text-8xl text-white mb-6 leading-[0.9] tracking-tighter uppercase">
               The Tech <br/><span className="bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">DJ Hub</span>
             </h1>
             <p className="text-gray-300 text-lg md:text-xl max-w-xl mb-10 leading-relaxed font-light">
               The most powerful curated library for modern DJs. Exclusive edits, technical redrums, and high-fidelity mashups.
             </p>
             <div className="flex flex-wrap gap-4">
               <a href="#plans" className="bg-brand-purple px-10 py-5 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-[0_10px_40px_rgba(123,92,255,0.4)] hover:shadow-[0_15px_60px_rgba(123,92,255,0.6)] hover:-translate-y-1 transition-all">
                 View Access Plans
               </a>
             </div>
          </div>
        </motion.div>

        {/* Genre Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-16 px-2 overflow-x-auto pb-4 scrollbar-hide">
          <button 
            onClick={() => setActiveGenre('All Genres')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeGenre === 'All Genres' ? 'bg-brand-purple text-white shadow-[0_5px_20px_rgba(123,92,255,0.4)]' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'}`}
          >
            All Genres
          </button>
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => setActiveGenre(genre)}
              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeGenre === genre ? 'bg-brand-purple text-white shadow-[0_5px_20px_rgba(123,92,255,0.4)]' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20'}`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Tracks Area */}
        <section className="mb-24 px-2">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Stream Preview</h2>
              <div className="flex items-center gap-2 text-brand-cyan text-[10px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan"></span>
                Database Sync: Active
              </div>
            </div>
            
            <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-cyan transition-colors" size={18} />
               <input 
                  type="text" 
                  placeholder="SEARCH ARCHIVES..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all min-w-[300px] uppercase font-bold tracking-widest"
               />
            </div>
          </div>

          <div className="relative">
            {!isSubscriber && poolTracks.length > 0 && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0B0B0F]/40 backdrop-blur-[2px] rounded-[2.5rem]">
                <div className="bg-[#15151A] p-8 md:p-12 rounded-[2.5rem] border border-brand-purple/30 shadow-2xl flex flex-col items-center text-center max-w-lg mx-6 group/lock">
                  <div className="w-20 h-20 rounded-3xl bg-brand-purple/10 flex items-center justify-center mb-6 border border-brand-purple/20 group-hover/lock:scale-110 transition-transform duration-500">
                    <Lock size={36} className="text-brand-purple" />
                  </div>
                  <h4 className="text-white font-black text-2xl mb-4 uppercase tracking-tighter">Terminal Locked</h4>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed">Unlock full access to browse, preview, and download from the industry's most advanced DJ arsenal.</p>
                  <a href="#plans" className="bg-brand-purple text-white px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-purple/30 hover:shadow-brand-purple/50 hover:-translate-y-1 transition-all">
                    Unlock Unlimited Access
                  </a>
                </div>
              </div>
            )}

            <div className={`space-y-4 ${!isSubscriber ? 'blur-[8px] pointer-events-none select-none' : ''}`}>
               {poolLoading ? (
                 <div className="py-32 flex flex-col items-center justify-center text-gray-500">
                   <div className="w-16 h-16 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mb-8"></div>
                   <p className="text-[10px] uppercase tracking-[0.4em] font-black animate-pulse">Scanning Hubs...</p>
                 </div>
               ) : (
                 <Virtuoso
                    useWindowScroll
                    data={filteredTracks}
                    style={{ height: 'auto' }}
                    itemContent={(index, track) => (
                      <div className="mb-4">
                        <TrackItem 
                           track={track} 
                           player={player} 
                           onPlay={handlePlay} 
                           onDownload={handleDownload}
                           isLocked={!isSubscriber}
                        />
                      </div>
                    )}
                 />
               )}
            </div>
          </div>
        </section>

        {/* Subscription Plans Section */}
        <section id="plans" className="mb-32">
          <div className="text-center mb-16">
            <h2 className="font-display font-black text-4xl md:text-5xl text-white mb-4 uppercase tracking-tighter">Choose Your <span className="text-brand-purple">Frequency</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Select the plan that matches your performance schedule. Every tier includes access to premium edits and mashups.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SubscriptionPlan 
              icon={<Crown className="text-yellow-500" />}
              title="1 Year Ultimate"
              price={6000}
              period="yr"
              savings="SAVE KSH 2,400 ✅"
              highlight
              features={[
                '12 months full access',
                'Unlimited downloads',
                'All old & new releases',
                'Complete Redrum Packs',
                'Weekly updates'
              ]}
              onSelect={() => (window.location.href = '/signup/?plan=year_ultimate')}
            />
            <SubscriptionPlan 
              icon={<Flame className="text-orange-500" />}
              title="6 Months Elite"
              price={3500}
              period="6mo"
              savings="SAVE KSH 700"
              features={[
                '6 months unlimited access',
                '200 downloads per day',
                'All releases & Redrums',
                'Mashups & Exclusive edits'
              ]}
              onSelect={() => (window.location.href = '/signup/?plan=six_months_elite')}
            />
            <SubscriptionPlan 
              icon={<Rocket className="text-blue-500" />}
              title="3 Months Club"
              price={1800}
              period="3mo"
              features={[
                '3 months full access',
                '200 downloads per day',
                'All new music updates',
                'Secure high-speed mirrors'
              ]}
              onSelect={() => (window.location.href = '/signup/?plan=three_months_club')}
            />
            <SubscriptionPlan 
              icon={<ZapIcon className="text-brand-purple" />}
              title="1 Month Pro"
              price={700}
              period="mo"
              features={[
                'Full 30 days access',
                '100 downloads per day',
                'High-quality 320kbps MP3s',
                'Advanced filtering'
              ]}
              onSelect={() => (window.location.href = '/signup/?plan=one_month_pro')}
            />
            <SubscriptionPlan 
              icon={<Music2 className="text-brand-cyan" />}
              title="1 Week Remix"
              price={200}
              period="wk"
              features={[
                '7 days full access',
                '50 downloads per day',
                'All remix packs included',
                'Mobile friendly downloads'
              ]}
              onSelect={() => (window.location.href = '/signup/?plan=one_week_remix')}
            />
             <SubscriptionPlan 
              icon={<Package className="text-gray-400" />}
              title="1 Week Free Trial"
              price={0}
              period="7days"
              features={[
                '7 days preview access',
                '5 downloads total',
                'Try library before you buy',
                'No card required'
              ]}
              onSelect={() => (window.location.href = '/signup/?plan=free_trial')}
            />
          </div>
        </section>

        {/* Hub Filters (Sub-Navigation) */}
        <section className="mb-24 px-2">
           <div className="flex justify-between items-end mb-10">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Hub Explorer</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Sectorized library access</p>
              </div>
           </div>
           
           <div className="overflow-x-auto pb-6 -mx-2 px-2 scrollbar-hide">
              <div className="flex gap-3 min-w-max">
                {HUBS.map(hub => (
                  <button
                    key={hub}
                    onClick={() => setActiveHub(hub)}
                    className={`px-8 py-3.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${activeHub === hub ? 'bg-brand-purple text-white shadow-lg border border-brand-purple' : 'bg-white/5 text-gray-500 border border-white/5 hover:border-brand-purple/30'}`}
                  >
                    {hub}
                  </button>
                ))}
              </div>
           </div>
        </section>

      </main>

      {/* Mini Player */}
      <AnimatePresence>
        {player.track && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-3xl border-t border-white/10"
          >
            <div className="max-w-7xl mx-auto px-6 h-24 flex items-center gap-6">
               <div className="relative group shrink-0">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 group-hover:border-brand-purple/50 transition-colors">
                    <img src={player.track.image_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&h=120&fit=crop'} className={`w-full h-full object-cover transition-transform duration-700 ${player.isPlaying && 'animate-[spin_10s_linear_infinite]'}`} alt={player.track.title} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-brand-purple animate-ping"></div>
                  </div>
               </div>

               <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold text-sm truncate uppercase tracking-tight">{player.track.title}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">{player.track.artist}</span>
                    <span className="text-brand-purple text-[9px] font-black bg-brand-purple/10 border border-brand-purple/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {player.track.versions?.find(v => v.id === player.versionId)?.type || 'Main Edit'}
                    </span>
                  </div>
               </div>

               <div className="flex items-center gap-6">
                 <button 
                   onClick={() => setPlayer(p => ({ ...p, isPlaying: !p.isPlaying }))}
                   className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                 >
                   {player.isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} className="ml-1" fill="black" />}
                 </button>
                 <button 
                    onClick={() => setPlayer({ track: null, isPlaying: false })} 
                    className="p-2 text-gray-500 hover:text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
               </div>
               
               <audio
                  ref={audioRef}
                  src={player.track.versions?.find(v => v.id === player.versionId)?.previewUrl || player.track.previewUrl}
                  autoPlay={player.isPlaying}
                  onEnded={() => setPlayer(p => ({ ...p, isPlaying: false }))}
                  onPlay={() => setPlayer(p => ({ ...p, isPlaying: true }))}
                  onPause={() => setPlayer(p => ({ ...p, isPlaying: false }))}
               />
            </div>
            {/* Progress Bar Mock */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
               <motion.div 
                 className="h-full bg-brand-purple"
                 animate={{ width: player.isPlaying ? '100%' : '0%' }}
                 transition={{ duration: 30, ease: 'linear' }}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
