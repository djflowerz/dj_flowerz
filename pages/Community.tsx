import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    Heart, MessageSquare, Share2, Image as ImageIcon, Send, RefreshCw,
    ShieldCheck, MoreHorizontal, Trash2, Flame, Clock,
    Users, ShoppingBag, UserPlus, UserCheck, X, ChevronDown, Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileToR2 } from '../utils/r2';
import { useFeed, useComposer, useLike, useFollow, usePost } from '../hooks/useSocial';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

// Hook: close dropdown when clicking outside
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
    useEffect(() => {
        const listener = (e: MouseEvent) => {
            if (!ref.current || ref.current.contains(e.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
}

// ─── Types ────────────────────────────────────────────────────────
interface Post {
    id: string;
    author_id: string;
    author_name: string;
    author_avatar: string;
    author_username: string;
    author_role: string;
    display_name?: string; // New
    avatar_url?: string; // New
    username?: string; // New
    content: string;
    image_url: string | null;
    media_urls?: string; // New
    is_marketplace: number;
    price: number;
    escrow_status: string;
    like_count: number; // New
    comment_count: number; // New
    reshare_count: number;
    viewer_liked?: boolean; // New
    likes_count: number;
    comments_count: number;
    is_liked: number;
    created_at: string;
    parent_id: string | null;
    parent_author_name?: string;
    parent_author_avatar?: string;
    parent_author_username?: string;
    parent_content?: string;
    parent_image_url?: string;
    parent_created_at?: string;
    quoted_post?: any;
}


interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    author_name: string;
    author_avatar: string;
    author_username: string;
    content: string;
    created_at: string;
}

type FeedTab = 'latest' | 'trending' | 'following' | 'marketplace';

// ─── Helpers ──────────────────────────────────────────────────────
// D1 returns UTC timestamps without 'Z' — force UTC parsing to avoid +3hr offset
const parseUTC = (dateStr: string) => {
    if (!dateStr) return new Date();
    // If already has timezone info, use as-is
    if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);
    // SQLite format: '2026-04-13 19:22:07' → treat as UTC
    return new Date(dateStr.replace(' ', 'T') + 'Z');
};

const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - parseUTC(dateStr).getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
};

// Build a clean profile slug: prefer username, fallback to name-slug-id
const profileSlug = (user: { id: string; name?: string; username?: string; display_name?: string }) => {
    if (user.username && user.username.trim()) return `@${user.username.trim()}`;
    const name = user.display_name || user.name || 'user';
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${slug}-${user.id.substring(0, 8)}`;
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
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useClickOutside(menuRef, () => setShowMenu(false));

    const isOwnPost = currentUserId === post.author_id;
    const { liked, count: likesCount, toggle: toggleLike } = useLike(!!post.viewer_liked, post.like_count ?? 0);
    const { following: isFollowing, toggle: toggleFollow, loading: followLoading } = useFollow(post.author_id);

    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showEscrowModal, setShowEscrowModal] = useState(false);
    const [shippingAddress, setShippingAddress] = useState('');
    const [isBuying, setIsBuying] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [isOffering, setIsOffering] = useState(false);

    const handleLike = () => {
        if (!currentUserId) return toast.error('Log in to like posts');
        toggleLike(post.id);
    };

    const handleFollow = () => {
        if (!currentUserId) return toast.error('Log in to follow users');
        toggleFollow();
    };
    // handleLike and handleFollow moved to hooks above

    const { reshare, comment: addComment, loading: submittingComment } = useComposer();
    const handleReshare = async () => {
        if (!currentUserId) return toast.error('Log in to reshare');
        if (window.confirm('Reshare this post to your feed?')) {
            try {
                await reshare(post.id);
                toast.success('Reshared!');
            } catch (err: any) {
                toast.error(err.message || 'Failed to reshare');
            }
        }
    };

    const { reload: reloadAll, appendComment } = usePost(post.id);

    const submitComment = async () => {
        if (!currentUserId) return toast.error('Log in to comment');
        if (!commentText.trim()) return;
        try {
            const commentData = await addComment({ content: commentText.trim(), reply_to_id: post.id });
            if (commentData) {
                appendComment(commentData);
                setCommentText('');
                toast.success('Comment posted');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to post comment');
            toast.error('Failed to post comment');
        }
    };

    const handleFollowClick = () => {
        if (!currentUserId) return toast.error('Log in to follow users');
        toggleFollow();
    };

    const handleShare = () => {
        const url = `${window.location.origin}/community`;
        navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await fetch(`${API_URL}/api/social/posts/${post.id}?userId=${currentUserId}`, { method: 'DELETE', headers: { 'X-Actor-Id': currentUserId || '' } });
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
                    <Link to={`/@${profileSlug({ id: post.author_id, name: post.display_name || post.author_name, username: post.username || post.author_username })}`}>
                        <Avatar src={post.avatar_url || post.author_avatar} name={post.display_name || post.author_name} size={11} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/@${profileSlug({ id: post.author_id, name: post.display_name || post.author_name, username: post.username || post.author_username })}`} className="font-bold text-white text-sm hover:text-brand-purple transition">
                                {post.display_name || post.author_name || 'DJ User'}
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
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-white p-1 rounded-lg transition">
                            <MoreHorizontal size={18} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-8 w-40 glass-card rounded-xl border border-white/5 py-1 z-50 shadow-xl">
                                <button onClick={() => { handleShare(); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                                    <Share2 size={14} /> Copy Link
                                </button>
                                {isOwnPost && (
                                    <button onClick={() => { handleDelete(); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition">
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

            {/* Reshared Content Card */}
            {post.parent_id && (
                <div className="mx-5 mb-4 border border-white/5 bg-black/40 rounded-2xl p-4 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <Avatar src={post.parent_author_avatar} name={post.parent_author_name} size={6} />
                        <Link to={`/@${profileSlug({ id: post.parent_id || '', name: post.parent_author_name, username: post.parent_author_username })}`} className="font-bold text-xs text-brand-purple hover:underline">
                            {post.parent_author_name}
                        </Link>
                        <span className="text-[10px] text-gray-500">• {timeAgo(post.parent_created_at || post.created_at)}</span>
                    </div>
                    {post.parent_content && (
                        <p className="text-gray-300 text-xs line-clamp-3 mb-2">{post.parent_content}</p>
                    )}
                    {post.parent_image_url && (
                        <img src={post.parent_image_url} className="rounded-xl max-h-48 w-full object-cover border border-white/5" alt="Reshared" />
                    )}
                </div>
            )}

            {/* Post Image */}
            {post.image_url && !post.parent_id && (
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
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (!currentUserId) return toast.error('Log in to make an offer');
                                setShowOfferModal(true);
                            }}
                            className="bg-white/10 text-brand-cyan px-4 py-2.5 rounded-xl font-bold text-sm border border-brand-cyan/20 hover:bg-brand-cyan/20 transition-all"
                        >
                            Make Offer
                        </button>
                        <button
                            onClick={() => {
                                if (!currentUserId) return toast.error('Log in to buy');
                                setShowEscrowModal(true);
                            }}
                            className="bg-gradient-to-r from-brand-cyan to-brand-purple text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg hover:scale-105 transition-transform"
                        >
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
            )}

            {showEscrowModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="glass-card w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <ShoppingBag className="text-brand-cyan" size={24} /> Complete Purchase
                            </h3>
                            <button onClick={() => setShowEscrowModal(false)} className="text-gray-500 hover:text-white p-2">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-400 text-sm">Item</span>
                                <span className="text-white text-sm font-medium line-clamp-1">{post.content?.substring(0, 30)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 text-sm">Price</span>
                                <span className="text-brand-cyan font-bold">KES {post.price.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery Address / Notes</label>
                                <textarea
                                    value={shippingAddress}
                                    onChange={(e) => setShippingAddress(e.target.value)}
                                    placeholder="Enter your location or delivery instructions..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-brand-purple placeholder-gray-600 min-h-[100px]"
                                />
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl mb-6">
                                <ShieldCheck className="text-brand-cyan shrink-0" size={18} />
                                <p className="text-[10px] text-gray-300">
                                    Funds will be held by DJ Flowerz. Only release when you have received and verified the item.
                                </p>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!shippingAddress.trim()) return toast.error('Please enter delivery details');
                                    setIsBuying(true);
                                    try {
                                        const res = await fetch(`${API_URL}/api/escrow/order`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                                post_id: post.id,
                                                shipping_address: shippingAddress.trim()
                                            })
                                        });
                                        if (res.ok) {
                                            toast.success('Order placed! Funds held in escrow.');
                                            setShowEscrowModal(false);
                                        } else {
                                            const err = await res.json();
                                            toast.error(err.error || 'Failed to place order');
                                        }
                                    } catch {
                                        toast.error('Network error');
                                    } finally {
                                        setIsBuying(false);
                                    }
                                }}
                                disabled={isBuying}
                                className="w-full bg-gradient-to-r from-brand-cyan to-brand-purple text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-brand-purple/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isBuying ? <Loader size={20} className="animate-spin" /> : 'Confirm & Hold Funds'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showOfferModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Flame className="text-brand-purple" size={24} /> Make an Offer
                            </h3>
                            <button onClick={() => setShowOfferModal(false)} className="text-gray-500 hover:text-white p-2">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Enter the amount you're willing to pay. The seller will be notified to accept or reject.
                            </p>
                            
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 mb-2">
                                <div className="flex justify-between mb-1">
                                    <span className="text-gray-400 text-xs uppercase font-bold tracking-widest">Listing Price</span>
                                    <span className="text-white text-sm font-bold">KES {post.price.toLocaleString()}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Offer (KES)</label>
                                <input
                                    type="number"
                                    value={offerAmount}
                                    onChange={(e) => setOfferAmount(e.target.value)}
                                    placeholder="Enter amount..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-brand-purple"
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    if (!offerAmount || Number(offerAmount) <= 0) return toast.error('Enter a valid amount');
                                    setIsOffering(true);
                                    try {
                                        const res = await fetch(`${API_URL}/api/community/offers`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ 
                                                postId: post.id,
                                                amount: Number(offerAmount)
                                            })
                                        });
                                        if (res.ok) {
                                            toast.success('Offer submitted! Seller notified.');
                                            setShowOfferModal(false);
                                        } else {
                                            const err = await res.json();
                                            toast.error(err.error || 'Failed to submit offer');
                                        }
                                    } catch {
                                        toast.error('Network error');
                                    } finally {
                                        setIsOffering(false);
                                    }
                                }}
                                disabled={isOffering}
                                className="w-full bg-brand-purple text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-brand-purple/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isOffering ? <Loader size={20} className="animate-spin" /> : 'Send Offer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Actions */}
            <div className="flex items-center gap-1 px-4 py-3 border-t border-white/5">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        liked ? 'text-red-400 bg-red-400/10' : 'text-gray-400 hover:text-red-400 hover:bg-red-400/5'
                    }`}
                >
                    <Heart size={17} className={liked ? 'fill-red-400' : ''} />
                    <span>{likesCount}</span>
                </button>

                <button
                    onClick={toggleComments}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                    <MessageSquare size={17} />
                    <span>{post.comments_count || 0}</span>
                </button>

                <button
                    onClick={handleReshare}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-green-400 hover:bg-green-400/5 transition-all"
                >
                    <RefreshCw size={17} />
                    <span>{post.reshare_count || 0}</span>
                </button>

                <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all ml-auto"
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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) return toast.error("Image too large (Max 5MB)");
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const submit = async () => {
        if (!content.trim() && !imageFile) return;
        setLoading(true);
        try {
            let finalImageUrl = null;
            if (imageFile) {
                const upload = await uploadFileToR2(imageFile, 'community-posts');
                if (upload) finalImageUrl = upload.url;
            }

            const res = await fetch(`${API_URL}/api/social/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Actor-Id': user.id },
                body: JSON.stringify({
                    content: content.trim(),
                    media_urls: finalImageUrl ? [finalImageUrl] : [],
                    post_type: 'post',
                    is_marketplace: isMarketplace ? 1 : 0,
                    price: isMarketplace ? Number(price) : 0
                })
            });
            const data = await res.json();
            if (data.post) {
                onPost(data.post);
                setContent('');
                setIsMarketplace(false);
                setPrice('');
                setImageFile(null);
                setImagePreview(null);
                toast.success('Broadcast transmitted!');
            } else {
                toast.error('Transmission failed');
            }
        } catch {
            toast.error('Frequency unstable. Try again.');
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

                    {imagePreview && (
                        <div className="relative mt-2 mb-2 rounded-xl overflow-hidden border border-white/10 group">
                            <img src={imagePreview} className="w-full max-h-64 object-cover" alt="Preview" />
                            <button 
                                onClick={() => { setImageFile(null); setImagePreview(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

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
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageSelect} 
                                accept="image/*"
                                className="hidden" 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className={`p-2 rounded-lg transition ${imageFile ? 'text-brand-purple bg-brand-purple/10' : 'text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10'}`} 
                                title="Add Image"
                            >
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

// ─── People You May Know Sidebar ─────────────────────────────────
interface SuggestedUser {
    id: string;
    name: string;
    avatar_url: string;
    role: string;
    post_count: number;
    followers: number;
}

const SuggestedSidebar: React.FC<{ currentUser: any }> = ({ currentUser }) => {
    const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
    const [following, setFollowing] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuggested = async () => {
            try {
                const url = currentUser?.id
                    ? `/api/community/suggested?userId=${currentUser.id}&limit=6`
                    : `/api/community/suggested?limit=6`;
                const res = await fetch(url);
                const data = await res.json();
                setSuggested(data.suggested || []);
            } catch {
            } finally {
                setLoading(false);
            }
        };
        fetchSuggested();
    }, [currentUser?.id]);

    const handleFollow = async (s: SuggestedUser) => {
        if (!currentUser) return toast.error('Log in to follow users');
        const alreadyFollowing = following[s.id];
        setFollowing(prev => ({ ...prev, [s.id]: !alreadyFollowing }));
        try {
            const res = await fetch(`/api/community/follows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    follower_id: currentUser.id,
                    following_id: s.id,
                    following_name: s.name,
                    following_avatar: s.avatar_url
                })
            });
            const data = await res.json();
            setFollowing(prev => ({ ...prev, [s.id]: data.followed }));
        } catch {
            setFollowing(prev => ({ ...prev, [s.id]: alreadyFollowing }));
        }
    };

    if (loading) return (
        <div className="glass-card rounded-2xl border border-white/5 p-5 animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-white/10 rounded w-2/3" />
                        <div className="h-2 bg-white/5 rounded w-1/3" />
                    </div>
                </div>
            ))}
        </div>
    );

    if (suggested.length === 0) return null;

    return (
        <div className="glass-card rounded-2xl border border-white/5 p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <Users size={13} /> People You May Know
            </h3>
            <div className="space-y-4">
                {suggested.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                        <Link to={`/@${profileSlug(s)}`} className="flex-shrink-0">
                            <img
                                src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=7C3AED&color=fff`}
                                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=7C3AED&color=fff`; }}
                                className="w-10 h-10 rounded-full object-cover border border-white/10"
                                alt={s.name}
                            />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <Link to={`/@${profileSlug(s)}`} className="font-bold text-white text-sm hover:text-brand-purple transition truncate block">
                                {s.name}
                                {s.role === 'admin' && <span className="ml-1 text-[9px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded-full font-black">Admin</span>}
                            </Link>
                            <span className="text-[11px] text-gray-500">{s.followers} followers · {s.post_count} posts</span>
                        </div>
                        <button
                            onClick={() => handleFollow(s)}
                            className={`flex-shrink-0 text-[11px] font-black px-3 py-1.5 rounded-full transition ${
                                following[s.id]
                                    ? 'bg-white/5 text-gray-400 border border-white/10'
                                    : 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30 hover:bg-brand-purple/30'
                            }`}
                        >
                            {following[s.id] ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Community Stats */}
            <div className="mt-6 pt-4 border-t border-white/5">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                    <Flame size={13} /> Scene Activity
                </h3>
                <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex justify-between">
                        <span>Active DJs</span>
                        <span className="text-white font-bold">{suggested.length}+</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Community</span>
                        <span className="text-brand-cyan font-bold">EA's Finest</span>
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
    const {
        posts,
        loading: isLoading,
        loadingMore,
        hasMore,
        loadMore,
        refresh,
        prependPost
    } = useFeed(activeTab === 'latest' ? 'foryou' : activeTab);

    const loaderRef = useRef<HTMLDivElement>(null);

    // Infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, loadMore]);

    const handleNewPost = (post: any) => {
        prependPost(post);
    };

    const handleDeletePost = (id: string) => {
        // useFeed hook should ideally have a removePost method, or we just refresh
        refresh();
    };

    const tabs = [
        { id: 'latest' as FeedTab, label: 'Latest', icon: <Clock size={15} /> },
        { id: 'trending' as FeedTab, label: 'Trending', icon: <Flame size={15} /> },
        { id: 'following' as FeedTab, label: 'Following', icon: <Users size={15} /> },
        { id: 'marketplace' as FeedTab, label: 'Marketplace', icon: <ShoppingBag size={15} /> },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">
                    DJ Community
                </h1>
                <p className="text-gray-400 text-sm mt-2">East Africa's DJ scene — share, trade, and connect.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* ── Main Feed Column ── */}
                <div className="flex-1 min-w-0">

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
            </div>{/* end feed space-y-4 */}
        </div>{/* end main feed column */}

        {/* ── Sidebar Column ── */}
        <div className="lg:w-72 flex-shrink-0 space-y-5 lg:sticky lg:top-24">
            <SuggestedSidebar currentUser={user} />
        </div>
    </div>{/* end flex row */}
        </div>
    );
};

export default Community;
