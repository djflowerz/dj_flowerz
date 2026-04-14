/**
 * UserProfile.tsx
 * 
 * Command Center for DJ Flowerz users.
 * Features:
 * - Real-time subscription timer (Days left)
 * - Referral Wallet (KES balance)
 * - Referral Code & Sharing Hub
 * - Premium dark design with glassmorphism & Framer Motion
 */

import React, { useState, useEffect } from 'react';
import {
    Download, Users, TrendingUp, Heart, Star, Coins,
    CircleDashed, Copy, Share2, ExternalLink, Zap, Crown,
    Gift, AlertCircle, CheckCircle2, Info, Clock, Wallet, ArrowRight,
    User, MapPin, Globe, PenLine, Save, X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import UserInstallments from '../components/user/UserInstallments';
import ProductCard from '../components/ProductCard';
import { TrackRow } from '../components/music-pool/TrackRow';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke';

const UserProfile: React.FC = () => {
    const { user, loading: authLoading, refreshProfile } = useAuth();
    const { wishlist, products, poolTracks, mixtapes, toggleWishlist, isInWishlist } = useData();
    const [showMpesa, setShowMpesa] = useState(false);
    const [showTOS, setShowTOS] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'wishlist'>('dashboard');

    const restrictedHandles = ['admin', 'official', 'support', 'settings', 'account', 'profile', 'community', 'mixtapes', 'store', 'marketplace', 'bookings', 'music-pool'];

    // Form State
    const [editForm, setEditForm] = useState({
        name: user?.name || '',
        username: user?.username || '',
        bio: user?.bio || '',
        location: user?.location || '',
        avatar_url: user?.avatarUrl || ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setEditForm({
                name: user.name || '',
                username: user.username || '',
                bio: user.bio || '',
                location: user.location || '',
                avatar_url: user.avatarUrl || ''
            });
        }
    }, [user]);

    const handleUpdateProfile = async () => {
        if (!user) return;
        
        // Basic Validation
        if (editForm.username && editForm.username.length < 3) {
            toast.error("Handle too short", { description: "User handles must be at least 3 characters." });
            return;
        }

        if (restrictedHandles.includes(editForm.username.toLowerCase())) {
            toast.error("Handle Reserved", { description: "This handle is reserved for system use." });
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('sb-access-token');
            const res = await fetch(`${WORKER_URL}/api/community/profile/update`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast.success("Profile System Synchronized", {
                description: "Your digital identity has been updated across the network."
            });
            
            // Refresh user context to reflect changes immediately
            if (refreshProfile) await refreshProfile();
            
            setShowEditProfile(false);
        } catch (err: any) {
            toast.error("Protocol Error", {
                description: err.message || "Failed to sync profile data."
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-6">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="mb-8"
                >
                    <CircleDashed className="text-brand-purple" size={64} />
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs"
                >
                    Initializing Command Center...
                </motion.p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-2xl font-black mb-4">Command Center Access Denied</h2>
                <p className="text-gray-500 mb-8">Please establish a secure connection (Login) to access your DJ profile.</p>
                <a href="/login" className="px-8 py-4 bg-brand-purple rounded-2xl font-black uppercase tracking-widest text-xs">Login Protocol</a>
            </div>
        );
    }

    const copyRef = () => {
        if (!user.referralCode) return;
        navigator.clipboard.writeText(user.referralCode);
        toast.success("Referral code copied!", {
            description: "Share it with other DJs to earn KES & free days."
        });
    };

    const isSubscribed = user.isSubscriber || user.role === 'admin';

    // Calculate days left
    let daysLeft = 0;
    if (user.subscriptionExpiry) {
        try {
            const expiry = new Date(user.subscriptionExpiry);
            const now = new Date();
            if (!isNaN(expiry.getTime())) {
                const diffTime = expiry.getTime() - now.getTime();
                daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            }
        } catch (e) {
            console.error("Date parsing error:", e);
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-[#050507] text-white selection:bg-brand-purple/30 pb-20 pt-32 px-6 overflow-x-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-purple/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-6xl mx-auto relative z-10 space-y-12"
            >
                {/* ── Header Area ────────────────────────────────────────────────── */}
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-end gap-6 mb-4">
                    <div>
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-2 mb-2"
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/80">System Online</span>
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                            DJ <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple via-brand-pink to-brand-cyan">COMMAND</span> CENTER
                        </h1>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-xs text-white/30 font-mono">STATION: {user.name?.toUpperCase() || 'UNIT-01'}</p>
                        <p className="text-[10px] text-white/20 font-mono uppercase">
                            EST. {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'INITIALIZING...'}
                        </p>
                    </div>
                </motion.div>

                {/* ── Main Dashboard Header (Pool Pass) ────────────────────────── */}
                <motion.div
                    variants={itemVariants}
                    className={`relative overflow-hidden rounded-[3.5rem] p-1 shadow-2xl transition-all duration-700 ${isSubscribed
                        ? 'bg-gradient-to-br from-indigo-500/20 via-brand-purple/20 to-brand-pink/20'
                        : 'bg-white/5'
                        } border border-white/10`}
                >
                    <div className="bg-[#0B0B0F]/90 backdrop-blur-3xl rounded-[3.4rem] p-10 md:p-14 relative overflow-hidden">
                        {/* Internal Glows */}
                        <div className={`absolute top-0 right-0 w-[400px] h-[400px] blur-[100px] rounded-full -mr-32 -mt-32 transition-colors duration-1000 ${isSubscribed ? 'bg-brand-purple/20' : 'bg-white/5'}`} />

                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                            {/* Profile Info */}
                            <div className="lg:col-span-5 space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center p-1 border-2 ${isSubscribed ? 'border-brand-purple animate-pulse' : 'border-white/10'}`}>
                                            <div className="w-full h-full rounded-2xl bg-white/5 backdrop-blur-xl flex items-center justify-center">
                                                {isSubscribed ? <Crown className="text-yellow-400" size={40} /> : <Zap className="text-white/20" size={40} />}
                                            </div>
                                        </div>
                                        {isSubscribed && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-3 -right-3 bg-emerald-500 p-2 rounded-xl shadow-lg border-2 border-[#0B0B0F]"
                                            >
                                                <CheckCircle2 size={16} />
                                            </motion.div>
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black tracking-tight mb-1">{user.name || 'Anonymous DJ'}</h2>
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className="text-blue-400 font-mono text-xs uppercase tracking-widest">{user.email}</p>
                                            {user.role && (
                                                <span className="px-2 py-0.5 rounded-lg bg-brand-purple/20 text-brand-purple text-[9px] font-black uppercase tracking-widest border border-brand-purple/30">
                                                    {user.role}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setShowEditProfile(true)}
                                        className="px-5 py-3 rounded-2xl bg-brand-purple text-white shadow-lg shadow-brand-purple/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105"
                                    >
                                        <PenLine size={14} /> Adjust Profile
                                    </button>
                                    <button
                                        onClick={() => setShowTOS(true)}
                                        className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                                    >
                                        <Info size={14} /> Service Access Terms
                                    </button>
                                    {isSubscribed && (
                                        <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                            Status: Active Elite
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Digital Countdown Timer */}
                            <div className="lg:col-span-4 flex flex-col items-center justify-center text-center py-8 border-y md:border-y-0 md:border-x border-white/5">
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">Frequency Access Token</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-8xl md:text-9xl font-mono font-black tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(138,43,226,0.3)]">
                                        {daysLeft}
                                    </span>
                                    <span className="text-2xl font-black text-brand-purple uppercase tracking-widest">Days</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-white/40">
                                    <Clock size={16} className="animate-spin-slow" />
                                    <span className="text-[10px] font-bold tracking-widest uppercase">System Clock Sync: OK</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="lg:col-span-3 space-y-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`w-full py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl ${isSubscribed
                                        ? 'bg-white text-indigo-900 shadow-white/5'
                                        : 'bg-gradient-to-r from-brand-purple to-brand-pink text-white shadow-brand-purple/20'
                                        }`}
                                >
                                    {isSubscribed ? 'Extend Membership' : 'Explore Membership'}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowMpesa(!showMpesa)}
                                    className="w-full py-5 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    {showMpesa ? 'Hide Payment' : 'M-Pesa Fallback'}
                                </motion.button>

                                <AnimatePresence>
                                    {showMpesa && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mt-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Till: 5952445</p>
                                                <p className="text-[9px] text-emerald-500/60 leading-tight">Send confirmation to WhatsApp for manual sync.</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Navigation Tabs ────────────────────────────────────────────── */}
                <motion.div variants={itemVariants} className="flex gap-4 p-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl w-fit mx-auto md:mx-0">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-white/40 hover:text-white'}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('wishlist')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'wishlist' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'text-white/40 hover:text-white'}`}
                    >
                        Saved for Later ({wishlist.length})
                    </button>
                </motion.div>

                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' ? (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-12"
                        >
                            {/* ── Dashboard Stats Grid ───────────────────────────────────────── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Loyalty Points */}
                                <motion.div
                                    variants={itemVariants}
                                    whileHover={{ y: -5 }}
                                    className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 backdrop-blur-xl border border-yellow-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-[40px] rounded-full transition-all group-hover:bg-yellow-500/10" />
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500">
                                            <Star size={20} />
                                        </div>
                                        <div className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-tighter text-yellow-500">
                                            Loyalty
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Available Points</h3>
                                        <div className="text-3xl font-black tracking-tight">{user.loyaltyPoints || 0} PTS</div>
                                    </div>
                                </motion.div>

                                {/* Total Spent */}
                                <motion.div
                                    variants={itemVariants}
                                    whileHover={{ y: -5 }}
                                    className="bg-gradient-to-br from-brand-cyan/10 to-blue-500/5 backdrop-blur-xl border border-brand-cyan/20 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-[40px] rounded-full transition-all group-hover:bg-brand-cyan/10" />
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="p-3 bg-brand-cyan/10 rounded-xl text-brand-cyan">
                                            <Coins size={20} />
                                        </div>
                                        <div className="px-2 py-0.5 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full text-[8px] font-black uppercase tracking-tighter text-brand-cyan">
                                            Lifetime
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Platform Spend</h3>
                                        <div className="text-3xl font-black tracking-tight">KES {(user.totalSpent || 0).toLocaleString()}</div>
                                    </div>
                                </motion.div>

                                {/* Next stats continue... */}

                    {/* Stat Card: Wallet */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="lg:col-span-4 bg-[#0B0B0F]/80 backdrop-blur-xl border border-white/5 p-10 rounded-[3rem] relative overflow-hidden group shadow-xl"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full transition-all group-hover:bg-emerald-500/10" />

                        <div className="flex justify-between items-start mb-12">
                            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
                                <Wallet size={24} />
                            </div>
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase tracking-tighter text-emerald-500">
                                Withdrawable
                            </div>
                        </div>

                        <div className="space-y-1 mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Referral Wallet</h3>
                            <div className="text-4xl font-black tracking-tight">KES {user.balance?.toLocaleString() || '0'}</div>
                        </div>

                        <motion.button
                            whileHover={{ x: 5 }}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-cyan group/btn"
                        >
                            Visit Shop to Spend <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </motion.button>
                    </motion.div>

                    {/* Stat Card: Downloads */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="lg:col-span-4 bg-[#0B0B0F]/80 backdrop-blur-xl border border-white/5 p-10 rounded-[3rem] relative overflow-hidden group shadow-xl"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full transition-all group-hover:bg-blue-500/10" />

                        <div className="flex justify-between items-start mb-12">
                            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400">
                                <Download size={24} />
                            </div>
                            <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[8px] font-black uppercase tracking-tighter text-blue-500">
                                Activity
                            </div>
                        </div>

                        <div className="space-y-1 mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Total Transmissions</h3>
                            <div className="text-4xl font-black tracking-tight">{user.downloadCountTotal || '0'} DLs</div>
                        </div>

                        <p className="text-[10px] text-white/20 font-medium">Daily limit reset in 14 hours</p>
                    </motion.div>

                    {/* Stat Card: Referrals */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="lg:col-span-4 bg-[#0B0B0F]/80 backdrop-blur-xl border border-white/5 p-10 rounded-[3rem] relative overflow-hidden group shadow-xl"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[50px] rounded-full transition-all group-hover:bg-brand-purple/10" />

                        <div className="flex justify-between items-start mb-12">
                            <div className="p-4 bg-brand-purple/10 rounded-2xl text-brand-purple">
                                <Users size={24} />
                            </div>
                            <div className="px-3 py-1 bg-brand-purple/10 border border-brand-purple/20 rounded-full text-[8px] font-black uppercase tracking-tighter text-brand-purple">
                                Network
                            </div>
                        </div>

                        <div className="space-y-1 mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Active Recruits</h3>
                            <div className="text-4xl font-black tracking-tight">{user.referralCount || '0'} DJs</div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">
                            <TrendingUp size={12} /> +KES {((user.referralCount || 0) * 200).toLocaleString()} Total earned
                        </div>
                    </motion.div>
                </div>

                {/* ── Lipa Pole Pole Installments ─────────────────────────────────── */}
                <UserInstallments />

                {/* ── Referral Modular Content ─────────────────────────────────── */}
                <motion.div
                    variants={itemVariants}
                    className="bg-[#0B0B0F]/80 backdrop-blur-xl border border-white/5 rounded-[3.5rem] p-1 shadow-2xl overflow-hidden"
                >
                    <div className="bg-gradient-to-br from-brand-purple/10 via-brand-pink/5 to-transparent p-12 relative">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-purple/5 blur-[120px] rounded-full -mr-64 -mt-64" />

                        <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
                            <div className="lg:w-1/2 space-y-8">
                                <div className="space-y-2">
                                    <h3 className="text-4xl font-black tracking-tighter leading-tight">EXPAND THE NETWORK.<br />GET REWARDED.</h3>
                                    <p className="text-gray-400 font-medium leading-relaxed max-w-md">
                                        For every DJ who signs up using your tactical code, you gain KES 200 in store credit and +7 days of premium access.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple"><Gift size={20} /></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest">Immediate KES 200 Payout</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><Clock size={20} /></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest">+7 Days Service Extension</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-1/2 w-full">
                                <div className="bg-[#0B0B0F]/60 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] space-y-8 shadow-inner shadow-white/5">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4 tracking-[0.5em]">Command Code</p>
                                        <div className="text-5xl font-mono font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan select-all">
                                            {user.referralCode || 'UNIT-001'}
                                        </div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={copyRef}
                                        className="w-full flex items-center justify-center gap-4 bg-white/10 hover:bg-white/20 border border-white/10 py-6 rounded-3xl transition-all group"
                                    >
                                        <Copy size={20} className="text-brand-purple group-hover:rotate-12 transition-transform" />
                                        <span className="font-black text-xs uppercase tracking-[0.2em]">Transmit Code</span>
                                    </motion.button>

                                    <div className="flex justify-center gap-3">
                                        <div className="p-3 bg-white/5 rounded-2xl hover:bg-brand-purple/20 transition-colors border border-white/5"><Share2 size={18} /></div>
                                        <div className="p-3 bg-white/5 rounded-2xl hover:bg-brand-purple/20 transition-colors border border-white/5"><ExternalLink size={18} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Footer Link Hub ────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-12">
                    {[
                        { label: 'SUPPORT HUB', icon: Zap },
                        { label: 'EXCLUSIVE ACCESS', icon: Crown, show: isSubscribed },
                        { label: 'EQUIPMENT STORE', icon: Gift },
                        { label: 'ACCOUNT SECURITY', icon: AlertCircle },
                    ].filter(l => l.show !== false).map((link, idx) => (
                        <motion.button
                            key={idx}
                            whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.05)' }}
                            className="p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-3 transition-all"
                        >
                            <link.icon className="text-white/20" size={20} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{link.label}</span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
                    ) : (
                        <motion.div
                            key="wishlist"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-[#0B0B0F]/80 backdrop-blur-xl border border-white/5 rounded-[3.5rem] p-12 min-h-[400px]"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Your Saved Signals</h3>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Ready for compilation</p>
                                </div>
                            </div>
                            
                            {wishlist.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
                                    <Heart className="w-12 h-12 text-white/10 mb-4" />
                                    <h4 className="text-lg font-bold text-white/40 uppercase tracking-wider mb-2">No signals intercepted</h4>
                                    <p className="text-xs text-white/20">Explore exclusive content to save tracks and mixtapes.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Wishlist items will be mapped here */}
                                    <p className="text-white/40 text-sm">Wishlist UI implementation in progress...</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            {/* ── TOS Modal Overlay ─────────────────────────────────────────── */}
            <AnimatePresence>
                {showTOS && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60"
                        onClick={() => setShowTOS(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-[#0B0B0F] border border-white/10 w-full max-w-xl rounded-[3rem] p-12 relative overflow-hidden shadow-[0_0_100px_rgba(138,43,226,0.1)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/10 blur-[80px] rounded-full -mr-32 -mt-32" />

                            <div className="relative z-10 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-brand-purple/10 rounded-2xl text-brand-purple border border-brand-purple/20">
                                        <AlertCircle size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight uppercase">Protocol Agreements</h3>
                                        <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase">Terms of DJ Service</p>
                                    </div>
                                </div>

                                <div className="space-y-6 text-gray-400 text-sm leading-relaxed border-y border-white/5 py-8">
                                    <div className="space-y-1">
                                        <h4 className="text-white font-black text-[11px] uppercase tracking-widest">01. INDIVIDUAL AUTHORIZATION</h4>
                                        <p>Command center access is restricted to a single operator. Shared frequency access will result in immediate termination.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-white font-black text-[11px] uppercase tracking-widest">02. SECTOR SECURITY</h4>
                                        <p>IP and Hardware signatures are tracked. Multi-sector (device) bypass detected will trigger automatic lock-out.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-white font-black text-[11px] uppercase tracking-widest">03. ASSET UTILIZATION</h4>
                                        <p>Transmitted assets are for promotional broadcasting only. Sub-licensing or file redistribution is a breach of protocol.</p>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowTOS(false)}
                                    className="w-full bg-brand-purple py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-purple/30"
                                >
                                    Acknowledge & Sync
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ── Edit Profile Modal ─────────────────────────────────────────── */}
            <AnimatePresence>
                {showEditProfile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60"
                        onClick={() => setShowEditProfile(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-[#0B0B0F] border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 relative overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black uppercase tracking-tight">Identity Management</h3>
                                <button onClick={() => setShowEditProfile(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <CloseIcon size={20} className="text-white/40" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Display Name</label>
                                    <input 
                                        type="text"
                                        value={editForm.name}
                                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-brand-purple outline-none transition-colors"
                                        placeholder="DJ Name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Custom Handle (@)</label>
                                    <input 
                                        type="text"
                                        value={editForm.username}
                                        onChange={e => setEditForm({...editForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-brand-purple outline-none transition-colors font-mono"
                                        placeholder="dj_name"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Artist Bio</label>
                                    <textarea 
                                        rows={3}
                                        value={editForm.bio}
                                        onChange={e => setEditForm({...editForm, bio: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-brand-purple outline-none transition-colors resize-none mb-2"
                                        placeholder="About your style, gear, and experience..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Base Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                        <input 
                                            type="text"
                                            value={editForm.location}
                                            onChange={e => setEditForm({...editForm, location: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 focus:border-brand-purple outline-none transition-colors"
                                            placeholder="Nairobi, KE"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Avatar URL</label>
                                    <input 
                                        type="text"
                                        value={editForm.avatar_url}
                                        onChange={e => setEditForm({...editForm, avatar_url: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:border-brand-purple outline-none transition-colors"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateProfile}
                                disabled={saving}
                                className="w-full bg-brand-purple py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-purple/30 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {saving ? <CircleDashed className="animate-spin" size={18} /> : <Save size={18} />}
                                {saving ? 'Synchronizing...' : 'Save Changes'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            </motion.div>
        </div>
    );
};

export default UserProfile;
