import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '../components/user/UserAvatar';
import { MessageSquare, Heart, Repeat, ArrowRight, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Post {
  id: string;
  author_id: string;
  author_handle: string;
  author_name: string;
  author_avatar: string;
  author_verified: boolean;
  content: string;
  media_urls?: string;
  type: 'text' | 'media' | 'deal' | 'poll';
  hearts: number;
  echoes: number;
  comments_count: number;
  created_at: string;
}

const parseUTC = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);
    return new Date(dateStr.replace(' ', 'T') + 'Z');
};

const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - parseUTC(dateStr).getTime()) / 1000);
    if (seconds < 5) return 'now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
};

const CommunityPreview: React.FC = () => {
    const { session } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLatestPosts = async () => {
            setLoading(true);
            try {
                const url = `${import.meta.env.VITE_API_URL || '/api'}/pulses?vector=latest`;
                const headers: any = {};
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }
                const res = await fetch(url, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setPosts(Array.isArray(data) ? data.slice(0, 3) : []);
                }
            } catch (error) {
                console.error("Failed to fetch community preview", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLatestPosts();
    }, [session]);

    return (
        <section className="py-20 bg-[#0B0B0F] relative overflow-hidden">
            {/* Background elements to match the vibe */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[10px] font-black uppercase tracking-widest mb-4">
                            <TrendingUp size={12} /> Live Updates
                        </div>
                        <h2 className="text-3xl md:text-5xl font-outfit font-black text-white uppercase italic tracking-tighter">
                            DJ Flowerz <span className="text-brand-purple">Community</span>
                        </h2>
                        <p className="text-gray-400 mt-4 font-medium max-w-xl leading-relaxed">
                            Join the conversation. Share your mixes, discuss gear, and connect with other DJs and music enthusiasts.
                        </p>
                    </div>
                    <Link to="/community" className="btn-premium px-8 py-4 text-xs uppercase tracking-widest group shrink-0">
                        <span className="flex items-center gap-2">
                            Enter Community
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 border-t-2 border-brand-purple border-solid rounded-full animate-spin"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 bg-[#15151A] rounded-3xl border border-white/5">
                        <MessageSquare className="mx-auto text-gray-600 mb-4" size={48} />
                        <h3 className="text-white text-xl font-bold mb-2">No active discussions</h3>
                        <p className="text-gray-400">Be the first to start a conversation in the community.</p>
                        <Link to="/community" className="mt-6 inline-block text-brand-purple font-bold hover:underline">Go to Community Feed</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {posts.map((post) => (
                            <Link 
                                key={post.id} 
                                to={`/post/${post.id}`}
                                className="block bg-[#15151A] rounded-2xl border border-white/5 hover:border-brand-purple/30 transition-all p-6 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[40px] rounded-full group-hover:bg-brand-purple/10 transition-colors pointer-events-none" />
                                
                                <div className="flex items-start gap-4 mb-4 relative z-10">
                                    <UserAvatar src={post.author_avatar} name={post.author_name} size={12} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white truncate group-hover:text-brand-purple transition-colors">{post.author_name}</span>
                                            {post.author_verified && (
                                                <span className="text-blue-400" title="Verified">✓</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>@{post.author_handle}</span>
                                            <span>•</span>
                                            <span>{timeAgo(post.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="relative z-10">
                                    <p className="text-gray-300 text-sm line-clamp-3 mb-4 leading-relaxed break-words">
                                        {post.content}
                                    </p>
                                    
                                    <div className="flex items-center gap-6 text-gray-500 text-xs font-medium">
                                        <div className="flex items-center gap-1.5 hover:text-brand-pink transition-colors">
                                            <Heart size={14} />
                                            <span>{post.hearts || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
                                            <MessageSquare size={14} />
                                            <span>{post.comments_count || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 hover:text-brand-purple transition-colors">
                                            <Repeat size={14} />
                                            <span>{post.echoes || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default CommunityPreview;
