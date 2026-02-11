
import React, { useState } from 'react';
import { Play, Download, Search, Video, Music, Calendar } from 'lucide-react';
import { useData } from '../context/DataContext';
import { usePlayer } from '../context/PlayerContext';
import { Link } from 'react-router-dom';

const Mixtapes: React.FC = () => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { mixtapes } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'All' | 'Audio' | 'Video'>('All');
  const [selectedGenre, setSelectedGenre] = useState('All');

  const genres = ['All', 'Afrobeats', 'Hip-Hop', 'EDM', 'Amapiano', 'House', 'R&B'];

  const filteredMixtapes = mixtapes.filter(mix => {
     if (!mix) return false;
     
     const title = mix.title || '';
     const genre = mix.genre || '';
     
     const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           genre.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesGenre = selectedGenre === 'All' || genre === selectedGenre;
     // Mock format filtering since data doesn't explicitly distinguish formats well yet, assume all are audio primarily
     const matchesFormat = selectedFormat === 'All' || (selectedFormat === 'Audio'); 

     return matchesSearch && matchesGenre && matchesFormat;
  });

  return (
    <div className="pt-24 pb-20 bg-[#0B0B0F] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center mb-12">
           <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 uppercase tracking-wider">Mixtapes</h1>
           <p className="text-gray-400 max-w-2xl mx-auto">
             Browse our collection of premium mixtapes. Free downloads and exclusive paid content available.
           </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-12 space-y-8">
           {/* Search Bar */}
           <div className="max-w-2xl mx-auto relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search mixtapes or DJs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#15151A] border border-white/10 rounded-full py-4 pl-12 pr-6 text-white text-lg focus:outline-none focus:border-brand-purple shadow-lg" 
              />
           </div>

           {/* Format Toggles */}
           <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setSelectedFormat('Audio')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border transition ${selectedFormat === 'Audio' ? 'bg-brand-purple text-white border-brand-purple' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
              >
                 <Music size={18} /> Audio Mixes
              </button>
              <button 
                onClick={() => setSelectedFormat('Video')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border transition ${selectedFormat === 'Video' ? 'bg-brand-purple text-white border-brand-purple' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
              >
                 <Video size={18} /> Video Mixes
              </button>
           </div>

           {/* Genre Filters */}
           <div className="flex flex-wrap justify-center gap-2">
              {genres.map(genre => (
                 <button 
                   key={genre}
                   onClick={() => setSelectedGenre(genre)}
                   className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${selectedGenre === genre ? 'bg-white text-black' : 'bg-[#15151A] text-gray-400 hover:text-white hover:bg-white/10'}`}
                 >
                    {genre}
                 </button>
              ))}
           </div>
        </div>

        {/* Grid */}
        {filteredMixtapes.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredMixtapes.map((mix, idx) => (
                 <div key={`${mix.id}-${idx}`} className="bg-[#15151A] rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition group flex flex-col shadow-lg">
                   <div className="relative aspect-square">
                     <img src={mix.coverUrl} alt={mix.title} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                        <button 
                          onClick={(e) => { e.preventDefault(); playTrack(mix); }}
                          className="w-12 h-12 rounded-full bg-brand-purple text-white flex items-center justify-center hover:scale-110 transition shadow-lg"
                        >
                          {currentTrack?.id === mix.id && isPlaying ? <div className="w-3 h-3 bg-white animate-pulse" /> : <Play size={20} fill="white" className="ml-1" />}
                        </button>
                     </div>
                     {mix.isExclusive && (
                       <span className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">PREMIUM</span>
                     )}
                   </div>
                   <div className="p-4 flex-1 flex flex-col">
                      <Link to={`/mixtapes/${mix.id}`} className="block hover:text-brand-cyan transition">
                         <h3 className="font-bold text-white truncate text-lg mb-1">{mix.title}</h3>
                      </Link>
                      <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                         <span className="bg-white/5 px-2 py-0.5 rounded">{mix.genre}</span>
                         <span className="flex items-center gap-1"><Calendar size={12} /> {mix.date || '2023'}</span>
                      </div>
                      <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center">
                         <button 
                           onClick={() => playTrack(mix)}
                           className="text-xs font-bold text-brand-purple hover:text-white transition uppercase flex items-center gap-1"
                         >
                            <Play size={12} /> Play Now
                         </button>
                         <Link to={`/mixtapes/${mix.id}`} className="text-gray-400 hover:text-white transition flex items-center gap-1 text-xs">
                           <Download size={14} /> Download
                         </Link>
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
