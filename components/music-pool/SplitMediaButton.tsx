import React from 'react';
import { Play, Download, ChevronDown } from 'lucide-react';

interface SplitMediaButtonProps {
  onPlay: () => void;
  onDownload: () => void;
  label?: string;
  type?: 'audio' | 'video';
  className?: string;
}

export const SplitMediaButton: React.FC<SplitMediaButtonProps> = ({
  onPlay,
  onDownload,
  label = "Download",
  type = 'audio',
  className = ""
}) => {
  return (
    <div className={`flex items-center rounded-xl overflow-hidden shadow-md group ${className}`}>
      {/* Play/Preview Part */}
      <button
        onClick={onPlay}
        className="flex items-center justify-center p-3 bg-zinc-800 hover:bg-zinc-700 text-white transition-colors border-r border-zinc-700/50"
        title="Preview"
      >
        <Play size={18} fill="currentColor" className="text-blue-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Main Download Part */}
      <button
        onClick={onDownload}
        className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white transition-colors min-w-[120px]"
      >
        <Download size={18} className="text-zinc-400" />
        <span className="text-sm font-bold truncate">{label}</span>
      </button>
    </div>
  );
};
