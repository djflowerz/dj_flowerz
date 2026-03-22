import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Music, Video, X, Volume2, ChevronDown
} from 'lucide-react';

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
  isSubscriber = false
}) => {
  const getVersionType = (v: TrackVersion): 'audio' | 'video' => {
    const name = (v?.version_name || '').toLowerCase();
    const url = (v?.preview_url || '').toLowerCase();
    if (name.includes('video') || name.includes('visual') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) return 'video';
    return 'audio';
  };

  // Build a normalized list of versions — always at least one entry
  const normalizedVersions: TrackVersion[] = React.useMemo(() => {
    if (versions && versions.length > 0) return versions;
    // Fallback: create a synthetic main version from previewUrl
    if (previewUrl) {
      return [{
        id: `${id}-main`,
        version_name: 'Original',
        preview_url: previewUrl,
        download_url: previewUrl,
        is_main_version: true,
      }];
    }
    return [];
  }, [versions, previewUrl, id]);

  const mainVersion = normalizedVersions.find(v => v?.is_main_version) || normalizedVersions[0];
  const isVideo = normalizedVersions.some(v => getVersionType(v) === 'video');

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex flex-col p-4 mb-2 rounded-2xl transition-all duration-500 ${
        isPlaying ? 'bg-brand-purple/10 border-brand-purple/40 shadow-[0_0_30px_rgba(168,85,247,0.12)]' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
      } border backdrop-blur-md`}
    >
      {/* Top Row: Track Info */}
      <div className="flex items-center gap-4 mb-3">
        {/* Thumbnail / Play button */}
        <div
          className="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-zinc-800/80 flex items-center justify-center group/play cursor-pointer border border-white/5"
          onClick={() => {
            if (mainVersion) {
              const vType = getVersionType(mainVersion);
              const vUrl = (vType === 'video' ? (videoUrl || mainVersion.preview_url) : mainVersion.preview_url) || '';
              onPlay(vUrl, `${artist} - ${title}`, vType, id);
            }
          }}
        >
          <div className={`w-full h-full flex items-center justify-center text-sm ${isVideo ? 'bg-brand-purple/20 text-brand-purple' : 'bg-white/10 text-white'}`}>
            {isVideo ? <Video size={20} /> : <Music size={20} />}
          </div>
          <div className={`absolute inset-0 flex items-center justify-center bg-brand-purple/80 transition-all duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
            {isPlaying ? <Pause size={16} fill="currentColor" className="text-white" /> : <Play size={16} fill="currentColor" className="text-white ml-0.5" />}
          </div>
        </div>

        {/* Title, Artist, Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white group-hover:text-brand-purple transition-colors truncate">
              {title}
            </h3>
            {isNew && (
              <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[8px] font-black uppercase rounded-full tracking-wider shadow-lg shadow-rose-500/20">
                NEW
              </span>
            )}
          </div>
          <p className="text-[12px] text-zinc-500 font-medium truncate mt-0.5">
            {artist}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">
              {genre}
            </span>
            {bpm > 0 && (
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-brand-purple/50 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-brand-purple/40 inline-block" />
                {bpm} BPM
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Version Controls Row — always visible */}
      {normalizedVersions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {/* Download All Versions button */}
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
                    onPlay(vUrl, `${artist} - ${title} (${v.version_name})`, vType, id);
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
            <div className="relative aspect-video w-full bg-zinc-900/50">
              <button
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-red-500/80 rounded-xl text-white transition-all border border-white/10 backdrop-blur-md"
              >
                <X size={18} />
              </button>
              <video
                src={playingUrl}
                className="w-full h-full object-contain"
                autoPlay={isPlaying}
                controls
                playsInline
                onEnded={() => onCloseInline?.()}
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
              <div className="flex-1">
                <div className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Volume2 size={10} className="text-blue-400" />
                  Now Previewing: {title}
                </div>
                <audio
                  src={playingUrl}
                  autoPlay={isPlaying}
                  controls
                  className="w-full h-8 accent-blue-500"
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
