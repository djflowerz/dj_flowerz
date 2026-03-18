import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Music, Video, Zap, Search, 
  SkipBack, SkipForward, X, Maximize2, Info
} from 'lucide-react';
import ReactPlayer from 'react-player';

interface TrackVersion {
  id: string;
  version_name: string;
  preview_url: string;
  download_url: string;
  is_main_version: boolean;
}

interface HypeTrackRowProps {
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
}

export const HypeTrackRow: React.FC<HypeTrackRowProps> = ({
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
  onCloseInline
}) => {
  const isHighBpm = bpm > 130;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col p-3 mb-2 rounded-xl bg-blue-700 hover:bg-blue-600 shadow-lg border border-blue-400/30 transition-all duration-200 overflow-hidden"
    >
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 opacity-90 rounded-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)] group-hover:scale-150 transition-transform duration-700 pointer-events-none rounded-xl" />

      {/* Top Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full relative z-10">
        {/* Track Info */}
        <div className="relative flex-1 flex items-center min-w-0 z-10">
          <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/20 backdrop-blur-md border border-white/30 mr-4">
            <Zap className="text-white fill-white animate-pulse" size={24} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-black text-base truncate">
                {title}
              </h3>
              {isNew && (
                <span className="px-2 py-0.5 bg-yellow-400 text-blue-900 text-[10px] font-black uppercase rounded-full shadow-sm">
                  NEW
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90 text-sm">
              <span className="font-bold text-white/90">{artist}</span>
              <span className="flex items-center gap-1 opacity-80">
                <span className="w-1 h-1 rounded-full bg-white/40" />
                {genre}
              </span>
            </div>
          </div>
        </div>

        {/* BPM Indicator */}
        <div className="relative flex flex-col items-end justify-center px-4 border-r border-white/20 z-10">
            <span className="text-xl font-black text-white font-mono tracking-tighter">
  BPM</span>
          <span className={`text-2xl font-black italic ${isHighBpm ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'text-white'}`}>
            {bpm || '--'}
          </span>
        </div>

        {/* Actions and Versions */}
        <div className="relative flex flex-wrap items-center gap-3 z-10">
          {/* Version Chips */}
          <div className="flex flex-wrap gap-2 max-w-[200px]">
            {versions.map((v) => (
              <div 
                key={v.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-blue-800 text-[11px] font-black uppercase transition-all hover:bg-blue-50 cursor-pointer group/v shadow-md`}
              >
                <span>{v.version_name}</span>
                <div className="flex items-center ml-2 border-l border-blue-100 pl-2 gap-2">
                  <button 
                    onClick={() => onPlay(videoUrl || v?.preview_url || v?.previewUrl || '', `${title} (${v?.version_name || 'Main'})`, (videoUrl || v?.version_name?.toLowerCase()?.includes('video')) ? 'video' : 'audio')}
                    className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(v?.download_url || v?.downloadUrl || '', `${artist} - ${title} (${v?.version_name || 'Main'})`); }}
                    className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Global Row Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {versions.length > 1 && (
              <button 
                onClick={onDownloadAll}
                className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-900 rounded-xl font-black text-xs uppercase transition-all shadow-xl active:scale-95 flex items-center gap-2 whitespace-nowrap"
              >
                <Download size={16} />
                ALL VERSIONS
              </button>
            )}
            
            <button 
              onClick={onFindSimilar}
              className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all border border-white/20"
              title="Find Similar BPM/Genre"
            >
              <Search size={18} />
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
            className="w-full mt-2 rounded-xl overflow-hidden bg-black/90 border border-white/20 relative z-20 shadow-2xl"
          >
            <div className="relative aspect-video w-full max-w-4xl mx-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/90 rounded-full text-white transition-colors border border-white/20"
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
    </motion.div>
  );
};
