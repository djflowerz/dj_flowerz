import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize, Minimize } from 'lucide-react';

interface MediaOverlayProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const MediaOverlay: React.FC<MediaOverlayProps> = ({ url, isOpen, onClose, title }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-5xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-white font-medium truncate pr-4">{title || 'Video Preview'}</h3>
              <button 
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center relative">
              <video
                src={url}
                className="w-full h-full object-contain"
                autoPlay
                controls
                playsInline
                onEnded={onClose}
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
