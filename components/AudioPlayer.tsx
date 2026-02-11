import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';

const AudioPlayer: React.FC = () => {
  const { currentTrack, isPlaying, playTrack, pauseTrack, resumeTrack } = usePlayer();
  const { user } = useAuth();

  if (!currentTrack) return null;

  const togglePlay = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#15151A]/95 backdrop-blur-xl border-t border-brand-purple/20 z-50 h-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        
        {/* Track Info */}
        <div className="flex items-center w-1/3 min-w-[200px]">
          <div className="relative group">
            <img 
              src={currentTrack.coverUrl} 
              alt={currentTrack.title} 
              className="w-12 h-12 rounded bg-gray-800 object-cover"
            />
          </div>
          <div className="ml-3 truncate">
            <h4 className="text-white text-sm font-bold truncate">{currentTrack.title}</h4>
            <p className="text-gray-400 text-xs truncate">{currentTrack.genre}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center w-1/3">
          <div className="flex items-center space-x-6">
            <button className="text-gray-400 hover:text-white transition">
              <SkipBack size={20} />
            </button>
            <button 
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-brand-cyan hover:scale-105 transition transform"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button className="text-gray-400 hover:text-white transition">
              <SkipForward size={20} />
            </button>
          </div>
          {/* Progress Bar (Mock) */}
          <div className="w-full max-w-xs mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>1:20</span>
            <div className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
               <div className="h-full w-1/3 bg-gradient-to-r from-brand-purple to-brand-cyan"></div>
            </div>
            <span>{currentTrack.duration}</span>
          </div>
        </div>

        {/* Extra Actions */}
        <div className="flex items-center justify-end w-1/3 gap-4">
           <Volume2 size={20} className="text-gray-400" />
           {user?.isSubscriber || !currentTrack.isExclusive ? (
             <button className="text-brand-cyan hover:text-white transition flex items-center gap-1 text-xs uppercase font-bold tracking-wider">
               <Download size={16} /> <span className="hidden sm:inline">Download</span>
             </button>
           ) : (
             <span className="text-xs text-gray-500">Subscribe to Download</span>
           )}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
