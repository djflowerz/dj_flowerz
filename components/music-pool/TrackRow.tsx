import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Music, Video, Search, X, Flame, Volume2
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
    const url = (v?.preview_url || '').toLowerCase();
    if (name.includes('video') || name.includes('visual') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) return 'video';
    return 'audio';
  };

  const isVideo = versions?.some(v => getVersionType(v) === 'video') || false;
  const mainVersion = versions?.find(v => v?.is_main_version) || versions?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex flex-col p-5 mb-3 rounded-[2rem] transition-all duration-500 ${
        isPlaying ? 'bg-brand-purple/10 border-brand-purple/40 shadow-[0_0_40px_rgba(168,85,247,0.15)]' : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
      } border backdrop-blur-md`}
    >
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-6 w-full">
        {/* Track Info with Preview Action */}
        <div className="flex-1 flex items-center min-w-0">
          <div className="relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-zinc-800/80 flex items-center justify-center group/play mr-5 cursor-pointer shadow-2xl border border-white/5"
               onClick={() => {
                 if (mainVersion) {
                   const vType = getVersionType(mainVersion);
                   const vUrl = (vType === 'video' ? (videoUrl || mainVersion.preview_url) : mainVersion.preview_url) || '';
                   onPlay(vUrl, `${artist} - ${title} (${mainVersion.version_name})`, vType, id);
                 }
               }}>
            <div className={`w-full h-full flex items-center justify-center ${isVideo ? 'bg-brand-purple/20 text-brand-purple' : 'bg-white/10 text-white'}`}>
              {isVideo ? <Video size={28} /> : <Music size={28} />}
            </div>
            
            {/* Play Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center bg-brand-purple/80 transition-all duration-500 ${isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover/play:opacity-100 group-hover/play:scale-100'}`}>
              {isPlaying ? <Pause size={28} fill="currentColor" className="text-white" /> : <Play size={28} fill="currentColor" className="text-white ml-1" />}
            </div>
          </div>

          <div className="min-w-0 flex-1">
              <div className="flex flex-col min-w-0">
                <h3 className="text-[15px] md:text-base font-bold text-white group-hover:text-brand-purple transition-colors line-clamp-1">
                  {title}
                  {isNew && (
                    <span className="inline-flex items-center ml-2 px-2 py-0.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[9px] font-black uppercase rounded-full shadow-lg shadow-rose-500/20 tracking-wider align-middle animate-pulse">
                      NEW
                    </span>
                  )}
                </h3>
                <p className="text-[13px] text-zinc-400 font-medium group-hover:text-zinc-300 transition-colors truncate">
                  {artist}
                </p>
              </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
              <span className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] text-zinc-500">
                <Music size={14} className="text-brand-purple/40 mr-1" />
                {genre}
              </span>
              {bpm > 0 && (
                <span className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] text-brand-purple/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-purple/40 animate-pulse mr-1" />
                  {bpm} BPM
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Version Control Area */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-2">
           {versions.length > 1 && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 if (!isSubscriber) return;
                 onDownloadAll();
               }}
               className={`h-9 px-4 rounded-xl font-black text-[10px] uppercase transition-all shadow-xl active:scale-95 whitespace-nowrap flex items-center gap-2 ${
                 isSubscriber
                   ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30'
                   : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
               }`}
             >
               <Download size={14} />
               Download All
             </button>
           )}

           {versions.map((v, idx) => {
             const vType = getVersionType(v);
             const vUrl = v.preview_url || '';
             const isActive = playingUrl === vUrl && isPlaying;
             const isVideoObj = vType === 'video';
             
             return (
                  <div 
                    key={v.id || `${vType}-${idx}`}
                    className={`flex items-center rounded-xl overflow-hidden border transition-all duration-300 ${
                      isActive 
                        ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                        : 'border-white/5 bg-zinc-900/50 hover:border-white/20'
                    }`}
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(vUrl, `${artist} - ${title} (${v.version_name})`, vType, id);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 transition-all font-bold text-[10px] uppercase tracking-wider ${
                        isActive ? 'text-blue-400' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {isActive ? <Pause size={14} fill="currentColor" /> : (isVideoObj ? <Video size={14} /> : <Play size={14} fill="currentColor" />)}
                      {v.version_name}
                    </button>
                    <div className="w-px h-6 bg-white/5" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSubscriber) return;
                        onDownload(v.download_url, `${artist} - ${title} (${v.version_name})`, v.id);
                      }}
                      className={`flex items-center justify-center w-9 py-2 transition-all flex-shrink-0 ${
                        isSubscriber 
                          ? 'text-blue-500 hover:bg-blue-500 hover:text-white' 
                          : 'text-zinc-700 cursor-not-allowed'
                      }`}
                    >
                      <Download size={14} />
                    </button>
                  </div>
             );
           })}
        </div>
      </div>

      {/* Inline Video Player */}
      <AnimatePresence>
        {isExpanded && playingType === 'video' && playingUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full mt-6 rounded-[2rem] overflow-hidden bg-black border border-white/10 shadow-2xl relative z-10"
          >
            <div className="relative aspect-video w-full bg-zinc-900/50">
              <button 
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-6 right-6 z-20 w-12 h-12 flex items-center justify-center bg-black/60 hover:bg-red-500/80 rounded-2xl text-white transition-all border border-white/10 backdrop-blur-md"
              >
                <X size={24} />
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
            className="w-full mt-6"
          >
            <div className="flex items-center gap-6 bg-zinc-800/80 rounded-3xl px-8 py-6 border border-white/10 shadow-2xl backdrop-blur-3xl">
              <div className="flex-1">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Volume2 size={12} className="text-blue-400" />
                  Now Previewing: {title}
                </div>
                <audio
                  src={playingUrl}
                  autoPlay={isPlaying}
                  controls
                  className="w-full h-10 accent-blue-500"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="w-12 h-12 flex items-center justify-center bg-zinc-700/50 hover:bg-red-500/10 hover:text-red-400 rounded-2xl text-zinc-400 border border-white/5 transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
