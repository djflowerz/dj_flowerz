/**
 * DJ FLOWERZ — PREMIUM MUSIC POOL (Zine edition)
 * 
 * Aesthetic: Underground music magazine / fanzine.
 * Layout: Bold lines, high contrast, Barlow Condensed & DM Mono.
 * Architecture: Clean state-machine via useMusicPool hook.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Download, Play, Pause, X, Filter, Disc3, 
  ChevronLeft, ChevronRight, Globe, Sliders, Type, Hash
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMusicPool, PoolTrack, YearData } from '../hooks/useMusicPool';
import { maskMediaUrl } from '../utils/branding';
import { SecurityWatchdog } from '../utils/watchdog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// 🔥 [2026-04-16] DEPLOYMENT HEARTBEAT: ZINE EDITION v1.2
// This comment is a manual trigger to force Netlify to re-scan and deploy the latest fixes.


// ─── STYLES (Zine Aesthetic) ────────────────────────────────────────────────

const FONTS = {
  TITLE: "'Barlow Condensed', sans-serif",
  BODY: "'Barlow', sans-serif",
  MONO: "'DM Mono', monospace"
};

const COLORS = {
  PAPER: '#fcfaf7',
  INK: '#1a1a1a',
  ACCENT: '#a855f7',
  MUTED: '#888888',
  BORDER: '#1a1a1a'
};

const css: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: COLORS.PAPER,
    minHeight: '100vh',
    color: COLORS.INK,
    fontFamily: FONTS.BODY,
    paddingTop: '80px',
    paddingBottom: '100px'
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
    borderBottom: `4px solid ${COLORS.BORDER}`,
    marginBottom: '40px'
  },
  masthead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    fontFamily: FONTS.TITLE,
    fontSize: 'clamp(4rem, 10vw, 8rem)',
    fontWeight: 900,
    lineHeight: 0.8,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '-0.04em',
    fontStyle: 'italic'
  },
  subtitle: {
    fontFamily: FONTS.MONO,
    fontSize: '14px',
    margin: 0,
    textTransform: 'uppercase',
    color: COLORS.MUTED,
    letterSpacing: '0.1em'
  },
  controls: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '40px'
  },
  input: {
    width: '100%',
    backgroundColor: 'transparent',
    border: `2px solid ${COLORS.BORDER}`,
    padding: '12px 15px',
    fontFamily: FONTS.MONO,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    backgroundColor: 'transparent',
    border: `2px solid ${COLORS.BORDER}`,
    padding: '12px 15px',
    fontFamily: FONTS.MONO,
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer'
  },
  trackGrid: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px', // Thin ink lines between items
    backgroundColor: COLORS.BORDER,
    border: `2px solid ${COLORS.BORDER}`
  },
  trackItem: {
    backgroundColor: COLORS.PAPER,
    display: 'grid',
    gridTemplateColumns: '80px 1fr 150px 100px 150px',
    alignItems: 'center',
    padding: '20px',
    gap: '20px',
    transition: 'background 0.2s',
    cursor: 'pointer'
  },
  trackArt: {
    width: '80px',
    height: '80px',
    border: `2px solid ${COLORS.BORDER}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee'
  },
  trackMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  trackTitle: {
    fontFamily: FONTS.TITLE,
    fontSize: '24px',
    fontWeight: 800,
    textTransform: 'uppercase',
    margin: 0,
    lineHeight: 1
  },
  trackArtist: {
    fontFamily: FONTS.BODY,
    fontSize: '16px',
    color: COLORS.MUTED,
    margin: 0
  },
  trackBPM: {
    fontFamily: FONTS.MONO,
    fontSize: '18px',
    fontWeight: 700,
    textAlign: 'center'
  },
  trackGenre: {
    fontFamily: FONTS.MONO,
    fontSize: '12px',
    textTransform: 'uppercase',
    textAlign: 'right',
    color: COLORS.MUTED
  },
  btn: {
    backgroundColor: COLORS.INK,
    color: COLORS.PAPER,
    border: 'none',
    padding: '12px 20px',
    fontFamily: FONTS.TITLE,
    fontWeight: 700,
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.1s'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 5, 5, 0.95)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  },
  playerContainer: {
    width: '100%',
    maxWidth: '1200px',
    backgroundColor: COLORS.PAPER,
    border: `4px solid ${COLORS.BORDER}`,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  closeBtn: {
    position: 'absolute',
    top: '-50px',
    right: 0,
    color: 'white',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: FONTS.TITLE,
    fontSize: '20px',
    textTransform: 'uppercase'
  }
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function MusicPool() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    tracks, filters, loading, error, pagination, 
    fetchTracks, trackDownload 
  } = useMusicPool();

  // ─── Security Watchdog ───
  useEffect(() => {
    const watchdog = SecurityWatchdog.getInstance();
    if (watchdog) {
      watchdog.start(() => {
        // Suppressing visible toast per user request to keep header/UI clean, 
        // but maintaining functional redirect security.
        setTimeout(() => navigate('/'), 500);
      });
    }
    return () => watchdog?.stop();
  }, [navigate]);

  const [search, setSearch] = useState('');
  const [activeHub, setActiveHub] = useState('All Hubs');
  const [activeGenre, setActiveGenre] = useState('All Genres');
  const [activeYear, setActiveYear] = useState('All Years');
  const [player, setPlayer] = useState<{track: PoolTrack | null, url: string | null}>({ track: null, url: null });

  const isAdminOrSub = user?.isSubscriber || user?.isAdmin || user?.role === 'admin';

  // Security Redirect (Hard Redirect)
  useEffect(() => {
    if (!loading && !isAdminOrSub) {
      toast.error("Subscription required for Pool access.");
      navigate('/@' + (user?.username || 'explore'));
    }
  }, [loading, isAdminOrSub, navigate, user]);

  // Handle Search & Filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTracks({
        search,
        hub: activeHub === 'All Hubs' ? undefined : activeHub,
        genre: activeGenre === 'All Genres' ? undefined : activeGenre,
        year: activeYear === 'All Years' ? undefined : activeYear
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [search, activeHub, activeGenre, activeYear, fetchTracks]);

  const handleDownload = (track: PoolTrack, version: any) => {
    if (!isAdminOrSub) return toast.error("Subscription required.");
    trackDownload(version.id, version.download_url);
    window.open(version.download_url, '_blank');
  };

  if (!isAdminOrSub && !loading) return null;

  return (
    <div style={css.page}>
      {/* ─── Header ─── */}
      <header style={css.header}>
        <div style={css.masthead}>
          <div>
            <p style={css.subtitle}>PREMIUM ARCHIVE</p>
            <h1 style={css.title}>Music <span style={{ color: COLORS.ACCENT }}>Pool</span></h1>
          </div>
          <div style={{ textAlign: 'right' }}>
             <p style={{ fontFamily: FONTS.TITLE, fontSize: '32px', margin: 0, fontWeight: 900 }}>
               {user?.display_name || user?.username || 'GUEST_USER'}
             </p>
          </div>
        </div>
      </header>

      {/* ─── Search & Filters ─── */}
      <section style={css.controls}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: COLORS.MUTED }} />
          <input 
            id="pool-search-input"
            name="pool-search"
            style={{ ...css.input, paddingLeft: '45px' }} 
            placeholder="SEARCH TRACKS..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          id="hub-selector"
          name="active-hub"
          style={css.select} 
          value={activeHub} 
          onChange={(e) => setActiveHub(e.target.value)}
        >
          <option>All Hubs</option>
          {filters.hubsWithGenres.map(h => <option key={h.hub}>{h.hub}</option>)}
        </select>

        <select 
          id="year-selector"
          name="active-year"
          style={css.select} 
          value={activeYear} 
          onChange={(e) => setActiveYear(e.target.value)}
        >
          <option>All Years</option>
          {filters.years.map(y => <option key={y.year}>{y.year}</option>)}
        </select>
        
        <div style={{ ...css.btn, backgroundColor: COLORS.PAPER, color: COLORS.INK, border: `2px solid ${COLORS.BORDER}` }}>
            <Sliders size={18} /> Filters
        </div>
      </section>

      {/* ─── Track List ─── */}
      <main style={css.trackGrid}>
        {loading && tracks.length === 0 ? (
          <div style={{ backgroundColor: COLORS.PAPER, padding: '100px', textAlign: 'center' }}>
            <Disc3 className="animate-spin" size={48} style={{ margin: '0 auto 20px' }} />
            <p style={{ fontFamily: FONTS.MONO, textTransform: 'uppercase' }}>Indexing pool database...</p>
          </div>
        ) : error ? (
          <div style={{ backgroundColor: COLORS.PAPER, padding: '100px', textAlign: 'center', color: 'red' }}>
            <X size={48} style={{ margin: '0 auto 20px' }} />
            <p style={{ fontFamily: FONTS.MONO }}>{error}</p>
          </div>
        ) : (
          tracks.map((track) => (
            <div 
              key={track.id} 
              style={css.trackItem}
              onClick={() => {
                const mainV = track.versions.find(v => v.is_main_version) || track.versions[0];
                setPlayer({ track, url: mainV?.preview_url || track.previewUrl || null });
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = COLORS.PAPER)}
            >
              <div style={css.trackArt}>
                <Play size={24} fill={COLORS.INK} />
              </div>
              <div style={css.trackMeta}>
                <h3 style={css.trackTitle}>{track.title}</h3>
                <p style={css.trackArtist}>{track.artist}</p>
              </div>
              <div style={css.trackBPM}>
                <span style={{ fontSize: '10px', display: 'block', color: COLORS.MUTED }}>BPM</span>
                {track.bpm || '—'}
              </div>
              <div style={css.trackGenre}>
                {track.display_genre}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  style={{ ...css.btn, flex: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const mainV = track.versions.find(v => v.is_main_version) || track.versions[0];
                    if (mainV) handleDownload(track, mainV);
                  }}
                >
                  <Download size={16} /> DL
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* ─── Pagination ─── */}
      {!loading && pagination.totalPages > 1 && (
        <div style={{ maxWidth: '1400px', margin: '40px auto', padding: '0 20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
             style={{ ...css.btn, backgroundColor: COLORS.PAPER, color: COLORS.INK, border: `2px solid ${COLORS.BORDER}` }}
             disabled={pagination.page === 1}
             onClick={() => fetchTracks({ page: pagination.page - 1 })}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ ...css.btn, pointerEvents: 'none', backgroundColor: COLORS.PAPER, color: COLORS.INK, border: `2px solid ${COLORS.BORDER}`, minWidth: '100px' }}>
             PAGE {pagination.page} / {pagination.totalPages}
          </div>
          <button 
             style={{ ...css.btn, backgroundColor: COLORS.PAPER, color: COLORS.INK, border: `2px solid ${COLORS.BORDER}` }}
             disabled={pagination.page === pagination.totalPages}
             onClick={() => fetchTracks({ page: pagination.page + 1 })}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* ─── Pop-up Player Overlay ─── */}
      <AnimatePresence>
        {player.track && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={css.overlay}
          >
            <div style={css.playerContainer}>
              <button style={css.closeBtn} onClick={() => setPlayer({ track: null, url: null })}>
                <X size={24} /> Close Preview
              </button>

              <div style={{ padding: '40px', borderBottom: `2px solid ${COLORS.BORDER}` }}>
                 <h2 style={{ ...css.title, fontSize: '48px', marginBottom: '10px' }}>{player.track.title}</h2>
                 <p style={{ ...css.subtitle, color: COLORS.ACCENT, fontSize: '18px' }}>{player.track.artist}</p>
              </div>

              <div style={{ padding: '40px', backgroundColor: COLORS.INK }}>
                {player.url && (
                   player.url.toLowerCase().endsWith('.mp4') || player.url.toLowerCase().endsWith('.webm') ? (
                     <video 
                       src={maskMediaUrl(player.url)} 
                       controls 
                       autoPlay 
                       style={{ width: '100%', maxHeight: '60vh', outline: 'none' }} 
                     />
                   ) : (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Disc3 className="animate-spin text-white" size={64} />
                        <audio src={maskMediaUrl(player.url)} controls autoPlay style={{ flex: 1 }} />
                     </div>
                   )
                )}
              </div>

              <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                {player.track.versions.map(v => (
                  <button 
                    key={v.id} 
                    style={{ ...css.btn, backgroundColor: v.is_main_version ? COLORS.ACCENT : COLORS.INK }}
                    onClick={() => handleDownload(player.track!, v)}
                  >
                    <Download size={16} /> {v.version_name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
