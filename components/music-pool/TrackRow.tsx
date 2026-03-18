import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Music, Video, Search, X, Flame
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
  onPlay: (url: string, title: string, type: 'audio' | 'video', trackId?: string) => void;
  onDownload: (url: string, fileName: string) => void;
  onDownloadAll: () => void;
  onFindSimilar: () => void;
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
  onPlay,
  onDownload,
  onDownloadAll,
  onFindSimilar,
  onCloseInline,
  isSubscriber = false
}) => {
  const getVersionType = (v: TrackVersion): 'audio' | 'video' => {
    const name = (v?.version_name || '').toLowerCase();
    const url = (v?.preview_url || v?.download_url || '').toLowerCase();
    return name.includes('video') || url.endsWith('.mp4') || url.endsWith('.webm') ? 'video' : 'audio';
  };

  const isVideo = versions?.some(v => getVersionType(v) === 'video') || false;
  const mainVersion = versions?.find(v => v?.is_main_version) || versions?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex flex-col p-4 mb-3 rounded-2xl transition-all duration-300 ${
        isPlaying ? 'bg-blue-600/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/60'
      } border`}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full">
        {/* Track Info with Preview Action */}
        <div className="flex-1 flex items-center min-w-0">
          <div className="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center group/play mr-4 cursor-pointer shadow-lg"
               onClick={() => {
                 if (mainVersion) {
                   const vType = getVersionType(mainVersion);
                   const vUrl = (vType === 'video' ? (videoUrl || mainVersion.preview_url) : mainVersion.preview_url) || '';
                   onPlay(vUrl, `${title} (${mainVersion.version_name})`, vType, id);
                 }
               }}>
            <div className={`w-full h-full flex items-center justify-center ${isVideo ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {isVideo ? <Video size={24} /> : <Music size={24} />}
            </div>
            
            {/* Play Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center bg-blue-600/60 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
              <Play size={24} fill="currentColor" className="text-white ml-1" />
            </div>
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-base truncate tracking-tight">{title}</h3>
              {isNew && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded-md shadow-lg shadow-blue-500/20">
                  NEW
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400 text-xs">
              <span className="font-semibold text-white/90">{artist}</span>
              <span className="flex items-center gap-2 opacity-50">
                <span className="w-1 h-1 rounded-full bg-zinc-500" />
                {genre}
              </span>
              {bpm > 0 && (
                <span className="flex items-center gap-2 opacity-50">
                  <span className="w-1 h-1 rounded-full bg-zinc-500" />
                  {bpm} BPM
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Versions and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Version Pills - Now focus on DOWNLOAD */}
          <div className="flex flex-wrap gap-2 max-w-md">
            {versions.map((v, idx) => (
              <div 
                key={v.id || idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 border border-white/5 text-zinc-300 text-[10px] font-bold uppercase transition-all hover:border-blue-500/50 hover:bg-zinc-800/80 group/pill"
              >
                <span className="opacity-70 group-hover/pill:opacity-100 transition-opacity">{v.version_name.replace('Original', 'ORIG')}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSubscriber) return;
                    onDownload(v.download_url, `${artist} - ${title} (${v.version_name})`);
                  }}
                  className={`ml-1 pl-2 border-l border-white/10 transition-all ${
                    isSubscriber 
                      ? 'text-blue-400 hover:text-blue-300 hover:scale-125' 
                      : 'text-zinc-600 cursor-not-allowed opacity-50'
                  }`}
                  title={isSubscriber ? "Download Version" : "Pro Access Required"}
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2">
            {versions.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSubscriber) return;
                  onDownloadAll();
                }}
                className={`h-10 px-5 rounded-xl font-black text-xs uppercase transition-all shadow-lg active:scale-95 whitespace-nowrap ${
                  isSubscriber 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                }`}
              >
                All Versions
              </button>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); onFindSimilar(); }}
              className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-blue-400 rounded-xl transition-all border border-white/5 shadow-lg"
              title="Find Similar Tracks"
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
            className="w-full mt-4 rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl"
          >
            <div className="relative aspect-video w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-6 right-6 z-20 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-all border border-white/10"
              >
                <X size={20} />
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
            className="w-full mt-4"
          >
            <div className="flex items-center gap-4 bg-zinc-800/80 rounded-2xl px-6 py-4 border border-white/10 shadow-xl backdrop-blur-md">
              <div className="flex-1">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">
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
                className="w-10 h-10 flex items-center justify-center bg-zinc-700/50 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white border border-white/5 transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
