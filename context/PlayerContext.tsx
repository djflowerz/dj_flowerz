import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Mixtape } from '../types';
import { fetchHearthisTrack, parseHearthisUrl } from '../utils/hearthisApi';

interface PlayerContextType {
  currentTrack: Mixtape | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: Mixtape) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setCurrentTrack: (track: Mixtape | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Mixtape | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (!currentTrack) {
      audioRef.current.pause();
      audioRef.current.src = "";
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const setupAudio = async () => {
      let url = currentTrack.audioUrl;
      console.log(`[Player] Setting up track: ${currentTrack.title}`, { url });

      // Handle Hearthis.at URLs
      const hearthisParams = parseHearthisUrl(url);
      if (hearthisParams) {
        console.log(`[Player] Detected Hearthis.at URL, resolving components...`, hearthisParams);
        const trackData = await fetchHearthisTrack(hearthisParams.artist, hearthisParams.track);
        if (trackData) {
          console.log(`[Player] Hearthis resolution success:`, {
            stream: trackData.stream_url,
            download: trackData.download_url,
            preview: trackData.preview_url
          });
          // Priority: Stream > Download > Preview
          url = trackData.stream_url || trackData.download_url || trackData.preview_url || url;
        } else {
          console.warn(`[Player] Hearthis resolution failed for: ${url}. Trying automatic stream fallback.`);
          // Fallback pattern: https://hearthis.at/artist/slug/listen/
          // This often works for public tracks without an API key
          const cleanUrl = url.split('?')[0];
          const fallbackUrl = cleanUrl.endsWith('/') ? `${cleanUrl}listen/` : `${cleanUrl}/listen/`;
          console.log(`[Player] Fallback URL: ${fallbackUrl}`);
          url = fallbackUrl;
        }
      }

      if (audioRef.current) {
        console.log(`[Player] Loading audio source: ${url}`);
        audioRef.current.src = url;
        audioRef.current.load(); // Ensure new source is loaded

        if (isPlaying) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.error("[Player] Playback failed:", err);
              setIsPlaying(false);
            });
          }
        }
      }
    };

    setupAudio();
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error("[Player] Playback toggle failed:", err);
            setIsPlaying(false);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

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

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      playTrack,
      pauseTrack,
      resumeTrack,
      seek,
      setVolume,
      setCurrentTrack
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};

