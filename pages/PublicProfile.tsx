/**
 * DJ Flowerz — Public Profile Page  (@username)
 *
 * Aesthetic: underground music zine — off-white/cream light theme,
 * bold condensed Barlow display type, thick ruled lines, stark ink-on-paper.
 * Feels like a DJ's press kit or a music blog feature page.
 *
 * Usage:
 *   <PublicProfile username="djflowerz" />
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProfile, useProfilePosts, useProfileEdit } from '../hooks/useProfile';
import { useComposer, useLike } from '../hooks/useSocial';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const DISPLAY = "'Barlow Condensed', 'Impact', sans-serif";
const BODY    = "'Barlow', 'Helvetica Neue', sans-serif";
const MONO    = "'DM Mono', monospace";

const TIER_COLORS: Record<string, string> = {
  SPARK:  '#D97706',
  GROOVE: '#7C3AED',
  VIBE:   '#059669',
  LEGEND: '#DC2626',
};

// ─── PublicProfileWrapper ───────────────────────────────────────────
export default function PublicProfile() {
    const { username } = useParams<{ username: string }>();
    if (!username) return null;
    return <PublicProfileContent username={username} />;
}

// ─── PublicProfileContent ────────────────────────────────────────────────────────────

function PublicProfileContent({ username }: { username: string }) {
  const { profile, stats, viewer, loading, error, following, followLoading, toggleFollow } = useProfile(username);
  const { user } = useAuth();
  const [tab, setTab] = useState('posts');
  const [showEdit, setShowEdit] = useState(false);

  if (loading && !profile) return <ProfileSkeleton />;
  if (error) return <div style={css.errorState}><p style={css.errorText}>User not found.</p></div>;
  if (!profile) return null;

  const isOwner = viewer.is_owner || (user && user.id === profile.id);
  const tierColor = TIER_COLORS[profile.aura_tier] ?? TIER_COLORS.SPARK;

  return (
    <div style={css.page}>
      {/* Banner */}
      <div style={css.bannerWrap}>
        {profile.banner_url
          ? <img loading="lazy" src={profile.banner_url} alt="" style={css.bannerImg} />
          : <div style={css.bannerPlaceholder} />
        }
        <div style={css.bannerOverlay} />
      </div>

      {/* Identity block */}
      <div style={css.identityWrap}>
        <div style={css.avatarOuter}>
          <div style={{ ...css.avatar, borderColor: tierColor }}>
            {profile.avatar_url
              ? <img loading="lazy" src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <span style={{ fontFamily: DISPLAY, fontSize: 40, color: '#1A1A1A', fontWeight: 900 }}>
                  {profile.display_name?.[0]?.toUpperCase() ?? profile.username?.[0]?.toUpperCase() ?? '?'}
                </span>
            }
          </div>
          {/* Tier badge */}
          <div style={{ ...css.tierBadge, background: tierColor }}>
            {profile.aura_tier}
          </div>
        </div>

        {/* Name + actions */}
        <div style={css.nameRow}>
          <div>
            <div style={css.nameBlock}>
              <h1 style={css.displayName}>{profile.display_name ?? profile.username}</h1>
              {profile.is_verified === 1 && <span style={css.verifiedBadge} title="Verified">✦</span>}
            </div>
            <p style={css.handle}>@{profile.username}</p>
          </div>

          {isOwner ? (
            <button style={css.editBtn} onClick={() => setShowEdit(true)}>Edit profile</button>
          ) : user ? (
            <button
              style={{ ...css.followBtn, ...(following ? css.followingBtn : {}) }}
              onClick={toggleFollow}
              disabled={followLoading}
            >
              {followLoading ? '…' : following ? 'Following' : 'Follow'}
            </button>
          ) : null}
        </div>

        {/* Bio */}
        {profile.bio && <p style={css.bio}>{profile.bio}</p>}

        {/* Meta */}
        <div style={css.metaRow}>
          {profile.location && <span style={css.metaItem}>◉ {profile.location}</span>}
          {profile.website  && <a href={profile.website} style={css.metaLink} target="_blank" rel="noopener noreferrer">⟡ {profile.website.replace(/^https?:\/\//, '')}</a>}
          <span style={css.metaItem}>◈ Joined {formatJoined(profile.joined_at)}</span>
        </div>

        {/* Stats */}
        <div style={css.statsRow}>
          <StatBtn value={stats.followers} label="followers" />
          <StatBtn value={stats.following} label="following" />
          <StatBtn value={stats.posts}     label="posts" />
          <StatBtn value={stats.total_likes} label="likes received" />
        </div>
      </div>

      {/* Divider */}
      <div style={css.ruleDivider} />

      {/* Tab bar */}
      <div style={css.tabBar}>
        {['posts', 'replies', 'media', 'likes'].map(t => (
          <button
            key={t}
            style={{ ...css.tabBtn, ...(tab === t ? css.tabBtnActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Post feed */}
      <PostGrid
        username={username}
        type={tab === 'likes' ? 'likes' : tab}
        isLikes={tab === 'likes'}
      />

      {/* Edit modal */}
      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} profile={profile} />}
    </div>
  );
}

// ─── PostGrid ─────────────────────────────────────────────────────────────────

function PostGrid({ username, type, isLikes }: { username: string, type: string, isLikes: boolean }) {
  const { posts, loading, loadingMore, hasMore, loadMore, patchPost } = useProfilePosts(username, isLikes ? 'posts' : type);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(e => { if (e[0].isIntersecting) loadMore(); }, { rootMargin: '300px' });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  if (loading && !posts.length) return (
    <div style={css.postList as any}>
      {[1,2,3].map(i => <PostSkeleton key={i} />)}
    </div>
  );

  if (!posts.length && !loading) return (
    <div style={css.emptyState as any}>
      <span style={css.emptyGlyph}>◌</span>
      <p style={css.emptyText}>Nothing here yet.</p>
    </div>
  );

  return (
    <div style={css.postList as any}>
      {posts.map((post, i) => (
        <ProfilePostCard
          key={post.id || i}
          post={post}
          index={i}
          onPatch={patchPost}
        />
      ))}
      {loadingMore && <PostSkeleton />}
      {!hasMore && posts.length > 0 && <p style={css.endLine as any}>— end —</p>}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </div>
  );
}

// ─── ProfilePostCard ──────────────────────────────────────────────────────────

function ProfilePostCard({ post, index, onPatch }: { post: any, index: number, onPatch: any }) {
  const { reshare, loading: reshareLoading } = useComposer();
  const { liked, count: likeCount, toggle: toggleLike } = useLike(post.id, post.viewer_liked, post.likes_count || post.like_count);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [reshared, setReshared] = useState(false);
  const [reshareCount, setReshareCount] = useState(post.reshare_count || 0);

  const mediaUrls = (() => { try { return typeof post.media_urls === 'string' ? JSON.parse(post.media_urls || '[]') : post.media_urls || []; } catch { return []; } })();
  const isReshare = post.post_type === 'reshare' || post.parent_id;

  const handleReshare = async () => {
    if (reshareLoading) return;
    const next = !reshared;
    setReshared(next);
    setReshareCount((c: number) => next ? c + 1 : Math.max(0, c - 1));
    try { await reshare(post.id); toast.success("Reshared!"); }
    catch { setReshared(!next); setReshareCount((c: number) => !next ? c + 1 : Math.max(0, c - 1)); }
  };

  return (
    <article style={{ ...css.postCard, animationDelay: `${Math.min(index * 35, 200)}ms` }}>
      {isReshare && (
        <p style={css.reshareLabel as any}>↺ reshared</p>
      )}

      {post.content && <p style={css.postContent}>{post.content}</p>}

      {mediaUrls && mediaUrls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: mediaUrls.length === 1 ? '1fr' : '1fr 1fr', gap: 2, marginBottom: 12, borderRadius: 4, overflow: 'hidden' }}>
          {mediaUrls.slice(0, 4).map((url: string, i: number) => (
            <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} loading="lazy" />
          ))}
        </div>
      )}

      {post.quoted_post && (
        <div style={css.quotedPost}>
          <p style={css.quotedAuthor}>@{post.quoted_post.username}</p>
          <p style={css.quotedContent}>{post.quoted_post.content}</p>
        </div>
      )}
      
      {post.parent_id && !post.quoted_post && (
        <div style={css.quotedPost}>
          <p style={css.quotedAuthor}>@{post.parent_author_name}</p>
          <p style={css.quotedContent}>{post.parent_content}</p>
        </div>
      )}

      {/* Footer */}
      <div style={css.postFooter}>
        <time style={css.postTime}>{formatTime(post.created_at)}</time>
        <div style={css.postActions}>
          <ActionBtn icon={liked ? '♥' : '♡'} count={likeCount} active={liked} activeColor="#DC2626" onClick={toggleLike} />
          <ActionBtn icon="◎" count={post.comments_count || post.comment_count} onClick={() => setShowCommentBox(s => !s)} active={showCommentBox} activeColor="#7C3AED" />
          <ActionBtn icon="↺" count={reshareCount} active={reshared} activeColor="#059669" onClick={handleReshare} />
        </div>
      </div>

      {showCommentBox && <InlineCommentBox postId={post.id} onDone={() => setShowCommentBox(false)} />}
    </article>
  );
}

