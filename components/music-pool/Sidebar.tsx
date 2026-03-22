import React from 'react';
import { Search, Folder, Music, Video, Zap, Hash, Layers, ChevronDown, MapPin } from 'lucide-react'; // Added ChevronDown, MapPin
import { motion, AnimatePresence } from 'framer-motion';

interface HubWithGenres {
  hub: string;
  genres: string[];
}

interface SidebarProps {
  hubsWithGenres: HubWithGenres[];
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeHub: string;
  onHubSelect: (hub: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  hubsWithGenres,
  activeGenre,
  onGenreSelect,
  searchTerm,
  onSearchChange,
  activeHub,
  onHubSelect
}) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [expandedHubs, setExpandedHubs] = React.useState<string[]>([]);
  
  const toggleHub = (hub: string) => {
    setExpandedHubs(prev => prev.includes(hub) ? prev.filter(h => h !== hub) : [...prev, hub]);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden w-full mb-4">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl hover:border-brand-purple/30 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-purple/20 text-brand-purple shadow-lg shadow-brand-purple/10">
              <Layers size={20} />
            </div>
            <div className="flex flex-col items-start translate-y-0.5">
              <span className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] leading-none mb-1">Browse Genre</span>
              <span className="text-sm font-bold text-white leading-none">{activeGenre}</span>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isMobileOpen ? 180 : 0 }}
            className="p-2 rounded-lg bg-white/5"
          >
            <ChevronDown size={20} className="text-zinc-500" />
          </motion.div>
        </button>
      </div>

      <aside className={`${isMobileOpen ? 'flex' : 'hidden lg:flex'} w-full lg:w-80 flex-shrink-0 bg-zinc-900/50 backdrop-blur-xl border border-white/5 flex flex-col lg:h-[calc(100vh-200px)] lg:sticky lg:top-24 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 lg:animate-none pb-4 lg:pb-0`}>
      {/* Search Header */}
      <div className="p-6 border-b border-white/5 bg-zinc-900/80 sticky top-0 z-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-purple transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search Genres..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-zinc-800/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple/50 transition-all font-bold"
          />
        </div>
      </div>

      {/* Genre List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-1">
          <div className="px-4 mb-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Music Categories</span>
          </div>
          <button
            onClick={() => {
              onHubSelect('all');
              onGenreSelect('All');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mb-4 ${
              activeHub === 'all' && activeGenre === 'All'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${
              activeHub === 'all' && activeGenre === 'All' ? 'bg-white/20' : 'bg-zinc-800 group-hover:bg-zinc-700'
            }`}>
              <Layers size={16} />
            </div>
            <span className="text-sm font-bold truncate">All Tracks</span>
          </button>
          
          {(hubsWithGenres || []).map((hubData) => {
            if (!hubData?.hub) return null;
            const isExpanded = expandedHubs.includes(hubData.hub) || activeHub === hubData.hub || searchTerm !== '';
            const filteredGenres = (hubData.genres || []).filter(g => g.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // If searching and no genres match in this hub (and hub name itself doesn't match), hide it
            if (searchTerm && filteredGenres.length === 0 && !hubData.hub.toLowerCase().includes(searchTerm.toLowerCase())) return null;

            return (
              <div key={hubData.hub} className="mb-2">
                <button
                  onClick={() => {
                    toggleHub(hubData.hub);
                    onHubSelect(hubData.hub);
                    onGenreSelect('All');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                    activeHub === hubData.hub
                      ? 'bg-zinc-800/80 text-white border border-white/10 shadow-lg'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Folder size={16} className={activeHub === hubData.hub ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'} />
                    <span className="text-sm font-bold truncate">{hubData.hub}</span>
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 text-zinc-500  ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pr-2 py-2 space-y-1 border-l-2 border-white/5 ml-6 mt-1">
                        {filteredGenres.map(genre => (
                          <button
                            key={genre}
                            onClick={() => {
                               onHubSelect(hubData.hub);
                               onGenreSelect(genre);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left ${
                              activeGenre === genre && activeHub === hubData.hub
                                ? 'bg-blue-500/10 text-blue-400 font-bold'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 text-sm'
                            }`}
                          >
                            <span className="truncate">{genre}</span>
                            {activeGenre === genre && activeHub === hubData.hub && (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="p-6 border-t border-white/5 bg-zinc-900/80">
        <div className="flex items-center gap-3 text-zinc-500">
          <Folder size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">{activeHub}</span>
        </div>
      </div>
    </aside>
    </>
  );
};
