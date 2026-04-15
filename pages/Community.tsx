import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFeed, useComposer, useLike } from '../hooks/useSocial';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageSquare, Repeat, Quote, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const FONT_DISPLAY = "'Bebas Neue', 'Impact', sans-serif";
const FONT_BODY    = "'Inter', 'Syne', sans-serif";
const FONT_MONO    = "'DM Mono', monospace";

export default function CommunityFeed() {
  const [tab, setTab] = useState<'following' | 'foryou'>('following');
  const { posts, loading, loadingMore, hasMore, loadMore, patchPost, prependPost } = useFeed(tab);
  const { user } = useAuth();

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '400px' });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  const handleNewPost = (post: any) => prependPost({ ...post, username: user?.user_metadata?.username || user?.email?.split('@')[0], display_name: user?.user_metadata?.full_name || 'DJ Flowerz User', avatar_url: user?.user_metadata?.avatar_url || '' });

  return (
    <div style={css.page}>
      <div style={css.masthead}>
        <span style={css.mastheadTag}>// community</span>
        <h1 style={css.mastheadTitle}>THE FEED</h1>
      </div>

      {user && <Composer onPost={handleNewPost} />}

      <div style={css.tabRow}>
        {['following', 'foryou'].map(t => (
          <button key={t} style={{ ...css.tab, ...(tab === t ? css.tabActive : {}) }} onClick={() => setTab(t as any)}>
            {t === 'following' ? 'Following' : 'For You'}
          </button>
        ))}
        <div style={css.tabDivider} />
      </div>

      {loading && !posts.length ? (
        <div style={css.loadingPulse}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div style={css.feed}>
          {posts.map((post: any, i: number) => (
            <PostCard key={post.id} post={post} index={i} onPatch={(patch: any) => patchPost(post.id, patch)} />
          ))}
          {loadingMore && <SkeletonCard />}
          {!hasMore && posts.length > 0 && (
            <p style={css.endNote}>— you've reached the end of the feed —</p>
          )}
          {posts.length === 0 && !loading && (
            <div style={css.emptyState}>
              <span style={css.emptyIcon}>◎</span>
              <p style={{ color: '#555', fontSize: 14 }}>
                {tab === 'following' ? 'Follow some DJs to fill your feed.' : 'No trending posts right now.'}
              </p>
            </div>
          )}
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
      )}
    </div>
  );
}

