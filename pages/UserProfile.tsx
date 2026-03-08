/**
 * UserProfile.tsx
 * 
 * Command Center for DJ Flowerz users.
 * Features:
 * - Real-time subscription timer (Days left)
 * - Referral Wallet (KES balance)
 * - Referral Code & Sharing Hub
 * - Premium dark design with glassmorphism
 */

import React, { useState, useEffect } from 'react';
import {
    Clock, Wallet, Share2, Copy, Crown, Zap,
    ExternalLink, ArrowRight, Gift, CircleDashed,
    ArrowUpRight, Info, AlertCircle
} from 'lucide-react';
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
            <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-6 bg-glow-mesh">
                <CircleDashed className="text-brand-purple animate-spin mb-4" size={48} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Synchronizing DJ Data...</p>
            </div>
        );
    }

    const isSubscribed = userData?.is_subscriber === 1;
    const daysLeft = userData?.days_left || 0;

    return (
        <div className="min-h-screen bg-[#050507] text-white selection:bg-brand-purple/30 pb-20 pt-32 px-6">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* ── Header / Timer Card ────────────────────────────────────────── */}
                <div className={`relative overflow-hidden rounded-[3.5rem] p-12 shadow-2xl transition-all duration-700 ${isSubscribed
                    ? 'bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 border border-white/10'
                    : 'bg-[#0B0B0F] border border-white/5'
                    }`}>
                    {/* Animated Background Gradients */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full -mr-64 -mt-64 animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-purple/10 blur-[100px] rounded-full -ml-32 -mb-32" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                                <div className={`p-4 rounded-3xl ${isSubscribed ? 'bg-white/20' : 'bg-white/5'} backdrop-blur-xl shadow-inner border border-white/10`}>
                                    {isSubscribed ? <Crown className="text-yellow-400" size={32} /> : <Zap className="text-gray-500" size={32} />}
                                </div>
                                <div>
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-1">
                                        {userData?.full_name || 'DJ Fellow'}
                                    </h1>
                                    <p className="text-sm font-medium text-white/60 tracking-wide">{userData?.email}</p>
                                </div>
                            </div>

                            {!isSubscribed && (
                                <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                                    <div className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest">
                                        Access Expired
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center md:items-end w-full md:w-auto">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-2">Pool Pass Remaining</div>
                            <div className="text-7xl font-mono font-black tracking-tighter tabular-nums drop-shadow-xl">
                                {daysLeft}<span className="text-3xl opacity-50 ml-2">DAYS</span>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                <button
                                    onClick={() => setShowMpesa(!showMpesa)}
                                    className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${showMpesa ? 'bg-green-500 border-green-500 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                                        }`}>
                                    {showMpesa ? 'Close Payment' : 'M-Pesa Fallback'}
                                </button>
                                <button className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isSubscribed
                                    ? 'bg-white text-blue-700 hover:scale-105 active:scale-95'
                                    : 'bg-emerald-500 text-white hover:brightness-110 shadow-lg shadow-emerald-500/20 active:scale-95'
                                    }`}>
                                    {isSubscribed ? 'Extend Access' : 'Renew Access Now'}
                                </button>
                                <button
                                    onClick={() => setShowTOS(true)}
                                    className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10">
                                    <Info size={18} />
                                </button>
                            </div>

                            {showMpesa && (
                                <div className="mt-6 w-full animate-fade-in-up">
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                                        <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                            <Zap size={16} /> Pay via M-Pesa Till
                                        </h4>
                                        <p className="text-sm text-white/50 mb-4">
                                            If Paystack is slow, use our Till Number directly:
                                        </p>
                                        <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                                            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Buy Goods Till</span>
                                            <span className="text-white font-mono text-xl font-black">5952445</span>
                                        </div>
                                        <p className="text-[10px] text-white/30 italic mt-3 text-center">
                                            Send confirmation code to +254 7XX XXX XXX (WhatsApp) to activate.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                    {/* ── Wallet Card ──────────────────────────────────────────────── */}
                    <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-emerald-500/10 transition-all duration-700" />

                        <div className="flex items-center gap-5 mb-10">
                            <div className="p-5 bg-emerald-500/10 rounded-3xl text-emerald-500 border border-emerald-500/20">
                                <Wallet size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Referral Wallet</h2>
                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.15em]">Store Credit</p>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-5xl font-black text-white">KES {userData?.referral_balance_kes?.toLocaleString() || 0}</span>
                        </div>
                        <p className="text-gray-500 text-sm font-medium leading-relaxed mb-10">
                            Earned from inviting fellow DJs. You can use this balance to buy anything in the physical store or digital downloads.
                        </p>

                        <button className="w-full group/btn relative overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-3xl transition-all">
                            <span className="relative z-10 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest">
                                Go to Physical Store <ArrowRight size={16} className="group-hover/btn:translate-x-2 transition-transform" />
                            </span>
                        </button>
                    </div>

                    {/* ── Referral Hub ──────────────────────────────────────────────── */}
                    <div className="bg-[#0B0B0F] p-10 rounded-[3.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-purple/5 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-brand-purple/10 transition-all duration-700" />

                        <div className="flex items-center gap-5 mb-10">
                            <div className="p-5 bg-brand-purple/10 rounded-3xl text-brand-purple border border-brand-purple/20">
                                <Share2 size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Refer & Earn</h2>
                                <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.15em]">Invite Program</p>
                            </div>
                        </div>

                        <div className="bg-white/5 p-7 rounded-3xl border border-white/10 flex items-center justify-between mb-8 group/ref">
                            <div>
                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Your Code</div>
                                <div className="text-3xl font-mono font-black tracking-[0.2em] text-brand-purple select-all">{userData?.referral_code || '---'}</div>
                            </div>
                            <button
                                onClick={copyRef}
                                className="p-4 rounded-2xl bg-brand-purple text-white hover:brightness-110 active:scale-90 transition-all shadow-lg shadow-brand-purple/20"
                            >
                                <Copy size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5 text-center">
                                <div className="text-emerald-500 font-black text-xl mb-1">KES 200</div>
                                <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Per Signup</div>
                            </div>
                            <div className="bg-white/[0.03] p-5 rounded-3xl border border-white/5 text-center">
                                <div className="text-blue-400 font-black text-xl mb-1">+7 DAYS</div>
                                <div className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Pool Access</div>
                            </div>
                        </div>

                        <p className="text-gray-500 text-xs font-semibold leading-relaxed">
                            Help your crew grow! When a new DJ signs up with your code and pays, you get KES 200 credited to your wallet and 7 days added to your subscription.
                        </p>
                    </div>

                </div>

                {/* ── Secondary Info ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><Gift size={24} /></div>
                        <div>
                            <div className="text-white font-black text-sm">{userData?.referral_earned_days || 0} Days Engaged</div>
                            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Total Earned</div>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><zap size={24} /></div>
                        <div>
                            <div className="text-white font-black text-sm">{userData?.download_count_today || 0} Downloads</div>
                            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Daily Activity</div>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500"><ArrowUpRight size={24} /></div>
                        <div>
                            <div className="text-white font-black text-sm">Joined {new Date(userData?.created_at).toLocaleDateString()}</div>
                            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Member Status</div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── TOS Modal ────────────────────────────────────────────────── */}
            {showTOS && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                    <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-purple/10 blur-[60px] rounded-full -mr-20 -mt-20" />

                        <div className="relative z-10">
                            <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                                <AlertCircle className="text-brand-purple" /> DJ Pool Terms of Service
                            </h3>

                            <div className="space-y-4 text-gray-400 text-sm leading-relaxed mb-8 border-y border-white/5 py-6">
                                <p>
                                    <span className="text-white font-bold tracking-tight">1. Individual Use Only:</span> Subscriptions are strictly for one DJ. Professional pool sharing or multi-user access is prohibited.
                                </p>
                                <p>
                                    <span className="text-white font-bold tracking-tight">2. Device Guard:</span> We use your IP and Device Fingerprint to ensure account integrity. Reaching more than 2 unique devices will result in an automatic temporary ban.
                                </p>
                                <p>
                                    <span className="text-white font-bold tracking-tight">3. Content Usage:</span> Mixtapes and tracks are provided for promotional use in sets, clubs, and radio. Resale of digital files is strictly forbidden.
                                </p>
                            </div>

                            <button
                                onClick={() => setShowTOS(false)}
                                className="w-full bg-brand-purple py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-purple/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                I Understand & Agree
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
