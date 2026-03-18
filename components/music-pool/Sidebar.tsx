import React from 'react';
import { Search, Folder, Music, Video, Zap, Hash, Layers } from 'lucide-react';
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
  return (
    <aside className="w-80 flex-shrink-0 bg-zinc-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col h-[calc(100vh-140px)] sticky top-20 rounded-2xl overflow-hidden shadow-xl">
      {/* Search Header */}
      <div className="p-6 border-b border-white/5 bg-zinc-900/80 sticky top-0 z-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search Genres..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-zinc-800/50 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
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
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
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
  );
};
