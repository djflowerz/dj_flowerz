
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import {
   LayoutDashboard, Package, Trash2, Check, X, Plus, Mic, Globe, Save, FileText, DollarSign, Upload,
   Image as ImageIcon, Box, Lock, List, MessageSquare, Link as LinkIcon, PenSquare,
   Mail, MessageCircle, Truck, Send, Headphones, Menu, Search, Edit2, Timer, Eye, Download, Info, CheckCircle,
   Layers, ChevronDown, ChevronUp, ChevronLeft, Folder, Database, RefreshCw, Zap, Shield, Play, Pause, Music, Star, Smartphone, Clock, Filter, Ticket
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { POOL_HUBS, POOL_YEARS, MONTHS } from '../constants';
import SubscribeButton from '../components/SubscribeButton';
import { isUserSubscriber } from '../utils/authHelpers';
import { downloadFileSecurely } from '../utils/downloadHelper';

// Add 'New' to POOL_HUBS if not present, or handled in UI
const DISPLAY_HUBS = ['New', ...POOL_HUBS.filter(h => h !== 'New')];

import Hero from '../components/Hero';

const MusicPool: React.FC = () => {
   const { user, updateUserProfile } = useAuth();
   const { poolTracks, genres, subscriptionPlans, poolError, poolLoading, loadMorePoolTracks, refreshPoolTracks, applyReferralCode, siteConfig, referralSettings } = useData();
   const [referralCode, setReferralCode] = useState('');
   const [appliedReferral, setAppliedReferral] = useState<{ code: string; discount: number; discountType: 'flat' | 'percentage'; referrerId: string } | null>(null);
   const [referralError, setReferralError] = useState('');
   const [isApplying, setIsApplying] = useState(false);

   const handleApplyReferral = async () => {
      if (!referralCode.trim()) return;
      setIsApplying(true);
      setReferralError('');

      const result = await applyReferralCode(referralCode);
      if (result.success) {
         setAppliedReferral({
            code: referralCode,
            discount: result.discount || 0,
            discountType: result.discountType || 'percentage',
            referrerId: result.referrerId || ''
         });
         setReferralCode('');
      } else {
         setReferralError(result.message || 'Invalid referral code');
      }
      setIsApplying(false);
   };
   const { pauseTrack: pauseGlobalTrack } = usePlayer();
   const isUnlocked = isUserSubscriber(user);

   // Auto-apply promotional discount for non-subscribers
   useEffect(() => {
      if (!isUnlocked && referralSettings?.enabled && referralSettings?.newUserDiscount > 0) {
         setAppliedReferral(prev => {
            if (prev) return prev; // Already applied
            return {
               code: 'PROMO_DISCOUNT',
               discount: referralSettings.newUserDiscount,
               discountType: referralSettings.newUserDiscountType || 'percentage',
               referrerId: 'system'
            };
         });
      }
   }, [isUnlocked, referralSettings]);

   // View State
   const [activeCategory, setActiveCategory] = useState('All');
   const [selectedYear, setSelectedYear] = useState<number | 'All'>('All');
   const [selectedMonth, setSelectedMonth] = useState<string>('All');
   const [selectedGenre, setSelectedGenre] = useState('All');
   const [searchQuery, setSearchQuery] = useState('');
   const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

   // Filter State Handlers (Enhanced to reset others)
   const changeCategory = (cat: string) => {
      setActiveCategory(cat);
      setSearchQuery('');
      setSelectedYear('All');
      setSelectedMonth('All');
   };

   const changeYear = (year: number | 'All') => {
      setSelectedYear(year);
      setSearchQuery('');
      if (year !== 'All') {
         setActiveCategory('All');
         setSelectedGenre('All');
      }
   };

   const changeGenre = (genre: string) => {
      setSelectedGenre(genre);
      setSearchQuery('');
   };

   const changeMonth = (month: string) => {
      setSelectedMonth(month);
      setSearchQuery('');
   };

   // Audio Player State
   const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
   const mediaRef = React.useRef<HTMLMediaElement | null>(null);

   const handleDownload = async (url: string, fileName: string, track: any) => {
      if (!user) {
         alert("Please login to download.");
         return;
      }

      if (!isUserSubscriber(user)) {
         alert("Subscription required or expired. Please renew to download.");
         return;
      }

      // Use the secure download helper which handles limits, logging, and token attachment server-side
      await downloadFileSecurely(url, {
         fileName,
         trackId: track.id,
         artist: track.artist,
         title: track.title,
         type: 'track'
      });

      // We don't need to manually updateUserProfile here anymore as the server does it,
      // and the real-time listener in AuthContext will catch the change.
   };

   const togglePlay = (track: any) => {
      if (playingTrackId === track.id) {
         setPlayingTrackId(null);
         mediaRef.current?.pause();
      } else {
         const url = track.previewUrl || track.versions?.[0]?.downloadUrl;
         if (!url) return;

         pauseGlobalTrack(); // Stop global player to avoid double audio
         setPlayingTrackId(track.id);
      }
   };

   // Auto-play: handled via autoPlay attribute on <audio>/<video> elements directly.
   // We still keep a ref to the active media element so we can pause when switching.
   // The ref is updated via onPlay event from each element to avoid ref overwrite in .map().

   // Filter Logic
   // Filter Logic
   const filteredTracks = useMemo(() => {
      const query = searchQuery.toLowerCase();
      return (poolTracks || []).filter(track => {
         if (!track) return false;
         const title = (track.title || '').toLowerCase();
         const artist = (track.artist || '').toLowerCase();
         const genre = (track.genre || '').toLowerCase();
         const categories = (track.category || []).map(c => c.toLowerCase());

         const matchesSearch = title.includes(query) || artist.includes(query);

         const matchesCategory = activeCategory === 'All' ||
            (activeCategory === 'New' && categories.some(c => c.toLowerCase() === 'new')) ||
            categories.some(c => c !== '' && (c.includes(activeCategory.toLowerCase()) || activeCategory.toLowerCase().includes(c)));

         const matchesYear = selectedYear === 'All' || Number(track.year) === Number(selectedYear);

         const matchesGenre = selectedGenre === 'All' ||
            (genre !== '' && (genre.includes(selectedGenre.toLowerCase()) || selectedGenre.toLowerCase().includes(genre))) ||
            categories.some(c => c !== '' && (c.includes(selectedGenre.toLowerCase()) || selectedGenre.toLowerCase().includes(c)));

         // Month filtering for year-based categories
         // Month filtering for year-based categories
         const matchesMonth = selectedMonth === 'All' ||
            categories.some(c => {
               const catLower = c.toLowerCase();
               const monthLower = selectedMonth.toLowerCase();
               // Check full name first
               if (catLower.includes(monthLower)) return true;

               // Check 3-letter abbreviation (e.g. Jan for January)
               const abbr = monthLower.slice(0, 3);
               // Ensure it's not a partial match of another word (e.g. Jun in Jungle) unless it's explicitly spaced or hyphenated?
               // For now, simple includes is safer than missing data, assuming categories are mostly "Jan 2022" etc.
               return catLower.includes(abbr);
            });

         return matchesSearch && matchesCategory && matchesYear && matchesGenre && matchesMonth;
      });
   }, [poolTracks, searchQuery, activeCategory, selectedYear, selectedMonth, selectedGenre]);

   // Pagination State
   const [currentPage, setCurrentPage] = useState(1);
   const tracksPerPage = 100;

   // Reset page on filter change
   useEffect(() => {
      setCurrentPage(1);
   }, [activeCategory, selectedYear, selectedMonth, selectedGenre, searchQuery]);

   const totalPages = Math.ceil(filteredTracks.length / tracksPerPage);
   const visibleTracks = filteredTracks.slice((currentPage - 1) * tracksPerPage, currentPage * tracksPerPage);

   const toggleExpand = (id: string) => {
      setExpandedTrackId(expandedTrackId === id ? null : id);
   }

   // --- UNLOCKED VIEW (LIBRARY) ---
   if (isUnlocked) {
      return (
         <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
            <div className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 2xl:px-32">

               {/* Header & Search */}
               <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                  <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                     <Headphones className="text-brand-purple" /> DJ Pool Library
                  </h1>
                  <div className="relative w-full md:w-96 group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-purple transition-colors" size={18} />
                     <input
                        type="text"
                        placeholder="Search artist or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#15151A] border border-white/10 rounded-full py-3.5 pl-11 pr-12 text-white focus:border-brand-purple focus:outline-none placeholder:text-gray-600 shadow-xl transition-all"
                     />
                     {searchQuery && (
                        <button
                           onClick={() => setSearchQuery('')}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1 transition-colors"
                        >
                           <X size={14} />
                        </button>
                     )}
                  </div>
               </div>

               {/* Hubs Scroll */}
               <div className="mb-6 overflow-x-auto pb-4 custom-scrollbar">
                  <div className="flex gap-3">
                     <button
                        onClick={() => changeCategory('All')}
                        className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all duration-300 ${activeCategory === 'All' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                     >
                        All Tracks
                     </button>
                     {DISPLAY_HUBS.map(hub => (
                        <button
                           key={hub}
                           onClick={() => changeCategory(hub)}
                           className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all duration-300 ${activeCategory === hub ? 'bg-brand-purple text-white shadow-[0_0_20px_rgba(123,92,255,0.3)]' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                        >
                           {hub}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Years Folders */}
               <div className="mb-8 overflow-x-auto pb-4 custom-scrollbar">
                  <div className="flex gap-4">
                     {POOL_YEARS.map(year => (
                        <button
                           key={year}
                           onClick={() => changeYear(selectedYear === year ? 'All' : year)}
                           className={`flex items-center gap-2 px-5 py-4 rounded-2xl border transition-all min-w-[140px] shadow-lg ${selectedYear === year ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan shadow-brand-cyan/10' : 'bg-[#15151A] border-white/5 text-gray-400 hover:border-white/20'}`}
                        >
                           <Folder size={20} className={selectedYear === year ? "fill-current" : ""} />
                           <span className="font-bold">{year} Edits</span>
                        </button>
                     ))}
                  </div>
               </div>

               {/* Main Content with Sidebar */}
               <div className="flex flex-col lg:flex-row gap-8 items-start">

                  {/* Genre Sidebar / Mobile Scroll */}
                  <div className="w-full lg:w-72 flex-shrink-0">
                     {/* Mobile Horizontal Scroll */}
                     <div className="lg:hidden mb-6 overflow-x-auto pb-2 custom-scrollbar flex gap-2">
                        <button
                           onClick={() => changeGenre('All')}
                           className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedGenre === 'All' ? 'bg-brand-purple text-white' : 'bg-[#15151A] text-gray-400 border border-white/10'}`}
                        >
                           All Genres
                        </button>
                        {genres.map(genre => (
                           <button
                              key={genre.id}
                              onClick={() => changeGenre(genre.name)}
                              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedGenre === genre.name ? 'bg-brand-purple text-white' : 'bg-[#15151A] text-gray-400 border border-white/10'}`}
                           >
                              {genre.name}
                           </button>
                        ))}
                     </div>

                     {/* Desktop Persistent Sidebar */}
                     <div className="hidden lg:block bg-[#15151A]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sticky top-24 shadow-2xl overflow-hidden group">
                        {/* Background glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-purple/10 rounded-full blur-[80px] group-hover:bg-brand-purple/20 transition-colors"></div>

                        <h3 className="text-white font-display font-bold text-xl flex items-center gap-2 mb-6 relative z-10">
                           <Layers size={22} className="text-brand-purple" />
                           Genres
                        </h3>

                        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                           <button
                              onClick={() => changeGenre('All')}
                              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 text-sm flex items-center justify-between group/genre ${selectedGenre === 'All'
                                 ? 'bg-gradient-to-r from-brand-purple to-purple-600 text-white font-bold shadow-lg shadow-brand-purple/20'
                                 : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                                 }`}
                           >
                              <span>All Genres</span>
                              {selectedGenre === 'All' && <Check size={14} />}
                           </button>
                           {genres.map(genre => (
                              <button
                                 key={genre.id}
                                 onClick={() => changeGenre(genre.name)}
                                 className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 text-sm flex items-center justify-between group/genre ${selectedGenre === genre.name
                                    ? 'bg-gradient-to-r from-brand-purple to-purple-600 text-white font-bold shadow-lg shadow-brand-purple/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
                                    }`}
                              >
                                 <span className="truncate">{genre.name}</span>
                                 {selectedGenre === genre.name && <Check size={14} />}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Tracks Section */}
                  <div id="track-list-top" className="flex-1 min-w-0 w-full">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                           <Music className="text-brand-cyan" size={24} />
                           Tracks <span className="text-gray-500 font-normal text-lg">({filteredTracks.length})</span>
                        </h3>
                        <div className="flex gap-4">
                           <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-xs text-gray-400">
                              <Check size={14} className="text-green-500" /> High Quality
                           </div>
                           <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-xs text-gray-400">
                              <Zap size={14} className="text-yellow-500" /> Instant DL
                           </div>
                        </div>
                     </div>

                     {/* Month Filter (shows when year is selected) */}
                     {selectedYear !== 'All' && (
                        <div className="mb-8 overflow-x-auto pb-4 custom-scrollbar">
                           <div className="flex items-center gap-3 mb-3">
                              <Clock size={18} className="text-brand-purple" />
                              <span className="text-white font-bold text-sm">Filter by Month:</span>
                           </div>
                           <div className="flex gap-2">
                              <button
                                 onClick={() => changeMonth('All')}
                                 className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedMonth === 'All' ? 'bg-brand-purple text-white shadow-lg' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                              >
                                 All Months
                              </button>
                              {MONTHS.map(month => (
                                 <button
                                    key={month}
                                    onClick={() => changeMonth(month)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedMonth === month ? 'bg-brand-purple text-white shadow-lg' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                                 >
                                    {month}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="bg-[#15151A]/60 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        {poolError && (
                           <div className="p-8 text-center text-red-400 bg-red-500/10 border-b border-red-500/20">
                              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                 <Shield size={24} className="text-red-500" />
                              </div>
                              <p className="font-bold text-lg mb-1">Database High Traffic</p>
                              <p className="text-sm opacity-80 max-w-md mx-auto">Our database is currently experiencing high traffic. Some tracks may not appear immediately. Please try refreshing or try again in a few moments.</p>
                           </div>
                        )}

                        {filteredTracks.length > 0 ? (
                           <div className="divide-y divide-white/5">
                              {visibleTracks.map(track => (
                                 <div key={track.id} className={`group hover:bg-white/[0.05] border border-white/5 rounded-3xl mb-4 transition-all duration-300 overflow-hidden ${expandedTrackId === track.id ? 'bg-white/[0.05] border-brand-purple/30 ring-1 ring-brand-purple/20' : ''}`}>

                                    {/* Main Content Area */}
                                    <div className="p-6">
                                       <div className="flex flex-col md:flex-row gap-6">
                                          {/* Left: Play Icon & Song Details */}
                                          <div className="flex-1 flex flex-col gap-4">
                                             <div className="flex items-start gap-4">
                                                {/* Play Toggle */}
                                                <div
                                                   onClick={() => togglePlay(track)}
                                                   className="relative flex-shrink-0 w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden group-hover:ring-2 ring-white/10 cursor-pointer shadow-xl transition-all duration-300 group-hover:scale-105 active:scale-95"
                                                >
                                                   <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                                                      {playingTrackId === track.id ? (
                                                         <Pause size={28} className="text-brand-cyan fill-current animate-pulse" />
                                                      ) : (
                                                         <Play size={28} className="text-white fill-current translate-x-0.5" />
                                                      )}
                                                   </div>
                                                   {playingTrackId === track.id && (
                                                      <div className="absolute inset-0 bg-brand-cyan/10 animate-pulse"></div>
                                                   )}
                                                </div>

                                                {/* Details: Title & Artist */}
                                                <div className="min-w-0 flex-1">
                                                   <h4 className="font-display font-bold text-white text-base md:text-lg mb-0.5 group-hover:text-brand-cyan transition-colors leading-tight break-words">
                                                      {track.title}
                                                   </h4>
                                                   <p className="text-brand-purple text-sm font-medium opacity-90 truncate italic">{track.artist}</p>
                                                </div>
                                             </div>

                                             {/* Metadata Info (Genres, Tags, Categories) - Stacked Below Title */}
                                             <div className="flex flex-wrap gap-2 items-center mt-1">
                                                {/* Primary Genre Tag */}
                                                <span className="bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded-lg border border-brand-purple/30 text-[10px] font-black uppercase tracking-widest whitespace-normal max-w-full">
                                                   {track.genre?.replace(/\s*\(\d+\s*tracks\)/i, '').toUpperCase()}
                                                </span>

                                                {/* NEW Badge */}
                                                {(track.category || []).map(c => c.toLowerCase()).includes('new') && (
                                                   <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-lg border border-green-500/30 text-[10px] font-black uppercase tracking-widest">
                                                      NEW
                                                   </span>
                                                )}

                                                {/* Version/Type Tag */}
                                                <span className="bg-white/5 text-gray-400 px-2 py-0.5 rounded-lg border border-white/10 text-[10px] uppercase font-medium">
                                                   {track.versions[0]?.type || 'Video'}
                                                </span>

                                                {/* Additional Category Tags */}
                                                {track.category && track.category.length > 0 &&
                                                   track.category
                                                      .filter(cat => {
                                                         const c = cat.toLowerCase();
                                                         const g = track.genre?.toLowerCase() || '';
                                                         return !c.includes('video pool') &&
                                                            !c.includes('tracks') &&
                                                            !c.includes('genres') &&
                                                            c !== g &&
                                                            c !== track.versions[0]?.type?.toLowerCase();
                                                      })
                                                      .map((cat, idx) => {
                                                         // Clean up formatting for display
                                                         let displayCat = cat.toUpperCase();
                                                         // If it's a year but doesn't have EDITS, add it
                                                         if (/20\d{2}/.test(displayCat) && !displayCat.includes('EDITS')) {
                                                            displayCat = displayCat.replace(/(20\d{2})/, '$1 EDITS');
                                                         }

                                                         return (
                                                            <span key={idx} className="bg-brand-cyan/10 text-brand-cyan px-2 py-0.5 rounded-lg border border-brand-cyan/20 text-[10px] font-bold uppercase whitespace-nowrap">
                                                               {displayCat}
                                                            </span>
                                                         );
                                                      })
                                                }

                                                {/* Show year ONLY if NOT 2026 and not already in tags */}
                                                {track.year && track.year > 0 && track.year !== 2026 && (
                                                   <span className="bg-brand-cyan/10 text-brand-cyan px-3 py-1 rounded-lg border border-brand-cyan/20 text-[10px] font-bold">
                                                      {track.year}
                                                   </span>
                                                )}
                                             </div>
                                          </div>

                                          {/* Right: Action Buttons (Download & Expand) */}
                                          <div className="flex flex-row md:flex-col lg:flex-row items-center gap-3 w-full md:w-auto self-end md:self-center">
                                             <button
                                                onClick={() => {
                                                   const firstVersion = track.versions?.[0];
                                                   if (firstVersion?.downloadUrl) {
                                                      const ext = firstVersion.downloadUrl.split('.').pop()?.split('?')[0] || 'mp3';
                                                      handleDownload(firstVersion.downloadUrl, `${track.artist} - ${track.title}.${ext}`, track);
                                                   }
                                                }}
                                                onContextMenu={(e) => {
                                                   e.preventDefault();
                                                   alert('⚠️ Right-click disabled. Please use the Download button to download tracks.');
                                                   return false;
                                                }}
                                                className="flex-1 md:flex-none px-10 py-4 bg-white text-black font-black rounded-2xl hover:bg-brand-cyan hover:scale-105 transition-all duration-300 text-sm shadow-2xl flex items-center justify-center gap-2 group/btn active:scale-95 uppercase tracking-widest"
                                             >
                                                <Download size={18} className="group-hover/btn:translate-y-0.5 transition-transform" />
                                                Download
                                             </button>
                                             <button
                                                onClick={() => toggleExpand(track.id)}
                                                className={`p-4 rounded-2xl border transition-all duration-300 ${expandedTrackId === track.id ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`}
                                             >
                                                {expandedTrackId === track.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                             </button>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Mini Player */}
                                    {playingTrackId === track.id && (track.previewUrl || track.versions?.[0]?.downloadUrl) && (() => {
                                       const mediaUrl = track.previewUrl || track.versions?.[0]?.downloadUrl || '';
                                       const isVideo = mediaUrl.toLowerCase().match(/\.(mp4|mov|webm|m4v|avi|mkv|flv|wmv)/) || mediaUrl.toLowerCase().includes('video');
                                       return (
                                          <div className="px-5 pb-5 animate-fade-in relative z-10">
                                             {isVideo ? (
                                                <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/20 ring-1 ring-white/10">
                                                   <video
                                                      controls
                                                      autoPlay
                                                      playsInline
                                                      onContextMenu={(e) => e.preventDefault()}
                                                      onPlay={(e) => { mediaRef.current = e.currentTarget as any; }}
                                                      className="w-full max-h-[600px] object-contain"
                                                      src={mediaUrl}
                                                      onEnded={() => setPlayingTrackId(null)}
                                                   />
                                                </div>
                                             ) : (
                                                <div className="bg-[#0B0B0F] p-4 rounded-2xl border border-white/10 shadow-xl ring-1 ring-brand-purple/20">
                                                   <audio
                                                      controls
                                                      autoPlay
                                                      onContextMenu={(e) => e.preventDefault()}
                                                      onPlay={(e) => { mediaRef.current = e.currentTarget as any; }}
                                                      className="w-full h-10 accent-brand-purple"
                                                      src={mediaUrl}
                                                      onEnded={() => setPlayingTrackId(null)}
                                                   />
                                                </div>
                                             )}
                                          </div>
                                       );
                                    })()}

                                    {/* Expanded Versions */}
                                    {expandedTrackId === track.id && (
                                       <div className="bg-black/40 p-6 border-t border-white/5 animate-fade-in">
                                          <h5 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 ml-1">Available Versions</h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                             {(track.versions || []).map(version => (
                                                <div key={version.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#15151A] border border-white/5 hover:border-brand-purple/40 hover:bg-brand-purple/5 transition-all duration-300 group/v shadow-sm">
                                                   <div className="flex flex-col">
                                                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg w-fit mb-1 ${version.type.includes('Dirty') ? 'bg-red-500/10 text-red-500' :
                                                         version.type.includes('Clean') ? 'bg-green-500/10 text-green-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                         }`}>
                                                         {version.type.toUpperCase()}
                                                      </span>
                                                      {version.label && <span className="text-xs text-gray-500 font-medium">{version.label}</span>}
                                                   </div>
                                                   <button
                                                      onClick={() => {
                                                         const ext = version.downloadUrl.split('.').pop()?.split('?')[0] || 'mp3';
                                                         handleDownload(version.downloadUrl, `${track.artist} - ${track.title} (${version.type}).${ext}`, track);
                                                      }}
                                                      onContextMenu={(e) => {
                                                         e.preventDefault();
                                                         alert('⚠️ Right-click disabled. Please use the Download button to download tracks.');
                                                         return false;
                                                      }}
                                                      className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-brand-purple transition-all duration-300 group-hover/v:scale-105 active:scale-95"
                                                   >
                                                      <Download size={18} />
                                                   </button>
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="p-20 text-center">
                              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                                 <Music size={40} className="text-gray-600" />
                              </div>
                              <h3 className="text-2xl font-display font-bold text-white mb-2">No tracks found</h3>
                              <p className="text-gray-500 max-w-sm mx-auto">We couldn't find any tracks matching your current filters. Try adjusting your search terms or genre selection.</p>
                              <button
                                 onClick={() => {
                                    setSearchQuery('');
                                    setSelectedGenre('All');
                                    setActiveCategory('All');
                                    setSelectedYear('All');
                                 }}
                                 className="mt-6 px-6 py-3 bg-brand-purple/10 text-brand-purple font-bold rounded-2xl border border-brand-purple/20 hover:bg-brand-purple hover:text-white transition-all duration-300"
                              >
                                 Clear All Filters
                              </button>
                           </div>

                        )}

                        <div className="flex flex-col items-center gap-3 py-8 border-t border-white/5 bg-black/5">
                           <p className="text-xs text-gray-500 font-medium underline underline-offset-4 decoration-brand-purple/30">Library Status</p>
                           {poolLoading ? (
                              <div className="flex items-center gap-3 px-8 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-bold">
                                 <RefreshCw size={18} className="text-brand-purple animate-spin" />
                                 Fetching tracks from database... ({poolTracks.length.toLocaleString()} loaded)
                              </div>
                           ) : (
                              <button
                                 onClick={() => refreshPoolTracks()}
                                 className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 hover:border-brand-purple transition-all duration-300 flex items-center gap-2 group"
                              >
                                 <Database size={18} className="text-brand-purple group-hover:scale-110 transition-transform" />
                                 Refresh Library ({poolTracks.length.toLocaleString()} total tracks)
                              </button>
                           )}
                           <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black opacity-50">
                              {poolLoading ? "Loading more tracks in background..." : "The library now loads all available tracks automatically"}
                           </p>
                        </div>

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                           <div className="p-10 flex flex-col items-center justify-center gap-6 border-t border-white/5 bg-black/5 flex-shrink-0">
                              <div className="flex items-center gap-4">
                                 <button
                                    onClick={() => {
                                       setCurrentPage(prev => Math.max(1, prev - 1));
                                       document.getElementById('track-list-top')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    disabled={currentPage === 1}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${currentPage === 1 ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-[#15151A] text-white border border-white/10 hover:border-brand-purple hover:bg-brand-purple/5'}`}
                                 >
                                    <ChevronDown size={20} className="rotate-90" />
                                    Previous
                                 </button>

                                 <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm font-medium">Page</span>
                                    <span className="w-10 h-10 flex items-center justify-center bg-brand-purple text-white font-bold rounded-xl shadow-lg shadow-brand-purple/20">
                                       {currentPage}
                                    </span>
                                    <span className="text-gray-400 text-sm font-medium">of {totalPages}</span>
                                 </div>

                                 <button
                                    onClick={() => {
                                       setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                       document.getElementById('track-list-top')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    disabled={currentPage === totalPages}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all duration-300 ${currentPage === totalPages ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 hover:scale-105 active:scale-95'}`}
                                 >
                                    Next
                                    <ChevronDown size={20} className="-rotate-90" />
                                 </button>
                              </div>

                              {/* Quick Jump Buttons (Show first and last) */}
                              <div className="flex gap-2">
                                 {currentPage > 2 && (
                                    <button onClick={() => { setCurrentPage(1); document.getElementById('track-list-top')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition uppercase font-black tracking-widest">First</button>
                                 )}
                                 {currentPage < totalPages - 1 && (
                                    <button onClick={() => { setCurrentPage(totalPages); document.getElementById('track-list-top')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-white transition uppercase font-black tracking-widest">Last</button>
                                 )}
                              </div>
                           </div>
                        )}

                        {/* Summary Footer */}
                        <div className="p-6 bg-black/20 border-t border-white/5 flex flex-col items-center gap-4">
                           <p className="text-gray-500 text-xs font-medium">
                              Showing tracks <span className="text-white font-bold">{((currentPage - 1) * tracksPerPage) + 1}</span> - <span className="text-white font-bold">{Math.min(currentPage * tracksPerPage, filteredTracks.length)}</span> of <span className="text-white font-bold">{filteredTracks.length}</span> results
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      );
   }


   // --- LOCKED VIEW (LANDING PAGE) ---
   return (
      <div className="pb-20 bg-[#0B0B0F]">
         <Hero
            badge="Exclusive DJ Pool"
            title={<>UNLIMITED <span className="text-brand-purple">POOL</span> ACCESS</>}
            subtitle="Join the elite community of DJs. Get unlimited access to exclusive edits, remixes, and high-quality tracks instantly."
            cta1Text="Choose a Plan"
            cta1Link="#plans"
            bgImage={siteConfig.hero.bgImage}
            showNewsletter={false}
         />
         <div id="plans" className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 2xl:px-32 mt-12">


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
               {subscriptionPlans.map((plan) => {
                  // Only apply referral discount for plans that are NOT the weekly plan
                  const currentReferral = plan.id !== 'weekly' ? appliedReferral : null;

                  return (
                     <div
                        key={plan.id}
                        className={`relative bg-[#15151A] rounded-2xl border p-8 flex flex-col ${plan.isBestValue ? 'border-brand-purple shadow-[0_0_30px_rgba(123,92,255,0.15)] transform scale-105 z-10' : 'border-white/10 hover:border-white/20 transition'}`}
                     >
                        {currentReferral && (
                           <div className="absolute -top-3 right-4 bg-brand-cyan text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg z-20 animate-bounce">
                              {currentReferral.discountType === 'percentage' ? `${currentReferral.discount}%` : `KES ${currentReferral.discount}`} APPLIED
                           </div>
                        )}
                        {plan.isBestValue && (
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-purple text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                              Best Value
                           </div>
                        )}
                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="mb-6 flex items-baseline gap-2">
                           <div className="flex items-baseline">
                              <span className="text-sm text-gray-500 font-bold mr-1">KES</span>
                              <span className={`text-4xl font-bold tracking-tight ${currentReferral ? 'text-gray-500 line-through text-2xl' : 'text-white'}`}>
                                 {plan.price.toLocaleString()}
                              </span>
                           </div>
                           {currentReferral && (
                              <div className="flex items-baseline">
                                 <span className="text-sm text-brand-cyan font-bold mr-1">KES</span>
                                 <span className="text-4xl font-bold text-white tracking-tight">
                                    {currentReferral.discountType === 'percentage'
                                       ? Math.round(plan.price * (1 - currentReferral.discount / 100)).toLocaleString()
                                       : Math.max(0, plan.price - currentReferral.discount).toLocaleString()
                                    }
                                 </span>
                              </div>
                           )}
                        </div>

                        <div className="flex-1">
                           <ul className="space-y-4 mb-8">
                              {(plan.features || []).map((feature, idx) => (
                                 <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                    <Check size={16} className="text-brand-cyan mt-0.5 flex-shrink-0" />
                                    {feature}
                                 </li>
                              ))}
                           </ul>
                        </div>

                        <SubscribeButton
                           plan={plan}
                           referralInfo={currentReferral || undefined}
                           className={`block w-full py-4 text-center font-bold rounded-xl transition ${plan.isBestValue ? 'bg-brand-purple text-white hover:bg-purple-600 shadow-lg shadow-brand-purple/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        />
                     </div>
                  )
               })}
            </div>

            {/* Referral Code Input */}
            <div className="max-w-md mx-auto mb-16">
               <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                     <Ticket size={20} className="text-brand-purple" />
                     <h4 className="text-white font-bold">Have a Referral Code?</h4>
                  </div>

                  {appliedReferral ? (
                     <div className="bg-brand-cyan/10 border border-brand-cyan/20 p-4 rounded-xl flex items-center justify-between">
                        <div>
                           <p className="text-brand-cyan font-bold text-sm uppercase tracking-widest">Code Applied!</p>
                           <p className="text-white text-xs font-mono">{appliedReferral.code.toUpperCase()}</p>
                        </div>
                        <button
                           onClick={() => setAppliedReferral(null)}
                           className="text-gray-500 hover:text-white transition"
                        >
                           <X size={18} />
                        </button>
                     </div>
                  ) : (
                     <div className="space-y-3">
                        <div className="flex gap-2">
                           <input
                              type="text"
                              placeholder="ENTER CODE"
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono uppercase focus:border-brand-purple outline-none"
                           />
                           <button
                              onClick={handleApplyReferral}
                              disabled={isApplying || !referralCode.trim()}
                              className="px-6 py-3 bg-brand-purple text-white font-bold rounded-xl hover:bg-brand-purple/80 transition disabled:opacity-50"
                           >
                              {isApplying ? <RefreshCw size={18} className="animate-spin" /> : 'APPLY'}
                           </button>
                        </div>
                        {referralError && (
                           <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{referralError}</p>
                        )}
                     </div>
                  )}
               </div>
            </div>

            <div className="bg-[#15151A] p-8 rounded-2xl border border-white/10 text-center max-w-2xl mx-auto">
               <p className="text-gray-400 mb-4">Already a member?</p>
               <Link to="/login" className="inline-block px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">Log In to Access</Link>
            </div>
         </div >
      </div >
   );
};

export default MusicPool;
