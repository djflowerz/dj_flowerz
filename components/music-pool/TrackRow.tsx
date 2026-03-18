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
                </h3>
                <p className="text-[13px] text-zinc-400 font-medium group-hover:text-zinc-300 transition-colors truncate">
                  {artist}
                </p>
              </div>
            {isNew && (
                <div className="relative flex items-center">
                   <div className="absolute inset-0 bg-rose-500/20 blur-md rounded-full animate-pulse" />
                   <span className="relative px-3 py-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[10px] font-black uppercase rounded-full shadow-lg shadow-rose-500/20 tracking-wider">
                     NEW
                   </span>
                </div>
              )}
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

        {/* Global Actions */}
        <div className="flex items-center gap-3">
           {versions.length > 1 && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 if (!isSubscriber) return;
                 onDownloadAll();
               }}
               className={`h-12 px-6 rounded-2xl font-black text-xs uppercase transition-all shadow-xl active:scale-95 whitespace-nowrap flex items-center gap-2 ${
                 isSubscriber
                   ? 'bg-brand-purple hover:bg-brand-purple/80 text-white shadow-brand-purple/30'
                   : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
               }`}
             >
               <Download size={16} />
               Download All Versions
             </button>
           )}

           <button
             onClick={(e) => { e.stopPropagation(); onFindSimilar(); }}
             className="w-12 h-12 flex items-center justify-center bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-brand-purple rounded-2xl transition-all border border-white/5 shadow-lg group/search"
             title="Find Similar Tracks"
           >
             <Search size={20} className="group-hover:scale-110 transition-transform" />
           </button>
        </div>
      </div>

      {/* Version Control Area */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex flex-wrap gap-3">
          {versions?.filter((v, index, self) =>
            index === self.findIndex((t) => (
              t.version_name?.toLowerCase().trim() === v.version_name?.toLowerCase().trim()
            ))
          ).map((version) => {
            const vType = getVersionType(version);
            const vUrl = version.preview_url || '';
            const isActive = playingUrl === vUrl && isPlaying;

            return (
              <div
                key={version.id}
                className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-800/40 border border-white/5 transition-all hover:border-white/10 hover:bg-zinc-800/60 group/version"
              >
                <div className="flex items-center gap-2 pr-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(vUrl, `${artist} - ${title} (${version.version_name})`, vType, id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[11px] uppercase tracking-wide group/preview ${
                      isActive
                        ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                        : 'bg-zinc-900/60 text-zinc-400 hover:text-white group-hover/version:bg-zinc-900 border border-white/5'
                    }`}
                  >
                    {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    Preview {version.version_name}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSubscriber) return;
                      onDownload(version.download_url, `${artist} - ${title} (${version.version_name})`, version.id);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[11px] uppercase tracking-wide border border-white/5 ${
                      isSubscriber
                        ? 'bg-zinc-900/40 text-brand-purple hover:bg-brand-purple/20 hover:text-brand-purple hover:border-brand-purple/30'
                        : 'bg-zinc-900/20 text-zinc-700 cursor-not-allowed opacity-50'
                    }`}
                    title={isSubscriber ? "Download Version" : "Pro Access Required"}
                  >
                    <Download size={14} />
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
