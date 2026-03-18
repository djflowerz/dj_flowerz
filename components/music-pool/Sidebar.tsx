import React from 'react';
import { Search, Folder, Music, Video, Zap, Hash, Layers, ChevronDown } from 'lucide-react'; // Added ChevronDown
import { motion } from 'framer-motion';

interface SidebarProps {
  genres: string[];
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeHub: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  genres,
  activeGenre,
  onGenreSelect,
  searchTerm,
  onSearchChange,
  activeHub
}) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

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
          
          {genres.filter(g => g.toLowerCase().includes(searchTerm.toLowerCase())).map((genre) => (
            <button
              key={genre}
              onClick={() => onGenreSelect(genre)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeGenre === genre
                  ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/25'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${
                activeGenre === genre ? 'bg-white/20' : 'bg-zinc-800 group-hover:bg-zinc-700'
              }`}>
                {genre === 'All' ? <Layers size={16} /> : 
                 genre.includes('Video') ? <Video size={16} /> : 
                 genre.includes('Hype') ? <Zap size={16} /> : 
                 <Music size={16} />}
              </div>
              <span className="text-sm font-bold truncate">{genre}</span>
              {activeGenre === genre && (
                <motion.div 
                  layoutId="active-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" 
                />
              )}
            </button>
          ))}
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
