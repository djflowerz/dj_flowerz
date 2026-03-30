
import React, { useState, useMemo } from 'react';
import { Play, Download, Search, Video, Music, Calendar, Youtube } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { MIXTAPE_GENRE_NAMES } from '../constants';

import Hero from '../components/Hero';

const Mixtapes: React.FC = () => {
   const { playTrack, pauseTrack, resumeTrack, currentTrack, isPlaying } = usePlayer();
   const { user } = useAuth();
   const { mixtapes, mixtapesError, siteConfig, toggleWishlist, isInWishlist } = useData();
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedFormat, setSelectedFormat] = useState<'All' | 'Audio' | 'Video'>('All');
   const [selectedGenre, setSelectedGenre] = useState('All');

   // restricted list of genres for mixtapes
   const mixGenres = useMemo(() => {
      return ['All', ...MIXTAPE_GENRE_NAMES];
   }, []);

   const filteredMixtapes = (mixtapes || []).filter(mix => {
      if (!mix) return false;

      const title = mix.title || '';
      const genre = mix.genre || '';

      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
         mix.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGenre = selectedGenre === 'All' || genre === selectedGenre;

      const matchesFormat = selectedFormat === 'All' ||
         (selectedFormat === 'Audio' && !mix.videoDownloadUrl) ||
         (selectedFormat === 'Video' && !!mix.videoDownloadUrl);

      // Hide drafts from non-admins
      const isVisible = mix.status !== 'draft' || (user?.isAdmin || false);

      return matchesSearch && matchesGenre && matchesFormat && isVisible;
   });

   return (

      <div className="pb-20 bg-[#0B0B0F] min-h-screen">
         <Hero
            badge="The Mixtape Catalog"
            title={<>PREMIUM <span className="text-brand-purple">MIXTAPES</span></>}
            subtitle="Browse our collection of premium mixtapes. Free downloads and exclusive paid content available."
            cta1Text="Browse All"
            cta1Link="#mixtapes"
            bgImage={siteConfig.hero.bgImage}
            showNewsletter={false}
         />
         <div id="mixtapes" className="w-full px-4 sm:px-6 lg:px-12 mt-12">


            {/* Search & Filters */}
            <div className="mb-12 space-y-8 glass-panel p-6 md:p-8 rounded-[32px]">
               {/* Search Bar */}
               <div className="max-w-3xl mx-auto relative">
                  <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-cyan/50" />
                  <input
                     type="text"
                     placeholder="SCAN MIXTAPES OR DJS..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white focus:outline-none focus:bg-black/60 focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/20 transition-all font-mono tracking-widest uppercase placeholder:text-gray-600 shadow-inner"
                  />
               </div>

               {/* Format Toggles */}
               <div className="flex flex-wrap justify-center gap-4">
                  <button
                     onClick={() => setSelectedFormat('Audio')}
                     className={`flex items-center gap-2 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${selectedFormat === 'Audio' ? 'bg-brand-purple/20 text-brand-purple border-brand-purple/50 shadow-[0_0_15px_rgba(157,78,221,0.2)] backdrop-blur-md' : 'bg-black/40 backdrop-blur-md border border-white/5 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/30 shadow-inner'}`}
                  >
                     <Music size={16} /> AUDIO MIXES
                  </button>
                  <button
                     onClick={() => setSelectedFormat('Video')}
                     className={`flex items-center gap-2 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${selectedFormat === 'Video' ? 'bg-brand-pink/20 text-brand-pink border-brand-pink/50 shadow-[0_0_15px_rgba(255,42,133,0.2)] backdrop-blur-md' : 'bg-black/40 backdrop-blur-md border border-white/5 text-gray-400 hover:text-brand-pink hover:bg-brand-pink/10 hover:border-brand-pink/30 shadow-inner'}`}
                  >
                     <Video size={16} /> VIDEO MIXES
                  </button>
               </div>

               {/* Genre Filters */}
               <div className="flex flex-wrap justify-center gap-2 pt-4 border-t border-white/5">
                  {mixGenres.map(genre => (
                     <button
                        key={genre}
                        onClick={() => setSelectedGenre(genre)}
                        className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${selectedGenre === genre ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/50 shadow-[0_0_15px_rgba(40,230,220,0.2)] backdrop-blur-md' : 'bg-black/40 backdrop-blur-md border border-white/5 text-gray-400 hover:text-brand-cyan hover:bg-brand-cyan/10 hover:border-brand-cyan/30 shadow-inner'}`}
                     >
                        {genre}
                     </button>
                  ))}
               </div>
            </div>

            {/* Error Message removed by request */}

            {/* Grid */}
            {filteredMixtapes.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {filteredMixtapes.map((mix, idx) => (
                     <div key={`${mix.id}-${idx}`} className="glass-card rounded-[24px] overflow-hidden border border-white/5 hover:border-brand-cyan/30 transition duration-300 group flex flex-col hover:shadow-[0_8px_30px_rgba(40,230,220,0.1)] relative">
                        <div className="relative aspect-[4/3] sm:aspect-square bg-black/40 border-b border-white/5 overflow-hidden">
                           <img src={mix.coverUrl} alt={mix.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                           <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 z-20">
                              <button
                                 onClick={(e) => {
                                    e.preventDefault();
                                    if (currentTrack?.id === mix.id && isPlaying) {
                                       pauseTrack();
                                    } else if (currentTrack?.id === mix.id && !isPlaying) {
                                       resumeTrack();
                                    } else {
                                       playTrack(mix);
                                    }
                                 }}
                                 className="w-14 h-14 rounded-full bg-brand-cyan text-black flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(40,230,220,0.4)]"
                              >
                                 {currentTrack?.id === mix.id && isPlaying ? (
                                    <div className="flex items-center gap-0.5">
                                       <div className="w-1 h-5 bg-black animate-bounce" style={{ animationDelay: '0.1s' }} />
                                       <div className="w-1 h-7 bg-black animate-bounce" style={{ animationDelay: '0.2s' }} />
                                       <div className="w-1 h-4 bg-black animate-bounce" style={{ animationDelay: '0.3s' }} />
                                    </div>
                                 ) : <Play size={24} fill="currentColor" className="ml-1" />}
                              </button>
                              
                              <button
                                 onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const isWishlisted = isInWishlist(mix.id);
                                    const result = await toggleWishlist(mix.id, 'mixtape');
                                    if (result.success) {
                                       toast.success(result.message || 'Updated wishlist');
                                    } else {
                                       toast.error(result.message || 'Failed to update wishlist');
                                    }
                                 }}
                                 className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${
                                    isInWishlist(mix.id) 
                                      ? 'bg-brand-purple text-white shadow-brand-purple/40' 
                                      : 'bg-white/10 backdrop-blur-md text-white hover:bg-brand-purple'
                                 }`}
                                 title={isInWishlist(mix.id) ? "Remove from wishlist" : "Add to wishlist"}
                              >
                                 <Heart size={24} fill={isInWishlist(mix.id) ? "currentColor" : "none"} />
                              </button>
                           </div>
                           <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
                           {mix.isExclusive && (
                              <span className="absolute top-3 right-3 bg-brand-pink text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(255,40,126,0.3)] uppercase tracking-widest z-20 backdrop-blur-md">
                                 PREMIUM
                              </span>
                           )}
                           {mix.videoDownloadUrl && (
                              <span className="absolute top-3 left-3 bg-brand-pink/90 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(255,42,133,0.3)] uppercase tracking-widest z-20 backdrop-blur-md flex items-center gap-1">
                                 <Video size={10} /> VIDEO
                              </span>
                           )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-transparent to-black/20 z-10">
                           <Link to={`/mixtapes/${mix.id}`} className="block hover:text-brand-cyan transition-colors mb-2">
                              <h3 className="font-outfit font-black text-white line-clamp-2 text-lg md:text-xl uppercase tracking-tight leading-tight">{mix.title}</h3>
                           </Link>
                           <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-4">
                              <span className="border border-white/10 px-2.5 py-1 rounded-full bg-white/5">{mix.genre}</span>
                              <span className="flex items-center gap-1 text-gray-500"><Calendar size={12} /> {mix.releaseDate ? new Date(mix.releaseDate).getFullYear() : (mix.date || '2023')}</span>
                           </div>
                           <div className="mt-auto pt-4 border-t border-white/10 border-dashed flex justify-between items-center">
                              <button
                                 onClick={() => {
                                    if (currentTrack?.id === mix.id && isPlaying) {
                                       pauseTrack();
                                    } else if (currentTrack?.id === mix.id && !isPlaying) {
                                       resumeTrack();
                                    } else {
                                       playTrack(mix);
                                    }
                                 }}
                                 className="text-[10px] font-black tracking-widest text-brand-cyan hover:text-white transition-colors uppercase flex items-center gap-1.5"
                              >
                                 {currentTrack?.id === mix.id && isPlaying ? <><div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></div> PAUSE</> : <><Play size={14} /> PLAY NOW</>}
                              </button>

                              {mix.youtubeUrl && (
                                 <a
                                    href={mix.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-black tracking-widest text-[#FF0000] hover:text-white transition-colors uppercase flex items-center gap-1.5"
                                 >
                                    <Youtube size={14} /> YOUTUBE
                                 </a>
                              )}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="text-center py-20 bg-[#15151A] rounded-2xl border border-white/5">
                  <p className="text-gray-400">No mixtapes found matching your criteria.</p>
                  <button onClick={() => { setSearchQuery(''); setSelectedGenre('All'); setSelectedFormat('All'); }} className="mt-4 text-brand-purple hover:underline">Clear filters</button>
               </div>
            )}

         </div>
      </div>
   );
};

export default Mixtapes;
