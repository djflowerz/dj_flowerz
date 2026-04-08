import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize, Minimize, ChevronLeft, ChevronRight, Music, Star } from 'lucide-react';

interface MediaOverlayProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  type?: 'audio' | 'video';
  onSkipNext?: () => void;
  onSkipPrev?: () => void;
}

export const MediaOverlay: React.FC<MediaOverlayProps> = ({ url, isOpen, onClose, title, type, onSkipNext, onSkipPrev }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl aspect-video bg-zinc-950 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 group/overlay"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Audio Visual Placeholder */}
            {type === 'audio' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600/20 via-zinc-950 to-purple-600/20">
                <div className="w-32 h-32 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 animate-pulse shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                  <Music size={64} className="text-blue-400" />
                </div>
                <div className="text-center px-8">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2">{title}</h3>
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Previewing Audio Stream</span>
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-20 opacity-0 group-hover/overlay:opacity-100 transition-opacity duration-500">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                   {type === 'video' ? <Star size={20} /> : <Music size={20} />}
                </div>
                <h3 className="text-white font-bold truncate pr-4 text-lg">{title || 'Preview Player'}</h3>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all flex items-center justify-center border border-white/10 hover:scale-110 active:scale-95 backdrop-blur-md"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center relative group/video">
              {/* Skip Controls */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-8 z-30 pointer-events-none opacity-0 group-hover/video:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onSkipPrev?.(); }}
                  className="w-16 h-16 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-blue-600 hover:scale-110 transition-all pointer-events-auto active:scale-95 shadow-2xl backdrop-blur-md"
                >
                  <ChevronLeft size={40} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSkipNext?.(); }}
                  className="w-16 h-16 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-blue-600 hover:scale-110 transition-all pointer-events-auto active:scale-95 shadow-2xl backdrop-blur-md"
                >
                  <ChevronRight size={40} />
                </button>
              </div>

              <video
                src={url}
                key={url}
                className={`w-full h-full ${type === 'audio' ? 'opacity-0' : 'object-contain'}`}
                autoPlay
                controls
                playsInline
                onEnded={onSkipNext || onClose}
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
