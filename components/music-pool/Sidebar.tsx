import React, { useState } from 'react';
import { Search, Folder, Calendar, ChevronDown, ChevronRight, Music, Filter, Trash2, Globe, Clock, Star, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  hubsWithGenres: { 
    name: string; 
    genres: { 
      name: string; 
      sub_genres: string[] 
    }[] 
  }[];
  years: { year: number; months: string[] }[];
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
  activeSubGenre: string;
  onSubGenreSelect: (subGenre: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeHub: string;
  onHubSelect: (hub: string) => void;
  activeYear: string;
  onYearSelect: (year: string) => void;
  activeMonth: string;
  onMonthSelect: (month: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    hubsWithGenres = [],
    years = [],
    activeGenre,
    onGenreSelect,
    activeSubGenre,
    onSubGenreSelect,
    activeHub,
    onHubSelect,
    activeYear,
    onYearSelect,
    activeMonth,
    onMonthSelect
  } = props;

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'hubs' | 'years' | null>('hubs');
  const [expandedHub, setExpandedHub] = useState<string | null>(activeHub !== 'all' ? activeHub : null);
  const [expandedGenre, setExpandedGenre] = useState<string | null>(activeGenre !== 'All' ? activeGenre : null);
  const [expandedYear, setExpandedYear] = useState<number | null>(activeYear !== 'All Years' ? parseInt(activeYear) : null);

  const hasActiveFilters = activeHub !== 'all' || activeGenre !== 'All' || activeSubGenre !== 'all' || activeYear !== 'All Years' || activeMonth !== 'All Months';

  const handleClearFilters = () => {
    onHubSelect('all');
    onGenreSelect('All');
    onSubGenreSelect('all');
    onYearSelect('All Years');
    onMonthSelect('All Months');
    setExpandedHub(null);
    setExpandedGenre(null);
    setExpandedYear(null);
  };

  const NavItem = ({ 
    icon: Icon, 
    label, 
    active, 
    onClick, 
    hasChildren, 
    isExpanded,
    count 
  }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-6 py-3.5 rounded-2xl transition-all duration-300 group ${
        active 
          ? 'bg-blue-600/10 text-white border border-blue-500/20' 
          : 'text-zinc-500 hover:text-white hover:bg-white/[0.03] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={16} className={active ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
        <span className={`text-[11px] font-black uppercase tracking-widest ${active ? 'text-white' : ''}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="text-[9px] font-black text-zinc-700 bg-white/5 px-2 py-0.5 rounded-md">{count}</span>
        )}
        {hasChildren && (
          <ChevronRight 
            size={14} 
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-90 text-blue-400' : 'text-zinc-700'}`} 
          />
        )}
      </div>
    </button>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden w-full mb-6 relative z-30">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full flex items-center justify-between px-6 py-5 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-2xl ${hasActiveFilters ? 'bg-blue-600' : 'bg-zinc-800'} text-white shadow-lg`}>
              <Filter size={20} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] leading-none mb-1.5">Navigation Filter</span>
              <span className="text-[14px] font-bold text-white uppercase tracking-tighter">
                {activeHub !== 'all' ? activeHub : activeYear !== 'All Years' ? activeYear : 'All Tracks'}
              </span>
            </div>
          </div>
          <ChevronDown size={22} className={`text-zinc-500 transition-transform ${isMobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <aside className={`${isMobileOpen ? 'flex fixed inset-0 z-[100] bg-black/95 p-6 overflow-y-auto' : 'hidden'} lg:block lg:sticky lg:top-24 lg:w-80 flex-shrink-0 animate-in fade-in slide-in-from-left-4 h-full`}>
        <div className="w-full bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-6 lg:p-8 flex flex-col gap-8 h-fit shadow-2xl">
          
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-3">
              <Layers className="text-blue-500" size={18} />
              Music Pool
            </h2>
            {hasActiveFilters && (
              <button 
                onClick={handleClearFilters}
                className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-xl transition-all"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div className="space-y-6">
            {/* Hubs & Genres Section */}
            <div className="space-y-4">
              <NavItem
                label="ALL MUSIC PACKS"
                icon={Globe}
                active={activeHub === 'all'}
                onClick={handleClearFilters}
              />

              {hubsWithGenres.map((hub) => (
                <div key={hub.name} className="space-y-2">
                  <NavItem
                    label={hub.name}
                    icon={Folder}
                    active={activeHub === hub.name}
                    onClick={() => {
                      setExpandedHub(expandedHub === hub.name ? null : hub.name);
                      onHubSelect(hub.name);
                      onGenreSelect('All');
                      onSubGenreSelect('all');
                    }}
                    hasChildren={hub.genres.length > 0}
                    isExpanded={expandedHub === hub.name}
                  />

                  <AnimatePresence>
                    {expandedHub === hub.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 space-y-1"
                      >
                        {hub.genres.map((genre) => (
                          <div key={genre.name} className="space-y-1">
                            <button
                              onClick={() => {
                                setExpandedGenre(expandedGenre === genre.name ? null : genre.name);
                                onGenreSelect(genre.name);
                                onSubGenreSelect('all');
                              }}
                              className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl transition-all ${
                                activeGenre === genre.name ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${activeGenre === genre.name ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-zinc-800'}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{genre.name}</span>
                              </div>
                              {genre.sub_genres.length > 0 && (
                                <ChevronRight 
                                  size={12} 
                                  className={`transition-transform ${expandedGenre === genre.name ? 'rotate-90 text-blue-500' : 'text-zinc-800'}`} 
                                />
                              )}
                            </button>

                            <AnimatePresence>
                              {expandedGenre === genre.name && genre.sub_genres.length > 0 && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden pl-6 border-l border-zinc-900 ml-3.5 space-y-1"
                                >
                                  {genre.sub_genres.map(sg => (
                                    <button
                                      key={sg}
                                      onClick={() => onSubGenreSelect(sg)}
                                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[9px] font-bold uppercase transition-all ${
                                        activeSubGenre === sg ? 'text-blue-400 bg-blue-400/5' : 'text-zinc-700 hover:text-zinc-500'
                                      }`}
                                    >
                                      <ChevronRight size={10} className={activeSubGenre === sg ? 'text-blue-500' : 'text-zinc-900'} />
                                      {sg}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Years Section */}
            <div className="pt-6 border-t border-white/5 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-zinc-500" /> Release Date
              </h3>
              
              {years.map(({ year, months }) => (
                <div key={year} className="space-y-2">
                  <NavItem
                    label={year.toString()}
                    icon={Calendar}
                    active={activeYear === year.toString()}
                    onClick={() => {
                      setExpandedYear(expandedYear === year ? null : year);
                      onYearSelect(year.toString());
                      onMonthSelect('All Months');
                    }}
                    hasChildren={months.length > 0}
                    isExpanded={expandedYear === year}
                  />

                  <AnimatePresence>
                    {expandedYear === year && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 mt-1 grid grid-cols-2 gap-2"
                      >
                        {months.map((month) => (
                          <button
                            key={month}
                            onClick={() => onMonthSelect(month)}
                            className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all text-center border ${
                              activeMonth === month 
                                ? 'bg-blue-600/10 text-white border-blue-500/20' 
                                : 'text-zinc-600 hover:text-white bg-zinc-900/40 border-transparent hover:border-white/5'
                            }`}
                          >
                            {month}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-white/5">
             <div className="flex items-center gap-3 justify-center opacity-30">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Live Pool Terminal</span>
             </div>
          </div>

        </div>
      </aside>
    </>
  );
};
