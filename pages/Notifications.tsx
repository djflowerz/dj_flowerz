import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Heart, MessageSquare, UserPlus, ShoppingBag, 
  Trash2, CheckCircle, Clock, ChevronRight, Filter,
  MoreVertical, ShieldCheck, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

interface Notification {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'marketplace' | 'system';
    actor_id: string;
    actor_name: string;
    actor_avatar: string;
    target_id: string; // post_id or order_id
    content: string;
    is_read: number;
    created_at: string;
}

const Notifications: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'social' | 'marketplace'>('all');

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/user/notifications`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            toast.error("Failed to sync notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/user/notifications/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
            }
        } catch {}
    };

    const markAllRead = async () => {
        if (!user) return;
        try {
            await fetch(`${API_URL}/api/user/notifications/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, all: true })
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            toast.success("All notifications caught up!");
        } catch {}
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const filteredNotifs = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'social') return ['follow', 'like', 'comment'].includes(n.type);
        if (filter === 'marketplace') return n.type === 'marketplace';
        return true;
    });

    const timeAgo = (dateStr: string) => {
        const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    if (!user) {
        return (
            <div className="pt-32 pb-20 min-h-screen bg-[#050507] flex items-center justify-center">
                <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Establishing Secure Uplink...</p>
            </div>
        );
    }

    return (
        <div className="pt-32 pb-24 min-h-screen bg-[#050507] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-cyan/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-4xl mx-auto px-6 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-purple shadow-[0_0_10px_#7C3AED]" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] font-display">Intelligence Feed</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-display font-black text-white italic tracking-tighter uppercase">
                            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">Briefing</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={markAllRead}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <CheckCircle size={14} /> Mark All Read
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                    {(['all', 'social', 'marketplace'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                                filter === t 
                                    ? 'bg-brand-purple text-white border-brand-purple shadow-lg shadow-brand-purple/20' 
                                    : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Notifications List */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center gap-4">
                                <Zap className="text-brand-purple animate-pulse" size={32} />
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Decrypting Signals...</p>
                            </div>
                        ) : filteredNotifs.length > 0 ? (
                            filteredNotifs.map((n) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={n.id}
                                    onClick={() => {
                                        markAsRead(n.id);
                                        // Navigation logic
                                        if (n.type === 'follow') window.location.href = `/@${n.actor_name}`;
                                        else if (n.type === 'marketplace') window.location.href = `/escrow-mngt`;
                                        else if (n.target_id) window.location.href = `/community?post=${n.target_id}`;
                                    }}
                                    className={`group relative glass-card rounded-2xl border transition-all cursor-pointer ${
                                        !n.is_read 
                                            ? 'bg-brand-purple/5 border-brand-purple/30 shadow-[0_0_20px_rgba(124,58,237,0.05)]' 
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    {!n.is_read && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-brand-purple rounded-r-full" />
                                    )}

                                    <div className="p-5 flex items-start gap-4">
                                        {/* Actor Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <img loading="lazy" src={n.actor_avatar || `https://ui-avatars.com/api/?name=${n.actor_name}&background=7C3AED&color=fff`} 
                                                className="w-12 h-12 rounded-2xl object-cover border border-white/10 group-hover:scale-105 transition-transform" 
                                                alt={n.actor_name} 
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#050507] border border-white/10 flex items-center justify-center p-1">
                                                {n.type === 'follow' && <UserPlus size={12} className="text-brand-cyan" />}
                                                {n.type === 'like' && <Heart size={12} className="text-pink-500 fill-pink-500" />}
                                                {n.type === 'comment' && <MessageSquare size={12} className="text-brand-purple" />}
                                                {n.type === 'marketplace' && <ShoppingBag size={12} className="text-amber-500" />}
                                                {n.type === 'system' && <ShieldCheck size={12} className="text-emerald-500" />}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4 mb-1">
                                                <p className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors line-clamp-2">
                                                    <span className="font-black text-white italic mr-1">@{n.actor_name}</span>
                                                    {n.content}
                                                </p>
                                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter flex-shrink-0 whitespace-nowrap">
                                                    {timeAgo(n.created_at)}
                                                </span>
                                            </div>

                                            {/* Action Hints */}
                                            <div className="flex items-center gap-3 mt-3">
                                                <span className="text-[9px] font-black text-brand-purple uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 flex items-center gap-1">
                                                    Intercept Signal <ChevronRight size={10} />
                                                </span>
                                            </div>
                                        </div>

                                        {/* Options */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                            className="p-2 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-24 text-center glass-card rounded-2xl border border-white/5 italic">
                                <Bell className="mx-auto text-gray-800 mb-4" size={40} />
                                <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px]">Frequency Silent. No New Signals.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Support Link */}
                <div className="mt-12 p-8 glass-card rounded-[2rem] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-sm uppercase tracking-tight">Security & Privacy</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">End-to-End protocol active</p>
                        </div>
                    </div>
                    <Link to="/support" className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all">
                        Contact Support
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
