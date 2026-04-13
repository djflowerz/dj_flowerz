import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    Heart, MessageSquare, Share2, Image as ImageIcon, Send,
    ShieldCheck, MoreHorizontal, Trash2, Flame, Clock,
    Users, ShoppingBag, UserPlus, UserCheck, X, ChevronDown, Loader
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

// ─── Types ────────────────────────────────────────────────────────
interface Post {
    id: string;
    user_id: string;
    author_name: string;
    author_avatar: string;
    author_role: string;
    content: string;
    image_url: string | null;
    is_marketplace: number;
    price: number;
    escrow_status: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    _liked?: boolean;
}

interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    author_name: string;
    author_avatar: string;
    content: string;
    created_at: string;
}

type FeedTab = 'latest' | 'trending' | 'following' | 'marketplace';

// ─── Helpers ──────────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
};

const Avatar = ({ src, name, size = 10 }: { src?: string; name?: string; size?: number }) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
    return (
        <img
            src={src || fallback}
            onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
            className={`w-${size} h-${size} rounded-full object-cover border border-white/10 flex-shrink-0`}
            alt={name}
        />
    );
};

// ─── PostCard ─────────────────────────────────────────────────────
const PostCard: React.FC<{
    post: Post;
    currentUserId?: string;
    currentUser?: any;
    onDelete: (id: string) => void;
}> = ({ post, currentUserId, currentUser, onDelete }) => {
    const [liked, setLiked] = useState(post._liked || false);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const isOwnPost = currentUserId === post.user_id;

    // Check if we already follow this user
    useEffect(() => {
        if (!currentUserId || isOwnPost) return;
        fetch(`${API_URL}/api/community/follows?followerId=${currentUserId}&followingId=${post.user_id}`)
            .then(r => r.json())
            .then(d => setIsFollowing(d.isFollowing))
            .catch(() => {});
    }, [currentUserId, post.user_id]);

    const handleLike = async () => {
        if (!currentUserId) return toast.error('Log in to like posts');
        const next = !liked;
        setLiked(next);
        setLikesCount(c => c + (next ? 1 : -1));
        try {
            const res = await fetch(`${API_URL}/api/community/likes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: post.id, user_id: currentUserId })
            });
            const data = await res.json();
            setLiked(data.liked);
            setLikesCount(data.count);
        } catch {
            setLiked(!next);
            setLikesCount(c => c + (next ? -1 : 1));
        }
    };

    const loadComments = async () => {
        if (commentsLoaded) return;
        try {
            const res = await fetch(`${API_URL}/api/community/comments?postId=${post.id}`);
            const data = await res.json();
            setComments(data);
            setCommentsLoaded(true);
        } catch {}
    };

    const toggleComments = () => {
        const next = !showComments;
        setShowComments(next);
        if (next) loadComments();
    };

    const submitComment = async () => {
        if (!currentUserId) return toast.error('Log in to comment');
        if (!commentText.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/community/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_id: post.id,
                    user_id: currentUserId,
                    author_name: currentUser?.name,
                    author_avatar: currentUser?.avatarUrl,
                    content: commentText.trim()
                })
            });
            const data = await res.json();
            if (data.comment) {
                setComments(prev => [...prev, data.comment]);
                setCommentText('');
            }
        } catch {
            toast.error('Failed to post comment');
        }
    };

    const handleFollow = async () => {
        if (!currentUserId) return toast.error('Log in to follow users');
        setFollowLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/community/follows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    follower_id: currentUserId,
                    following_id: post.user_id,
                    following_name: post.author_name,
                    following_avatar: post.author_avatar
                })
            });
            const data = await res.json();
            setIsFollowing(data.followed);
            toast.success(data.followed ? `Following ${post.author_name}` : `Unfollowed ${post.author_name}`);
        } catch {
            toast.error('Failed to update follow');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/community`;
        navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await fetch(`${API_URL}/api/community/posts?id=${post.id}&userId=${currentUserId}`, { method: 'DELETE' });
            onDelete(post.id);
            toast.success('Post deleted');
        } catch {
            toast.error('Failed to delete post');
        }
    };

    return (
        <div className="glass-card rounded-2xl border border-white/5 hover:border-brand-purple/20 transition-colors overflow-hidden">
            {/* Post Header */}
            <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                    <Link to={`/@${post.user_id}`}>
                        <Avatar src={post.author_avatar} name={post.author_name} size={11} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/@${post.user_id}`} className="font-bold text-white text-sm hover:text-brand-purple transition">
                                {post.author_name || 'DJ User'}
                            </Link>
                            {post.author_role === 'admin' && (
                                <span className="bg-brand-purple/20 text-brand-purple text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase">Admin</span>
                            )}
                            {post.is_marketplace === 1 && (
                                <span className="bg-brand-cyan/10 text-brand-cyan text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase flex items-center gap-1">
                                    <ShieldCheck size={9} /> Selling
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-gray-500">{timeAgo(post.created_at)} ago</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isOwnPost && (
                        <button
                            onClick={handleFollow}
                            disabled={followLoading}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition ${
                                isFollowing
                                    ? 'bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-white/10'
                                    : 'bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30 border border-brand-purple/30'
                            }`}
                        >
                            {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                    <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-white p-1 rounded-lg transition">
                            <MoreHorizontal size={18} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-8 w-40 glass-card rounded-xl border border-white/5 py-1 z-50 shadow-xl">
                                <button onClick={handleShare} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                                    <Share2 size={14} /> Copy Link
                                </button>
                                {isOwnPost && (
                                    <button onClick={handleDelete} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition">
                                        <Trash2 size={14} /> Delete Post
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Post Content */}
            {post.content && (
                <p className="px-5 pb-3 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
            )}

            {/* Post Image */}
            {post.image_url && (
                <img src={post.image_url} className="w-full max-h-96 object-cover" alt="post" />
            )}

            {/* Marketplace Card */}
            {post.is_marketplace === 1 && (
                <div className="mx-5 mb-3 mt-1 bg-gradient-to-br from-brand-cyan/10 to-brand-purple/10 border border-brand-cyan/25 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] text-brand-cyan font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                            <ShieldCheck size={11} /> Escrow Protected
                        </div>
                        <div className="text-2xl font-black text-white">KES {(post.price || 0).toLocaleString()}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Funds held safely until delivery confirmed</div>
                    </div>
                    <button
                        onClick={() => !currentUserId ? toast.error('Log in to buy') : toast.info('Escrow checkout coming soon!')}
                        className="bg-gradient-to-r from-brand-cyan to-brand-purple text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-transform"
                    >
                        Buy Now
                    </button>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 px-4 py-3 border-t border-white/5">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        liked ? 'text-red-400 bg-red-400/10' : 'text-gray-400 hover:text-red-400 hover:bg-red-400/5'
                    }`}
                >
                    <Heart size={17} className={liked ? 'fill-red-400' : ''} />
                    <span>{likesCount}</span>
                </button>

                <button
                    onClick={toggleComments}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                    <MessageSquare size={17} />
                    <span>{post.comments_count || 0}</span>
                </button>

                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all ml-auto"
                >
                    <Share2 size={17} />
                </button>
            </div>

            {/* Comments section */}
            {showComments && (
                <div className="border-t border-white/5 bg-black/10 px-5 py-4 space-y-4">
                    {comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <Avatar src={c.author_avatar} name={c.author_name} size={8} />
                            <div className="flex-1">
                                <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-2.5">
                                    <span className="font-bold text-xs text-white mr-2">{c.author_name}</span>
                                    <span className="text-sm text-gray-300">{c.content}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 ml-2">{timeAgo(c.created_at)} ago</span>
                            </div>
                        </div>
                    ))}

                    {/* Comment input */}
                    <div className="flex gap-3 pt-1">
                        {currentUser && <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={8} />}
                        <div className="flex-1 flex gap-2">
                            <input
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && submitComment()}
                                placeholder="Write a comment..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-500"
                            />
                            <button
                                onClick={submitComment}
                                className="w-9 h-9 bg-brand-purple text-white rounded-full flex items-center justify-center hover:bg-brand-purple/80 transition flex-shrink-0"
                            >
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Post Composer ────────────────────────────────────────────────
const PostComposer: React.FC<{ user: any; onPost: (post: Post) => void }> = ({ user, onPost }) => {
    const [content, setContent] = useState('');
    const [isMarketplace, setIsMarketplace] = useState(false);
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!content.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/community/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    author_name: user.name,
                    author_avatar: user.avatarUrl,
                    author_role: user.role,
                    content: content.trim(),
                    is_marketplace: isMarketplace,
                    price: isMarketplace ? Number(price) : 0
                })
            });
            const data = await res.json();
            if (data.post) {
                onPost(data.post);
                setContent('');
                setIsMarketplace(false);
                setPrice('');
                toast.success('Posted!');
            } else {
                toast.error('Failed to post');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-2xl border border-white/5 p-5 mb-6">
            <div className="flex gap-3">
                <Avatar src={user.avatarUrl} name={user.name} size={11} />
                <div className="flex-1">
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="What's happening in the scene? Share a mix, gear, or news..."
                        className="w-full bg-transparent text-white text-sm placeholder-gray-500 outline-none resize-none min-h-[80px]"
                        rows={3}
                    />

                    {isMarketplace && (
                        <div className="flex items-center gap-3 py-3 border-t border-white/5 mt-2">
                            <ShieldCheck size={16} className="text-brand-cyan" />
                            <span className="text-sm text-brand-cyan font-bold">Listing Price (KES):</span>
                            <input
                                type="number"
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                placeholder="0"
                                className="bg-white/10 border border-brand-cyan/50 rounded-lg px-3 py-1.5 text-white text-sm w-32 focus:outline-none focus:border-brand-cyan"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <div className="flex gap-2">
                            <button className="p-2 text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 rounded-lg transition" title="Add Image">
                                <ImageIcon size={18} />
                            </button>
                            <button
                                onClick={() => setIsMarketplace(!isMarketplace)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    isMarketplace ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <ShoppingBag size={15} />
                                {isMarketplace ? 'Selling Gear' : 'Sell Gear'}
                            </button>
                        </div>

                        <button
                            onClick={submit}
                            disabled={!content.trim() || loading}
                            className="bg-brand-purple text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-brand-purple/80 disabled:opacity-50 transition"
                        >
                            {loading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                            Post
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Community Page ──────────────────────────────────────────
const Community: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<FeedTab>('latest');
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const loaderRef = useRef<HTMLDivElement>(null);

    const fetchPosts = useCallback(async (tab: FeedTab, cursor?: string | null) => {
        try {
            if (!cursor) setIsLoading(true);
            else setLoadingMore(true);

            let url = `${API_URL}/api/community/posts?feed=${tab}`;
            if (tab === 'following' && user?.id) url += `&followerId=${user.id}`;
            if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

            const res = await fetch(url);
            const data = await res.json();

            if (cursor) {
                setPosts(prev => [...prev, ...(data.posts || [])]);
            } else {
                setPosts(data.posts || []);
            }
            setNextCursor(data.nextCursor || null);
        } catch {
            toast.error('Failed to load feed');
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchPosts(activeTab);
    }, [activeTab, fetchPosts]);

    // Infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && nextCursor && !loadingMore) {
                    fetchPosts(activeTab, nextCursor);
                }
            },
            { threshold: 0.1 }
        );
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [nextCursor, loadingMore, activeTab, fetchPosts]);

    const handleNewPost = (post: Post) => {
        setPosts(prev => [post, ...prev]);
    };

    const handleDeletePost = (id: string) => {
        setPosts(prev => prev.filter(p => p.id !== id));
    };

    const tabs = [
        { id: 'latest' as FeedTab, label: 'Latest', icon: <Clock size={15} /> },
        { id: 'trending' as FeedTab, label: 'Trending', icon: <Flame size={15} /> },
        { id: 'following' as FeedTab, label: 'Following', icon: <Users size={15} /> },
        { id: 'marketplace' as FeedTab, label: 'Marketplace', icon: <ShoppingBag size={15} /> },
    ];

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">
                    DJ Community
                </h1>
                <p className="text-gray-400 text-sm mt-2">East Africa's DJ scene — share, trade, and connect.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl mb-6 sticky top-20 z-30 backdrop-blur-xl border border-white/5">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { if (activeTab !== tab.id) { setActiveTab(tab.id); setPosts([]); } }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Composer (logged in users only) */}
            {isAuthenticated && user && (
                <PostComposer user={user} onPost={handleNewPost} />
            )}

            {!isAuthenticated && (
                <div className="glass-card rounded-2xl border border-brand-purple/20 p-6 mb-6 text-center">
                    <p className="text-gray-300 text-sm mb-4">Join the conversation — log in to post, follow DJs, and trade gear.</p>
                    <Link to="/login" className="bg-brand-purple text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-brand-purple/80 transition inline-block">
                        Log In / Sign Up
                    </Link>
                </div>
            )}

            {/* Feed */}
            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card rounded-2xl border border-white/5 p-5 animate-pulse">
                            <div className="flex gap-3 mb-4">
                                <div className="w-11 h-11 rounded-full bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-white/10 rounded w-1/3" />
                                    <div className="h-2 bg-white/5 rounded w-1/4" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded" />
                                <div className="h-3 bg-white/10 rounded w-5/6" />
                            </div>
                        </div>
                    ))
                ) : posts.length === 0 ? (
                    <div className="text-center py-16">
                        {activeTab === 'following' ? (
                            <>
                                <Users size={40} className="mx-auto mb-4 text-gray-600" />
                                <p className="text-gray-500">Follow some DJs to see their posts here.</p>
                            </>
                        ) : (
                            <>
                                <MessageSquare size={40} className="mx-auto mb-4 text-gray-600" />
                                <p className="text-gray-500">No posts yet. Be the first!</p>
                            </>
                        )}
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUserId={user?.id}
                            currentUser={user}
                            onDelete={handleDeletePost}
                        />
                    ))
                )}

                {/* Infinite scroll trigger */}
                <div ref={loaderRef} className="py-4 text-center">
                    {loadingMore && (
                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                            <Loader size={16} className="animate-spin" /> Loading more...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Community;
