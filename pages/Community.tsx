import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageSquare, Share2, Image as ImageIcon, Send, Music, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Post {
    id: string;
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
}

const Community: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [isMarketplace, setIsMarketplace] = useState(false);
    const [price, setPrice] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const API_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_URL}/api/community/posts`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
            }
        } catch (e) {
            console.error("Failed to load posts", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!isAuthenticated) return toast.error('You must be logged in to post');
        if (!newPostContent.trim()) return;

        try {
            const res = await fetch(`${API_URL}/api/community/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.id,
                    content: newPostContent,
                    is_marketplace: isMarketplace,
                    price: price
                })
            });

            if (res.ok) {
                toast.success('Post created!');
                setNewPostContent('');
                setIsMarketplace(false);
                setPrice(0);
                fetchPosts();
            } else {
                toast.error('Failed to create post');
            }
        } catch (e) {
            toast.error('Network error. Please try again.');
        }
    };

    const handleLike = async (postId: string) => {
        if (!isAuthenticated) return toast.error('Please log in to like posts');
        
        // Optimistic UI update
        setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));

        try {
            await fetch(`${API_URL}/api/community/likes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId, user_id: user?.id })
            });
        } catch (e) {
            toast.error("Failed to like post");
            fetchPosts(); // Revert
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 relative">
            
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black font-display uppercase text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">
                    DJ Community Hub
                </h1>
                <p className="text-gray-400">Connect, trade, and share with DJs across East Africa.</p>
            </div>

            {/* Create Post Box */}
            <div className="glass-card rounded-2xl p-6 mb-10 shadow-lg border border-white/5 relative z-10">
                <div className="flex gap-4">
                    <img 
                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=random`}
                        className="w-12 h-12 rounded-full hidden sm:block object-cover border border-brand-purple/50" 
                        alt="You"
                    />
                    <div className="flex-1">
                        <textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="What's going on in the scene? Got gear to sell?"
                            className="w-full bg-[#0B0B0F]/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple resize-none"
                            rows={3}
                        />
                        
                        {isMarketplace && (
                            <div className="mt-3 flex items-center gap-3 animate-in slide-in-from-top-2">
                                <label className="text-sm text-brand-cyan font-bold p-2 bg-brand-cyan/10 rounded-lg">
                                    KES Price:
                                </label>
                                <input 
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(Number(e.target.value))}
                                    className="bg-[#0B0B0F]/50 border border-brand-cyan/50 rounded-lg p-2 text-white w-32 focus:outline-none"
                                    placeholder="0"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                            <div className="flex gap-2">
                                <button className="p-2 text-gray-400 hover:text-brand-purple hover:bg-white/5 rounded-lg transition">
                                    <ImageIcon size={20} />
                                </button>
                                <button 
                                    onClick={() => !isAuthenticated ? toast.error('Log in first') : setIsMarketplace(!isMarketplace)}
                                    className={`p-2 rounded-lg transition flex items-center gap-2 text-sm font-bold ${isMarketplace ? 'bg-brand-cyan/20 text-brand-cyan' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <ShieldCheck size={20} />
                                    Sell Gear / Music
                                </button>
                            </div>
                            
                            <button 
                                onClick={handleCreatePost}
                                disabled={!newPostContent.trim()}
                                className="bg-brand-purple text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-brand-purple/80 disabled:opacity-50 transition"
                            >
                                <Send size={16} /> Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feed timeline line */}
            <div className="absolute left-6 md:left-[3.25rem] top-48 bottom-0 w-px bg-gradient-to-b from-brand-purple/50 via-white/10 to-transparent -z-10"></div>

            {/* Feed display */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="text-center py-12 text-brand-purple animate-pulse">Loading feed...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No posts yet. Be the first!</div>
                ) : (
                    posts.map((post) => (
                        <div key={post.id} className="glass-card rounded-2xl p-5 border border-white/5 ml-0 sm:ml-6 hover:border-brand-purple/30 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={post.author_avatar || `https://ui-avatars.com/api/?name=${post.author_name}&background=random`} 
                                        className="w-10 h-10 rounded-full border border-gray-700"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-white leading-none">{post.author_name || 'Anonymous User'}</h3>
                                            {post.author_role === 'admin' && <span className="bg-brand-purple text-[9px] px-1.5 py-0.5 rounded font-black tracking-widest text-white uppercase">Admin</span>}
                                        </div>
                                        <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button className="text-xs text-brand-purple font-bold hover:underline">Follow</button>
                            </div>
                            
                            <p className="text-gray-300 text-sm whitespace-pre-wrap ml-[3.25rem] leading-relaxed mb-4">{post.content}</p>

                            {post.is_marketplace === 1 && (
                                <div className="ml-[3.25rem] mb-4 bg-gradient-to-r from-brand-cyan/20 to-[#0B0B0F] border border-brand-cyan/30 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-brand-cyan font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <ShieldCheck size={12}/> Escrow Protected Listing
                                        </div>
                                        <div className="text-2xl font-black text-white">KES {post.price.toLocaleString()}</div>
                                    </div>
                                    <button className="bg-brand-cyan text-[#0B0B0F] px-4 py-2 rounded-lg font-black text-sm uppercase shadow-lg shadow-brand-cyan/20 hover:scale-105 transition-transform">
                                        Buy Now
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-6 mt-4 ml-[3.25rem] border-t border-white/5 pt-4">
                                <button 
                                    onClick={() => handleLike(post.id)}
                                    className="flex items-center gap-2 text-gray-400 hover:text-brand-purple transition-colors text-sm"
                                >
                                    <Heart size={18} /> {post.likes_count || 0}
                                </button>
                                <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                                    <MessageSquare size={18} /> {post.comments_count || 0}
                                </button>
                                <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                                    <Share2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Community;
