import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import {
  Search, Download, Play, Pause, X, ChevronDown,
  Music, Video, Filter, Zap, CheckCircle2, AlertCircle,
  Clock, SortAsc, SortDesc, Disc3, Fuel, ChevronRight,
  Star, Lock, Check, Crown, Flame, Rocket, Zap as ZapIcon,
  PlayCircle, Package, Layers, Info, Volume2, Globe,
  ArrowLeft, ArrowRight, MapPin, Trash2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Track } from '../types';
import { MONTHS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { STORAGE_WORKER_URL } from '../utils/r2';

interface TrackVersion {
  id: string;
  version_name: string;
  preview_url: string;
  download_url: string;
  is_main_version: boolean;
}

// New Components
import { Sidebar } from '../components/music-pool/Sidebar';
import { TrackRow } from '../components/music-pool/TrackRow';
import { MediaOverlay } from '../components/music-pool/MediaOverlay';
import AccessDenied from '../components/AccessDenied';

// --- Constants ---
const MONTH_MAP: Record<string, string> = {
  'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
  'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
  'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
};

// --- Types ---
interface PlayerState {
  url: string | null;
  title: string;
  type: 'audio' | 'video';
  isPlaying: boolean;
}

// Filters are now fetched dynamically from the backend

export default function MusicPool() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  const isSubscriber = user?.isSubscriber || isAdmin;

  const { poolTracks, poolLoading, poolPagination, refreshPoolTracks } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [genreSearchTerm, setGenreSearchTerm] = useState('');
  const [activeHub, setActiveHub] = useState('all');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeSubGenre, setActiveSubGenre] = useState('all');
  const [activeYear, setActiveYear] = useState('All Years');
  const [activeMonth, setActiveMonth] = useState('All Months');
  const [bpmFilter, setBpmFilter] = useState<[number, number]>([60, 180]);
  const [activeKey, setActiveKey] = useState<string>('All Keys');
  const [hypeOnly, setHypeOnly] = useState(false);
  
  interface HubWithGenres {
    name: string;
    genres: {
      name: string;
      sub_genres: string[];
    }[];
  }
  
  const [dynamicFilters, setDynamicFilters] = useState<{
    hubsWithGenres: HubWithGenres[];
    years: { year: number; months: string[] }[];
  }>({ hubsWithGenres: [], years: [] });

  const fetchFilters = useCallback(async () => {
    try {
      const response = await fetch(`${STORAGE_WORKER_URL}/api/pool/filters`);
      if (response.ok) {
        const data = await response.json();
        // Validate shape before setting state — prevents React #31 crash if API returns error obj
        const safeHubs = Array.isArray(data?.hubsWithGenres) ? data.hubsWithGenres : [];
        const safeYears = Array.isArray(data?.years)
          ? data.years
              .filter((y: any) => y && typeof y.year === 'number' && Array.isArray(y.months))
              .map((y: any) => ({
                year: y.year,
                months: y.months.filter((m: any) => typeof m === 'string')
              }))
          : [];
        setDynamicFilters({ hubsWithGenres: safeHubs, years: safeYears });
      }
    } catch (err) {
      console.error("Error fetching filters:", err);
    }
  }, []);


  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);
  
  const [player, setPlayer] = useState<PlayerState>({ 
    url: null, 
    title: '', 
    type: 'audio', 
    isPlaying: false 
  });
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync refresh on filter change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const mappedMonth = activeMonth !== 'All Months' ? (MONTH_MAP[activeMonth] || activeMonth) : undefined;

      refreshPoolTracks({
        page: 1,
        limit: poolPagination?.limit || 50,
        hub: (activeHub === 'all' || activeHub === 'All Hubs') ? undefined : activeHub,
        genre: (activeGenre === 'All' || activeGenre === 'All Genres') ? undefined : activeGenre,
        sub_genre: (activeSubGenre === 'all' || activeSubGenre === 'All Sub-Genres') ? undefined : activeSubGenre,
        year: activeYear === 'All Years' ? undefined : activeYear,
        month: mappedMonth,
        search: searchTerm,
        bpmMin: bpmFilter[0],
        bpmMax: bpmFilter[1],
        key: activeKey === 'All Keys' ? undefined : activeKey,
        isHype: hypeOnly ? true : undefined
      });
    }, 400);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHub, activeGenre, activeSubGenre, activeYear, activeMonth, searchTerm, bpmFilter, activeKey, hypeOnly]);
  // Removal of loadMore as it's no longer used for infinite scroll

  const handlePageChange = useCallback((newPage: number) => {
    if (poolLoading) return;

    const mappedMonth = activeMonth !== 'All Months' ? (MONTH_MAP[activeMonth] || activeMonth) : undefined;

    refreshPoolTracks({
      page: newPage,
      limit: poolPagination?.limit || 50,
      hub: (activeHub === 'all' || activeHub === 'All Hubs') ? undefined : activeHub,
      genre: (activeGenre === 'All' || activeGenre === 'All Genres') ? undefined : activeGenre,
      sub_genre: (activeSubGenre === 'all' || activeSubGenre === 'All Sub-Genres') ? undefined : activeSubGenre,
      year: activeYear === 'All Years' ? undefined : activeYear,
      month: mappedMonth,
      search: searchTerm,
      bpmMin: bpmFilter[0],
      bpmMax: bpmFilter[1],
      key: activeKey === 'All Keys' ? undefined : activeKey
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeHub, activeGenre, activeSubGenre, activeYear, activeMonth, searchTerm, bpmFilter, refreshPoolTracks, poolLoading, poolPagination?.limit]);
  const handlePlay = useCallback((url: string, title: string, type: 'audio' | 'video', trackId?: string) => {
    const isActuallyVideo = type === 'video' || url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.webm');
    
    // Always open in MediaOverlay popup for all track types to satisfy "pop up for preview player" request
    setPlayer({ url, title, type: isActuallyVideo ? 'video' : 'audio', isPlaying: true, id: trackId });
    if (trackId) setExpandedTrackId(trackId);
    
    // Pause background footer audio if playing something new in the overlay
    if (audioRef.current) audioRef.current.pause();
    
    // Trigger the overlay
    setShowVideoOverlay(true);
  }, [poolTracks, expandedTrackId, player.isPlaying, player.url, audioRef]);

  const handleSkip = useCallback((direction: 'next' | 'prev') => {
    if (!poolTracks.length || !expandedTrackId) return;
    const currentIndex = poolTracks.findIndex(t => t.id === expandedTrackId);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= poolTracks.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = poolTracks.length - 1;
    
    const nextTrack = poolTracks[nextIndex];
    if (nextTrack) {
      const mainV = nextTrack.versions?.find(v => v.is_main_version) || nextTrack.versions?.[0];
      const getVersionType = (v: TrackVersion): 'audio' | 'video' => {
        const name = (v?.version_name || '').toLowerCase();
        const url = (v?.preview_url || '').toLowerCase();
        if (name.includes('video') || name.includes('visual') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) return 'video';
        return 'audio';
      };
      const url = nextTrack.videoUrl || mainV?.preview_url || '';
      const type = (nextTrack.videoUrl || (mainV && getVersionType(mainV) === 'video')) ? 'video' : 'audio';
      handlePlay(url, nextTrack.title, type, nextTrack.id);
    }
  }, [poolTracks, expandedTrackId, handlePlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleSkip('next');
      if (e.key === 'ArrowLeft') handleSkip('prev');
      if (e.key === ' ') {
        e.preventDefault();
        setPlayer(p => {
          const newPlaying = !p.isPlaying;
          if (audioRef.current) {
            if (newPlaying) audioRef.current.play();
            else audioRef.current.pause();
          }
          return { ...p, isPlaying: newPlaying };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);
  const handleDownload = useCallback(async (url: string, fileName: string, versionId?: string) => {
    if (!isSubscriber) {
      toast.error("Subscription required to download.");
      return;
    }
    
    if (!url) {
      toast.error("Download URL not available");
      return;
    }

    try {
      // Get session for token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      // 1. HIT THE TRACKING API (POST) - Non-blocking
      fetch(`${STORAGE_WORKER_URL}/api/pool/download`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url, versionId })
      }).catch(err => console.error("Tracking error:", err));

      // 2. TRIGGER NATIVE BROWSER DOWNLOAD IMMEDIATELY
      // We use the GET version of the endpoint with ?token=... to support window.location.href
      // This will return the body with Content-Disposition: attachment
      const workerUrl = STORAGE_WORKER_URL.startsWith('http') ? STORAGE_WORKER_URL : 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
      const downloadApiUrl = `${workerUrl}/api/pool/download?versionId=${encodeURIComponent(versionId || '')}&token=${token}&filename=${encodeURIComponent(fileName)}`;

      // Using a hidden iframe to trigger the download prevents 
      // the browser from replacing the current tab or opening a new tab
      // and breaking the single-page experience.
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = downloadApiUrl;
      document.body.appendChild(iframe);
      
      // Cleanup the iframe after a short delay
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 10000);
      
    } catch (err) {
      console.error("Download error:", err);
      // Fallback
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 10000);
    }
  }, [isSubscriber]);

  const handleDownloadAll = useCallback((track: any) => {
    if (!track.versions || track.versions.length === 0) return;
    
    toast.success(`Starting downloads for all versions of ${track.title}`);
    
    // To trigger multiple downloads at once without window.location.href overriding itself,
    // we use multiple hidden iframes or <a> tags.
    track.versions.forEach((v: any, index: number) => {
      setTimeout(() => {
        handleDownload(v.download_url, `${track.artist} - ${track.title} (${v.version_name}).mp3`, v.id);
      }, index * 500); // Stagger to be safe
    });
  }, [handleDownload]);

  const handleFindSimilar = useCallback((track: any) => {
    setBpmFilter([track.bpm - 3, track.bpm + 3]);
    setActiveGenre(track.display_genre || 'All');
    toast.success(`Finding tracks similar to ${track.bpm} BPM in ${track.display_genre}`);
  }, []);

  // genres derived from hubsWithGenres in Sidebar component directly

// Removed default hubs use effect hook since dynamic filters covers this from sidebar

  // Removed early return for guests to show locked design instead

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-24 pb-32 overflow-x-hidden selection:bg-blue-500/30">

      
      {/* Subscription Status Banner */}
      {isSubscriber && user?.subscriptionExpiry && !isAdmin && (
        <div className="max-w-[1700px] mx-auto px-6 mb-6">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between group hover:bg-blue-600/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Crown size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-0.5">Active Subscription</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {(() => {
                      const expiry = new Date(user.subscriptionExpiry);
                      const diff = expiry.getTime() - new Date().getTime();
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                      return days > 0 ? `${days} Days Remaining` : 'Expires Today';
                    })()}
                  </span>
                  <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">•</span>
                  <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">
                    Ends {new Date(user.subscriptionExpiry).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to="/checkout?plan=renew" 
              className="px-6 py-2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              Extend Access
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-[1700px] mx-auto px-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <Music className="text-blue-400" size={24} />
              </div>
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
                  Music <span className="text-blue-500">Pool</span>
                </h1>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-1">Version 4.0 // 92,000+ Tracks</p>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
             <div className="relative group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400" size={18} />
               <input 
                 type="text"
                 id="pool-search"
                 name="search"
                 placeholder="Search Pool..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[300px] transition-all placeholder:text-zinc-600"
               />
             </div>

             {/* Removed FolderSwitcher */}
          </div>
        </div>
        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar */}
           <Sidebar 
            hubsWithGenres={dynamicFilters.hubsWithGenres}
            years={dynamicFilters.years}
            activeGenre={activeGenre}
            onGenreSelect={setActiveGenre}
            activeSubGenre={activeSubGenre}
            onSubGenreSelect={setActiveSubGenre}
            searchTerm={genreSearchTerm}
            onSearchChange={setGenreSearchTerm}
            activeHub={activeHub}
            onHubSelect={setActiveHub}
            activeYear={activeYear}
            onYearSelect={setActiveYear}
            activeMonth={activeMonth}
            onMonthSelect={setActiveMonth}
          />

          {/* Track List Area */}
          <div className="flex-1 w-full min-w-0">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-zinc-900/40 rounded-2xl border border-white/5">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">BPM Range ({bpmFilter[0]}-{bpmFilter[1]})</span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      id="bpm-min"
                      name="bpm_min"
                      min="60" 
                      max="180" 
                      value={bpmFilter[0]} 
                      onChange={(e) => setBpmFilter([parseInt(e.target.value), bpmFilter[1]])}
                      className="w-20 accent-blue-500 h-1 bg-zinc-800 rounded-full cursor-pointer"
                    />
                    <input 
                      type="range" 
                      id="bpm-max"
                      name="bpm_max"
                      min="60" 
                      max="180" 
                      value={bpmFilter[1]} 
                      onChange={(e) => setBpmFilter([bpmFilter[0], parseInt(e.target.value)])}
                      className="w-20 accent-blue-500 h-1 bg-zinc-800 rounded-full cursor-pointer"
                    />
                  </div>
                </div>

                <div className="h-8 w-px bg-white/5" />

                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Camelot Key</span>
                  <select 
                    id="key-filter"
                    name="key"
                    value={activeKey}
                    onChange={(e) => setActiveKey(e.target.value)}
                    className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  >
                    <option>All Keys</option>
                    {[...Array(12)].map((_, i) => (
                      <React.Fragment key={i}>
                        <option value={`${i + 1}A`}>{i + 1}A</option>
                        <option value={`${i + 1}B`}>{i + 1}B</option>
                      </React.Fragment>
                    ))}
                  </select>
                </div>
                
                <div className="h-8 w-px bg-white/5" />

                {/* Hype Toggle */}
                <button
                  onClick={() => setHypeOnly(!hypeOnly)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
                    hypeOnly 
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                      : 'bg-zinc-800/40 border-white/5 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Flame size={14} fill={hypeOnly ? "currentColor" : "none"} className={hypeOnly ? "animate-pulse" : ""} />
                  <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Hype Only</span>
                </button>
                
                <div className="h-8 w-px bg-white/5" />
                
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                     {poolPagination?.totalRecords || 0} Tracks Found
                   </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => {
                    setSearchTerm('');
                    setActiveGenre('All');
                    setActiveSubGenre('all');
                    setActiveHub('all');
                    setActiveYear('All Years');
                    setActiveMonth('All Months');
                    setBpmFilter([60, 180]);
                    setActiveKey('All Keys');
                    setHypeOnly(false);
                    toast.success('Filters cleared');
                  }}
                  className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5"
                  title="Reset All Filters"
                >
                   <Trash2 size={18} />
                 </button>
                 <button className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
                   <Filter size={18} />
                 </button>
              </div>
            </div>

            {/* List */}
            <div className="min-h-[600px]">
              {!isSubscriber ? (
                <div className="w-full py-12">
                   <AccessDenied />
                </div>
              ) :
 poolLoading && poolTracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 animate-pulse">Syncing Engine...</p>
                </div>
              ) : poolTracks.length === 0 ? (
                <div className="text-center py-32 bg-zinc-900/20 rounded-[3rem] border border-dashed border-white/5">
                  <Package size={48} className="mx-auto text-zinc-700 mb-4" />
                  <h3 className="text-xl font-bold text-zinc-500">No tracks found in this category</h3>
                  <button 
                    onClick={() => { setActiveGenre('All'); setSearchTerm(''); }}
                    className="mt-4 text-blue-400 font-bold hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <Virtuoso
                  useWindowScroll
                  data={poolTracks}
                  itemContent={(index, track) => {
                    // Logic for "NEW" badge: March 2026 or added from today (March 22, 2026) onwards
                    const trackDate = track.created_at ? new Date(track.created_at) : null;
                    const today = new Date('2026-03-22');
                    today.setHours(0, 0, 0, 0);
                    
                    const isMarch2026 = track.release_year === 2026 && track.release_month === 'March';
                    const isFromTodayOnwards = trackDate && trackDate >= today;

                    const isActuallyNew = track.is_featured || isMarch2026 || isFromTodayOnwards;
                    const isHype = track?.genre?.toLowerCase()?.includes('hype') || 
                                  track?.display_genre?.toLowerCase()?.includes('hype') || 
                                  track?.sub_genre?.toLowerCase()?.includes('hype');

                    return (
                      <div className="mb-2" key={track.id}>
                        <TrackRow
                          id={track.id}
                          title={track.title}
                          artist={track.artist}
                          bpm={track.bpm}
                          genre={track.genre || track.display_genre || track.collection_hub || 'Uncategorized'}
                          videoUrl={track.videoUrl}
                          previewUrl={track.previewUrl || track.versions?.[0]?.previewUrl}
                          versions={track.versions || []}
                          isNew={isActuallyNew}
                          isHype={isHype}
                          isExpanded={expandedTrackId === track.id}
                          isPlaying={expandedTrackId === track.id && player.isPlaying}
                          playingUrl={expandedTrackId === track.id ? player.url : null}
                          playingType={expandedTrackId === track.id ? player.type : null}
                          isSubscriber={isSubscriber}
                          onPlay={(url, title, type) => handlePlay(url, title, type, track.id)}
                          onDownload={handleDownload}
                          onDownloadAll={() => handleDownloadAll(track)}
                          onFindSimilar={() => handleFindSimilar(track)}
                          onSkipNext={() => handleSkip('next')}
                          onSkipPrev={() => handleSkip('prev')}
                          onCloseInline={() => setExpandedTrackId(null)}
                        />
                      </div>
                    );
                  }}
                />
              )}
            </div>

            {/* Pagination Controls */}
            {poolPagination && poolPagination.totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-4 pb-12">
                <button
                  onClick={() => handlePageChange(poolPagination.page - 1)}
                  disabled={poolPagination.page === 1 || poolLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase text-xs"
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">Page</span>
                  <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black text-sm">
                    {poolPagination.page}
                  </span>
                  <span className="text-zinc-500 text-xs font-black uppercase tracking-widest">of</span>
                  <span className="text-zinc-300 text-xs font-black tracking-widest">
                    {poolPagination.totalPages}
                  </span>
                </div>

                <button
                  onClick={() => handlePageChange(poolPagination.page + 1)}
                  disabled={poolPagination.page === poolPagination.totalPages || poolLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase text-xs"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      <MediaOverlay
        isOpen={showVideoOverlay}
        onClose={() => setShowVideoOverlay(false)}
        url={player.url || ''}
        title={player.title}
        type={player.type}
        onSkipNext={() => handleSkip('next')}
        onSkipPrev={() => handleSkip('prev')}
      />

      {/* Footer Mini Player (Audio) */}
      <AnimatePresence>
        {player.url && player.type === 'audio' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-3xl border-t border-white/5 p-4 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto flex items-center gap-6">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                <Music className="text-blue-400" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold truncate">{player.title}</h4>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 text-green-400">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Playing Preview</span>
                   </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => {
                     setPlayer(p => ({ ...p, isPlaying: !p.isPlaying }));
                     if (audioRef.current) {
                        if (player.isPlaying) audioRef.current.pause();
                        else audioRef.current.play();
                     }
                   }}
                   className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                 >
                   {player.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                 </button>
                 <button 
                   onClick={() => setPlayer({ url: null, title: '', type: 'audio', isPlaying: false })}
                   className="p-2 text-zinc-500 hover:text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayer(p => ({ ...p, isPlaying: false }))}
      />
    </div>
  );
}
