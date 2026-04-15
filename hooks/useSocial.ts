import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
const SOCIAL_API = `${API}/api/social`;

// ─── Feed ─────────────────────────────────────────────────────────────────────

export function useFeed(tab: string | { profile: string } = 'following') {
  const { user } = useAuth();
  const [posts,      setPosts]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [loadingMore,setLoadingMore] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore,    setHasMore]    = useState(true);

  const fetchPage = useCallback(async (cursor: string | null = null, replace = false) => {
    if (!user) return;
    cursor ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      let url;
      if (tab === 'following' || tab === 'foryou') {
        url = `${SOCIAL_API}/feed?tab=${tab}&limit=20${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`;
      } else if (typeof tab === 'object' && tab.profile) {
        url = `${SOCIAL_API}/feed/profile/${tab.profile}?limit=20${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`;
      }

      if (!url) return;

      const data = await apiGet(url, user.id);
      const incoming = data.posts ?? [];

      setPosts(prev => replace ? incoming : [...prev, ...incoming]);
      setNextCursor(data.next_cursor ?? null);
      setHasMore(!!data.next_cursor);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tab, user]);

  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPage(null, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextCursor) fetchPage(nextCursor);
  }, [loadingMore, hasMore, nextCursor, fetchPage]);

  const patchPost = useCallback((postId: string, patch: any) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...patch } : p));
  }, []);

  const prependPost = useCallback((post: any) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  return { posts, loading, loadingMore, error, hasMore, loadMore, patchPost, prependPost, refresh: () => fetchPage(null, true) };
}

// ─── Single post + comments ───────────────────────────────────────────────────

export function usePost(postId?: string) {
  const { user }   = useAuth();
  const [post,     setPost]     = useState<any>(null);
  const [quoted,   setQuoted]   = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!postId || !user) return;
    setLoading(true);
    try {
      const [postData, commentData] = await Promise.all([
        apiGet(`${SOCIAL_API}/posts/${postId}`, user.id),
        apiGet(`${SOCIAL_API}/posts/${postId}/comments?limit=30`, user.id),
      ]);
      setPost(postData.post);
      setQuoted(postData.quoted_post ?? null);
      setComments(commentData.comments ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => { load(); }, [load]);

  const appendComment = useCallback((comment: any) => {
    setComments(prev => [...prev, { ...comment, replies: [] }]);
    setPost((p: any) => p ? { ...p, comment_count: p.comment_count + 1 } : p);
  }, []);

  return { post, quoted, comments, loading, error, reload: load, appendComment };
}

// ─── Composer ─────────────────────────────────────────────────────────────────

export function useComposer() {
  const { user }  = useAuth();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = async (body: any) => {
    if (!user) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost(`${SOCIAL_API}/posts`, body, user.id);
      return data.post;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const post = useCallback(async ({ content, media_urls = [] }: any) => {
    return submit({ content, media_urls, post_type: 'post' });
  }, [user]);

  const comment = useCallback(async ({ content, reply_to_id }: any) => {
    return submit({ content, post_type: 'post', reply_to_id });
  }, [user]);

  const quotedReshare = useCallback(async ({ content, quote_of_id }: any) => {
    return submit({ content, post_type: 'quoted_reshare', quote_of_id });
  }, [user]);

  const reshare = useCallback(async (postId: string) => {
    if (!user) throw new Error('Not authenticated');
    setLoading(true);
    try {
      return await apiPost(`${SOCIAL_API}/posts/${postId}/reshare`, {}, user.id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { post, comment, quotedReshare, reshare, loading, error };
}

// ─── Like ─────────────────────────────────────────────────────────────────────

export function useLike(initialLiked: boolean, initialCount: number) {
  const { user }   = useAuth();
  const [liked,    setLiked]  = useState(initialLiked);
  const [count,    setCount]  = useState(initialCount);
  const [loading,  setLoading] = useState(false);
  const debounce   = useRef<any>(null);

  const toggle = useCallback(async (postId: string) => {
    if (!user || loading) return;
    const next = !liked;
    setLiked(next);
    setCount(c => next ? c + 1 : Math.max(0, c - 1));

    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        await apiPost(`${SOCIAL_API}/posts/${postId}/like`, {}, user.id);
      } catch {
        setLiked(!next);
        setCount(c => !next ? c + 1 : Math.max(0, c - 1));
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [liked, loading, user]);

  useEffect(() => { setLiked(initialLiked); }, [initialLiked]);
  useEffect(() => { setCount(initialCount); }, [initialCount]);

  return { liked, count, toggle };
}

// ─── Follow ───────────────────────────────────────────────────────────────────

export function useFollow(targetUserId?: string) {
  const { user }    = useAuth();
  const [following, setFollowing] = useState(false);
  const [stats,     setStats]     = useState({ followers: 0, following: 0 });
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!targetUserId || !user) return;
    apiGet(`${SOCIAL_API}/follows/${targetUserId}/stats`, user.id)
      .then((d: any) => setStats({ followers: d.followers, following: d.following }))
      .catch(() => {});
  }, [targetUserId, user]);

  const toggle = useCallback(async () => {
    if (!user || loading || !targetUserId) return;
    setLoading(true);
    const next = !following;
    setFollowing(next);
    setStats(s => ({ ...s, followers: next ? s.followers + 1 : Math.max(0, s.followers - 1) }));
    try {
      await apiPost(`${SOCIAL_API}/follows/${targetUserId}`, {}, user.id);
    } catch {
      setFollowing(!next);
      setStats(s => ({ ...s, followers: !next ? s.followers + 1 : Math.max(0, s.followers - 1) }));
    } finally {
      setLoading(false);
    }
  }, [following, loading, user, targetUserId]);

  return { following, stats, toggle, loading };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(url: string, actorId?: string) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(actorId ? { 'X-Actor-Id': actorId } : {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function apiPost(url: string, body: any, actorId?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(actorId ? { 'X-Actor-Id': actorId } : {}) },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
