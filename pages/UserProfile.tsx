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
    Clock, Wallet, Share2, Copy, Crown, Zap,
    ExternalLink, ArrowRight, Gift, CircleDashed,
    ArrowUpRight, Info, AlertCircle, CheckCircle2,
    Download, Users, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke';

const UserProfile: React.FC = () => {
    const { session } = useAuth() as any;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showMpesa, setShowMpesa] = useState(false);
    const [showTOS, setShowTOS] = useState(false);

    useEffect(() => {
        if (!session?.access_token) return;

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${WORKER_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                const data = await res.json();
                setUserData(data);
            } catch (e) {
                console.error('Failed to fetch profile', e);
                toast.error('Could not load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [session?.access_token]);

    const copyRef = () => {
        if (!userData?.referral_code) return;
        navigator.clipboard.writeText(userData.referral_code);
        toast.success("Referral code copied!", {
            description: "Share it with other DJs to earn KES & free days."
        });
    };

    if (loading) {
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

    const isSubscribed = userData?.is_subscriber === 1;
    const daysLeft = userData?.days_left || 0;

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
                        <p className="text-xs text-white/30 font-mono">STATION: {userData?.full_name?.toUpperCase() || 'UNIT-01'}</p>
                        <p className="text-[10px] text-white/20 font-mono uppercase">EST. {new Date(userData?.created_at).toLocaleDateString()}</p>
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
                                        <h2 className="text-4xl font-black tracking-tight mb-1">{userData?.full_name || 'Anonymous DJ'}</h2>
                                        <p className="text-blue-400 font-mono text-xs uppercase tracking-widest">{userData?.email}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
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
                                    {isSubscribed ? 'Extend Subscription' : 'Force Upgrade Link'}
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

                {/* ── Dashboard Stats Grid ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
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
                            <div className="text-4xl font-black tracking-tight">KES {userData?.referral_balance_kes?.toLocaleString() || '0'}</div>
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
                            <div className="text-4xl font-black tracking-tight">{userData?.download_count_total || '0'} DLs</div>
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
                            <div className="text-4xl font-black tracking-tight">{userData?.referral_count || '0'} DJs</div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">
                            <TrendingUp size={12} /> +KES {((userData?.referral_count || 0) * 200).toLocaleString()} Total earned
                        </div>
                    </motion.div>
                </div>

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
                                    <h3 className="text-4xl font-black tracking-tighter leading-tight">EXPAND THE NETWORK.<br/>GET REWARDED.</h3>
                                    <p className="text-gray-400 font-medium leading-relaxed max-w-md">
                                        For every DJ who signs up using your tactical code, you gain KES 200 in store credit and +7 days of premium access.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple"><Gift size={20}/></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest">Immediate KES 200 Payout</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><Clock size={20}/></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest">+7 Days Service Extension</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-1/2 w-full">
                                <div className="bg-[#0B0B0F]/60 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] space-y-8 shadow-inner shadow-white/5">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-4 tracking-[0.5em]">Command Code</p>
                                        <div className="text-5xl font-mono font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan select-all">
                                            {userData?.referral_code || 'UNIT-001'}
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
                                        <div className="p-3 bg-white/5 rounded-2xl hover:bg-brand-purple/20 transition-colors border border-white/5"><Share2 size={18}/></div>
                                        <div className="p-3 bg-white/5 rounded-2xl hover:bg-brand-purple/20 transition-colors border border-white/5"><ExternalLink size={18}/></div>
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
                        { label: 'MUSIC POOL', icon: Crown },
                        { label: 'EQUIPMENT STORE', icon: Gift },
                        { label: 'ACCOUNT SECURITY', icon: AlertCircle },
                    ].map((link, idx) => (
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
        </div>
    );
};

export default UserProfile;
