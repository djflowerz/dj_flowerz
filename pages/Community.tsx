import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    Heart, MessageSquare, Share2, Image as ImageIcon, Send, RefreshCw,
    ShieldCheck, MoreHorizontal, Trash2, Flame, Clock,
    Users, ShoppingBag, UserPlus, UserCheck, X, ChevronDown, Loader,
    Zap, Crown, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileToR2 } from '../utils/r2';
import { useFeed, useComposer, useLike, useFollow, usePost } from '../hooks/useSocial';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_WORKER_URL || import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
console.log('[Community] API URL being used:', API_URL);

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
    if (user.username && user.username.trim()) return user.username.trim();
    const name = user.display_name || user.name || 'user';
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${slug}-${user.id.substring(0, 8)}`;
};


const Avatar = ({ src, name, size = 10 }: { src?: string; name?: string; size?: number }) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
    return (
        <img loading="lazy" src={src || fallback}
            onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
            className={`w-${size} h-${size} rounded-full object-cover border border-white/10 flex-shrink-0`}
            alt={name}
        />
    );
};

// ─── PostCard ─────────────────────────────────────────────────────
// ─── PostCard ─────────────────────────────────────────────────────
const PostCard: React.FC<{
    post: Post;
    currentUserId?: string;
    currentUser?: any;
    onDelete: (id: string) => void;
}> = ({ post, currentUserId, currentUser, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showEscrowModal, setShowEscrowModal] = useState(false);
    const [shippingAddress, setShippingAddress] = useState('');
    const [isBuying, setIsBuying] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerAmount, setOfferAmount] = useState('');
    const [isOffering, setIsOffering] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    useClickOutside(menuRef, () => setShowMenu(false));

    const { session } = useAuth();
    const isOwnPost = currentUserId === post.author_id;
    const { liked, count: likesCount, toggle: toggleLike } = useLike(!!post.viewer_liked, post.like_count ?? post.likes_count ?? 0);
    const { following: isFollowing, toggle: toggleFollow, loading: followLoading } = useFollow(post.author_id);
    const { reshare, comment: addComment } = useComposer();
    const { comments, appendComment, loading: commentsLoading } = usePost(post.id);

    const handleLike = () => {
        if (!currentUserId) return toast.error('Log in to like posts');
        toggleLike(post.id);
    };

    const handleFollow = () => {
        if (!currentUserId) return toast.error('Log in to follow users');
        toggleFollow();
    };

    const handleReshare = async () => {
        if (!currentUserId) return toast.error('Log in to reshare');
        if (window.confirm('Reshare this broadcast?')) {
            try {
                await reshare(post.id);
                toast.success('Broadcast reshared!');
            } catch (err: any) {
                toast.error(err.message || 'Transmission failed');
            }
        }
    };

    const submitComment = async () => {
        if (!currentUserId) return toast.error('Log in to comment');
        if (!commentText.trim()) return;
        try {
            const commentData = await addComment({ content: commentText.trim(), reply_to_id: post.id });
            if (commentData) {
                appendComment(commentData);
                setCommentText('');
                toast.success('Comment pulsed!');
            }
        } catch (err: any) {
            toast.error(err.message || 'Comment failed');
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/community?post=${post.id}`;
        navigator.clipboard.writeText(url).then(() => toast.success('Frequency copied!'));
    };

    const handleDelete = async () => {
        if (!window.confirm('Erase this broadcast?')) return;
        try {
            await fetch(`${API_URL}/api/social/posts/${post.id}?userId=${currentUserId}`, { 
                method: 'DELETE', 
                headers: { 'X-Actor-Id': currentUserId || '' } 
            });
            onDelete(post.id);
            toast.success('Broadcast erased');
        } catch {
            toast.error('Deletion failed');
        }
    };

    return (
        <div className="glass-card rounded-2xl border border-white/5 hover:border-brand-purple/20 transition-all duration-300 overflow-hidden group mb-6 shadow-2xl">
            {/* Post Header */}
            <div className="flex items-start justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                    <Link to={`/community/@${post.author_username || profileSlug({ id: post.author_id, name: post.author_name })}`} className="relative group/avatar">
                        <Avatar src={post.author_avatar} name={post.author_name} size={11} />
                        <div className="absolute inset-0 rounded-full border-2 border-brand-purple opacity-0 group-hover/avatar:opacity-100 transition-opacity" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/community/@${post.author_username || profileSlug({ id: post.author_id, name: post.author_name })}`} className="font-bold text-white text-sm hover:text-brand-purple transition">
                                {post.author_name}
                            </Link>
                            {post.author_role === 'admin' && (
                                <ShieldCheck size={14} className="text-brand-purple" />
                            )}
                            {post.is_marketplace === 1 && (
                                <div className="bg-brand-cyan/10 text-brand-cyan text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase flex items-center gap-1 border border-brand-cyan/20">
                                    <ShoppingBag size={10} /> Marketplace
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span>@{post.author_username || 'user'}</span>
                            <span>•</span>
                            <span>{timeAgo(post.created_at)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isOwnPost && (
                        <button
                            onClick={handleFollow}
                            disabled={followLoading}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${
                                isFollowing
                                    ? 'bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-white/10'
                                    : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 hover:scale-105 active:scale-95'
                            }`}
                        >
                            {isFollowing ? <UserCheck size={11} /> : <UserPlus size={11} />}
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 glass-panel rounded-xl border border-white/10 py-2 z-50 shadow-2xl animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => { handleShare(); setShowMenu(false); }} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                                    <Share2 size={16} /> Share Link
                                </button>
                                {isOwnPost && (
                                    <button onClick={() => { handleDelete(); setShowMenu(false); }} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition">
                                        <Trash2 size={16} /> Delete Broadcast
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Post Content */}
            {post.content && (
                <div className="px-5 pb-4 text-gray-100 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                    {post.content}
                </div>
            )}

            {/* Post Media */}
            {post.image_url && (
                <div className="px-5 pb-4">
                    <img 
                        src={post.image_url} 
                        className="w-full rounded-2xl object-cover border border-white/5 shadow-inner max-h-[500px]" 
                        alt="media"
                        loading="lazy" 
                    />
                </div>
            )}

            {/* Marketplace Card (Enhanced) */}
            {post.is_marketplace === 1 && (
                <div className="mx-5 mb-5 p-5 glass-panel rounded-2xl border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/5 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-[10px] text-brand-cyan font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                <ShieldCheck size={12} /> Secure Escrow Deal
                            </div>
                            <div className="text-3xl font-black text-white tracking-tighter">
                                KES {(post.price || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowOfferModal(true)}
                                className="bg-white/5 text-gray-300 px-4 py-2.5 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/10 hover:text-white transition-all shadow-lg"
                            >
                                Offer
                            </button>
                            <button 
                                onClick={() => setShowEscrowModal(true)}
                                className="bg-gradient-to-r from-brand-cyan to-brand-purple text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-brand-cyan/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Buy Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Actions Bar */}
            <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2 bg-white/[0.01]">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        liked 
                            ? 'text-red-400 bg-red-400/10 border border-red-400/20' 
                            : 'text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition'
                    }`}
                >
                    <Heart size={18} className={liked ? 'fill-red-400 animate-bounce' : ''} />
                    <span>{likesCount}</span>
                </button>

                <button
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        showComments 
                            ? 'text-brand-purple bg-brand-purple/10 border border-brand-purple/20' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5 transition'
                    }`}
                >
                    <MessageSquare size={18} />
                    <span>{post.comment_count || post.comments_count || 0}</span>
                </button>

                <button
                    onClick={handleReshare}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-green-400 hover:bg-green-400/5 transition transition-all"
                >
                    <RefreshCw size={18} />
                    <span>{post.reshare_count || 0}</span>
                </button>

                <button
                    onClick={handleShare}
                    className="ml-auto p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition transition-all"
                >
                    <Share2 size={18} />
                </button>
            </div>

            {/* Comments Drawer */}
            {showComments && (
                <div className="border-t border-white/5 bg-black/20 p-5 space-y-5 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {commentsLoading ? (
                            <div className="flex justify-center py-4"><Loader className="animate-spin text-brand-purple" size={20} /></div>
                        ) : comments.length > 0 ? (
                            comments.map(c => (
                                <div key={c.id} className="flex gap-3 items-start animate-in slide-in-from-left-2 transition-all">
                                    <Avatar src={c.author_avatar} name={c.author_name} size={8} />
                                    <div className="flex-1">
                                        <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 border border-white/5">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-black text-[10px] text-brand-purple uppercase tracking-widest">{c.author_name}</span>
                                                <span className="text-[9px] text-gray-600">{timeAgo(c.created_at)}</span>
                                            </div>
                                            <p className="text-gray-200 text-xs leading-relaxed">{c.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-600 text-xs py-4">No pulses yet. Start the conversation.</p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        {currentUser && <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={9} />}
                        <div className="flex-1 flex gap-2">
                            <input
                                id="community-comment-input"
                                name="comment"
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && submitComment()}
                                placeholder="Write a response..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-purple transition-all placeholder-gray-600"
                            />
                            <button
                                onClick={submitComment}
                                className="bg-brand-purple text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-brand-purple/80 transition-all shadow-lg active:scale-90"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals (Escrow & Offer) */}
            {showEscrowModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md rounded-3xl border border-brand-cyan/30 p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <ShoppingBag className="text-brand-cyan" size={28} /> Confirm Deal
                            </h3>
                            <button onClick={() => setShowEscrowModal(false)} className="text-gray-500 hover:text-white transition"><X size={24} /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                <div className="flex justify-between mb-2"><span className="text-gray-400">Item</span><span className="text-white font-bold">{post.content?.substring(0,30)}...</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">Total Price</span><span className="text-brand-cyan font-black text-xl">KES {post.price.toLocaleString()}</span></div>
                            </div>
                            <textarea 
                                id="shipping-address-input"
                                name="shipping_address"
                                value={shippingAddress} 
                                onChange={e => setShippingAddress(e.target.value)}
                                placeholder="Enter Delivery Instructions / Preferred Pickup Location..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white text-sm focus:border-brand-cyan h-32 focus:outline-none"
                            />
                            <button 
                                onClick={async () => {
                                    if(!shippingAddress.trim()) return toast.error('Enter delivery address');
                                    setIsBuying(true);
                                    try {
                                        const res = await fetch(`${API_URL}/api/escrow/order`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'X-Actor-Id': currentUserId || '' },
                                            body: JSON.stringify({ post_id: post.id, shipping_address: shippingAddress })
                                        });
                                        if(res.ok) { toast.success('Order Securely Locked!'); setShowEscrowModal(false); }
                                        else toast.error('Transaction Failed');
                                    } finally { setIsBuying(false); }
                                }}
                                className="w-full bg-brand-cyan text-black font-black py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                            >
                                {isBuying ? <Loader className="animate-spin mx-auto" size={20} /> : 'Confirm & Hold Funds'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Offer Modal */}
            {showOfferModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="glass-card w-full max-w-md rounded-3xl border border-brand-purple/30 p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                <Zap className="text-brand-purple" size={28} /> Make an Offer
                            </h3>
                            <button onClick={() => setShowOfferModal(false)} className="text-gray-500 hover:text-white transition"><X size={24} /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                <p className="text-xs text-gray-400 mb-1 uppercase font-bold tracking-widest">Listing Price</p>
                                <p className="text-white font-black text-xl">KES {post.price?.toLocaleString() || '0'}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-brand-purple ml-1">Your Tactical Offer (KES)</label>
                                <input 
                                    id="offer-amount-input"
                                    name="offer_amount"
                                    type="number" 
                                    value={offerAmount} 
                                    onChange={e => setOfferAmount(e.target.value)}
                                    placeholder="Enter amount..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg font-black focus:border-brand-purple focus:outline-none"
                                />
                            </div>
                            <button 
                                onClick={async () => {
                                    if(!offerAmount || Number(offerAmount) <= 0) return toast.error('Enter a valid offer');
                                    setIsOffering(true);
                                    try {
                                        const res = await fetch(`${API_URL}/api/community/offers`, {
                                            method: 'POST',
                                            headers: { 
                                                'Content-Type': 'application/json', 
                                                'X-Actor-Id': currentUserId || '',
                                                'Authorization': `Bearer ${session?.access_token}`
                                            },
                                            body: JSON.stringify({ post_id: post.id, amount: Number(offerAmount) })
                                        });
                                        if(res.ok) { 
                                            toast.success('Offer Transmitted!', { description: 'The seller has been notified of your interest.' }); 
                                            setShowOfferModal(false); 
                                        } else {
                                            toast.error('Transmission Failure');
                                        }
                                    } finally { setIsOffering(false); }
                                }}
                                className="w-full bg-brand-purple text-white font-black py-4 rounded-2xl shadow-xl shadow-brand-purple/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                {isOffering ? <Loader className="animate-spin mx-auto" size={20} /> : 'Beam Offer to Seller'}
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
    const { session } = useAuth();
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

        // Fix 2 — guard: require valid auth token before posting
        if (!session?.access_token) {
            toast.error('Please log in again to post');
            return;
        }

        setLoading(true);
        try {
            let finalImageUrl = null;
            if (imageFile) {
                const upload = await uploadFileToR2(imageFile, 'community-posts');
                if (upload) finalImageUrl = upload.url;
            }

            const res = await fetch(`${API_URL}/api/social/posts`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-Actor-Id': user.id,
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    content: content.trim(),
                    media_urls: finalImageUrl ? [finalImageUrl] : [],
                    post_type: 'post',
                    is_marketplace: isMarketplace ? 1 : 0,
                    price: isMarketplace ? Number(price) : 0
                })
            });
            const data = await res.json();
            console.log('POST RESPONSE STATUS:', res.status);
            console.log('POST RESPONSE DATA:', data);

            // Fix 1 — handle multiple possible response shapes from the worker
            const newPost = data.post || data.data || data.result || (data.id ? data : null);

            if (res.ok && newPost) {
                onPost(newPost);
                setContent('');
                setIsMarketplace(false);
                setPrice('');
                setImageFile(null);
                setImagePreview(null);
                toast.success('Broadcast transmitted!');
            } else {
                console.error('Post failed:', data);
                toast.error(data.error || data.message || 'Transmission failed');
            }
        } catch {
            toast.error('Frequency unstable. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-[2rem] border border-white/5 p-6 mb-8 relative overflow-hidden group">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[50px] rounded-full group-focus-within:bg-brand-purple/10 transition-all" />
            
            <div className="flex gap-4 relative z-10">
                <Avatar src={user.avatarUrl} name={user.name} size={12} />
                <div className="flex-1">
                    <div className="relative">
                        <textarea
                            id="post-content-composer"
                            name="broadcast_content"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="What's hitting the speakers? Broadcast a mix, news, or set..."
                            className="w-full bg-transparent text-white text-base placeholder-white/20 outline-none resize-none min-h-[100px] font-medium py-2"
                            rows={3}
                        />
                    </div>

                    {imagePreview && (
                        <div className="relative mt-4 mb-4 rounded-2xl overflow-hidden border border-white/10 group/img shadow-2xl">
                            <img loading="lazy" src={imagePreview} className="w-full max-h-80 object-cover" alt="Preview" />
                            <button 
                                onClick={() => { setImageFile(null); setImagePreview(null); }}
                                className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-red-500 transition-all backdrop-blur-md active:scale-90"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {isMarketplace && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="flex items-center gap-4 py-4 border-t border-white/5 mt-2"
                        >
                            <div className="p-2.5 bg-brand-cyan/10 rounded-xl text-brand-cyan">
                                <ShieldCheck size={18} />
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Listing Price (KES)</span>
                                <input
                                    id="composer-price-input"
                                    name="listing_price"
                                    type="number"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm w-40 focus:outline-none focus:border-brand-cyan transition-all font-mono"
                                />
                            </div>
                        </motion.div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <div className="flex gap-2">
                            <input 
                                id="composer-file-input"
                                name="attachment"
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageSelect} 
                                accept="image/*"
                                className="hidden" 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className={`p-3 rounded-xl transition-all ${imageFile ? 'text-brand-purple bg-brand-purple/10 border border-brand-purple/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`} 
                                title="Add Visuals"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <button
                                onClick={() => setIsMarketplace(!isMarketplace)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isMarketplace ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <ShoppingBag size={16} />
                                {isMarketplace ? 'Marketplace Active' : 'Sell Equipment'}
                            </button>
                        </div>

                        <button
                            onClick={submit}
                            disabled={!content.trim() || loading}
                            className="bg-brand-purple text-white pl-6 pr-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-brand-purple/80 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all shadow-xl shadow-brand-purple/20"
                        >
                            {loading ? <Loader size={16} className="animate-spin" /> : <span>Broadcast</span>}
                            {!loading && <Send size={16} className="-rotate-12" />}
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
        <div className="glass-card rounded-[2rem] border border-white/5 p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[60px] rounded-full pointer-events-none" />
            
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse" />
                Network Expansion
            </h3>
            
            <div className="space-y-6">
                {suggested.map(s => (
                    <div key={s.id} className="flex items-center gap-4 group/item">
                        <Link to={`/community/@${profileSlug(s)}`} className="relative flex-shrink-0">
                            <img loading="lazy" src={s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=7C3AED&color=fff`}
                                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=7C3AED&color=fff`; }}
                                className="w-12 h-12 rounded-[1.2rem] object-cover border border-white/10 group-hover/item:border-brand-purple/50 transition-all duration-500 shadow-lg"
                                alt={s.name}
                            />
                            {s.role === 'admin' && (
                                <div className="absolute -top-1 -right-1 bg-brand-purple text-white p-1 rounded-lg shadow-xl border border-[#0B0B0F]">
                                    <Crown size={8} />
                                </div>
                            )}
                        </Link>
                        <div className="flex-1 min-w-0">
                            <Link to={`/@${profileSlug(s)}`} className="font-black text-white text-xs hover:text-brand-purple transition-all duration-300 truncate block uppercase tracking-tight">
                                {s.name}
                            </Link>
                            <span className="text-[10px] text-gray-600 font-bold block mt-0.5">{s.followers} followers</span>
                        </div>
                        <button
                            onClick={() => handleFollow(s)}
                            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                following[s.id]
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-white/5 text-white border border-white/10 hover:border-brand-purple/50 hover:bg-brand-purple/10 active:scale-90'
                            }`}
                            title={following[s.id] ? 'Following' : 'Follow DJ'}
                        >
                            {following[s.id] ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                        </button>
                    </div>
                ))}
            </div>

            {/* Community Stats */}
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 group/stat hover:bg-brand-purple/[0.03] transition-all">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Active Frequency</span>
                        <div className="flex gap-1">
                            <div className="w-1 h-3 bg-brand-purple/30 rounded-full animate-[pulse_1s_infinite]" />
                            <div className="w-1 h-4 bg-brand-purple/50 rounded-full animate-[pulse_1.2s_infinite]" />
                            <div className="w-1 h-3 bg-brand-purple/30 rounded-full animate-[pulse_0.8s_infinite]" />
                        </div>
                    </div>
                    <p className="text-white font-black text-sm uppercase tracking-tight">EA's Finest Scene</p>
                </div>
                
                <div className="text-center">
                    <button className="text-[9px] font-black text-brand-purple hover:text-white uppercase tracking-[0.3em] transition-all">
                        Discover More Signals
                    </button>
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
                        onClick={() => { if (activeTab !== tab.id) { setActiveTab(tab.id); } }}
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
