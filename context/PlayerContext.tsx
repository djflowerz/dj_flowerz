import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Mixtape } from '../types';

interface PlayerContextType {
  currentTrack: Mixtape | null;
  isPlaying: boolean;
  playTrack: (track: Mixtape) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Mixtape | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTrack = (track: Mixtape) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const pauseTrack = () => setIsPlaying(false);
  const resumeTrack = () => setIsPlaying(true);

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, playTrack, pauseTrack, resumeTrack }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};
