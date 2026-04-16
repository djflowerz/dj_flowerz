import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || '';

export interface TrackVersion {
  id: string;
  version_name: string;
  preview_url: string;
  download_url: string;
  is_main_version: boolean;
}

export interface PoolTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  display_genre: string;
  videoUrl?: string;
  previewUrl?: string;
  versions: TrackVersion[];
  isNew?: boolean;
}

export interface HubWithGenres {
  hub: string;
  genres: string[];
}

export interface YearData {
  year: number;
  months: string[];
}

export interface PoolFilters {
  hubsWithGenres: HubWithGenres[];
  years: YearData[];
}

export interface MusicPoolOptions {
  page?: number;
  limit?: number;
  hub?: string;
  genre?: string;
  year?: string;
  month?: string;
  search?: string;
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  isHype?: boolean;
}

export function useMusicPool() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<PoolTrack[]>([]);
  const [filters, setFilters] = useState<PoolFilters>({ hubsWithGenres: [], years: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [shadowSalt, setShadowSalt] = useState<string | null>(null);

  // 1. Handshake for Shadow Salt
  useEffect(() => {
    async function handshake() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE}/api/handshake`, {
          headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }
        });
        if (res.ok) {
          const d = await res.json();
          setShadowSalt(d.salt);
        }
      } catch (err) {
        console.warn("[MusicPool] Handshake skipped/failed", err);
      }
    }
    handshake();
  }, []);

  // 2. Fetch Dynamic Filters
  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pool/filters`);
      if (res.ok) {
        const data = await res.json();
        setFilters({
          hubsWithGenres: Array.isArray(data.hubsWithGenres) ? data.hubsWithGenres : [],
          years: Array.isArray(data.years) ? data.years : []
        });
      }
    } catch (err) {
      console.error("[MusicPool] Failed to fetch filters", err);
    }
  }, []);

  useEffect(() => { fetchFilters(); }, [fetchFilters]);

  // 3. Fetch Tracks
  const fetchTracks = useCallback(async (options: MusicPoolOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      Object.entries(options).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });

      // Construct URL with shadow salt if available
      let url = `${API_BASE}/api/pool/tracks?${params.toString()}`;
      if (shadowSalt) {
         url = `${API_BASE}/api/v1/sh-${shadowSalt}/pool/tracks?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) }
      });
      
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);

      setTracks(d.results || []);
      setPagination(d.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [shadowSalt]);

  // 4. Record Download
  const trackDownload = useCallback(async (versionId: string, url: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE}/api/pool/download`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ url, versionId })
      });
    } catch (err) {
      console.error("[MusicPool] Download tracking failed", err);
    }
  }, []);

  return {
    tracks,
    filters,
    loading,
    error,
    pagination,
    shadowSalt,
    fetchTracks,
    trackDownload
  };
}
