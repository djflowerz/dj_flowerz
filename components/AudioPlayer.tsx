import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, X } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { isUserSubscriber } from '../utils/authHelpers';

const AudioPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    pauseTrack,
    resumeTrack,
    seek,
    setVolume,
    setCurrentTrack
  } = usePlayer();
  const { user } = useAuth();
  const progressCircleRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const togglePlay = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressCircleRef.current && duration) {
      const rect = progressCircleRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      seek(percentage * duration);
    }
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#15151A]/95 backdrop-blur-xl border-t border-brand-purple/20 z-50 h-24 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

        {/* Track Info */}
        <div className="flex items-center w-1/3 min-w-[200px]">
          <div className="relative group">
            <img loading="lazy" src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 rounded bg-gray-800 object-cover shadow-lg border border-white/10"
            />
          </div>
          <div className="ml-4 truncate">
            <h4 className="text-white text-sm font-bold truncate tracking-tight">{currentTrack.title}</h4>
            <p className="text-gray-400 text-xs truncate mt-0.5">{currentTrack.genre}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-center w-1/3 px-4">
          <div className="flex items-center space-x-8 mb-3">
            <button className="text-gray-400 hover:text-brand-cyan transition-colors">
              <SkipBack size={22} />
            </button>
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-brand-cyan hover:scale-110 transition-all shadow-glow-cyan"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <button className="text-gray-400 hover:text-brand-cyan transition-colors">
              <SkipForward size={22} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3 text-[10px] font-mono text-gray-400">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <div
              ref={progressCircleRef}
              onClick={handleProgressClick}
              className="h-1.5 flex-1 bg-white/10 rounded-full cursor-pointer relative group overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-purple to-brand-cyan rounded-full transition-all duration-100 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                style={{ width: `${progressPercentage}%` }}
              ></div>
              <div
                className="absolute h-3 w-3 bg-white rounded-full -top-[3px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPercentage}% - 6px)` }}
              ></div>
            </div>
            <span className="w-10 text-left">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Extra Actions */}
        <div className="flex items-center justify-end w-1/3 gap-6">
          <div className="flex items-center gap-3 group hidden sm:flex">
            <Volume2 size={18} className="text-gray-400 group-hover:text-brand-cyan transition-colors" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-cyan hover:bg-white/20 transition-all"
            />
          </div>

          {isUserSubscriber(user) || !currentTrack.isExclusive ? null : (
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold border border-white/5 px-3 py-2 rounded">Premium Only</span>
          )}
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={() => setCurrentTrack(null)}
        className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-1"
        title="Close Player"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default AudioPlayer;

