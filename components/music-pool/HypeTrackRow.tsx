import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Download, Music, Video, Zap, Search, X, Volume2, Hash, Maximize2, SkipBack, SkipForward, Layers
} from 'lucide-react';

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
  onPlay: (url: string, title: string, type: 'audio' | 'video', trackId?: string) => void;
  onDownload: (url: string, fileName: string, versionId?: string) => void;
  onDownloadAll: () => void;
  onFindSimilar: () => void;
  onCloseInline?: () => void;
  isSubscriber?: boolean;
}

  const getVersionType = (v: TrackVersion): 'audio' | 'video' => {
    const name = (v?.version_name || '').toLowerCase();
    const url = (v?.preview_url || '').toLowerCase();
    if (name.includes('video') || name.includes('visual') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) return 'video';
    return 'audio';
  };

export const HypeTrackRow: React.FC<HypeTrackRowProps> = ({
  id, title, artist, bpm, genre, videoUrl, versions, isNew, isExpanded, isPlaying, playingUrl, playingType, onPlay, onDownload, onDownloadAll, onFindSimilar, onCloseInline, isSubscriber = false
}) => {
  const isHighBpm = bpm > 130;

  const isVideo = versions?.some(v => getVersionType(v) === 'video') || false;
  const mainVersion = versions?.find(v => v?.is_main_version) || versions?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative flex flex-col p-6 mb-4 rounded-[2.5rem] transition-all duration-500 ${
        isPlaying 
          ? 'bg-brand-purple/10 border-brand-purple/40 shadow-[0_0_40px_rgba(168,85,247,0.15)]' 
          : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
      } border backdrop-blur-xl overflow-hidden`}
    >
      {/* Hype Glow Effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-purple/10 blur-[80px] rounded-full group-hover:bg-brand-purple/20 transition-all duration-700" />
      
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-8 w-full relative z-10">
        {/* Track Info with Preview Action */}
        <div className="flex-1 flex items-center min-w-0">
          <div className="relative flex-shrink-0 w-20 h-20 rounded-3xl overflow-hidden bg-zinc-800/80 flex items-center justify-center group/play mr-6 cursor-pointer shadow-2xl border border-white/10"
               onClick={() => {
                 if (mainVersion) {
                   const vType = getVersionType(mainVersion);
                   const vUrl = (vType === 'video' ? (videoUrl || mainVersion.preview_url) : mainVersion.preview_url) || '';
                   onPlay(vUrl, `${artist} - ${title} (${mainVersion.version_name})`, vType, id);
                 }
               }}>
            <div className={`w-full h-full flex items-center justify-center ${isVideo ? 'bg-brand-purple/20 text-brand-purple' : 'bg-white/10 text-white'}`}>
              {isVideo ? <Video size={32} /> : <Zap size={32} className="animate-pulse" />}
            </div>
            
            {/* Play Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-purple to-purple-800 transition-all duration-500 ${isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover/play:opacity-100 group-hover/play:scale-100'}`}>
              {isPlaying ? <Pause size={32} fill="currentColor" className="text-white" /> : <Play size={32} fill="currentColor" className="text-white ml-1" />}
            </div>
          </div>
          
          <div className="min-w-0 flex-1">
              <div className="flex flex-col min-w-0">
                <h3 className="text-[15px] md:text-base font-bold text-white group-hover:text-brand-purple transition-colors line-clamp-1">
                  {title}
                </h3>
                <p className="text-[13px] text-zinc-400 font-medium group-hover:text-zinc-300 transition-colors truncate">
                  {artist}
                </p>
              </div>
            {isNew && (
                <div className="relative flex items-center">
                    <div className="absolute inset-0 bg-rose-500/20 blur-md rounded-full animate-pulse" />
                    <span className="relative px-4 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-black uppercase rounded-full shadow-lg shadow-rose-500/20 tracking-[0.1em]">
                      NEW
                    </span>
                </div>
              )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] text-zinc-500">
                <Music size={14} className="text-brand-purple" />
                {genre}
              </span>
              {bpm > 0 && (
                <span className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] text-brand-purple">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse mr-1" />
                  {bpm} BPM
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-4">
           {versions.length > 1 && (
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 if (!isSubscriber) return;
                 onDownloadAll();
               }}
                className={`h-14 px-8 rounded-[1.5rem] font-black text-sm uppercase transition-all shadow-2xl active:scale-95 whitespace-nowrap flex items-center gap-3 ${
                  isSubscriber 
                    ? 'bg-brand-purple hover:bg-brand-purple/80 text-white shadow-brand-purple/30' 
                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-white/5'
                }`}
             >
               <Download size={20} />
               Download All
             </button>
           )}
           
             <button 
               onClick={(e) => { e.stopPropagation(); onFindSimilar(); }}
               className="w-14 h-14 flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-brand-purple rounded-[1.5rem] transition-all border border-white/10 shadow-xl group/search"
               title="Find Similar Tracks"
             >
               <Search size={22} className="group-hover:scale-110 transition-transform" />
             </button>
        </div>
      </div>

      {/* Version Control Area */}
      <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
        <div className="flex flex-wrap gap-4">
          {versions?.filter((v, index, self) => 
            index === self.findIndex((t) => (
              t.version_name?.toLowerCase().trim() === v.version_name?.toLowerCase().trim()
            ))
          ).map((v, idx) => {
            const vType = getVersionType(v);
            const vUrl = v.preview_url || '';
            const isActive = playingUrl === vUrl && isPlaying;

            return (
              <div 
                key={v.id || idx}
                className="flex items-center gap-2 p-1.5 rounded-[1.5rem] bg-zinc-900/40 border border-white/5 transition-all hover:border-brand-purple/30 hover:bg-zinc-800/60 group/version shadow-lg"
              >
                <div className="flex items-center gap-2 pr-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(vUrl, `${artist} - ${title} (${v.version_name})`, vType, id);
                    }}
                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-[0.05em] ${
                      isActive 
                        ? 'bg-brand-purple text-white shadow-xl shadow-brand-purple/30' 
                        : 'bg-zinc-900 text-zinc-400 hover:text-white group-hover/version:bg-zinc-900'
                    }`}
                  >
                    {isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    Preview {v.version_name}
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSubscriber) return;
                      onDownload(v.download_url, `${artist} - ${title} (${v.version_name})`, v.id);
                    }}
                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-[0.05em] ${
                      isSubscriber 
                        ? 'bg-zinc-900/40 text-brand-purple hover:bg-brand-purple/20 hover:text-brand-purple' 
                        : 'bg-zinc-900/20 text-zinc-700 cursor-not-allowed opacity-50'
                    }`}
                    title={isSubscriber ? "Download Version" : "Pro Access Required"}
                  >
                    <Download size={18} />
                    Instant Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Video Player */}
      <AnimatePresence>
        {isExpanded && playingType === 'video' && playingUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: 20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 20 }}
            className="w-full mt-8 rounded-[2.5rem] overflow-hidden bg-black border-2 border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] relative z-10"
          >
            <div className="relative aspect-video w-full bg-zinc-900/80">
              <button 
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-8 right-8 z-20 w-14 h-14 flex items-center justify-center bg-black/60 hover:bg-red-500 text-white transition-all border border-white/20 backdrop-blur-xl rounded-2xl shadow-2xl"
              >
                <X size={28} />
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
            initial={{ height: 0, opacity: 0, y: 10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 10 }}
            className="w-full mt-8"
          >
            <div className="flex items-center gap-8 bg-zinc-800/60 rounded-[2.5rem] px-10 py-8 border border-white/10 shadow-3xl backdrop-blur-3xl">
              <div className="flex-1">
                <div className="text-xs text-zinc-500 font-extrabold uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <Volume2 size={16} className="text-brand-purple animate-pulse" />
                  Hype Preview: {title}
                </div>
                <audio
                  src={playingUrl}
                  autoPlay={isPlaying}
                  controls
                  className="w-full h-12 accent-brand-purple"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="w-14 h-14 flex items-center justify-center bg-zinc-700/50 hover:bg-red-500/20 hover:text-red-400 rounded-2xl text-zinc-400 border border-white/10 transition-all shadow-xl"
              >
                <X size={28} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