// ─── InlineCommentBox ─────────────────────────────────────────────────────────

function InlineCommentBox({ postId, onDone }: { postId: string, onDone: () => void }) {
  const { post: submitComment, loading } = useComposer(postId);
  const { user } = useAuth();
  const [text, setText] = useState('');

  const submit = async () => {
    if (!text.trim() || loading) return;
    try { await submitComment(text, []); setText(''); onDone?.(); }
    catch {}
  };

  return (
    <div style={css.commentBox}>
      <textarea
        style={css.commentInput as any}
        placeholder="Write a reply…"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={2}
        maxLength={500}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
        <button style={css.cancelBtn} onClick={onDone}>Cancel</button>
        <button style={{ ...css.replyBtn, opacity: (!text.trim() || loading) ? 0.5 : 1 }} onClick={submit} disabled={!text.trim() || loading}>
          {loading ? '…' : 'Reply'}
        </button>
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({ onClose, profile }: { onClose: () => void, profile: any }) {
  const { update, loading, error, success } = useProfileEdit();
  const [form, setForm] = useState({
    display_name: profile.display_name ?? '',
    bio:          profile.bio ?? '',
    location:     profile.location ?? '',
    website:      profile.website ?? '',
    username:     profile.username ?? '',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    try { await update(form); onClose(); } catch {}
  };

  return (
    <div style={css.modalBackdrop as any} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={css.modal as any}>
        <div style={css.modalHeader}>
          <h2 style={css.modalTitle as any}>Edit profile</h2>
          <button style={css.modalClose} onClick={onClose}>×</button>
        </div>

        <div style={css.modalBody}>
          <Field label="Username" max={30} current={form.username.length}>
            <input style={css.input} value={form.username} onChange={e => set('username', e.target.value)} maxLength={30} placeholder="handle" />
          </Field>
          <Field label="Display name" max={50} current={form.display_name.length}>
            <input style={css.input} value={form.display_name} onChange={e => set('display_name', e.target.value)} maxLength={50} placeholder="Your name" />
          </Field>
          <Field label="Bio" max={160} current={form.bio.length}>
            <textarea style={{ ...css.input, minHeight: 80, resize: 'vertical' } as any} value={form.bio} onChange={e => set('bio', e.target.value)} maxLength={160} placeholder="Tell the scene about yourself…" />
          </Field>
          <Field label="Location">
            <input style={css.input} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Nairobi, Kenya" />
          </Field>
          <Field label="Website">
            <input style={css.input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yoursite.com" />
          </Field>

          {error   && <p style={{ color: '#DC2626', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
          {success && <p style={{ color: '#059669', fontSize: 13, margin: '8px 0 0' }}>Saved!</p>}
        </div>

        <div style={css.modalFooter as any}>
          <button style={css.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{ ...css.saveBtn, opacity: loading ? 0.5 : 1 }} onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function StatBtn({ value, label }: { value: number, label: string }) {
  return (
    <div style={css.statItem as any}>
      <span style={css.statValue as any}>{(value ?? 0).toLocaleString()}</span>
      <span style={css.statLabel}>{label}</span>
    </div>
  );
}

function ActionBtn({ icon, count, active, activeColor, onClick }: any) {
  return (
    <button style={{ ...css.actionBtn, color: active ? activeColor : '#999' } as any} onClick={onClick}>
      <span>{icon}</span>
      {count > 0 && <span style={{ fontSize: 11, fontFamily: MONO }}>{count}</span>}
    </button>
  );
}

function Field({ label, children, max, current }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={css.fieldLabel as any}>{label}</label>
        {max && <span style={{ fontSize: 11, color: '#999', fontFamily: MONO }}>{current ?? 0}/{max}</span>}
      </div>
      {children}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div style={css.page as any}>
      <div style={{ ...css.bannerPlaceholder, height: 140 } as any} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#E5E0D8', marginTop: -44, marginBottom: 12 }} />
        {[200, 120, 280].map((w, i) => (
          <div key={i} style={{ height: i === 0 ? 28 : 14, width: w, background: '#E5E0D8', borderRadius: 4, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E0D8' }}>
      {[280, 220, 160].map((w, i) => (
        <div key={i} style={{ height: 14, width: w, background: '#E5E0D8', borderRadius: 3, marginBottom: 8 }} />
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 60)   return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

function formatJoined(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    background: '#FAF7F2',
    minHeight: '100vh',
    fontFamily: BODY,
    color: '#1A1A1A',
    paddingBottom: 80,
  },
  errorState: { padding: 40, textAlign: 'center' as const },
  errorText:  { fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: '#999' },

  // Banner
  bannerWrap: { position: 'relative' as const, height: 140, overflow: 'hidden', background: '#1A1A1A' },
  bannerImg:  { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' },
  bannerPlaceholder: {
    width: '100%', height: 140,
    background: 'repeating-linear-gradient(45deg, #1A1A1A 0, #1A1A1A 2px, #222 2px, #222 12px)',
  },
  bannerOverlay: { position: 'absolute' as const, inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(250,247,242,0.3))' },

  // Identity
  identityWrap: { padding: '0 20px 20px' },
  avatarOuter:  { position: 'relative' as const, display: 'inline-block', marginTop: -44, marginBottom: 10 },
  avatar: {
    width: 88, height: 88, borderRadius: '50%',
    background: '#E5E0D8', border: '4px solid #FAF7F2',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  tierBadge: {
    position: 'absolute' as const, bottom: 0, right: -4,
    fontSize: 8, fontFamily: MONO, letterSpacing: '.08em',
    padding: '2px 5px', borderRadius: 3, color: '#fff', fontWeight: 700,
  },
  nameRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  nameBlock: { display: 'flex', alignItems: 'center', gap: 8 },
  displayName: { fontFamily: DISPLAY, fontSize: 36, fontWeight: 900, letterSpacing: '-.01em', margin: 0, lineHeight: 1, color: '#1A1A1A' },
  verifiedBadge: { fontSize: 16, color: '#D97706' },
  handle: { fontFamily: MONO, fontSize: 13, color: '#999', margin: 0 },
  bio: { fontSize: 15, lineHeight: 1.6, color: '#333', margin: '0 0 10px', maxWidth: 480 },
  metaRow: { display: 'flex', flexWrap: 'wrap' as const, gap: '4px 16px', marginBottom: 12 },
  metaItem: { fontSize: 12, color: '#999', fontFamily: MONO },
  metaLink: { fontSize: 12, color: '#D97706', fontFamily: MONO, textDecoration: 'none' },
  statsRow: { display: 'flex', gap: 20, flexWrap: 'wrap' as const },
  statItem: { display: 'flex', gap: 4, alignItems: 'baseline' },
  statValue: { fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#999', fontFamily: MONO },

  // Buttons
  followBtn: {
    padding: '8px 22px', borderRadius: 3,
    background: '#1A1A1A', color: '#FAF7F2',
    border: '2px solid #1A1A1A',
    fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: '.05em',
    cursor: 'pointer', transition: 'all .15s', flexShrink: 0,
  },
  followingBtn: { background: 'transparent', color: '#1A1A1A' },
  editBtn: {
    padding: '8px 18px', borderRadius: 3,
    background: 'transparent', color: '#1A1A1A',
    border: '2px solid #1A1A1A',
    fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: '.05em',
    cursor: 'pointer', flexShrink: 0,
  },

  // Divider + tabs
  ruleDivider: { height: 3, background: '#1A1A1A', margin: '4px 0 0' },
  tabBar: { display: 'flex', borderBottom: '1px solid #E5E0D8' },
  tabBtn: {
    flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
    borderBottom: '3px solid transparent', marginBottom: -1,
    fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, letterSpacing: '.05em',
    color: '#999', cursor: 'pointer', transition: 'color .15s, border-color .15s',
  },
  tabBtnActive: { color: '#1A1A1A', borderBottomColor: '#1A1A1A' },

  // Posts
  postList: { display: 'flex', flexDirection: 'column' },
  postCard: {
    padding: '16px 20px', borderBottom: '1px solid #E5E0D8',
    animation: 'fadeIn .25s ease both', background: '#FAF7F2',
    transition: 'background .1s',
  },
  reshareLabel: { fontFamily: MONO, fontSize: 11, color: '#999', margin: '0 0 8px' },
  postContent: { fontSize: 16, lineHeight: 1.65, color: '#1A1A1A', margin: '0 0 10px', wordBreak: 'break-word' as const },
  quotedPost: {
    border: '2px solid #E5E0D8', borderRadius: 4,
    padding: '10px 12px', marginBottom: 10, background: '#F5F0E8',
  },
  quotedAuthor: { fontFamily: MONO, fontSize: 11, color: '#999', margin: '0 0 4px' },
  quotedContent: { fontSize: 13, color: '#555', margin: 0, lineHeight: 1.5 },
  postFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  postTime: { fontFamily: MONO, fontSize: 11, color: '#BBB' },
  postActions: { display: 'flex', gap: 4 },
  actionBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 8px', borderRadius: 20, fontSize: 14,
    transition: 'color .15s',
  },

  // Comment box
  commentBox: { marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E0D8' },
  commentInput: {
    width: '100%', background: '#F5F0E8', border: '1px solid #E5E0D8',
    borderRadius: 4, padding: '8px 12px', fontFamily: BODY, fontSize: 14,
    color: '#1A1A1A', outline: 'none', resize: 'none', boxSizing: 'border-box',
  },
  cancelBtn: {
    background: 'transparent', border: '1px solid #DDD', borderRadius: 3,
    padding: '6px 14px', fontFamily: BODY, fontSize: 13, color: '#999', cursor: 'pointer',
  },
  replyBtn: {
    background: '#1A1A1A', border: '1px solid #1A1A1A', borderRadius: 3,
    padding: '6px 14px', fontFamily: DISPLAY, fontSize: 14, letterSpacing: '.05em',
    color: '#FAF7F2', cursor: 'pointer', fontWeight: 700, transition: 'opacity .15s',
  },

  // Modal
  modalBackdrop: {
    position: 'fixed' as const, inset: 0, background: 'rgba(26,26,26,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: 20,
  },
  modal: {
    background: '#FAF7F2', borderRadius: 6, width: '100%', maxWidth: 440,
    border: '3px solid #1A1A1A', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: '2px solid #1A1A1A',
  },
  modalTitle: { fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '.02em' },
  modalClose: {
    background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
    color: '#555', lineHeight: 1, padding: '0 4px',
  },
  modalBody: { padding: '20px 20px 12px' },
  modalFooter: {
    display: 'flex', gap: 8, justifyContent: 'flex-end',
    padding: '12px 20px', borderTop: '1px solid #E5E0D8',
  },
  saveBtn: {
    background: '#1A1A1A', color: '#FAF7F2', border: 'none', borderRadius: 3,
    padding: '8px 20px', fontFamily: DISPLAY, fontSize: 15, fontWeight: 700,
    letterSpacing: '.05em', cursor: 'pointer', transition: 'opacity .15s',
  },
  input: {
    width: '100%', background: '#FFF', border: '1px solid #DDD',
    borderRadius: 3, padding: '8px 12px', fontFamily: BODY, fontSize: 14,
    color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' as const,
  },
  fieldLabel: { fontFamily: DISPLAY, fontSize: 13, fontWeight: 700, letterSpacing: '.05em', color: '#1A1A1A' },

  // Empty + end states
  emptyState: { padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  emptyGlyph: { fontSize: 32, color: '#CCC' },
  emptyText:  { fontFamily: MONO, fontSize: 13, color: '#BBB' },
  endLine:    { textAlign: 'center' as const, fontFamily: MONO, fontSize: 11, color: '#CCC', letterSpacing: '.1em', padding: '20px 0' },
};
