import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import {
   Search, Download, Play, Pause, X, ChevronDown,
   Music2, Radio, Filter, Zap, CheckCircle2, AlertCircle,
   Clock, SortAsc, SortDesc, Disc3, Fuel
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Track } from '../types';
import { POOL_HUBS, POOL_YEARS, MONTHS, GENRE_NAMES } from '../constants';
import { fetchPoolTracks, trackPoolDownload, fetchPoolFilters } from '../utils/r2';
import AccessDenied from '../components/AccessDenied';
import { toast } from 'sonner';

// ─── Mini Audio Player State ──────────────────────────────────────────────────
interface PlayerState {
   track: Track | null;
   versionId?: string;
   isPlaying: boolean;
}

// ─── Filter State ─────────────────────────────────────────────────────────────
interface Filters {
   search: string;
   hub: string;
   displayGenre: string;
   year: string;
   month: string;
   vibe: string;
}

const DEFAULT_FILTERS: Filters = {
   search: '',
   hub: '',
   displayGenre: '',
   year: '',
   month: '',
   vibe: '',
};

// ─── Vibe Colours ─────────────────────────────────────────────────────────────
const VIBE_COLORS: Record<string, string> = {
   'Hype': 'hsl(25 95% 55%)',
   'Low Hype': 'hsl(205 85% 55%)',
   'Chill': 'hsl(160 60% 45%)',
   'Energetic': 'hsl(300 80% 55%)',
};

const VIBES = ['Hype', 'Low Hype', 'Chill', 'Energetic'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalise = (s: string) => s.toLowerCase().trim();

function getUnique<T>(arr: T[], fn: (item: T) => string | undefined): string[] {
   const seen = new Set<string>();
   const result: string[] = [];
   for (const item of arr) {
      const val = fn(item);
      if (val && !seen.has(val)) {
         seen.add(val);
         result.push(val);
      }
   }
   return result.sort();
}

// ─── Select Component ─────────────────────────────────────────────────────────
function FilterSelect({
   value, onChange, options, placeholder, icon: Icon
}: {
   value: string;
   onChange: (v: string) => void;
   options: string[];
   placeholder: string;
   icon: React.ElementType;
}) {
   return (
      <div className="mp-select-wrapper">
         <Icon size={15} className="mp-select-icon" />
         <select
            className="mp-select"
            value={value}
            onChange={e => onChange(e.target.value)}
         >
            <option value="">{placeholder}</option>
            {options.map(o => (
               <option key={o} value={o}>{o}</option>
            ))}
         </select>
         <ChevronDown size={13} className="mp-select-chevron" />
      </div>
   );
}

// ─── Track Row ────────────────────────────────────────────────────────────────
const TrackRow = React.memo(({ track, player, onPlay, onDownload }: {
   track: Track;
   player: PlayerState;
   onPlay: (t: Track, versionId?: string) => void;
   onDownload: (t: Track, versionId?: string) => void;
}) => {
   const [selectedVersionId, setSelectedVersionId] = useState(track.versions?.[0]?.id);
   const isActive = player.track?.id === track.id;
   const isPlaying = isActive && player.isPlaying;
   const vibe = track.vibe || 'Hype';
   const vibeColor = VIBE_COLORS[vibe] || VIBE_COLORS['Hype'];
   const yearLabel = track.releaseYear || track.year;

   const activeVersionId = isActive ? player.versionId : selectedVersionId;

   return (
      <div className={`mp-track-row${isActive ? ' mp-track-row--active' : ''}`} data-id={track.id}>
         {/* Terminal ID / Indicator */}
         <div className="mp-track-id font-mono text-[10px] opacity-30 select-none hidden sm:block">
            {track.id.slice(0, 4).toUpperCase()}
         </div>

         {/* Waveform / Play button */}
         <button
            className="mp-play-btn"
            onClick={() => onPlay(track, selectedVersionId)}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ '--vibe': vibeColor } as React.CSSProperties}
         >
            {isPlaying
               ? <Pause size={16} />
               : <Play size={16} />
            }
            {isActive && <span className="mp-play-pulse" />}
         </button>

         {/* Labels */}
         <div className="mp-track-info">
            <span className="mp-track-title font-bold tracking-tight">{track.title}</span>
            <div className="flex items-center gap-3">
               <span className="mp-track-artist font-mono text-[11px] uppercase tracking-wider text-brand-cyan/70">{track.artist}</span>
               {track.versions && track.versions.length > 1 && (
                  <div className="flex gap-1">
                     {track.versions.map(v => (
                        <button
                           key={v.id}
                           onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVersionId(v.id);
                              if (isActive && player.versionId !== v.id) {
                                 onPlay(track, v.id);
                              }
                           }}
                           className={`mp-version-chip ${selectedVersionId === v.id ? 'active' : ''}`}
                        >
                           {v.type}
                        </button>
                     ))}
                  </div>
               )}
            </div>
         </div>

         <div className="mp-track-meta hidden md:flex">
            {track.displayGenre && (
               <span className="mp-badge mp-badge--genre font-mono uppercase text-[9px]">{track.displayGenre}</span>
            )}
            {vibe && (
               <span
                  className="mp-badge mp-badge--vibe font-mono uppercase text-[9px]"
                  style={{ background: `${vibeColor}22`, color: vibeColor, borderColor: `${vibeColor}44` }}
               >
                  {vibe}
               </span>
            )}
            {yearLabel && (
               <span className="mp-badge mp-badge--year font-mono text-[9px]">{yearLabel}</span>
            )}
         </div>

         {/* Link health */}
         {track.linkStatus === 'broken' && (
            <AlertCircle size={14} className="mp-link-broken" title="Broken link" />
         )}

         {/* Download */}
         <button
            className="mp-dl-btn group relative"
            onClick={() => onDownload(track, selectedVersionId)}
            aria-label="Download"
            title={`Download: ${track.title}`}
         >
            <Download size={15} className="group-hover:text-brand-cyan transition-colors" />
            <div className="absolute inset-0 bg-brand-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
         </button>
      </div>
   );
});

