
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import {
   LayoutDashboard, Package, Trash2, Check, X, Plus, Mic, Globe, Save, FileText, DollarSign, Upload,
   Image as ImageIcon, Box, Lock, List, MessageSquare, Link as LinkIcon, PenSquare,
   Mail, MessageCircle, Truck, Send, Headphones, Menu, Search, Edit2, Timer, Eye, Download, Info, CheckCircle,
   Layers, ChevronDown, ChevronUp, Folder, Database, RefreshCw, Zap, Shield, Play, Pause, Music, Star, Smartphone, Clock, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { POOL_HUBS, POOL_YEARS, MONTHS } from '../constants';
import SubscribeButton from '../components/SubscribeButton';
import { downloadFile } from '../utils/downloadHelper';

const MusicPool: React.FC = () => {
   const { user, updateUserProfile } = useAuth();
   const { poolTracks, genres, subscriptionPlans, poolError, poolLoading, loadMorePoolTracks, refreshPoolTracks } = useData();
   const { pauseTrack: pauseGlobalTrack } = usePlayer();
   const isUnlocked = user?.isSubscriber || user?.isAdmin;

   // View State
   const [activeCategory, setActiveCategory] = useState('All');
   const [selectedYear, setSelectedYear] = useState<number | 'All'>('All');
   const [selectedMonth, setSelectedMonth] = useState<string>('All');
   const [selectedGenre, setSelectedGenre] = useState('All');
   const [searchQuery, setSearchQuery] = useState('');
   const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

   // Audio Player State
   const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
   const mediaRef = React.useRef<HTMLMediaElement | null>(null);

   const handleDownload = async (url: string, fileName: string) => {
      if (!user) {
         alert("Please login to download.");
         return;
      }

      if (user.isAdmin) {
         downloadFile(url, fileName);
         return;
      }

      if (!user.isSubscriber) {
         alert("Subscription required to download.");
         return;
      }

      // Check Limits
      const today = new Date().toISOString().split('T')[0];

      // Determine Limit based on Plan
      // Check for weekly plan identifiers
      const planId = user.subscriptionPlan?.toLowerCase() || '';
      const isWeekly = planId.includes('week') || planId.includes('7') || planId === 'weekly';
      const limit = isWeekly ? 30 : 200;

      let downloadsToday = user.downloadsToday || 0;
      const lastDate = user.lastDownloadDate || '';

      if (lastDate !== today) {
         downloadsToday = 0; // Reset if new day
      }

      if (downloadsToday >= limit) {
         alert(`Daily download limit reached (${limit}/day). Please try again tomorrow.`);
         return;
      }

      // Proceed
      downloadFile(url, fileName);

      // Update User Stats
      await updateUserProfile({
         downloadsToday: downloadsToday + 1,
         lastDownloadDate: today
      });
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

   // Auto-play when media is ready
   useEffect(() => {
      if (playingTrackId && mediaRef.current) {
         mediaRef.current.play().catch(e => {
            console.warn("Autoplay blocked, user interaction required:", e);
         });
      }
   }, [playingTrackId]);

   // Filter Logic
   // Filter Logic
   const filteredTracks = useMemo(() => {
      const query = searchQuery.toLowerCase();
      return poolTracks.filter(track => {
         if (!track) return false;
         const title = (track.title || '').toLowerCase();
         const artist = (track.artist || '').toLowerCase();
         const genre = (track.genre || '').toLowerCase();
         const categories = (track.category || []).map(c => c.toLowerCase());

         const matchesSearch = title.includes(query) || artist.includes(query);

         const matchesCategory = activeCategory === 'All' ||
            categories.some(c => c.includes(activeCategory.toLowerCase()) || activeCategory.toLowerCase().includes(c));

         const matchesYear = selectedYear === 'All' || Number(track.year) === Number(selectedYear);

         const matchesGenre = selectedGenre === 'All' ||
            genre.includes(selectedGenre.toLowerCase()) ||
            selectedGenre.toLowerCase().includes(genre) ||
            categories.some(c => c.includes(selectedGenre.toLowerCase()) || selectedGenre.toLowerCase().includes(c));

         // Month filtering for year-based categories
         const matchesMonth = selectedMonth === 'All' ||
            categories.some(c => c.toLowerCase().includes(selectedMonth.toLowerCase()));

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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

               {/* Header & Search */}
               <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                  <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                     <Headphones className="text-brand-purple" /> DJ Pool Library
                  </h1>
                  <div className="relative w-full md:w-96">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                     <input
                        type="text"
                        placeholder="Search artist or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#15151A] border border-white/10 rounded-full py-3 pl-10 pr-4 text-white focus:border-brand-purple focus:outline-none placeholder:text-gray-600 shadow-lg"
                     />
                  </div>
               </div>

               {/* Hubs Scroll */}
               <div className="mb-6 overflow-x-auto pb-4 custom-scrollbar">
                  <div className="flex gap-3">
                     <button
                        onClick={() => setActiveCategory('All')}
                        className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap transition-all duration-300 ${activeCategory === 'All' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                     >
                        All Tracks
                     </button>
                     {POOL_HUBS.map(hub => (
                        <button
                           key={hub}
                           onClick={() => setActiveCategory(hub)}
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
                           onClick={() => setSelectedYear(selectedYear === year ? 'All' : year)}
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
                           onClick={() => setSelectedGenre('All')}
                           className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedGenre === 'All' ? 'bg-brand-purple text-white' : 'bg-[#15151A] text-gray-400 border border-white/10'}`}
                        >
                           All Genres
                        </button>
                        {genres.map(genre => (
                           <button
                              key={genre.id}
                              onClick={() => setSelectedGenre(genre.name)}
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
                              onClick={() => setSelectedGenre('All')}
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
                                 onClick={() => setSelectedGenre(genre.name)}
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

                     <div className="bg-[#15151A]/60 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        {poolError && (
                           <div className="p-8 text-center text-red-400 bg-red-500/10 border-b border-red-500/20">
                              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                 <Shield size={24} className="text-red-500" />
                              </div>
                              <p className="font-bold text-lg mb-1">Database Quota Exceeded</p>
                              <p className="text-sm opacity-80 max-w-md mx-auto">We've reached our daily usage limit for data fetching. Some tracks may not appear until the quota resets. Please try again tomorrow!</p>
                           </div>
                        )}

                        {filteredTracks.length > 0 ? (
                           <div className="divide-y divide-white/5">
                              {visibleTracks.map(track => (
                                 <div key={track.id} className={`group hover:bg-white/[0.03] transition-all duration-300 ${expandedTrackId === track.id ? 'bg-white/[0.03]' : ''}`}>

                                    {/* Main Row */}
                                    <div className="p-5 flex flex-col md:flex-row items-center gap-5">
                                       {/* Play/Art */}
                                       <div
                                          onClick={() => togglePlay(track)}
                                          className="relative flex-shrink-0 w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden group-hover:ring-2 ring-white/10 cursor-pointer shadow-xl transition-all duration-300 group-hover:scale-105 active:scale-95"
                                       >
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                                             {playingTrackId === track.id ? (
                                                <Pause size={24} className="text-brand-cyan fill-current animate-pulse" />
                                             ) : (
                                                <Play size={24} className="text-white fill-current translate-x-0.5" />
                                             )}
                                          </div>
                                          {/* Subtle glow when playing */}
                                          {playingTrackId === track.id && (
                                             <div className="absolute inset-0 bg-brand-cyan/10 animate-pulse"></div>
                                          )}
                                       </div>

                                       {/* Info */}
                                       <div className="flex-1 text-center md:text-left min-w-0">
                                          <h4 className="font-display font-bold text-white truncate text-xl mb-0.5 group-hover:text-brand-cyan transition-colors">{track.title}</h4>
                                          <p className="text-brand-purple text-sm font-medium truncate opacity-80">{track.artist}</p>
                                       </div>

                                       {/* Meta */}
                                       <div className="hidden md:flex items-center gap-3 text-sm">
                                          <span className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-gray-400 text-xs font-medium min-w-[100px] text-center">
                                             {track.versions && track.versions.length > 0 ? track.versions[0].type : 'Original'}
                                          </span>
                                          <span className="bg-brand-purple/10 text-brand-purple px-3 py-1.5 rounded-xl border border-brand-purple/20 text-xs font-black min-w-[100px] text-center tracking-tighter">
                                             {track.genre?.replace(/\s*\(\d+\s*tracks\)/i, '').toUpperCase()}
                                          </span>
                                       </div>

                                       {/* Actions */}
                                       <div className="flex items-center gap-3 w-full md:w-auto justify-center">
                                          <button
                                             onClick={() => {
                                                const firstVersion = track.versions?.[0];
                                                if (firstVersion?.downloadUrl) {
                                                   const ext = firstVersion.downloadUrl.split('.').pop()?.split('?')[0] || 'mp3';
                                                   handleDownload(firstVersion.downloadUrl, `${track.artist} - ${track.title}.${ext}`);
                                                }
                                             }}
                                             className="flex-1 md:flex-none px-6 py-3 bg-white text-black font-bold rounded-2xl hover:bg-brand-cyan hover:scale-105 transition-all duration-300 text-sm shadow-lg flex items-center justify-center gap-2 group/btn active:scale-95"
                                          >
                                             <Download size={16} className="group-hover/btn:translate-y-0.5 transition-transform" />
                                             Download
                                          </button>
                                          <button
                                             onClick={() => toggleExpand(track.id)}
                                             className={`p-3 rounded-2xl border transition-all duration-300 ${expandedTrackId === track.id ? 'bg-white/10 border-white/30 text-white' : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`}
                                          >
                                             {expandedTrackId === track.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                          </button>
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
                                                      ref={mediaRef as any}
                                                      controls
                                                      autoPlay
                                                      playsInline
                                                      className="w-full max-h-[600px] object-contain"
                                                      src={mediaUrl}
                                                      onEnded={() => setPlayingTrackId(null)}
                                                   />
                                                </div>
                                             ) : (
                                                <div className="bg-[#0B0B0F] p-4 rounded-2xl border border-white/10 shadow-xl ring-1 ring-brand-purple/20">
                                                   <audio
                                                      ref={mediaRef as any}
                                                      controls
                                                      autoPlay
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
                                             {track.versions.map(version => (
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
                                                         handleDownload(version.downloadUrl, `${track.artist} - ${track.title} (${version.type}).${ext}`);
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
                           <p className="text-xs text-gray-500 font-medium underline underline-offset-4 decoration-brand-purple/30">Total Library Browser</p>
                           {poolTracks.length < 45000 && (
                              <button
                                 onClick={() => loadMorePoolTracks(5000)}
                                 className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 hover:border-brand-purple transition-all duration-300 flex items-center gap-2 group"
                              >
                                 <Layers size={18} className="text-brand-purple group-hover:scale-110 transition-transform" />
                                 Fetch Remaining Tracks from Database (Current: {poolTracks.length.toLocaleString()})
                              </button>
                           )}
                           <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black opacity-50">
                              {poolTracks.length >= 45000 ? "Full Library Loaded" : "Fetching additional tracks in the background"}
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

                           {filteredTracks.length >= 1000 && (
                              <button
                                 onClick={() => loadMorePoolTracks(2000)}
                                 disabled={poolLoading}
                                 className="flex items-center gap-2 px-8 py-3 bg-brand-purple/10 border border-brand-purple/30 text-brand-purple rounded-xl font-bold hover:bg-brand-purple/20 transition-all disabled:opacity-50"
                              >
                                 {poolLoading ? (
                                    <RefreshCw className="animate-spin" size={18} />
                                 ) : (
                                    <Database size={18} />
                                 )}
                                 Load More From Full Library (45k+ Tracks)
                              </button>
                           )}
                        </div>
                     </div>
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
                        onClick={() => setSelectedMonth('All')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedMonth === 'All' ? 'bg-brand-purple text-white shadow-lg' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                     >
                        All Months
                     </button>
                     {MONTHS.map(month => (
                        <button
                           key={month}
                           onClick={() => setSelectedMonth(month)}
                           className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedMonth === month ? 'bg-brand-purple text-white shadow-lg' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}
                        >
                           {month}
                        </button>
                     ))}
                  </div>
               </div>
            )}

         </div>
      );
   }

   // --- LOCKED VIEW (LANDING PAGE) ---
   return (
      <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
               <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 uppercase">Music Pool Subscriptions</h1>
               <p className="text-xl text-brand-purple font-bold tracking-wider mb-4">CHOOSE YOUR PLAN</p>
               <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                  Join the elite community of DJs. Get unlimited access to exclusive edits, remixes, and high-quality tracks instantly.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
               {subscriptionPlans.map((plan) => (
                  <div
                     key={plan.id}
                     className={`relative bg-[#15151A] rounded-2xl border p-8 flex flex-col ${plan.isBestValue ? 'border-brand-purple shadow-[0_0_30px_rgba(123,92,255,0.15)] transform scale-105 z-10' : 'border-white/10 hover:border-white/20 transition'}`}
                  >
                     {plan.isBestValue && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-purple text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                           Best Value
                        </div>
                     )}
                     <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                     <div className="mb-6 flex items-baseline">
                        <span className="text-sm text-gray-500 font-bold mr-1">KES</span>
                        <span className="text-4xl font-bold text-white tracking-tight">{plan.price.toLocaleString()}</span>
                        {/* <span className="text-gray-500 ml-1">/{plan.period}</span> */}
                     </div>

                     <div className="flex-1">
                        <ul className="space-y-4 mb-8">
                           {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                                 <Check size={16} className="text-brand-cyan mt-0.5 flex-shrink-0" />
                                 {feature}
                              </li>
                           ))}
                        </ul>
                     </div>

                     <SubscribeButton
                        plan={plan}
                        className={`block w-full py-4 text-center font-bold rounded-xl transition ${plan.isBestValue ? 'bg-brand-purple text-white hover:bg-purple-600 shadow-lg shadow-brand-purple/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                     />
                  </div>
               ))}
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
