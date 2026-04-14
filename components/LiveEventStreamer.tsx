import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { Flame, ShoppingBag, UserPlus, Heart } from 'lucide-react';

const API_URL = '';

const LiveEventStreamer: React.FC = () => {
    useEffect(() => {
        let lastEventId: string | null = null;

        const fetchLatestEvents = async () => {
            try {
                // We'll fetch the latest public notifications or posts
                const res = await fetch(`${API_URL}/api/community/posts?feed=latest&limit=1`);
                const data = await res.json();
                
                if (data.posts && data.posts.length > 0) {
                    const latest = data.posts[0];
                    if (latest.id !== lastEventId) {
                        if (lastEventId !== null) { // Don't toast on first load
                            toast.custom((t) => (
                                <div className="glass-card border border-white/10 p-4 rounded-2xl flex items-center gap-4 bg-[#0B0B0F]/90 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right duration-500">
                                    <div className="w-10 h-10 rounded-full border border-brand-purple overflow-hidden flex-shrink-0">
                                        <img src={latest.author_avatar || ''} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-black text-white">{latest.author_name}</span>
                                            {latest.is_marketplace === 1 ? (
                                                <span className="bg-brand-cyan/20 text-brand-cyan text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1">
                                                    <ShoppingBag size={8} /> Marketplace
                                                </span>
                                            ) : (
                                                <span className="bg-brand-purple/20 text-brand-purple text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1">
                                                    <Flame size={8} /> Fresh Drop
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-400 line-clamp-1 italic">
                                            "{latest.content?.substring(0, 40)}..."
                                        </p>
                                    </div>
                                    <button onClick={() => toast.dismiss(t)} className="text-gray-600 hover:text-white transition">
                                        <Heart size={14} />
                                    </button>
                                </div>
                            ), {
                                duration: 5000,
                                position: 'bottom-right'
                            });
                        }
                        lastEventId = latest.id;
                    }
                }
            } catch (e) {
                // Silently skip
            }
        };

        const interval = setInterval(fetchLatestEvents, 15000); // Check every 15s
        fetchLatestEvents();

        return () => clearInterval(interval);
    }, []);

    return null; // This component doesn't render anything itself, it just fires toasts
};

export default LiveEventStreamer;
