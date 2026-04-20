import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_WORKER_URL ||
  import.meta.env.VITE_STORAGE_WORKER_URL ||
  'https://djflowerz-worker.ianmuriithiflowerz.workers.dev'
).replace(/\/$/, '');

const PROFILES_API = `${BASE}/api/profiles`;

// ─── useProfile ───────────────────────────────────────────────────────────────

export function useProfile(username: string) {
  const { user }     = useAuth();
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string|null>(null);
  const [following,  setFollowing]  = useState(false);
  const [mutuals,    setMutuals]    = useState<any>({ count: 0, text: '' });
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const d = await apiGet(`${PROFILES_API}/${username}`, user?.id);
      setData(d);
      setFollowing(d.viewer.following);
      setFollowerCount(d.stats.followers);
      if (user && d.profile.id !== user.id) {
          apiGet(`${BASE}/api/social/profiles/${username}/mutuals`, user.id)
            .then(m => setMutuals(m.mutuals))
            .catch(() => null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [username, user]);

  useEffect(() => { load(); }, [load]);

  const toggleFollow = useCallback(async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    const next = !following;
    setFollowing(next);
    setFollowerCount(c => next ? c + 1 : Math.max(0, c - 1));
    try {
      await apiPost(`${PROFILES_API}/${username}/follow`, {}, user.id);
    } catch {
      setFollowing(!next);
      setFollowerCount(c => !next ? c + 1 : Math.max(0, c - 1));
    } finally {
      setFollowLoading(false);
    }
  }, [following, followLoading, user, username]);

  return {
    profile:      data?.profile ?? null,
    stats:        { ...data?.stats, followers: followerCount },
    mutuals,
    viewer:       data?.viewer ?? { following: false, is_owner: false },
    loading,
    error,
    reload:       load,
    following,
    followLoading,
    toggleFollow,
  };
}

// ─── useProfilePosts ──────────────────────────────────────────────────────────

export function useProfilePosts(username: string, type = 'posts') {
  const { user }      = useAuth();
  const [posts,       setPosts]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [cursor,      setCursor]      = useState<string|null>(null);
  const [error,       setError]       = useState<string|null>(null);

  const fetchPage = useCallback(async (before: string | null = null, replace = false) => {
    if (!username) return;
    before ? setLoadingMore(true) : setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', type });
      if (before) params.set('before', before);
      const d = await apiGet(`${PROFILES_API}/${username}/${type}?${params}`, user?.id);
      const incoming = d.posts ?? [];
      setPosts(prev => replace ? incoming : [...prev, ...incoming]);
      setCursor(d.next_cursor ?? null);
      setHasMore(!!d.next_cursor);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [username, type, user]);

  useEffect(() => {
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    fetchPage(null, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && cursor) fetchPage(cursor);
  }, [loadingMore, hasMore, cursor, fetchPage]);

  const prependPost = useCallback((post: any) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  const patchPost = useCallback((id: string, patch: any) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  return { posts, loading, loadingMore, hasMore, error, loadMore, prependPost, patchPost };
}

// ─── useProfileEdit ───────────────────────────────────────────────────────────

export function useProfileEdit() {
  const { user }   = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string|null>(null);
  const [success,  setSuccess]  = useState(false);

  const update = useCallback(async (fields: any) => {
    if (!user) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await apiPatch(`${PROFILES_API}/me`, fields, user.id);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      return result.profile;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { update, loading, error, success };
}

// ─── useUserSearch ────────────────────────────────────────────────────────────

export function useUserSearch() {
  const { user }    = useAuth();
  const [results,   setResults]  = useState<any[]>([]);
  const [loading,   setLoading]  = useState(false);
  const debounceRef = useRef<any>(null);

  const search = useCallback((query: string) => {
    clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await apiGet(`${PROFILES_API}/search?q=${encodeURIComponent(query)}&limit=8`, user?.id);
        setResults(d.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [user]);

  const clear = useCallback(() => { setResults([]); clearTimeout(debounceRef.current); }, []);

  return { results, loading, search, clear };
}

// ─── useFollowList ────────────────────────────────────────────────────────────

export function useFollowList(username: string, type = 'followers') {
  const { user }   = useAuth();
  const [users,    setUsers]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const [cursor,   setCursor]   = useState<string|null>(null);

  const fetch_ = useCallback(async (before: string | null = null, replace = false) => {
    if (!username) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (before) params.set('before', before);
      const d = await apiGet(`${PROFILES_API}/${username}/${type}?${params}`, user?.id);
      const incoming = d.users ?? [];
      setUsers(prev => replace ? incoming : [...prev, ...incoming]);
      setCursor(d.next_cursor ?? null);
      setHasMore(!!d.next_cursor);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [username, type, user]);

  useEffect(() => { setUsers([]); setCursor(null); fetch_(null, true); }, [fetch_]);

  const loadMore = useCallback(() => { if (!loading && hasMore && cursor) fetch_(cursor); }, [loading, hasMore, cursor, fetch_]);

  return { users, loading, hasMore, loadMore };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(url: string, actorId?: string) {
  const res = await fetch(url, {
    headers: { ...(actorId ? { 'X-Actor-Id': actorId } : {}) },
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function apiPost(url: string, body: any, actorId?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(actorId ? { 'X-Actor-Id': actorId } : {}) },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function apiPatch(url: string, body: any, actorId?: string) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(actorId ? { 'X-Actor-Id': actorId } : {}) },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
