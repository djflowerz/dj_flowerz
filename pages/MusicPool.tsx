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
            <span className="mp-track-title">{track.title}</span>
            <div className="flex items-center gap-3">
               <span className="mp-track-artist">{track.artist}</span>
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

         <div className="mp-track-meta">
            {track.displayGenre && (
               <span className="mp-badge mp-badge--genre">{track.displayGenre}</span>
            )}
            {vibe && (
               <span
                  className="mp-badge mp-badge--vibe"
                  style={{ background: `${vibeColor}22`, color: vibeColor, borderColor: `${vibeColor}44` }}
               >
                  {vibe}
               </span>
            )}
            {yearLabel && (
               <span className="mp-badge mp-badge--year">{yearLabel}</span>
            )}
            {track.releaseMonth && (
               <span className="mp-badge mp-badge--month">{track.releaseMonth}</span>
            )}
         </div>

         {/* Link health */}
         {track.linkStatus === 'broken' && (
            <AlertCircle size={14} className="mp-link-broken" title="Broken link" />
         )}

         {/* Download */}
         <button
            className="mp-dl-btn"
            onClick={() => onDownload(track, selectedVersionId)}
            aria-label="Download"
            title={`Download: ${track.title}`}
         >
            <Download size={15} />
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
               <header className="mp-header">
                  <div className="mp-header__inner">
                     <div className="mp-header__brand">
                        <Music2 size={28} className="mp-header__icon text-gradient-cyan" />
                        <div>
                           <h1 className="mp-header__title">Music Pool</h1>
                           <p className="mp-header__sub">
                              {`${filtered.length.toLocaleString()} of ${poolTracks.length.toLocaleString()} tracks`}
                           </p>
                        </div>
                     </div>

                     {/* Download Fuel Tracker */}
                     {usage.limit > 0 && (
                        <div className="mp-fuel">
                           <div className="mp-fuel__label">
                              <Fuel size={14} className="text-brand-pink" />
                              <span>Download Fuel: {usage.limit - usage.count} left today</span>
                           </div>
                           <div className="mp-fuel__bar-bg">
                              <div
                                 className="mp-fuel__bar-fill"
                                 style={{ width: `${Math.max(0, Math.min(100, (1 - usage.count / usage.limit) * 100))}%` }}
                              />
                           </div>
                        </div>
                     )}

                     {/* Sort */}
                     <button
                        className="mp-sort-btn"
                        onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                        title="Toggle sort order"
                     >
                        {sortDir === 'desc' ? <SortDesc size={16} /> : <SortAsc size={16} />}
                        <span>{sortDir === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                     </button>
                  </div>

                  {/* ── Search ──────────────────────────────────────────────────────── */}
                  <div className="mp-search-bar">
                     <Search size={17} className="mp-search-icon" />
                     <input
                        className="mp-search-input"
                        type="search"
                        placeholder="Search by title, artist, genre…"
                        value={filters.search}
                        onChange={e => setFilter('search', e.target.value)}
                        aria-label="Search tracks"
                     />
                     {filters.search && (
                        <button className="mp-search-clear" onClick={() => setFilter('search', '')} aria-label="Clear search">
                           <X size={14} />
                        </button>
                     )}
                  </div>

                  {/* ── Filters ─────────────────────────────────────────────────────── */}
                  <div className="mp-filters">
                     <div className="mp-filters__row">
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
                           <button className="mp-clear-filters" onClick={clearFilters}>
                              <X size={13} />
                              Clear ({activeFilterCount})
                           </button>
                        )}
                     </div>
                  </div>
               </header>

               {/* ── Track List ─────────────────────────────────────────────────────── */}
               <main className="mp-main">
                  {filtered.length === 0 ? (
                     <div className="mp-empty">
                        <Music2 size={48} opacity={0.25} />
                        <p>No tracks match your filters.</p>
                        <button className="mp-clear-filters" onClick={clearFilters}>Clear filters</button>
                     </div>
                  ) : (
                     <Virtuoso<Track>
                        style={{ height: '100%' }}
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