// ─── Mini Player Bar ──────────────────────────────────────────────────────────
function MiniPlayer({ player, audioRef, onClose }: {
   player: PlayerState;
   audioRef: React.RefObject<HTMLAudioElement | null>;
   onClose: () => void;
}) {
   if (!player.track) return null;
   const t = player.track;
   const vibeColor = VIBE_COLORS[t.vibe || 'Hype'];

   return (
      <div className="mp-mini-player" style={{ '--vibe': vibeColor } as React.CSSProperties}>
         <div className="mp-mini-player__bar" />
         <Disc3 size={22} className={`mp-mini-player__disc${player.isPlaying ? ' spinning' : ''}`} />
         <div className="mp-mini-player__info">
            <span className="mp-mini-player__title">{t.title}</span>
            <div className="flex items-center gap-2">
               <span className="mp-mini-player__artist">{t.artist}</span>
               {player.versionId && (
                  <span className="mp-mini-player__version">
                     {t.versions.find(v => v.id === player.versionId)?.type}
                  </span>
               )}
            </div>
         </div>
         <audio
            ref={audioRef}
            src={t.versions.find(v => v.id === player.versionId)?.previewUrl || t.previewUrl}
            autoPlay
         />
         <button className="mp-mini-player__close" onClick={onClose} aria-label="Close player">
            <X size={16} />
         </button>
      </div>
   );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MusicPool() {
   // -- Gated Access & Limits --
   const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
   const [usage, setUsage] = useState({ limit: 0, count: 0 });
   const [poolTracks, setPoolTracks] = useState<Track[]>([]);
   const [poolLoading, setPoolLoading] = useState(true);

   const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
   const [filterMetadata, setFilterMetadata] = useState<{
      genres: string[];
      years: string[];
      months: string[];
   }>({ genres: [], years: [], months: [] });

   const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
   const [player, setPlayer] = useState<PlayerState>({ track: null, isPlaying: false });
   const audioRef = useRef<HTMLAudioElement | null>(null);

   const fetchGatedPool = useCallback(async () => {
      setPoolLoading(true);
      const [poolResult, filtersResult] = await Promise.all([
         fetchPoolTracks(),
         fetchPoolFilters()
      ]);

      setIsAuthorized(poolResult.isAuthorized);
      if (poolResult.isAuthorized) {
         setPoolTracks(poolResult.tracks);
         setUsage({ limit: poolResult.downloadLimit || 0, count: poolResult.downloadsCount || 0 });
      }
      setFilterMetadata(filtersResult);
      setPoolLoading(false);
   }, []);

   useEffect(() => {
      fetchGatedPool();
   }, [fetchGatedPool]);

   // ── Derived filter options (prioritize API, fallback to derived) ────────────
   const hubs = useMemo(() => getUnique(poolTracks as Track[], (t: Track) => t.collectionHub), [poolTracks]);
   const displayGenres = useMemo(() =>
      filterMetadata.genres.length > 0 ? filterMetadata.genres : getUnique(poolTracks as Track[], (t: Track) => t.displayGenre),
      [poolTracks, filterMetadata]);
   const years = useMemo(() =>
      filterMetadata.years.length > 0 ? filterMetadata.years : getUnique(poolTracks as Track[], (t: Track) => t.releaseYear?.toString()),
      [poolTracks, filterMetadata]);
   const months = useMemo(() =>
      filterMetadata.months.length > 0 ? filterMetadata.months : MONTHS.filter(m => poolTracks.some((t: Track) => t.releaseMonth === m)),
      [poolTracks, filterMetadata]);

   // ── Filtered & sorted tracks ───────────────────────────────────────────────
   const filtered = useMemo(() => {
      let list: Track[] = poolTracks;

      if (filters.search) {
         const q = normalise(filters.search);
         list = list.filter(t =>
            normalise(t.title).includes(q) ||
            normalise(t.artist).includes(q) ||
            normalise(t.genre).includes(q) ||
            normalise(t.displayGenre || '').includes(q)
         );
      }
      if (filters.hub) list = list.filter(t => t.collectionHub === filters.hub);
      if (filters.displayGenre) list = list.filter(t => t.displayGenre === filters.displayGenre);
      if (filters.year) list = list.filter(t => String(t.releaseYear || t.year) === filters.year);
      if (filters.month) list = list.filter(t => t.releaseMonth === filters.month);
      if (filters.vibe) list = list.filter(t => t.vibe === filters.vibe);

      list = [...list].sort((a, b) => {
         const da = new Date(a.dateAdded || a.createdAt || 0).getTime();
         const db = new Date(b.dateAdded || b.createdAt || 0).getTime();
         return sortDir === 'desc' ? db - da : da - db;
      });

      return list;
   }, [poolTracks, filters, sortDir]);

   // ── Active filter count ────────────────────────────────────────────────────
   const activeFilterCount = useMemo(() =>
      Object.entries(filters).filter(([k, v]) => k !== 'search' && v !== '').length,
      [filters]);

   const setFilter = useCallback((key: keyof Filters, val: string) =>
      setFilters(f => ({ ...f, [key]: val })), []);

   const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

   // ── Player controls ────────────────────────────────────────────────────────
   const handlePlay = useCallback((track: Track, versionId?: string) => {
      setPlayer(prev => {
         if (prev.track?.id === track.id && (versionId === undefined || prev.versionId === versionId)) {
            // Toggle
            if (prev.isPlaying) audioRef.current?.pause();
            else audioRef.current?.play();
            return { ...prev, isPlaying: !prev.isPlaying };
         }
         return { track, versionId: versionId || track.versions?.[0]?.id, isPlaying: true };
      });
   }, []);

   const closePlayer = useCallback(() => {
      audioRef.current?.pause();
      setPlayer({ track: null, isPlaying: false });
   }, []);

   // ── Download handler ───────────────────────────────────────────────────────
   const handleDownload = useCallback(async (track: Track, versionId?: string) => {
      if (usage.limit > 0 && usage.count >= usage.limit) {
         toast.error("Daily download limit reached. Upgrade for more fuel!");
         return;
      }

      const version = versionId ? track.versions?.find(v => v.id === versionId) : track.versions?.[0];
      const url = version?.downloadUrl || track.downloadUrl || track.previewUrl;

      if (!url) return;

      // Track download on server
      const ok = await trackPoolDownload(track.id);
      if (!ok) {
         toast.error("Access denied or limit reached.");
         return;
      }

      // Increment local count
      setUsage(u => ({ ...u, count: u.count + 1 }));

      const a = document.createElement('a');
      a.href = url;
      const fileName = `${track.artist} - ${track.title}${version ? ` (${version.type})` : ''}`.replace(/[/\\?%*:|"<>]/g, '_');
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success(`Downloading ${track.title}${version ? ` (${version.type})` : ''}`);
   }, [usage]);

   // ── Handle audio end ───────────────────────────────────────────────────────
   useEffect(() => {
      const el = audioRef.current;
      if (!el) return;
      const onEnd = () => setPlayer(p => ({ ...p, isPlaying: false }));
      el.addEventListener('ended', onEnd);
      return () => el.removeEventListener('ended', onEnd);
   }, [player.track]);

   return (
      <div className="mp-root">
         <style>{MUSIC_POOL_CSS}</style>

         {/* ── Background Effects ── */}
         <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-[#0B0B0F]" />
            <div className="absolute inset-0 scanline opacity-20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-purple/10 rounded-full blur-[120px] animate-pulse" />

            <div className="orbital-ring w-[600px] h-[600px] border border-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ animation: 'orbit 20s linear infinite' }} />
            <div className="orbital-ring w-[900px] h-[900px] border border-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ animation: 'orbit 35s linear infinite reverse' }} />
         </div>

         {/* ── Gated Access Check ─────────────────────────────────────────────── */}
         {poolLoading ? (
            <div className="mp-loading">
               <div className="mp-spinner" />
               <span>Loading your music library…</span>
            </div>
         ) : isAuthorized === false ? (
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
               <AccessDenied />
            </div>
         ) : (
            <>
               {/* ── Header ─────────────────────────────────────────────────────────── */}
               <div className="mp-header__inner relative z-10 glass-panel border border-white/10 rounded-2xl p-6 mb-6">
                  <div className="mp-header__brand">
                     <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center shadow-lg shadow-brand-purple/20">
                        <Music2 size={24} className="text-white animate-pulse" />
                     </div>
                     <div>
                        <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
                           Track <span className="text-brand-cyan">Terminal</span>
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold flex items-center gap-2">
                           {`${filtered.length.toLocaleString()} Tracks Indexing...`}
                           <span className="w-1 h-1 bg-brand-cyan rounded-full animate-ping" />
                        </p>
                     </div>
                  </div>

                  <div className="flex items-center gap-6">
                     {/* Download Fuel Tracker */}
                     {usage.limit > 0 && (
                        <div className="mp-fuel glass-card px-4 py-2 rounded-xl border border-white/5">
                           <div className="mp-fuel__label flex items-center gap-2 mb-1.5">
                              <Fuel size={12} className="text-brand-pink" />
                              <span className="text-[10px] font-black tracking-wider uppercase">Fuel Level: {usage.limit - usage.count} Units</span>
                           </div>
                           <div className="mp-fuel__bar-bg h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                              <div
                                 className="mp-fuel__bar-fill h-full bg-gradient-to-r from-brand-pink to-brand-purple rounded-full"
                                 style={{ width: `${Math.max(0, Math.min(100, (1 - usage.count / usage.limit) * 100))}%` }}
                              />
                           </div>
                        </div>
                     )}

                     {/* Sort */}
                     <button
                        className="btn-cyber-outline px-4 py-2 text-[10px] font-black uppercase"
                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                     >
                        {sortDir === 'desc' ? <SortDesc size={14} /> : <SortAsc size={14} />}
                        <span className="ml-2">{sortDir === 'desc' ? 'Latest' : 'Oldest'}</span>
                     </button>
                  </div>
               </div>

               {/* ── Search & Filters Grid ── */}
               <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6 relative z-10">
                  <div className="lg:col-span-2 relative">
                     <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search size={16} className="text-brand-cyan opacity-50" />
                     </div>
                     <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/20 transition-all font-medium"
                        type="search"
                        placeholder="SCAN DATABASE FOR TRACKS..."
                        value={filters.search}
                        onChange={e => setFilter('search', e.target.value)}
                     />
                  </div>
                  <div className="lg:col-span-2 flex flex-wrap gap-2">
                     {/* Filters are rendered as buttons/chips for cleaner UI */}
                     {activeFilterCount > 0 && (
                        <button className="px-4 py-2 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-[10px] font-black uppercase hover:bg-brand-pink/20 transition-all" onClick={clearFilters}>
                           RESET {activeFilterCount}
                        </button>
                     )}
                  </div>
               </div>

               {/* ── Filters ─────────────────────────────────────────────────────── */}
               <div className="mp-filters px-6 py-2 relative z-10 glass-panel border border-white/5 mx-6 rounded-xl mb-6">
                  <div className="mp-filters__row flex flex-wrap items-center gap-4 py-1">
                     <FilterSelect
                        value={filters.hub}
                        onChange={v => setFilter('hub', v)}
                        options={hubs}
                        placeholder="All Hubs"
                        icon={Radio}
                     />
                     <FilterSelect
                        value={filters.displayGenre}
                        onChange={v => setFilter('displayGenre', v)}
                        options={displayGenres}
                        placeholder="All Genres"
                        icon={Music2}
                     />
                     <FilterSelect
                        value={filters.year}
                        onChange={v => setFilter('year', v)}
                        options={years}
                        placeholder="Any Year"
                        icon={Clock}
                     />
                     <FilterSelect
                        value={filters.month}
                        onChange={v => setFilter('month', v)}
                        options={months}
                        placeholder="Any Month"
                        icon={Filter}
                     />
                     <FilterSelect
                        value={filters.vibe}
                        onChange={v => setFilter('vibe', v)}
                        options={VIBES}
                        placeholder="Any Vibe"
                        icon={Zap}
                     />
                     {activeFilterCount > 0 && (
                        <button className="mp-clear-filters px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border border-brand-pink/30 hover:bg-brand-pink/10 transition-colors text-brand-pink" onClick={clearFilters}>
                           <X size={12} />
                           CLEAR ALL
                        </button>
                     )}
                  </div>
               </div>

               {/* ── Track List ─────────────────────────────────────────────────────── */}
               <main className="mp-main relative z-10 mx-6 bg-black/20 rounded-t-2xl border-x border-t border-white/10 overflow-hidden">
                  <div className="mp-terminal-header flex items-center gap-4 px-6 py-3 border-b border-white/10 bg-white/5">
                     <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                     <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">Database Stream active // Port 8080</span>
                     <div className="ml-auto flex gap-6">
                        <span className="text-[10px] font-mono text-gray-500 hidden sm:block">INDEX_STATUS: OK</span>
                        <span className="text-[10px] font-mono text-gray-500 hidden sm:block">CRYPT_LINK: SECURE</span>
                     </div>
                  </div>

                  {filtered.length === 0 ? (
                     <div className="mp-empty py-20">
                        <div className="relative mb-6">
                           <Music2 size={64} className="text-white/5" />
                           <Search size={24} className="absolute bottom-0 right-0 text-brand-pink animate-bounce" />
                        </div>
                        <p className="text-gray-400 font-mono text-xs uppercase tracking-widest">No matching sectors found in database</p>
                        <button className="mt-4 px-6 py-2 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-white" onClick={clearFilters}>
                           Re-scan with zero filters
                        </button>
                     </div>
                  ) : (
                     <Virtuoso<Track>
                        style={{ height: 'calc(100dvh - 380px)' }}
                        data={filtered}
                        itemContent={(_, track) => (
                           <TrackRow
                              key={track.id}
                              track={track}
                              player={player}
                              onPlay={handlePlay}
                              onDownload={handleDownload}
                           />
                        )}
                     />
                  )}
               </main>

               {/* ── Mini Player ────────────────────────────────────────────────────── */}
               <MiniPlayer player={player} audioRef={audioRef} onClose={closePlayer} />
            </>
         )}
      </div>
   );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const MUSIC_POOL_CSS = `
.mp-root {
  --accent:    var(--brand-cyan, #28E6DC);
  --accent-2:  var(--brand-purple, #7B5CFF);
  --accent-3:  var(--brand-pink, #FF287E);
  --bg:        var(--bg-dark, #0B0B0F);
  --surface:   var(--bg-card, #15151A);
  --surface-2: rgba(255, 255, 255, 0.05);
  --border:    var(--glass-border, rgba(255, 255, 255, 0.08));
  --text:      #ffffff;
  --muted:     #9ca3af;
  --radius:    12px;
  
  display: flex;
  flex-direction: column;
  /* 80px = Navbar h-20. Music Pool fills remaining viewport below the fixed nav. */
  height: calc(100dvh - 80px);
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.mp-header {
  padding: 20px 24px 0;
  background: var(--glass-bg, rgba(255, 255, 255, 0.03));
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}
.mp-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.mp-header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mp-header__title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text);
  margin: 0;
}
.mp-header__sub {
  font-size: 0.78rem;
  color: var(--muted);
  margin: 2px 0 0;
}

/* Sort */
.mp-sort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  padding: 7px 12px;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}
.mp-sort-btn:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }

/* Fuel Tracker */
.mp-fuel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: 16px;
  min-width: 150px;
}
.mp-fuel__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.text-brand-pink { color: var(--accent-3); }
.mp-fuel__bar-bg {
  height: 4px;
  background: var(--surface-2);
  border-radius: 99px;
  overflow: hidden;
}
.mp-fuel__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-3), var(--accent-2));
  box-shadow: 0 0 10px rgba(255, 40, 126, 0.4);
  transition: width 0.3s ease;
}

/* ── Search ─────────────────────────────────────────────────────────────── */
.mp-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 14px;
  margin-bottom: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  backdrop-filter: blur(4px);
}
.mp-search-bar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(40, 230, 220, 0.15);
}
.mp-search-icon { color: var(--muted); flex-shrink: 0; }
.mp-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 0.9rem;
  padding: 12px 0;
  font-family: inherit;
}
.mp-search-input::placeholder { color: var(--muted); }
.mp-search-clear {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  border-radius: 50%;
  transition: color 0.15s;
}
.mp-search-clear:hover { color: var(--text); }

/* ── Filters ─────────────────────────────────────────────────────────────── */
.mp-filters { margin-bottom: 14px; }
.mp-filters__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

/* Select */
.mp-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.mp-select-icon {
  position: absolute;
  left: 10px;
  color: var(--muted);
  pointer-events: none;
}
.mp-select {
  appearance: none;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.8rem;
  padding: 7px 30px 7px 30px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 130px;
  max-width: 190px;
  backdrop-filter: blur(4px);
}
.mp-select:hover { border-color: var(--accent); }
.mp-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(40, 230, 220, 0.15); }
.mp-select option { background: var(--bg); color: var(--text); }
.mp-select-chevron {
  position: absolute;
  right: 9px;
  color: var(--muted);
  pointer-events: none;
}

/* Clear filters */
.mp-clear-filters {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 40, 126, 0.1);
  border: 1px solid rgba(255, 40, 126, 0.3);
  border-radius: 8px;
  color: var(--accent-3);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 11px;
  transition: all 0.2s;
}
.mp-clear-filters:hover { background: rgba(255, 40, 126, 0.2); }

/* ── Main list ──────────────────────────────────────────────────────────── */
.mp-main {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Track row ──────────────────────────────────────────────────────────── */
.mp-track-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
  position: relative;
}
.mp-track-row:hover { background: var(--surface-2); }
.mp-track-row--active {
  background: rgba(40, 230, 220, 0.08);
  border-left: 3px solid var(--accent);
}

/* Play button */
.mp-play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  flex-shrink: 0;
  position: relative;
  background: var(--vibe, var(--accent));
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}
.mp-play-btn:hover { transform: scale(1.1); box-shadow: 0 4px 16px rgba(40, 230, 220, 0.4); }

.mp-play-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--vibe, var(--accent));
  animation: mp-pulse 1.4s ease-out infinite;
  pointer-events: none;
}
@keyframes mp-pulse {
  0%   { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.55); opacity: 0; }
}

/* Track info */
.mp-track-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mp-track-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-track-artist {
  font-size: 0.75rem;
  color: var(--muted);
}

/* Meta badges */
.mp-track-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  flex-shrink: 0;
  max-width: 280px;
}
.mp-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  border: 1px solid;
  white-space: nowrap;
}
.mp-badge--genre {
  background: rgba(40, 230, 220, 0.1);
  color: var(--accent);
  border-color: rgba(40, 230, 220, 0.25);
}
.mp-badge--vibe {
  /* set dynamically via inline style */
}
.mp-badge--year {
  background: rgba(123, 92, 255, 0.1);
  color: var(--accent-2);
  border-color: rgba(123, 92, 255, 0.25);
}
.mp-badge--month {
  background: rgba(255, 40, 126, 0.1);
  color: var(--accent-3);
  border-color: rgba(255, 40, 126, 0.25);
}

/* Link broken indicator */
.mp-link-broken {
  color: var(--accent-3);
  flex-shrink: 0;
}

/* Download button */
.mp-dl-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}
.mp-dl-btn:hover {
  background: var(--surface-2);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

/* ── Loading / Empty ─────────────────────────────────────────────────────── */
.mp-loading, .mp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 100%;
  color: var(--muted);
}
.mp-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Mini Player ─────────────────────────────────────────────────────────── */
.mp-mini-player {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--glass-bg, rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 24px 12px;
  z-index: 200;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.25s ease;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.mp-mini-player__bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--vibe, var(--accent)), transparent);
}
.mp-mini-player__disc {
  color: var(--vibe, var(--accent));
  flex-shrink: 0;
}
.mp-mini-player__disc.spinning { animation: spin 3s linear infinite; }
.mp-mini-player__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.mp-mini-player__title {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-mini-player__artist { font-size: 0.75rem; color: var(--muted); }
.mp-mini-player__version {
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--accent-2);
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  margin-left: 8px;
}
.mp-mini-player__close {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}
.mp-mini-player__close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }

/* Version selection chips */
.mp-version-chip {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  backdrop-filter: blur(4px);
}
.mp-version-chip:hover { border-color: var(--accent); color: var(--text); }
.mp-version-chip.active {
  background: linear-gradient(to right, var(--accent-2), var(--accent));
  border-color: transparent;
  color: white;
  box-shadow: 0 0 10px rgba(40, 230, 220, 0.3);
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .mp-header { padding: 14px 16px 0; }
  .mp-track-row { padding: 10px 16px; }
  .mp-track-meta { display: none; }
  .mp-filters__row { gap: 6px; }
  .mp-select { min-width: 100px; font-size: 0.75rem; padding: 6px 26px 6px 28px; }
  .mp-mini-player { padding: 10px 16px 12px; }
}
`;
