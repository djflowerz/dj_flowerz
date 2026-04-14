import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Music, Video, X, Volume2, ChevronDown, Flame, Zap, Heart,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import { maskMediaUrl } from '../../utils/branding';

interface TrackVersion {
  id: string;
  version_name: string;
  preview_url: string;
  download_url: string;
  is_main_version: boolean;
}

interface TrackRowProps {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  genre: string;
  videoUrl?: string;
  previewUrl?: string;
  versions: TrackVersion[];
  isNew?: boolean;
  isExpanded?: boolean;
  isPlaying?: boolean;
  playingUrl?: string | null;
  playingType?: 'audio' | 'video' | null;
  onPlay: (url: string, title: string, type: 'audio' | 'video', trackId?: string) => void;
  onDownload: (url: string, fileName: string, versionId?: string) => void;
  onDownloadAll: () => void;
  onFindSimilar: () => void;
  onCloseInline?: () => void;
  onSkipNext?: () => void;
  onSkipPrev?: () => void;
  isSubscriber?: boolean;
  isHype?: boolean;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  id,
  title,
  artist,
  bpm,
  genre,
  videoUrl,
  previewUrl,
  versions,
  isNew,
  isExpanded,
  isPlaying,
  playingUrl,
  playingType,
  onPlay,
  onDownload,
  onDownloadAll,
  onFindSimilar,
  onCloseInline,
  onSkipNext,
  onSkipPrev,
  isSubscriber = false,
  isHype = false
}) => {
  const { toggleWishlist, isInWishlist } = useData();
  const isWishlisted = isInWishlist(id);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggleWishlist(id, 'track');
    if (result.success) {
      toast.success(result.message || 'Updated wishlist');
    } else {
      toast.error(result.message || 'Failed to update wishlist');
    }
  };

  const getVersionType = (v: TrackVersion): 'audio' | 'video' => {
    const name = (v?.version_name || '').toLowerCase();
    const url = (v?.preview_url || v?.download_url || '').toLowerCase();
    if (name.includes('video') || name.includes('visual') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) return 'video';
    return 'audio';
  };

  // Build a normalized list of versions — always at least one entry if data exists
  const normalizedVersions: TrackVersion[] = React.useMemo(() => {
    if (versions && versions.length > 0) return versions;
    // Fallback: create a synthetic main version from previewUrl or videoUrl
    const fallbackUrl = previewUrl || videoUrl;
    if (fallbackUrl) {
      return [{
        id: `${id}-main`,
        version_name: 'Original',
        preview_url: fallbackUrl,
        download_url: fallbackUrl,
        is_main_version: true,
      }];
    }
    return [];
  }, [versions, previewUrl, videoUrl, id]);

  const mainVersion = normalizedVersions.find(v => v?.is_main_version) || normalizedVersions[0];
  const isVideo = normalizedVersions.some(v => getVersionType(v) === 'video');

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex flex-col p-5 mb-3 rounded-[1.5rem] transition-all duration-500 ${
        isPlaying 
          ? 'bg-brand-purple/10 border-brand-purple/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]' 
          : isHype 
            ? 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10 hover:border-orange-500/30'
            : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
      } border backdrop-blur-md overflow-hidden`}
    >
      {/* Subtle Hype Background Glow */}
      {isHype && (
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-orange-500/30 transition-all duration-700" />
      )}

      {/* Top Row: Track Info */}
      <div className="flex items-center gap-5">
        {/* Thumbnail / Play button */}
        <div
          className={`relative flex-shrink-0 w-14 h-14 rounded-2xl overflow-hidden bg-zinc-800/80 flex items-center justify-center group/play cursor-pointer border shadow-lg transition-all duration-300 ${isHype ? 'border-orange-500/40 shadow-orange-500/10' : 'border-white/10 shadow-black/40'}`}
          onClick={() => {
            if (mainVersion) {
              const vType = getVersionType(mainVersion);
              const vUrl = (vType === 'video' ? (videoUrl || mainVersion.preview_url) : mainVersion.preview_url) || '';
              onPlay(maskMediaUrl(vUrl), `${artist} - ${title}`, vType, id);
            }
          }}
        >
          <div className={`w-full h-full flex items-center justify-center ${
            isVideo ? 'bg-brand-purple/20 text-brand-purple' : isHype ? 'bg-orange-600/20 text-orange-400' : 'bg-white/10 text-white'
          }`}>
            {isVideo ? <Video size={24} /> : isHype ? <Zap size={24} className="animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" /> : <Music size={24} />}
          </div>
          <div className={`absolute inset-0 flex items-center justify-center bg-brand-purple/90 transition-all duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
            {isPlaying ? <Pause size={20} fill="currentColor" className="text-white" /> : <Play size={20} fill="currentColor" className="text-white ml-0.5" />}
          </div>
        </div>

        {/* Title, Artist, Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base md:text-[17px] font-bold text-white group-hover:text-brand-purple transition-colors truncate tracking-tight">
              {title}
            </h3>
            <div className="flex gap-2">
              {isNew && (
                <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-lg shadow-rose-500/30">
                  NEW
                </span>
              )}
              {isHype && (
                <motion.span 
                  animate={{ scale: [1, 1.05, 1] }} 
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-lg shadow-orange-500/40 border border-orange-400/30"
                >
                  <Flame size={10} fill="currentColor" className="text-orange-100" />
                  HYPE
                </motion.span>
              )}
            </div>
          </div>
          <p className="text-[13px] text-zinc-400 font-medium truncate mt-0.5 group-hover:text-zinc-300 transition-colors">
            {artist}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              {genre}
            </span>
            {bpm > 0 && (
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-purple/60 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-brand-purple/40 animate-pulse" />
                {bpm} BPM
              </span>
            )}
          </div>
        </div>
        
        {/* Wishlist Button */}
        <div className="flex-shrink-0 flex items-center pr-2">
          <button
            onClick={handleToggleWishlist}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
              isWishlisted 
                ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 border-brand-purple/40' 
                : 'bg-zinc-800/50 text-zinc-500 hover:text-white hover:bg-zinc-800 border-white/5'
            } border`}
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Version Controls Row — always visible */}
      {normalizedVersions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {/* Download All Versions button - Only if multiple versions */}
          {normalizedVersions.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isSubscriber) return;
                onDownloadAll();
              }}
              title={isSubscriber ? 'Download all versions' : 'Subscription required'}
              className={`h-8 px-3 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                isSubscriber
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/30'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5'
              }`}
            >
              <Download size={11} />
              Download All Versions
            </button>
          )}

          {/* Per-version: play + download button pairs */}
          {normalizedVersions.map((v, idx) => {
            const vType = getVersionType(v);
            const vUrl = v.preview_url || '';
            const isActive = playingUrl === vUrl && isPlaying;
            const isVideoVer = vType === 'video';

            return (
              <div
                key={v.id || `ver-${idx}`}
                className={`flex items-center rounded-lg overflow-hidden border transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                    : 'border-white/5 bg-zinc-900/60 hover:border-white/15'
                }`}
              >
                {/* Play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(maskMediaUrl(vUrl), `${artist} - ${title} (${v.version_name})`, vType, id);
                  }}
                  className={`flex items-center gap-1.5 pl-2.5 pr-2 py-2 transition-all font-bold text-[9px] uppercase tracking-wider whitespace-nowrap ${
                    isActive ? 'text-blue-400' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {isActive
                    ? <Pause size={11} fill="currentColor" />
                    : isVideoVer
                      ? <Video size={11} />
                      : <Play size={11} fill="currentColor" />
                  }
                  {v.version_name}
                </button>

                {/* Divider */}
                <div className="w-px h-5 bg-white/5 flex-shrink-0" />

                {/* Download button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSubscriber) return;
                    onDownload(v.download_url || v.preview_url, `${artist} - ${title} (${v.version_name}).mp3`, v.id);
                  }}
                  title={isSubscriber ? `Download ${v.version_name}` : 'Subscription required'}
                  className={`flex items-center justify-center w-8 py-2 transition-all flex-shrink-0 ${
                    isSubscriber
                      ? 'text-zinc-400 hover:bg-blue-500 hover:text-white'
                      : 'text-zinc-700 cursor-not-allowed'
                  }`}
                >
                  <Download size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Video Player */}
      <AnimatePresence>
        {isExpanded && playingType === 'video' && playingUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full mt-4 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative z-10"
          >
            <div className="relative aspect-video w-full bg-zinc-900/50 group/video">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-4 z-20 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); onSkipPrev?.(); }}
                  className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-blue-600 transition-all opacity-0 group-hover/video:opacity-100 pointer-events-auto"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSkipNext?.(); }}
                  className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-blue-600 transition-all opacity-0 group-hover/video:opacity-100 pointer-events-auto"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-red-500/80 rounded-xl text-white transition-all border border-white/10 backdrop-blur-md"
              >
                <X size={18} />
              </button>
              <video
                src={maskMediaUrl(playingUrl)}
                className="w-full h-full object-contain"
                autoPlay={isPlaying}
                controls
                playsInline
                onEnded={() => onSkipNext?.() || onCloseInline?.()}
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Audio Player */}
      <AnimatePresence>
        {isExpanded && playingType === 'audio' && playingUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full mt-4"
          >
            <div className="flex items-center gap-4 bg-zinc-800/80 rounded-2xl px-6 py-4 border border-white/10 shadow-xl backdrop-blur-3xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onSkipPrev?.(); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSkipNext?.(); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex-1">
                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Volume2 size={10} className="text-blue-400" />
                  Now Previewing: {title}
                </div>
                <audio
                  src={maskMediaUrl(playingUrl)}
                  autoPlay={isPlaying}
                  controls
                  className="w-full h-8 accent-blue-500 text-xs"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="w-10 h-10 flex items-center justify-center bg-zinc-700/50 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-zinc-400 border border-white/5 transition-all flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
