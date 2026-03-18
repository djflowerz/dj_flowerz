import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import {
  Search, Download, Play, Pause, X, ChevronDown,
  Music, Video, Filter, Zap, CheckCircle2, AlertCircle,
  Clock, SortAsc, SortDesc, Disc3, Fuel, ChevronRight,
  Star, Lock, Check, Crown, Flame, Rocket, Zap as ZapIcon,
  PlayCircle, Package, Layers, Info, Volume2, Globe
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Track } from '../types';
import { MONTHS, SUBSCRIPTION_PLANS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// New Components
import { Sidebar } from '../components/music-pool/Sidebar';
import { FolderSwitcher } from '../components/music-pool/FolderSwitcher';
import { TrackRow } from '../components/music-pool/TrackRow';
import { HypeTrackRow } from '../components/music-pool/HypeTrackRow';
import { MediaOverlay } from '../components/music-pool/MediaOverlay';
import AccessDenied from '../components/AccessDenied';

// --- Types ---
interface PlayerState {
  url: string | null;
  title: string;
  type: 'audio' | 'video';
  isPlaying: boolean;
}

const HUBS = [
  { id: 'all', label: 'All Sources', icon: <Globe size={18} /> },
  { id: 'Remix & Mashups Hub', label: 'Remix & Mashups Hub', icon: <Zap size={18} /> },
  { id: 'Genres', label: 'Genre Categories', icon: <Layers size={18} /> },
  { id: '2024 VIDEO', label: '2024 Video Pool', icon: <Video size={18} /> },
  { id: '2023 VIDEO', label: '2023 Video Pool', icon: <Video size={18} /> }
];

const REMIX_HUB_GENRES = [
  "All",
  "redrum video remixes",
  "audio redrums",
  "remixah",
  "dancehall refix",
  "Khester Redrums Remixes",
  "R&B Remixes",
  "Amapiano Redrum remixes",
  "HYPE edits",
  "Club Edits",
  "Dancehall Remixes",
  "Amapiano",
  "Afrohouse",
  "Reggae Fussion"
];

const VICKNICK_HUB_GENRES = [
  "All",
  "Arbantone & Gengetone (Low Hype)",
  "Arbantone & Gengetone (Hype)",
  "Kenya Love Songs (Hype)",
  "Kenya Love Songs (Low Hype)",
  "Locals",
  "Rnb 2000",
  "Rnb 2010",
  "Rnb 90",
  "3 Step Amapiano",
  "South Africa Amapiano",
  "Reggae Covers",
  "Afro Beats (TBT)",
  "Mugithi Covers (Kikuyu)",
  "Taarabu",
  "Afro Amapiano",
  "Mugithi (Kikuyu)",
  "soul",
  "East Africa TBT (Low Hype)",
  "East Africa TBT (Hype)",
  "Urban Pop (Low Hype)",
  "EDMs",
  "Urban Pop (Hype)",
  "Urban Pop (Urban)",
  "Gospel (Urban)",
  "Drill Rhumba",
  "RNB (Low Hype)",
  "Dancehall (Low Hype)",
  "Bongo (TZ) (Hype)",
  "UG Music",
  "Dancehall (Hype)",
  "RNB (Hype)",
  "Ragga (Low Hype)",
  "Afro Beats (Naija) (Hype)",
  "Ragga (Hype)",
  "Hip Hop",
  "BassHall Dancehall",
  "Kikuyu Gospel (Kigoco)",
  "Rhumba",
  "Jazz",
  "Country",
  "Rock",
  "Pop",
  "Deep House",
  "Reggae Funk",
  "Oldies",
  "Kalenjin",
  "Luhya",
  "Kamba",
  "Kisii"
];

export default function MusicPool() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  const isSubscriber = user?.isSubscriber || isAdmin;

  const { poolTracks, poolLoading, poolPagination, refreshPoolTracks } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [genreSearchTerm, setGenreSearchTerm] = useState('');
  const [activeHub, setActiveHub] = useState('all');
  const [activeGenre, setActiveGenre] = useState('All');
  const [activeYear, setActiveYear] = useState('All Years');
  const [activeMonth, setActiveMonth] = useState('All Months');
  const [bpmFilter, setBpmFilter] = useState<[number, number]>([60, 180]);
  
  const [player, setPlayer] = useState<PlayerState>({ 
    url: null, 
    title: '', 
    type: 'audio', 
    isPlaying: false 
  });
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync refresh on filter change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshPoolTracks({
        page: 1,
        limit: 50,
        hub: activeHub,
        genre: activeGenre,
        year: activeYear === 'All Years' ? undefined : activeYear,
        month: activeMonth === 'All Months' ? undefined : activeMonth,
        search: searchTerm,
        bpmMin: bpmFilter[0],
        bpmMax: bpmFilter[1]
      });
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [activeHub, activeGenre, activeYear, activeMonth, searchTerm, bpmFilter, refreshPoolTracks]);

  const loadMore = useCallback(() => {
    if (poolPagination && poolPagination.page < poolPagination.totalPages && !poolLoading) {
      refreshPoolTracks({
        page: poolPagination.page + 1,
        limit: 50,
        hub: activeHub,
        year: activeYear,
        month: activeMonth,
        search: searchTerm,
        bpmMin: bpmFilter[0],
        bpmMax: bpmFilter[1]
      });
    }
  }, [poolPagination, poolLoading, activeHub, activeGenre, activeYear, activeMonth, searchTerm, bpmFilter, refreshPoolTracks]);

  const handlePlay = useCallback((url: string, title: string, type: 'audio' | 'video', trackId?: string) => {
    if (trackId) {
      // Toggle pause on same track
      if (expandedTrackId === trackId && player.isPlaying) {
        setPlayer(p => ({ ...p, isPlaying: false }));
        if (audioRef.current) audioRef.current.pause();
        return;
      }
      setExpandedTrackId(trackId);
      setPlayer({ url, title, type, isPlaying: true });
      // When playing inline, ALWAYS pause the footer audio to avoid double-play.
      // The inline <audio> element handles playback via its own autoPlay + src props.
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    // Non-inline (global) play — use footer audio for audio, mute it for video
    setPlayer({ url, title, type, isPlaying: true });
    if (type === 'audio') {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } else {
      if (audioRef.current) audioRef.current.pause();
    }
  }, [expandedTrackId, player.isPlaying]);

  const handleSkip = useCallback((direction: 'next' | 'prev') => {
    if (!poolTracks.length || !expandedTrackId) return;
    const currentIndex = poolTracks.findIndex(t => t.id === expandedTrackId);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= poolTracks.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = poolTracks.length - 1;
    
    const nextTrack = poolTracks[nextIndex];
    if (nextTrack) {
      const url = nextTrack.videoUrl || nextTrack.versions?.[0]?.preview_url || '';
      const type = (nextTrack.videoUrl || nextTrack.versions?.some(v => v.version_name.toLowerCase().includes('video'))) ? 'video' : 'audio';
      handlePlay(url, nextTrack.title, type, nextTrack.id);
    }
  }, [poolTracks, expandedTrackId, handlePlay]);

  const handleDownload = useCallback(async (url: string, fileName: string) => {
    if (!isSubscriber) {
      toast.error("Subscription required to download.");
      return;
    }
    
    if (!url) {
      toast.error("Download URL not available");
      return;
    }
    
    const toastId = toast.loading(`Preparing download: ${fileName}...`);
    try {
      // Ensure we hit the tracking API first without blocking the download
      fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || ''}/api/pool/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }).catch(err => console.error("Tracking error:", err));

      // Force download via fetch to bypass cross-origin browser opening
      // If it fails, fallback to window.open
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        toast.success("Download complete", { id: toastId });
      } catch (blobErr) {
        console.warn("Blob download failed, falling back to new tab", blobErr);
        window.open(url, '_blank');
        toast.success("Download started in new tab", { id: toastId });
      }

    } catch (err) {
      window.open(url, '_blank');
      toast.success("Download attempt started", { id: toastId });
    }
  }, [isSubscriber]);

  const handleDownloadAll = useCallback((track: any) => {
    toast.info(`Starting bulk download for ${track.title}...`);
    track.versions.forEach((v: any, i: number) => {
      setTimeout(() => {
        handleDownload(v.download_url, `${track.artist} - ${track.title} (${v.version_name}).mp3`);
      }, i * 1000);
    });
  }, [handleDownload]);

  const handleFindSimilar = useCallback((track: any) => {
    setBpmFilter([track.bpm - 3, track.bpm + 3]);
    setActiveGenre(track.display_genre || 'All');
    toast.success(`Finding tracks similar to ${track.bpm} BPM in ${track.display_genre}`);
  }, []);

  const genres = useMemo(() => {
    if (activeHub === 'Remix & Mashups Hub') return REMIX_HUB_GENRES;
    return VICKNICK_HUB_GENRES;
  }, [activeHub]);

  if (!user) return <AccessDenied />;

  return (
    <div className="bg-[#050505] min-h-screen text-white pt-24 pb-32 overflow-x-hiddenselection:bg-blue-500/30">
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
                 placeholder="Search Pool..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="bg-zinc-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[300px] transition-all placeholder:text-zinc-600"
               />
             </div>
             <FolderSwitcher 
               activeHub={activeHub} 
               hubs={HUBS}
               onHubSelect={(hubId) => {
                 setActiveHub(hubId);
                 setActiveGenre('All');
               }} 
             />
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar */}
          <Sidebar 
            genres={genres}
            activeGenre={activeGenre}
            onGenreSelect={setActiveGenre}
            searchTerm={genreSearchTerm}
            onSearchChange={setGenreSearchTerm}
            activeHub={HUBS.find(h => h.id === activeHub)?.label || 'All'}
          />

          {/* Track List Area */}
          <div className="flex-1 w-full min-w-0">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-zinc-900/40 rounded-2xl border border-white/5">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">BPM Range</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-400">{bpmFilter[0]}</span>
                    <input 
                      type="range" 
                      min="60" 
                      max="180" 
                      value={bpmFilter[1]} 
                      onChange={(e) => setBpmFilter([bpmFilter[0], parseInt(e.target.value)])}
                      className="w-32 accent-blue-500 h-1 bg-zinc-800 rounded-full cursor-pointer"
                    />
                    <span className="text-xs font-bold text-blue-400">{bpmFilter[1]}</span>
                  </div>
                </div>
                
                <div className="h-8 w-px bg-white/5" />

                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Year</span>
                    <select 
                      value={activeYear}
                      onChange={(e) => setActiveYear(e.target.value)}
                      className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    >
                      <option>All Years</option>
                      <option>2026</option>
                      <option>2025</option>
                      <option>2024</option>
                      <option>2023</option>
                      <option>2022</option>
                      <option>2021</option>
                      <option>2020</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Month</span>
                    <select 
                      value={activeMonth}
                      onChange={(e) => setActiveMonth(e.target.value)}
                      className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    >
                      <option>All Months</option>
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="h-8 w-px bg-white/5" />
                
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                   <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                     {poolPagination?.totalRecords || 0} Tracks Found
                   </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <button className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
                   <SortAsc size={18} />
                 </button>
                 <button className="p-2 text-zinc-500 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
                   <Filter size={18} />
                 </button>
              </div>
            </div>

            {/* List */}
            <div className="min-h-[600px]">
              {isMobile && !isSubscriber ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-zinc-900/30 rounded-[3rem] border border-white/5 backdrop-blur-md">
                  <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-8 border border-blue-500/30 shadow-2xl">
                    <Lock className="text-blue-400" size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-4 italic uppercase tracking-tighter">Pro Access Required</h2>
                  <p className="text-zinc-400 max-w-sm mb-10 font-medium leading-relaxed italic opacity-80">
                    Get full access to the Music Pool on your mobile device. Download 92,000+ professional DJ edits anywhere.
                  </p>
                  <Link 
                    to="/catalog?tab=plans"
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase transition-all shadow-2xl shadow-blue-600/40 active:scale-95 flex items-center gap-3"
                  >
                    <Crown size={20} />
                    Unlock Library
                  </Link>
                </div>
              ) : poolLoading && poolTracks.length === 0 ? (
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
                  endReached={loadMore}
                  itemContent={(index, track) => {
                    const isHype = track?.display_genre?.toLowerCase()?.includes('hype') || 
                                  track?.sub_genre?.toLowerCase()?.includes('hype');
                    
                    if (isHype && activeGenre !== 'All') {
                      return (
                        <div className="mb-2" key={track.id}>
                          <HypeTrackRow
                            title={track.title}
                            artist={track.artist}
                            bpm={track.bpm}
                            genre={track.display_genre || 'Hype'}
                            videoUrl={track.videoUrl}
                            previewUrl={track.previewUrl || track.versions?.[0]?.previewUrl}
                            versions={track.versions || []}
                            isNew={track.is_featured}
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
                    }

                    return (
                      <div className="mb-2" key={track.id}>
                        <TrackRow
                          title={track.title}
                          artist={track.artist}
                          bpm={track.bpm}
                          genre={track.display_genre || 'General'}
                          videoUrl={track.videoUrl}
                          previewUrl={track.previewUrl || track.versions?.[0]?.previewUrl}
                          versions={track.versions || []}
                          isNew={track.is_featured}
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
          </div>
        </div>

      </div>

      {/* Video Preview Overlay */}
      <MediaOverlay
        isOpen={showVideoOverlay}
        onClose={() => setShowVideoOverlay(false)}
        url={player.url || ''}
        title={player.title}
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
