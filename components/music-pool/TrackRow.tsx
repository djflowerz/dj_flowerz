import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Music, Video, Zap, Search, Clock, Info,
  SkipBack, SkipForward, X, Maximize2
} from 'lucide-react';
import ReactPlayer from 'react-player';

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
  versions: TrackVersion[];
  isNew?: boolean;
  isExpanded?: boolean;
  isPlaying?: boolean;
  playingUrl?: string | null;
  playingType?: 'audio' | 'video' | null;
  previewUrl?: string | null;
  onPlay: (url: string, title: string, type: 'audio' | 'video', trackId?: string) => void;
  onDownload: (url: string, fileName: string) => void;
  onDownloadAll: () => void;
  onFindSimilar: () => void;
  onSkipNext?: () => void;
  onSkipPrev?: () => void;
  onCloseInline?: () => void;
  isSubscriber?: boolean;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  id,
  title,
  artist,
  bpm,
  genre,
  videoUrl,
  versions,
  isNew,
  isExpanded,
  isPlaying,
  playingUrl,
  playingType,
  previewUrl,
  onPlay,
  onDownload,
  onDownloadAll,
  onFindSimilar,
  onSkipNext,
  onSkipPrev,
  onCloseInline,
  isSubscriber = false
}) => {
  // Helper: determine type for a specific version
  const getVersionType = (v: TrackVersion): 'audio' | 'video' => {
    const name = (v?.version_name || '').toLowerCase();
    const url = (v?.preview_url || v?.download_url || '').toLowerCase();
    return name.includes('video') || url.endsWith('.mp4') || url.endsWith('.webm') ? 'video' : 'audio';
  };

  // Determine if it's primarily a video track
  const isVideo = versions?.some(v => getVersionType(v) === 'video') || false;
  const mainVersion = versions?.find(v => v?.is_main_version) || versions?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col p-3 mb-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg border border-blue-400/20 transition-all duration-200"
    >
      {/* Top Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
        {/* Track Info */}
        <div className="flex-1 flex items-center min-w-0 pr-4">
          <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg ${isVideo ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'} border border-current/10 mr-3`}>
            {isVideo ? <Video size={20} /> : <Music size={20} />}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-white font-bold text-sm truncate">
                {title}
              </h3>
              {isNew && (
                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded shadow-sm">
                  NEW
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-zinc-500 text-xs">
              <span className="font-semibold text-white/80">{artist}</span>
              <span className="flex items-center gap-1 opacity-60">
                <span className="w-1 h-1 rounded-full bg-white/40" />
                {genre}
              </span>
            </div>
          </div>
        </div>

        {/* BPM Indicator */}
        <div className="flex items-center justify-center px-6 border-x border-white/5 min-w-[80px]">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">BPM</span>
            <span className="text-lg font-black text-white font-mono">
              {bpm || '--'}
            </span>
          </div>
        </div>

        {/* Actions and Versions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Version Chips */}
          <div className="flex flex-wrap gap-1.5 max-w-[180px]">
            {versions.map((v) => (
              <div 
                key={v.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-blue-700 text-[10px] font-black uppercase transition-all hover:bg-blue-50`}
              >
                <span>{v.version_name.replace('Original', 'ORIG')}</span>
                <div className="flex items-center ml-1 border-l border-zinc-700 pl-2 gap-2">
                  <button 
                    onClick={() => {
                      const vType = getVersionType(v);
                      const vUrl = (vType === 'video' ? (videoUrl || v?.preview_url || v?.previewUrl) : (v?.preview_url || v?.previewUrl)) || '';
                      onPlay(vUrl, `${title} (${v?.version_name || 'Main'})`, vType);
                    }}
                    className="hover:scale-125 transition-transform text-blue-600"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                  <button 
                    onClick={() => {
                      if (!isSubscriber) return;
                      onDownload(v?.download_url || v?.downloadUrl || '', `${artist} - ${title} (${v?.version_name || 'Main'})`);
                    }}
                    className={`hover:scale-125 transition-transform ${isSubscriber ? 'text-blue-600' : 'text-zinc-300 opacity-50 cursor-not-allowed'}`}
                    title={isSubscriber ? "Download" : "Subscription Required"}
                  >
                    <Download size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {versions.length > 1 && (
              <button 
                onClick={() => {
                  if (!isSubscriber) return;
                  onDownloadAll();
                }}
                className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase transition-all shadow-sm active:scale-95 ${
                  isSubscriber 
                    ? 'bg-yellow-400 hover:bg-yellow-300 text-blue-900' 
                    : 'bg-zinc-700 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
                title={isSubscriber ? "Download All" : "Subscription Required"}
              >
                All Versions
              </button>
            )}
            
            <button 
              onClick={onFindSimilar}
              className="p-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-blue-400 rounded-lg transition-all border border-white/5"
              title="Find Similar"
            >
              <Search size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Inline Video Player */}
      <AnimatePresence>
        {isExpanded && playingType === 'video' && playingUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full mt-2 rounded-xl overflow-hidden bg-black/80 border border-white/10"
          >
            <div className="relative aspect-video w-full max-w-4xl mx-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/90 rounded-full text-white transition-colors border border-white/10"
              >
                <X size={18} />
              </button>
              <ReactPlayer
                url={playingUrl}
                width="100%"
                height="100%"
                playing={isPlaying}
                controls
                style={{ position: 'absolute', top: 0, left: 0 }}
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
            className="w-full mt-2 px-2 pb-2"
          >
            <div className="flex items-center gap-3 bg-black/60 rounded-xl px-4 py-3 border border-white/10">
              <span className="text-white/60 text-xs font-bold truncate flex-1">{isPlaying ? '▶ Playing…' : '⏸ Paused'}</span>
              <audio
                src={playingUrl}
                autoPlay={isPlaying}
                controls
                className="flex-1 h-8 accent-blue-400"
                style={{ minWidth: 0 }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white border border-white/10 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
