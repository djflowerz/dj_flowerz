import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
const SOCIAL_API = `${API}/api/social`;

// ─── Feed ─────────────────────────────────────────────────────────────────────

export function useFeed(tab: string | { profile: string } = 'following') {
  const { user, session } = useAuth();
  const userId = user?.id;
  const token = session?.access_token;

  const [posts,       setPosts]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(true);

  const fetchPage = useCallback(async (cursor: string | null = null, replace = false) => {
    // ✅ No userId guard — public feed works for guests too
    cursor ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      let url: string | undefined;
      if (tab === 'following' || tab === 'foryou' || tab === 'latest' || tab === 'trending' || tab === 'marketplace') {
        // ✅ Map 'foryou' → 'latest' — worker doesn't have a foryou route
        const feedTab = tab === 'foryou' ? 'latest' : tab;
        // ✅ Only append userId if available
        const userParam = userId ? `&userId=${userId}` : '';
        url = `${SOCIAL_API}/feed?tab=${feedTab}&limit=20${userParam}${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`;
      } else if (typeof tab === 'object' && tab.profile) {
        url = `${SOCIAL_API}/feed/profile/${tab.profile}?limit=20${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`;
      }
      if (!url) return;

      const data = await apiGet(url, userId, token);
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
  // ✅ userId and token are primitives — stable references
  }, [tab, userId, token]);

  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPage(null, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextCursor) fetchPage(nextCursor);
  // @ts-ignore - tab and users are stable enough or extracted
  }, [loadingMore, hasMore, nextCursor, fetchPage]);

  const patchPost = useCallback((postId: string, patch: any) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...patch } : p));
  }, []);

  const prependPost = useCallback((post: any) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  return {
    posts, loading, loadingMore, error, hasMore,
    loadMore, patchPost, prependPost,
    refresh: useCallback(() => fetchPage(null, true), [fetchPage])
  };
}

// ─── Single post + comments ───────────────────────────────────────────────────

export function usePost(postId?: string) {
  const { user, session } = useAuth();
  const userId = user?.id;
  const token = session?.access_token;

  const [post,     setPost]     = useState<any>(null);
  const [quoted,   setQuoted]   = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!postId || !userId) return;
    setLoading(true);
    try {
      const [postData, commentData] = await Promise.all([
        apiGet(`${SOCIAL_API}/posts/${postId}`, userId, token),
        apiGet(`${SOCIAL_API}/posts/${postId}/comments?limit=30`, userId, token),
      ]);
      setPost(postData.post);
      setQuoted(postData.quoted_post ?? null);
      setComments(commentData.comments ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // ✅ primitives only
  }, [postId, userId, token]);

  useEffect(() => { load(); }, [load]);

  const appendComment = useCallback((comment: any) => {
    setComments(prev => [...prev, { ...comment, replies: [] }]);
    setPost((p: any) => p ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p);
  }, []);

  return { post, quoted, comments, loading, error, reload: load, appendComment };
}

// ─── Composer ─────────────────────────────────────────────────────────────────

export function useComposer() {
  const { user, session } = useAuth();
  const userId = user?.id;
  const token = session?.access_token;

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const submit = useCallback(async (body: any) => {
    if (!userId) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost(`${SOCIAL_API}/posts`, body, userId, token);
      return data.post;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  // ✅ primitives only
  }, [userId, token]);

  const post = useCallback(async ({ content, media_urls = [] }: any) => {
    return submit({ content, media_urls, post_type: 'post' });
  }, [submit]);

  const comment = useCallback(async ({ content, reply_to_id }: any) => {
    return submit({ content, post_type: 'post', reply_to_id });
  }, [submit]);

  const reshare = useCallback(async (postId: string) => {
    if (!userId) throw new Error('Not authenticated');
    setLoading(true);
    try {
      return await apiPost(`${SOCIAL_API}/posts/${postId}/reshare`, {}, userId, token);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  const deletePost = useCallback(async (postId: string) => {
    if (!userId) throw new Error('Not authenticated');
    setLoading(true);
    try {
      const res = await fetch(`${SOCIAL_API}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'X-Actor-Id': userId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Deletion failed');
      }
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  return { post, comment, quotedReshare, reshare, deletePost, loading, error };
}

// ─── Like ─────────────────────────────────────────────────────────────────────

export function useLike(initialLiked: boolean, initialCount: number) {
  const { user, session } = useAuth();
  const userId = user?.id;
  const token = session?.access_token;

  const [liked,   setLiked]   = useState(initialLiked);
  const [count,   setCount]   = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const debounce  = useRef<any>(null);

  // Sync if props change (e.g. feed refresh)
  useEffect(() => { setLiked(initialLiked); }, [initialLiked]);
  useEffect(() => { setCount(initialCount); }, [initialCount]);

  const toggle = useCallback(async (postId: string) => {
    if (!userId || loading) return;
    const next = !liked;
    setLiked(next);
    setCount(c => next ? c + 1 : Math.max(0, c - 1));
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        await apiPost(`${SOCIAL_API}/posts/${postId}/like`, {}, userId, token);
      } catch {
        setLiked(!next);
        setCount(c => !next ? c + 1 : Math.max(0, c - 1));
      } finally {
        setLoading(false);
      }
    }, 300);
  // ✅ primitives only
  }, [liked, loading, userId, token]);

  return { liked, count, toggle };
}

// ─── Follow ───────────────────────────────────────────────────────────────────

export function useFollow(targetUserId?: string) {
  const { user, session } = useAuth();
  const userId = user?.id;
  const token = session?.access_token;

  const [following, setFollowing] = useState(false);
  const [stats,     setStats]     = useState({ followers: 0, following: 0 });
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!targetUserId || !userId) return;
    // ✅ stable primitives — this effect will NOT re-run on every render
    apiGet(`${SOCIAL_API}/follows/${targetUserId}/stats`, userId, token)
      .then((d: any) => setStats({ followers: (d.followers || 0), following: (d.following || 0) }))
      .catch(() => {});
  }, [targetUserId, userId, token]);

  const toggle = useCallback(async () => {
    if (!userId || loading || !targetUserId) return;
    setLoading(true);
    const next = !following;
    setFollowing(next);
    setStats(s => ({ ...s, followers: next ? s.followers + 1 : Math.max(0, s.followers - 1) }));
    try {
      await apiPost(`${SOCIAL_API}/follows/${targetUserId}`, {}, userId, token);
    } catch {
      setFollowing(!next);
      setStats(s => ({ ...s, followers: !next ? s.followers + 1 : Math.max(0, s.followers - 1) }));
    } finally {
      setLoading(false);
    }
  }, [following, loading, userId, token, targetUserId]);

  return { following, stats, toggle, loading };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(url: string, actorId?: string, token?: string) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(actorId ? { 'X-Actor-Id': actorId } : {}),
      ...(token   ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

async function apiPost(url: string, body: any, actorId?: string, token?: string) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(actorId ? { 'X-Actor-Id': actorId } : {}),
      ...(token   ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}
