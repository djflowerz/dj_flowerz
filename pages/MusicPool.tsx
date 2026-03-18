import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MONTHS, SUBSCRIPTION_PLANS } from '../constants';
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

const GENRES = [
  'Afrobeats', 'Amapiano', 'Bongo', 'Dancehall', 'Drill', 
  'Edits / Mashups', 'Gengetone', 'Gospel', 'Hip Hop', 
  'House', 'Pop', 'R&B', 'Reggae', 'Riddim'
].sort();
const HUBS = ['All Hubs', 'Remix & Mashups Hub', 'Amapiano', 'Hype Edits', 'Kenyan Love Songs Hype', 'Bongo Flava (TBT) Hype', "Riddimz F'"];

// --- UI Components ---
const FilterDropdown = ({ 
  label, 
  value, 
  options, 
  onChange, 
  icon: Icon 
}: { 
  label: string; 
  value: string; 
  options: (string | number)[]; 
  onChange: (val: string) => void;
  icon?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-6 py-4 bg-white/[0.03] border rounded-2xl transition-all duration-300 group ${isOpen ? 'border-brand-purple/50 bg-white/[0.05]' : 'border-white/5 hover:border-white/10'}`}
      >
        {Icon && <Icon size={16} className={isOpen ? 'text-brand-purple' : 'text-gray-500'} />}
        <div className="text-left">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white font-bold uppercase tracking-wide truncate max-w-[120px]">
              {value || `Select ${label}`}
            </span>
            <ChevronDown size={14} className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#15151A] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden"
          >
            <div className="max-h-[300px] overflow-y-auto py-2 px-2 custom-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(String(opt));
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${String(opt) === value ? 'bg-brand-purple text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      
      // Get the next midnight UTC
      const tomorrowUTC = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0, 0, 0
      ));

      const difference = tomorrowUTC.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft(
          `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
        );
      } else {
        setTimeLeft('00h 00m 00s');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 mt-1">
       <Clock size={12} className="text-gray-500" />
       <span className="text-gray-400 text-xs font-bold tracking-wider">
          Resets in <span className="text-brand-purple">{timeLeft}</span>
       </span>
    </div>
  );
};

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
  const isActive = player.track?.id === track.id;
  const isPlaying = isActive && player.isPlaying;
  const defaultVersionId = track.versions?.[0]?.id;

  return (
    <div className="group relative transition-all duration-300">
      <div className="bg-[#15151A] border border-white/5 rounded-3xl p-6 flex flex-col lg:flex-row lg:items-center gap-6 hover:border-white/10 hover:bg-[#1a1a22] transition-all">
        {/* Track Main Info */}
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div 
            className="relative group shrink-0 cursor-pointer"
            onClick={() => onPlay(track, defaultVersionId)}
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 group-hover:border-brand-purple/50 transition-colors text-white">
              <img src={track.image_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&h=120&fit=crop'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={track.title} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-[2px]">
              {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white fill-current" />}
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
          <div className="flex flex-wrap items-center gap-2">
            {isLocked ? (
              <a 
                href="#plans"
                className="bg-white/5 hover:bg-white/10 text-brand-purple px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-purple/30 transition-all flex items-center gap-2"
              >
                <Lock size={14} />
                Join to Download
              </a>
            ) : (
              <>
                {track.versions?.map((v: any) => {
                  const isVersionPlaying = isActive && player.versionId === v.id && player.isPlaying;
                  return (
                    <div 
                      key={v.id} 
                      className="flex items-center gap-1 bg-[#1a1a22] border border-white/5 p-1 rounded-2xl hover:border-brand-purple/30 transition-all"
                    >
                      <span className="pl-3 pr-2 text-[10px] font-black uppercase text-gray-400 border-r border-white/5">
                        {v.type || v.label}
                      </span>
                      
                      <button 
                        onClick={() => onPlay(track, v.id)}
                        className={`p-2 rounded-xl transition-all ${isVersionPlaying ? 'text-brand-purple bg-brand-purple/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                        title={isVersionPlaying ? "Pause Preview" : "Play Preview"}
                      >
                        {isVersionPlaying ? <Pause size={14} /> : <Play size={14} className="fill-current" />}
                      </button>

                      <button 
                        onClick={() => onDownload(track, v.id)}
                        className="p-2 rounded-xl text-gray-500 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                        title="Download Version"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  );
                })}
                <button 
                  onClick={() => onDownload(track, 'ALL')}
                  className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 transition-all group/bulk"
                  title="Download All Versions"
                >
                  <Package size={18} className="text-gray-400 group-hover/bulk:text-brand-cyan transition-colors" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function MusicPool() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  const isSubscriber = user?.isSubscriber || isAdmin;

  const { poolTracks, poolLoading, poolPagination, refreshPoolTracks } = useData();
  const navigate = useNavigate();
  const [usage, setUsage] = useState({ limit: 0, count: 0 });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [activeHub, setActiveHub] = useState('All Hubs');
  const [activeGenre, setActiveGenre] = useState('All Genres');
  const [activeYear, setActiveYear] = useState('All Years');
  const [activeMonth, setActiveMonth] = useState('All Months');
  
  const [player, setPlayer] = useState<PlayerState>({ track: null, isPlaying: false });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync usage stats if available
  useEffect(() => {
    if (user) {
      const getLimit = (plan?: string) => {
        if (isAdmin) return 999999;
        switch (plan) {
          case 'yearly':
          case '6months':
          case '3months':
            return 200;
          case 'monthly':
            return 100;
          case 'weekly':
            return 50;
          case 'trial':
            return 5;
          default:
            return 0;
        }
      };

      setUsage({
        limit: getLimit(user.subscriptionPlan as string),
        count: user.subscriptionPlan === 'trial' ? (user.downloadCountTotal || 0) : (user.downloadsToday || 0)
      });
    }
  }, [user, isAdmin]);

  // Call refresh when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshPoolTracks({
        page: 1,
        limit: 50,
        hub: activeHub,
        genre: activeGenre,
        year: activeYear,
        month: activeMonth,
        search: filters.search
      });
    }, 400); // debounce search
    return () => clearTimeout(timeoutId);
  }, [activeHub, activeGenre, activeYear, activeMonth, filters.search, refreshPoolTracks]);

  const loadMore = useCallback(() => {
    if (poolPagination && poolPagination.page < poolPagination.totalPages && !poolLoading) {
      const nextPage = poolPagination.page + 1;
      refreshPoolTracks({
        page: nextPage,
        limit: 50,
        hub: activeHub,
        genre: activeGenre,
        year: activeYear,
        month: activeMonth,
        search: filters.search
      });
    }
  }, [poolPagination, poolLoading, activeHub, activeGenre, activeYear, activeMonth, filters.search, refreshPoolTracks]);

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

    const triggerDownload = async (v: any) => {
      const url = v.downloadUrl || v.previewUrl || track.downloadUrl || track.previewUrl;
      if (!url) {
        toast.error("Download URL not found.");
        return;
      }

      if (!isAdmin && usage.count >= usage.limit) {
         toast.error(`Daily download limit reached (${usage.limit}). Please upgrade or wait for refresh.`);
         return;
      }

      const toastId = toast.loading(`Preparing download for ${track.title}...`);
      
      try {
        const { downloadFileSecurely } = await import('../utils/downloadHelper');
        
        const result = await downloadFileSecurely(url, {
           fileName: `${track.artist} - ${track.title} (${v.type || 'Track'}).mp3`,
           trackId: track.id,
           type: 'track'
        });

        if (result.success) {
           toast.success(`Downloading ${track.title}`, { id: toastId });
           if (!isAdmin) {
              setUsage(u => ({ ...u, count: u.count + 1 }));
           }
        } else {
           toast.error(result.error || "Download failed. Please try again or check your limits.", { id: toastId });
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred during download.", { id: toastId });
      }
    };

    if (versionId === 'ALL') {
      toast.info(`Preparing bulk download for ${track.title}...`);
      track.versions?.forEach((v, i) => {
        setTimeout(() => triggerDownload(v), i * 1500);
      });
      return;
    }

    const version = track.versions?.find(v => v.id === versionId) || track.versions?.[0] || { type: 'Edit' };
    await triggerDownload(version);

  }, [user, isSubscriber, isAdmin, usage]);

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
          <div className="flex flex-col gap-8 mb-10">
            <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Stream Preview</h2>
                <div className="flex items-center gap-2 text-brand-cyan text-[10px] font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                  Database Sync: Active
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group flex-1 lg:flex-none">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-cyan transition-colors" size={18} />
                   <input 
                      type="text" 
                      placeholder="SEARCH TRACKS..."
                      value={filters.search}
                      onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                      className="bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all min-w-full lg:min-w-[400px] uppercase font-bold tracking-widest"
                   />
                </div>
              </div>
            </div>

            {/* Selectors Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
              <FilterDropdown 
                label="Hub"
                value={activeHub}
                options={['All Hubs', ...HUBS.filter(h => h !== 'All Hubs')]}
                onChange={setActiveHub}
                icon={Radio}
              />
              <FilterDropdown 
                label="Genre"
                value={activeGenre}
                options={['All Genres', ...GENRES]}
                onChange={setActiveGenre}
                icon={Music2}
              />
              <FilterDropdown 
                label="Year"
                value={activeYear}
                options={['All Years', 2026, 2025, 2024, 2023, 2022, 2021, 2020]}
                onChange={setActiveYear}
                icon={Clock}
              />
              <FilterDropdown 
                label="Month"
                value={activeMonth}
                options={['All Months', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']}
                onChange={setActiveMonth}
                icon={Filter}
              />
            </div>
          </div>

          <div className="relative">
            {!isSubscriber && (
               <div className="mb-10 bg-brand-purple/10 border border-brand-purple/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-purple/20 flex items-center justify-center">
                       <Lock size={20} className="text-brand-purple" />
                    </div>
                    <div className="text-left">
                       <h4 className="text-white font-bold text-sm uppercase tracking-tight">Browse Mode Active</h4>
                       <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Subscribe to download from the full arsenal</p>
                    </div>
                 </div>
                 <a href="#plans" className="bg-brand-purple text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-purple/20 hover:shadow-brand-purple/40 hover:-translate-y-0.5 transition-all">
                   Unlock Full Access
                 </a>
               </div>
            )}

            {isSubscriber && !isAdmin && (
               <div className="mb-10 flex flex-wrap items-center justify-between gap-6 px-2">
                 <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl border ${usage.count >= usage.limit ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                       <Fuel size={20} />
                    </div>
                    <div>
                       <div className="flex items-baseline gap-2">
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Daily Downloads</p>
                       </div>
                       <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-white font-black text-2xl">{usage.count}</span>
                          <span className="text-gray-600 text-sm font-bold">/ {usage.limit}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex-1 max-w-[400px]">
                    <div className="flex justify-between items-end mb-2">
                       <CountdownTimer />
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                          className={`h-full ${usage.count >= usage.limit ? 'bg-red-500' : 'bg-brand-purple'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((usage.count / usage.limit) * 100, 100)}%` }}
                       />
                    </div>
                 </div>
               </div>
            )}

            <div className="space-y-4">
               {poolLoading ? (
                 <div className="py-32 flex flex-col items-center justify-center text-gray-500">
                   <div className="w-16 h-16 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mb-8"></div>
                   <p className="text-[10px] uppercase tracking-[0.4em] font-black animate-pulse">Scanning Hubs...</p>
                 </div>
               ) : (
                 <>
                 <Virtuoso
                    useWindowScroll
                    data={poolTracks}
                    endReached={loadMore}
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
                 {poolLoading && poolTracks.length > 0 && (
                   <div className="py-8 flex justify-center">
                     <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
                   </div>
                 )}
                 </>
               )}
            </div>
          </div>
        </section>

        {/* Subscription Plans Section */}
        {!isSubscriber && (
          <section id="plans" className="mb-32">
            <div className="text-center mb-16">
              <h2 className="font-display font-black text-4xl md:text-5xl text-white mb-4 uppercase tracking-tighter">Choose Your <span className="text-brand-purple">Frequency</span></h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Select the plan that matches your performance schedule. Every tier includes access to premium edits and mashups.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SUBSCRIPTION_PLANS
                .filter(plan => plan.active && (!plan.isTrial || !user?.hasUsedTrial))
                .map((plan) => (
                  <SubscriptionPlan 
                    key={plan.id}
                    icon={
                      plan.id === 'yearly' ? <Crown className="text-yellow-500" /> :
                      plan.id === '6months' ? <Flame className="text-orange-500" /> :
                      plan.id === '3months' ? <Rocket className="text-blue-500" /> :
                      plan.id === 'monthly' ? <ZapIcon className="text-brand-purple" /> :
                      plan.id === 'weekly' ? <Music2 className="text-brand-cyan" /> :
                      <Package className="text-gray-400" />
                    }
                    title={plan.name}
                    price={plan.price}
                    period={plan.period}
                    features={plan.features}
                    highlight={plan.isBestValue || plan.id === '6months' || plan.id === '3months'}
                    onSelect={() => (window.location.href = user ? `/checkout?plan=${plan.id}` : `/signup/?plan=${plan.id}`)}
                  />
                ))}
            </div>
          </section>
        )}

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
            <div className="max-w-7xl mx-auto px-6 h-28 flex items-center gap-6">
               <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 group-hover:border-brand-purple/50 transition-colors bg-black">
                    {(player.track.previewUrl?.endsWith('.mp4') || player.track.versions?.find(v => v.id === player.versionId)?.previewUrl?.endsWith('.mp4')) ? (
                      <video 
                        src={player.track.versions?.find(v => v.id === player.versionId)?.previewUrl || player.track.previewUrl} 
                        className="w-full h-full object-cover"
                        autoPlay={player.isPlaying}
                        muted
                        playsInline
                        loop
                      />
                    ) : (
                      <img src={player.track.image_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&h=120&fit=crop'} className={`w-full h-full object-cover transition-transform duration-700 ${player.isPlaying && 'animate-[spin_10s_linear_infinite]'}`} alt={player.track.title} />
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl pointer-events-none">
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
                   onClick={() => {
                     setPlayer(p => ({ ...p, isPlaying: !p.isPlaying }));
                     if (player.isPlaying) audioRef.current?.pause();
                     else audioRef.current?.play();
                   }}
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
