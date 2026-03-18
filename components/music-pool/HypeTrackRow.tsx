import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Download, Music, Video, Zap, Search, X
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
  onPlay: (url: string, title: string, type: 'audio' | 'video', trackId?: string) => void;
  onDownload: (url: string, fileName: string) => void;
  onDownloadAll: () => void;
  onFindSimilar: () => void;
  onCloseInline?: () => void;
  isSubscriber?: boolean;
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
  onPlay,
  onDownload,
  onDownloadAll,
  onFindSimilar,
  onCloseInline,
  isSubscriber = false
}) => {
  const isHighBpm = bpm > 130;

  const getVersionType = (v: TrackVersion): 'audio' | 'video' => {
    const name = (v?.version_name || '').toLowerCase();
    const url = (v?.preview_url || v?.download_url || '').toLowerCase();
    return name.includes('video') || url.endsWith('.mp4') || url.endsWith('.webm') ? 'video' : 'audio';
  };

  const isVideo = versions?.some(v => getVersionType(v) === 'video') || false;
  const mainVersion = versions?.find(v => v?.is_main_version) || versions?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex flex-col p-4 mb-3 rounded-2xl transition-all duration-300 overflow-hidden ${
        isPlaying ? 'bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.3)]' : 'bg-blue-700 hover:bg-blue-600'
      } border border-blue-400/30`}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.1),transparent)] transition-all duration-700" />
      
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full relative z-10">
        {/* Track Info & Preview Action */}
        <div className="flex-1 flex items-center min-w-0">
          <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-white/20 backdrop-blur-lg border border-white/30 flex items-center justify-center group/play mr-4 cursor-pointer shadow-xl transition-transform hover:scale-105"
               onClick={() => {
                 if (mainVersion) {
                   const vType = getVersionType(mainVersion);
                   const vUrl = (vType === 'video' ? (videoUrl || mainVersion.preview_url) : mainVersion.preview_url) || '';
                   onPlay(vUrl, `${title} (${mainVersion.version_name})`, vType, id);
                 }
               }}>
            <Zap className={`text-white fill-white ${isPlaying ? 'animate-bounce' : 'animate-pulse'}`} size={28} />
            
            {/* Play Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center bg-blue-400/40 transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
              <Play size={28} fill="currentColor" className="text-white ml-1" />
            </div>
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-white font-black text-lg truncate tracking-tight uppercase italic">{title}</h3>
              {isNew && (
                <span className="px-2 py-0.5 bg-yellow-400 text-blue-900 text-[10px] font-black uppercase rounded-full shadow-lg">
                  TRENDING
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90 text-sm">
              <span className="font-bold">{artist}</span>
              <span className="flex items-center gap-2 opacity-70">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                {genre}
              </span>
              {bpm > 0 && (
                <span className={`font-black italic px-2 py-0.5 rounded bg-white/10 ${isHighBpm ? 'text-red-300' : 'text-white'}`}>
                  {bpm} BPM
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Versions and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Version Pills -Focus on DOWNLOAD */}
          <div className="flex flex-wrap gap-2 max-w-md">
            {versions.map((v, idx) => (
              <div 
                key={v.id || idx}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-900 text-[11px] font-black uppercase transition-all hover:scale-105 shadow-xl group/pill"
              >
                <span className="opacity-80 group-hover/pill:opacity-100">{v.version_name}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSubscriber) return;
                    onDownload(v.download_url, `${artist} - ${title} (${v.version_name})`);
                  }}
                  className={`ml-2 pl-3 border-l border-blue-100 transition-all ${
                    isSubscriber 
                      ? 'text-blue-600 hover:text-blue-500 hover:scale-125' 
                      : 'text-zinc-400 cursor-not-allowed opacity-50'
                  }`}
                  title={isSubscriber ? "Download Version" : "Pro Access Required"}
                >
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3">
            {versions.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSubscriber) return;
                  onDownloadAll();
                }}
                className={`h-12 px-6 rounded-xl font-black text-xs uppercase transition-all shadow-2xl active:scale-95 flex items-center gap-2 whitespace-nowrap ${
                  isSubscriber 
                    ? 'bg-yellow-400 hover:bg-yellow-300 text-blue-900 hover:scale-105 active:scale-95' 
                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <Download size={18} />
                ALL VERSIONS
              </button>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); onFindSimilar(); }}
              className="w-12 h-12 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all border border-white/20 shadow-lg"
              title="Find Similar"
            >
              <Search size={20} />
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
            className="w-full mt-4 rounded-2xl overflow-hidden bg-black/90 border border-white/20 relative z-20 shadow-2xl"
          >
            <div className="relative aspect-video w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="absolute top-6 right-6 z-30 w-10 h-10 flex items-center justify-center bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-all border border-white/20"
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
            className="w-full mt-4 relative z-20"
          >
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/20 shadow-2xl">
              <div className="flex-1">
                <div className="text-[10px] text-white/60 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Play size={10} fill="currentColor" /> Previewing Master: {title}
                </div>
                <audio
                  src={playingUrl}
                  autoPlay={isPlaying}
                  controls
                  className="w-full h-8 accent-yellow-400"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCloseInline?.(); }}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl text-white border border-white/10 transition-all"
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