function Composer({ onPost, replyTo = null, quoteOf = null, onDone = null, compact = false }: any) {
  const { post: postFn, comment, quotedReshare, loading, error } = useComposer();
  const { user }  = useAuth();
  const [content, setContent] = useState('');
  const [focused, setFocused] = useState(false);
  const MAX = 500;
  const remaining = MAX - content.length;

  const submit = async () => {
    if (!content.trim() || loading) return;
    try {
      let newPost;
      if (replyTo)  newPost = await comment({ content, reply_to_id: replyTo });
      else if (quoteOf) newPost = await quotedReshare({ content, quote_of_id: quoteOf.id });
      else newPost = await postFn({ content });
      setContent('');
      if(onPost) onPost(newPost);
      if(onDone) onDone();
    } catch {}
  };

  const handleKey = (e: any) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  };

  const displayName = user?.user_metadata?.full_name || user?.name || user?.email || "?";
  
  return (
    <div style={{ ...css.composer, ...(compact ? css.composerCompact : {}), ...(focused ? css.composerFocused : {}) }}>
      {quoteOf && (
        <div style={css.quotePreview}>
          <span style={css.quotePreviewLabel}>Quoting</span>
          <p style={css.quotePreviewContent}>"{quoteOf.content?.slice(0, 80)}{quoteOf.content?.length > 80 ? '…' : ''}"</p>
          <span style={css.quotePreviewAuthor}>@{quoteOf.username}</span>
        </div>
      )}
      {replyTo && (
        <p style={css.replyingTo}>↩ replying to thread</p>
      )}
      <div style={css.composerInner}>
        <div style={css.avatar}>{displayName?.[0]?.toUpperCase() ?? '?'}</div>
        <textarea
          style={css.textarea}
          placeholder={replyTo ? 'Drop a reply…' : quoteOf ? 'Add your take…' : "What's on the decks?"}
          value={content}
          onChange={e => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          maxLength={MAX}
          rows={compact ? 2 : 3}
        />
      </div>
      <div style={css.composerFooter}>
        <span style={{ ...css.charCount, color: remaining < 50 ? (remaining < 10 ? '#EF4444' : '#F59E0B') : '#444' }}>
          {remaining}
        </span>
        {error && <span style={{ color: '#EF4444', fontSize: 12 }}>{error}</span>}
        <button
          style={{ ...css.postBtn, opacity: (!content.trim() || loading) ? 0.4 : 1 }}
          onClick={submit}
          disabled={!content.trim() || loading}
        >
          {loading ? '…' : replyTo ? 'REPLY' : quoteOf ? 'QUOTE' : 'POST'}
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, index, onPatch, isComment = false }: any) {
  const { reshare, loading: reshareLoading } = useComposer();
  const { liked, count: likeCount, toggle: toggleLike } = useLike(post.viewer_liked, post.like_count);
  const [showComments, setShowComments] = useState(false);
  const [showQuoteComposer, setShowQuoteComposer] = useState(false);
  const [reshared, setReshared] = useState(false);
  const [localReshareCount, setLocalReshareCount] = useState(post.reshare_count);

  const isReshare = post.post_type === 'reshare';
  const isQuoted  = post.post_type === 'quoted_reshare';
  const hasMedia  = post.media_urls && JSON.parse(post.media_urls || '[]').length > 0;
  const mediaUrls = hasMedia ? JSON.parse(post.media_urls) : [];

  const handleReshare = async () => {
    if (reshareLoading) return;
    const next = !reshared;
    setReshared(next);
    setLocalReshareCount(c => next ? c + 1 : Math.max(0, c - 1));
    try { await reshare(post.id); }
    catch { setReshared(!next); setLocalReshareCount(c => !next ? c + 1 : Math.max(0, c - 1)); }
  };

  const animDelay = \`\${Math.min(index * 40, 300)}ms\`;

  return (
    <article
      style={{
        ...css.card,
        ...(isComment ? css.cardComment : {}),
        animationDelay: animDelay,
      }}
      className="post-card"
    >
      {isReshare && (
        <div style={css.reshareTag}>
          <Repeat style={css.reshareIcon} />
          <span style={css.reshareAuthor}>@{post.username} reshared</span>
        </div>
      )}

      <div style={css.cardHeader}>
        <div style={css.avatar}>{post.display_name?.[0]?.toUpperCase() ?? '?'}</div>
        <div style={css.authorBlock}>
          <span style={css.displayName}>{post.display_name ?? post.username}</span>
          <span style={css.username}>@{post.username}</span>
        </div>
        <time style={css.timestamp}>{formatTime(post.created_at)}</time>
      </div>

      {post.content && (
        <p style={css.content}>{post.content}</p>
      )}

      {mediaUrls.length > 0 && (
        <div style={{ ...css.mediaGrid, gridTemplateColumns: mediaUrls.length === 1 ? '1fr' : '1fr 1fr' }}>
          {mediaUrls.slice(0, 4).map((url: string, i: number) => (
            <img key={i} src={url} alt="" style={css.mediaImg} loading="lazy" />
          ))}
        </div>
      )}

      {(isQuoted || post.quoted_post) && post.quoted_post && (
        <div style={css.quotedPost}>
          <div style={css.quotedHeader}>
            <div style={{ ...css.avatar, ...css.avatarSm }}>{post.quoted_post.display_name?.[0]?.toUpperCase() ?? '?'}</div>
            <span style={css.quotedAuthor}>{post.quoted_post.display_name ?? post.quoted_post.username}</span>
            <span style={{ ...css.username, fontSize: 11 }}>@{post.quoted_post.username}</span>
          </div>
          <p style={css.quotedContent}>{post.quoted_post.content}</p>
        </div>
      )}

      {!isComment && (
        <div style={css.actions}>
          <button
            style={{ ...css.actionBtn, color: liked ? '#F43F5E' : '#555' }}
            onClick={() => toggleLike(post.id)}
          >
            <Heart size={16} fill={liked ? '#F43F5E' : 'none'} color={liked ? '#F43F5E' : '#555'} />
            <span style={css.actionCount}>{likeCount}</span>
          </button>

          <button
            style={{ ...css.actionBtn, color: showComments ? '#A78BFA' : '#555' }}
            onClick={() => setShowComments(s => !s)}
          >
            <MessageSquare size={16} />
            <span style={css.actionCount}>{post.comment_count}</span>
          </button>

          <button
            style={{ ...css.actionBtn, color: reshared ? '#34D399' : '#555' }}
            onClick={handleReshare}
          >
            <Repeat size={16} />
            <span style={css.actionCount}>{localReshareCount}</span>
          </button>

          <button
            style={{ ...css.actionBtn, color: showQuoteComposer ? '#60A5FA' : '#555' }}
            onClick={() => setShowQuoteComposer(s => !s)}
          >
            <Quote size={16} />
          </button>
        </div>
      )}

      {showQuoteComposer && (
        <Composer
          quoteOf={post}
          compact
          onDone={() => setShowQuoteComposer(false)}
          onPost={() => setShowQuoteComposer(false)}
        />
      )}

      {showComments && <CommentsDrawer postId={post.id} />}
    </article>
  );
}

function CommentsDrawer({ postId }: { postId: string }) {
  const { comments, loading, appendComment } = usePostComments(postId);
  const { user } = useAuth();

  return (
    <div style={css.commentsDrawer}>
      <div style={css.drawerLine} />
      {loading && <p style={css.drawerLoading}>loading…</p>}
      {comments.map((comment: any) => (
        <div key={comment.id}>
          <PostCard post={comment} isComment />
          {comment.replies?.map((reply: any) => (
            <div key={reply.id} style={css.nestedReply}>
              <PostCard post={reply} isComment />
            </div>
          ))}
        </div>
      ))}
      {user && (
        <div style={{ marginTop: 12 }}>
            <Composer replyTo={postId} compact onPost={appendComment} />
        </div>
      )}
    </div>
  );
}

function usePostComments(postId: string) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId || !user) return;
    setLoading(true);
    const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
    fetch(\`\${API}/api/social/posts/\${postId}/comments?limit=30\`, {
      headers: user?.id ? { 'X-Actor-Id': user.id } : {},
    })
      .then(r => r.json())
      .then((d: any) => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId, user]);

  const appendComment = useCallback((comment: any) => {
    setComments(prev => [...prev, { ...comment, replies: [] }]);
  }, []);

  return { comments, loading, appendComment };
}

function SkeletonCard() {
  return (
    <div style={{ ...css.card, animation: 'none' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...css.avatar, background: '#1A1A1A', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={skeletonBar(120, 13)} />
          <div style={{ ...skeletonBar(80, 11), marginTop: 4 }} />
        </div>
      </div>
      <div style={skeletonBar('80%', 14)} />
      <div style={{ ...skeletonBar('60%', 14), marginTop: 6 }} />
    </div>
  );
}

function skeletonBar(w: any, h: any): any {
  return { height: h, width: w, background: '#1A1A1A', borderRadius: 4, animation: 'shimmer 1.5s infinite' };
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'now';
  if (diffMin < 60) return \`\${diffMin}m\`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return \`\${diffH}h\`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return \`\${diffD}d\`;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

const css: any = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '0 0 80px',
    fontFamily: FONT_BODY,
    background: '#09090b',
    minHeight: '100vh',
    color: '#E5E5E5',
    paddingTop: '32px'
  },
  masthead: {
    padding: '0 20px 20px',
    borderBottom: '3px solid #E5E5E5',
    marginBottom: 20,
  },
  mastheadTag: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    color: '#555',
    letterSpacing: '.1em',
    display: 'block',
    marginBottom: 4,
  },
  mastheadTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 64,
    letterSpacing: '-.02em',
    lineHeight: 1,
    color: '#FFFFFF',
    margin: 0,
  },
  tabRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '0 20px',
    borderBottom: '1px solid #1F1F1F',
    marginBottom: 8,
    position: 'relative',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 16px 10px 0',
    fontFamily: FONT_MONO,
    fontSize: 12,
    letterSpacing: '.08em',
    color: '#555',
    cursor: 'pointer',
    marginRight: 16,
    transition: 'color .15s, border-color .15s',
  },
  tabActive: {
    color: '#E5E5E5',
    borderBottomColor: '#E5E5E5',
  },
  tabDivider: { flex: 1 },

  composer: {
    margin: '0 20px 16px',
    background: '#111',
    border: '1px solid #1F1F1F',
    borderRadius: 12,
    padding: 14,
    transition: 'border-color .15s',
  },
  composerCompact: {
    margin: '12px 0 0',
    borderRadius: 8,
  },
  composerFocused: {
    borderColor: '#eab308',
  },
  composerInner: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#E5E5E5',
    fontFamily: FONT_BODY,
    fontSize: 14,
    lineHeight: 1.6,
    resize: 'none',
    width: '100%',
  },
  composerFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #1A1A1A',
  },
  charCount: {
    fontFamily: FONT_MONO,
    fontSize: 11,
    marginRight: 'auto',
  },
  postBtn: {
    background: '#E5E5E5',
    color: '#0A0A0A',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 18px',
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'opacity .15s, transform .2s ease',
  },
  quotePreview: {
    background: '#0F0F0F',
    border: '1px solid #222',
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 10,
  },
  quotePreviewLabel: { fontSize: 10, color: '#555', fontFamily: FONT_MONO, letterSpacing: '.08em', display: 'block', marginBottom: 4 },
  quotePreviewContent: { fontSize: 12, color: '#999', margin: '0 0 4px', lineHeight: 1.4 },
  quotePreviewAuthor: { fontSize: 11, color: '#555', fontFamily: FONT_MONO },
  replyingTo: { fontSize: 11, color: '#555', fontFamily: FONT_MONO, margin: '0 0 10px' },

  feed: { display: 'flex', flexDirection: 'column' },
  loadingPulse: { display: 'flex', flexDirection: 'column', gap: 1 },
  endNote: { textAlign: 'center', color: '#333', fontFamily: FONT_MONO, fontSize: 11, letterSpacing: '.1em', padding: '24px 0 8px' },
  emptyState: { textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 32, color: '#2A2A2A' },

  card: {
    padding: '16px 20px',
    borderBottom: '1px solid #141414',
    background: '#0a0a0a',
    animation: 'fadeUp .3s ease both',
    transition: 'background .1s',
  },
  cardComment: {
    padding: '12px 16px',
    borderBottom: 'none',
    borderLeft: '2px solid #1A1A1A',
    marginLeft: 28,
    background: '#0D0D0D',
    animation: 'none',
    marginTop: '6px',
    borderRadius: '8px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reshareTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 38,
  },
  reshareIcon: { color: '#34D399', width: 14, height: 14 },
  reshareAuthor: { fontSize: 11, color: '#555', fontFamily: FONT_MONO },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#1A1A1A',
    border: '1px solid #222',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: '#E5E5E5',
    flexShrink: 0,
    fontFamily: FONT_DISPLAY,
    letterSpacing: '.05em',
  },
  avatarSm: { width: 22, height: 22, fontSize: 10 },
  authorBlock: { flex: 1, display: 'flex', alignItems: 'baseline', gap: 8 },
  displayName: { fontWeight: 700, fontSize: 14, color: '#E5E5E5', fontFamily: FONT_BODY },
  username: { fontSize: 12, color: '#444', fontFamily: FONT_MONO },
  timestamp: { fontSize: 11, color: '#333', fontFamily: FONT_MONO, flexShrink: 0 },
  content: { fontSize: 15, lineHeight: 1.65, color: '#D1D5DB', margin: '0 0 12px', wordBreak: 'break-word', fontFamily: 'Inter' },
  mediaGrid: { display: 'grid', gap: 2, marginBottom: 12, borderRadius: 8, overflow: 'hidden' },
  mediaImg: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' },

  quotedPost: {
    border: '1px solid #222',
    borderRadius: 6,
    padding: '10px 14px',
    marginBottom: 12,
    background: '#0F0F0F',
  },
  quotedHeader: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 },
  quotedAuthor: { fontSize: 13, fontWeight: 600, color: '#C4C4C4' },
  quotedContent: { fontSize: 13, color: '#777', lineHeight: 1.5, margin: 0, fontFamily: 'Inter' },

  actions: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
    marginLeft: -4,
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px 6px 4px',
    borderRadius: 20,
    fontFamily: FONT_MONO,
    fontSize: 12,
    transition: 'color .15s, transform .1s ease-in',
  },
  actionCount: { fontSize: 12, fontFamily: FONT_MONO, fontWeight: 600 },

  commentsDrawer: {
    marginTop: 12,
    paddingTop: 12,
  },
  drawerLine: { height: 1, background: '#1A1A1A', marginBottom: 12 },
  drawerLoading: { color: '#333', fontSize: 12, fontFamily: FONT_MONO, padding: '8px 0' },
  nestedReply: { marginLeft: 20, borderLeft: '1px solid #1A1A1A', paddingLeft: '8px' },
};
