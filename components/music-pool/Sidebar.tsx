import React from 'react';
import { Search, Folder, Music, Video, Zap, Hash, Layers, ChevronDown, MapPin } from 'lucide-react'; // Added ChevronDown, MapPin
import { motion, AnimatePresence } from 'framer-motion';

interface HubWithGenres {
  hub: string;
  genres: string[];
}

interface YearData {
  year: number;
  months: string[];
}

interface SidebarProps {
  hubsWithGenres: HubWithGenres[];
  years: YearData[];
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeHub: string;
  onHubSelect: (hub: string) => void;
  activeYear: string;
  onYearSelect: (year: string) => void;
  activeMonth: string;
  onMonthSelect: (month: string) => void;
}

const DEFAULT_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Sidebar: React.FC<SidebarProps> = ({
  hubsWithGenres,
  years,
  activeGenre,
  onGenreSelect,
  searchTerm,
  onSearchChange,
  activeHub,
  onHubSelect,
  activeYear,
  onYearSelect,
  activeMonth,
  onMonthSelect
}) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [expandedHubs, setExpandedHubs] = React.useState<string[]>([]);
  const [expandedYears, setExpandedYears] = React.useState<string[]>([]);
  
  const toggleHub = (hub: string) => {
    setExpandedHubs(prev => prev.includes(hub) ? prev.filter(h => h !== hub) : [...prev, hub]);
  };

  const toggleYear = (year: string) => {
    setExpandedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]);
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
              <span className="text-[11px] uppercase font-black text-zinc-500 tracking-[0.15em] leading-none mb-1.5">Browse Genre</span>
              <span className="text-[15px] font-bold text-white leading-none">{activeGenre}</span>
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

      <aside className={`${isMobileOpen ? 'flex' : 'hidden lg:flex'} w-full lg:w-80 flex-shrink-0 bg-zinc-900/50 backdrop-blur-xl border border-white/5 flex flex-col lg:h-[calc(100vh-140px)] lg:sticky lg:top-24 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 lg:animate-none pb-4 lg:pb-0`}>
      {/* Search & Folder Selectors */}
      <div className="p-6 border-b border-white/5 bg-zinc-900/80 sticky top-0 z-20 space-y-4">
        {/* Dropdowns from Reference Image */}
        <div className="space-y-3">
          <div className="relative group">
            <select
              id="sidebar-folder-select"
              value={activeHub === 'all' || activeHub === 'All Hubs' ? '' : activeHub}
              onChange={(e) => {
                const hub = e.target.value || 'all';
                onHubSelect(hub);
                onGenreSelect('All');
              }}
              className="w-full bg-white text-black font-black py-3.5 px-5 rounded-2xl appearance-none cursor-pointer focus:ring-4 focus:ring-brand-purple/20 transition-all text-[13px] uppercase tracking-widest shadow-xl shadow-black/20"
            >
              <option value="" disabled>Select Folder</option>
              <option value="all">All Folders</option>
              {hubsWithGenres.map(h => (
                <option key={h.hub} value={h.hub}>{h.hub}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-black/50 group-hover:text-black transition-colors" size={16} />
          </div>

          <div className="relative group">
            <select
              id="sidebar-subfolder-select"
              value={(activeGenre === 'All' || !activeGenre) ? '' : activeGenre}
              onChange={(e) => onGenreSelect(e.target.value)}
              disabled={activeHub === 'all' || !activeHub || activeHub === 'All Hubs'}
              className="w-full bg-[#121216] text-white font-black py-3.5 px-5 rounded-2xl appearance-none cursor-pointer focus:ring-4 focus:ring-white/5 transition-all text-[13px] uppercase tracking-widest border border-white/5 shadow-inner disabled:opacity-30"
            >
              <option value="" disabled>Select Subfolder</option>
              <option value="All">View All</option>
              {activeHub !== 'all' && activeHub !== 'All Hubs' && hubsWithGenres.find(h => h.hub === activeHub)?.genres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/40 transition-colors" size={16} />
          </div>
        </div>

        <div className="relative group pt-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-brand-purple transition-colors" size={16} />
          <input
            id="genre-sidebar-search"
            name="genreSearch"
            type="text"
            placeholder="Filter list..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-[12px] text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 transition-all font-bold"
          />
        </div>
      </div>

      {/* Genre List removed as per user request to rely on dropdowns */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {/* Navigation is now handled exclusively by the dropdowns above */}
      </div>
      
      {/* Footer Branding */}
      <div className="p-6 border-t border-white/5 bg-zinc-900/80 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-zinc-600">
            <Layers size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{activeHub === 'all' || activeHub === 'All Hubs' ? 'Full Library' : activeHub}</span>
          </div>
          <button 
            onClick={() => {
              onHubSelect('all');
              onGenreSelect('All');
              onYearSelect('All Years');
              onMonthSelect('All Months');
            }}
            className="text-[10px] font-black text-brand-purple uppercase tracking-widest hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
