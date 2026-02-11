
import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Shield, Check, Zap, Smartphone, Globe, Headphones, Star, Search, Download, Play, Folder, ChevronDown, ChevronUp, Clock, Filter, Layers, Music } from 'lucide-react';
import { Link } from 'react-router-dom';
import { POOL_HUBS, POOL_YEARS } from '../constants';

const MusicPool: React.FC = () => {
  const { user } = useAuth();
  const { poolTracks, genres, subscriptionPlans } = useData();
  const isUnlocked = user?.isSubscriber || user?.isAdmin;

  // View State
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedYear, setSelectedYear] = useState<number | 'All'>('All');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Filter Logic
  const filteredTracks = useMemo(() => {
    return poolTracks.filter(track => {
      if (!track) return false;
      const title = track.title || '';
      const artist = track.artist || '';
      
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            artist.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || track.category?.includes(activeCategory);
      const matchesYear = selectedYear === 'All' || track.year === selectedYear;
      const matchesGenre = selectedGenre === 'All' || track.genre === selectedGenre;

      return matchesSearch && matchesCategory && matchesYear && matchesGenre;
    });
  }, [poolTracks, searchQuery, activeCategory, selectedYear, selectedGenre]);

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
                       placeholder="Search artist, title, or BPM..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-[#15151A] border border-white/10 rounded-full py-3 pl-10 pr-4 text-white focus:border-brand-purple focus:outline-none"
                    />
                 </div>
              </div>

              {/* Hubs Scroll */}
              <div className="mb-8 overflow-x-auto pb-2 custom-scrollbar">
                 <div className="flex gap-3">
                    <button 
                       onClick={() => setActiveCategory('All')}
                       className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition ${activeCategory === 'All' ? 'bg-white text-black' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white'}`}
                    >
                       All Tracks
                    </button>
                    {POOL_HUBS.map(hub => (
                       <button 
                          key={hub} 
                          onClick={() => setActiveCategory(hub)}
                          className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition ${activeCategory === hub ? 'bg-brand-purple text-white' : 'bg-[#15151A] border border-white/10 text-gray-400 hover:text-white'}`}
                       >
                          {hub}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Years Folders */}
              <div className="mb-8 overflow-x-auto pb-2 custom-scrollbar">
                 <div className="flex gap-4">
                    {POOL_YEARS.map(year => (
                       <button 
                          key={year}
                          onClick={() => setSelectedYear(selectedYear === year ? 'All' : year)}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition min-w-[120px] ${selectedYear === year ? 'bg-brand-cyan/10 border-brand-cyan text-brand-cyan' : 'bg-[#15151A] border-white/5 text-gray-400 hover:border-white/20'}`}
                       >
                          <Folder size={18} className={selectedYear === year ? "fill-current" : ""} />
                          <span className="font-bold">{year} Edits</span>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Genres Grid (Collapsible/Scrollable) */}
              <div className="mb-12">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2"><Layers size={18} /> Genres</h3>
                    {selectedGenre !== 'All' && <button onClick={() => setSelectedGenre('All')} className="text-xs text-red-500 hover:underline">Clear Genre Filter</button>}
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {genres.slice(0, 12).map(genre => (
                       <div 
                          key={genre.id} 
                          onClick={() => setSelectedGenre(selectedGenre === genre.name ? 'All' : genre.name)}
                          className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group border transition ${selectedGenre === genre.name ? 'border-brand-purple ring-2 ring-brand-purple/50' : 'border-white/5 hover:border-white/20'}`}
                       >
                          <img src={genre.coverUrl} alt={genre.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                          <div className={`absolute inset-0 flex items-end p-3 bg-gradient-to-t from-black/90 via-transparent to-transparent`}>
                             <span className={`font-bold text-sm leading-tight ${selectedGenre === genre.name ? 'text-brand-purple' : 'text-white'}`}>{genre.name}</span>
                          </div>
                       </div>
                    ))}
                    <div className="aspect-square rounded-xl bg-[#15151A] border border-white/5 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-white/20 cursor-pointer transition">
                       <span className="text-xs font-bold uppercase tracking-widest">View All</span>
                       <span className="text-[10px] mt-1">50+ Genres</span>
                    </div>
                 </div>
              </div>

              {/* Track List */}
              <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Tracks ({filteredTracks.length})</h3>
                    <div className="flex gap-2 text-xs text-gray-500">
                       <span className="flex items-center gap-1"><Check size={12} /> High Quality</span>
                       <span className="flex items-center gap-1"><Zap size={12} /> Instant DL</span>
                    </div>
                 </div>

                 <div className="bg-[#15151A] border border-white/5 rounded-2xl overflow-hidden">
                    {filteredTracks.length > 0 ? (
                       <div className="divide-y divide-white/5">
                          {filteredTracks.map(track => (
                             <div key={track.id} className={`group hover:bg-white/[0.02] transition ${expandedTrackId === track.id ? 'bg-white/[0.02]' : ''}`}>
                                
                                {/* Main Row */}
                                <div className="p-4 flex flex-col md:flex-row items-center gap-4">
                                   {/* Play/Art */}
                                   <div className="flex-shrink-0 relative w-12 h-12 bg-gray-800 rounded-lg overflow-hidden group-hover:ring-1 ring-white/20">
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                         <Play size={20} className="text-white fill-current" />
                                      </div>
                                   </div>

                                   {/* Info */}
                                   <div className="flex-1 text-center md:text-left min-w-0">
                                      <h4 className="font-bold text-white truncate text-lg">{track.title}</h4>
                                      <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                                   </div>

                                   {/* Meta */}
                                   <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <span className="bg-white/5 px-2 py-1 rounded border border-white/5 w-24 text-center hidden sm:block">{track.bpm} BPM</span>
                                      <span className="bg-brand-purple/10 text-brand-purple px-2 py-1 rounded border border-brand-purple/20 text-xs font-bold w-24 text-center hidden md:block">{track.genre}</span>
                                   </div>

                                   {/* Actions */}
                                   <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                                      <button className="px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-brand-cyan transition text-xs flex items-center gap-2">
                                         <Download size={14} /> Download All
                                      </button>
                                      <button 
                                         onClick={() => toggleExpand(track.id)}
                                         className={`p-2 rounded-lg border transition ${expandedTrackId === track.id ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-gray-400 hover:text-white'}`}
                                      >
                                         {expandedTrackId === track.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                      </button>
                                   </div>
                                </div>

                                {/* Expanded Versions */}
                                {expandedTrackId === track.id && (
                                   <div className="bg-black/20 p-4 border-t border-white/5 animate-fade-in-down">
                                      <p className="text-xs font-bold text-gray-500 uppercase mb-3 ml-2">Available Versions</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                         {track.versions.map(version => (
                                            <div key={version.id} className="flex items-center justify-between p-3 rounded-lg bg-[#15151A] border border-white/5 hover:border-brand-purple/30 transition group/v">
                                               <div>
                                                  <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${
                                                     version.type.includes('Dirty') ? 'bg-red-500/20 text-red-400' : 
                                                     version.type.includes('Clean') ? 'bg-green-500/20 text-green-400' : 
                                                     'bg-blue-500/20 text-blue-400'
                                                  }`}>
                                                     {version.type}
                                                  </span>
                                                  {version.label && <span className="text-xs text-gray-400">{version.label}</span>}
                                               </div>
                                               <a href={version.downloadUrl} className="text-gray-500 hover:text-white group-hover/v:scale-110 transition">
                                                  <Download size={16} />
                                               </a>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                )}
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="p-12 text-center">
                          <Music size={48} className="mx-auto text-gray-600 mb-4" />
                          <h3 className="text-xl font-bold text-white">No tracks found</h3>
                          <p className="text-gray-500">Try adjusting your filters or search terms.</p>
                       </div>
                    )}
                 </div>
              </div>

           </div>
        </div>
     )
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

                 <a 
                    href={plan.link || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`block w-full py-4 text-center font-bold rounded-xl transition ${plan.isBestValue ? 'bg-brand-purple text-white hover:bg-purple-600 shadow-lg shadow-brand-purple/20' : 'bg-white/10 text-white hover:bg-white/20'}`}
                 >
                    Subscribe Now
                 </a>
              </div>
           ))}
        </div>

        <div className="bg-[#15151A] p-8 rounded-2xl border border-white/10 text-center max-w-2xl mx-auto">
           <p className="text-gray-400 mb-4">Already a member?</p>
           <Link to="/login" className="inline-block px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">Log In to Access</Link>
        </div>
      </div>
    </div>
  );
};

export default MusicPool;
