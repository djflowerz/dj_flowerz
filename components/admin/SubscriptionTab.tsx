import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserCheck, UserMinus, Calendar, Clock, Shield, AlertCircle, Activity, RefreshCw, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

import { STORAGE_WORKER_URL, getAuthHeader } from '../../utils/r2';

interface ActiveSubscriber {
    id: string;
    email: string;
    full_name?: string;
    displayName?: string;
    is_subscriber: number | boolean;
    subscription_plan?: string;
    subscription_expiry?: string;
}

export default function SubscriptionTab() {
    const { grantSubscription, revokeSubscription } = useData();
    const { session } = useAuth();

    const [subscribers, setSubscribers] = useState<ActiveSubscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [grantingEmail, setGrantingEmail] = useState('');
    const [grantDays, setGrantDays] = useState(30);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const fetchSubscribers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const authHeader = await getAuthHeader();
            const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/active-subscribers`, {
                headers: authHeader,
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            // API may return { results: [...] } or a raw array
            setSubscribers(Array.isArray(data) ? data : (data.results ?? []));
        } catch (err: any) {
            setError(err.message || 'Failed to load subscribers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscribers();
    }, [fetchSubscribers]);

    const showFeedback = (type: 'success' | 'error', msg: string) => {
        setActionFeedback({ type, msg });
        setTimeout(() => setActionFeedback(null), 4000);
    };

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grantingEmail) return;
        setIsSubmitting(true);
        try {
            await grantSubscription(grantingEmail, grantDays);
            showFeedback('success', `Access granted to ${grantingEmail} for ${grantDays} days.`);
            setGrantingEmail('');
            fetchSubscribers();
        } catch (err: any) {
            showFeedback('error', err.message || 'Failed to grant access.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevoke = async (email: string) => {
        if (!confirm(`INITIATE PROTOCOL: REVOKE ACCESS FOR ${email.toUpperCase()}?`)) return;
        try {
            await revokeSubscription(email);
            showFeedback('success', `Access revoked for ${email}.`);
            // Optimistically remove from list
            setSubscribers(prev => prev.filter(s => s.email !== email));
        } catch (err: any) {
            showFeedback('error', err.message || 'Failed to revoke access.');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const isExpired = (dateString?: string) => {
        if (!dateString) return false;
        return new Date(dateString) < new Date();
    };

    const filteredSubscribers = subscribers.filter(sub =>
        sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.full_name || sub.displayName || '')?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Feedback banner */}
            {actionFeedback && (
                <div className={`px-6 py-4 rounded-2xl text-sm font-bold border ${
                    actionFeedback.type === 'success'
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    {actionFeedback.msg}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Manual Grant Console */}
                <div className="lg:col-span-1">
                    <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-brand-purple/10 transition-all duration-700" />

                        <div className="relative z-10">
                            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                                    <Shield size={20} />
                                </div>
                                Access Control
                            </h2>

                            <form onSubmit={handleGrant} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">User Identity (Email)</label>
                                    <input
                                        type="email"
                                        required
                                        value={grantingEmail}
                                        onChange={(e) => setGrantingEmail(e.target.value)}
                                        placeholder="dj@example.com"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all placeholder:text-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Frequency Period</label>
                                    <div className="relative flex items-center">
                                        <select
                                            value={grantDays}
                                            onChange={(e) => setGrantDays(Number(e.target.value))}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value={7} className="bg-[#0B0B0F]">7 Days (Beta Access)</option>
                                            <option value={30} className="bg-[#0B0B0F]">30 Days (Standard Loop)</option>
                                            <option value={90} className="bg-[#0B0B0F]">90 Days (Quarterly Session)</option>
                                            <option value={365} className="bg-[#0B0B0F]">365 Days (Full Cycle)</option>
                                        </select>
                                        <div className="absolute right-4 pointer-events-none text-gray-600">
                                            <Clock size={16} />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-brand-purple text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-purple-600 transition-all shadow-xl shadow-brand-purple/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                                    {isSubmitting ? 'Authorizing...' : 'Authorize Access'}
                                </button>
                            </form>

                            <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-3">
                                <AlertCircle className="text-brand-purple shrink-0 mt-0.5" size={16} />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                                    Manual authorization will extend existing sessions or create new ones from the current time mark.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats card */}
                    <div className="mt-6 bg-[#0B0B0F] p-6 rounded-[2rem] border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                            <Activity size={22} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white tracking-tighter">{subscribers.length}</div>
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Active Subscribers</div>
                        </div>
                    </div>
                </div>

                {/* Active Subscriber Registry */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl h-full flex flex-col">
                        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex gap-4 items-center">
                            <div className="relative group flex-1">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="SCAN ACTIVE REGISTRY: ENTER IDENTITY OR HANDLE..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-xs font-black uppercase tracking-[0.1em] text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all placeholder:text-gray-800"
                                />
                            </div>
                            <button
                                onClick={fetchSubscribers}
                                disabled={loading}
                                className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                                title="Refresh"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-8 py-6">Operator Identity</th>
                                        <th className="px-8 py-6">Plan</th>
                                        <th className="px-8 py-6">Expiry</th>
                                        <th className="px-8 py-6 text-right">Protocol</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-40">
                                                    <Loader2 size={36} className="text-brand-purple animate-spin" />
                                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Scanning active signals...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-60">
                                                    <AlertCircle size={36} className="text-red-500" />
                                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">{error}</p>
                                                    <button onClick={fetchSubscribers} className="mt-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white">
                                                        Retry
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredSubscribers.length > 0 ? (
                                        filteredSubscribers.map((sub) => {
                                            const name = sub.full_name || sub.displayName || '';
                                            const expired = isExpired(sub.subscription_expiry);
                                            return (
                                                <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-brand-purple group-hover:bg-brand-purple/10 group-hover:border-brand-purple/20 transition-all">
                                                                {sub.email?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-white group-hover:text-brand-purple transition-colors">
                                                                    {name || 'ANONYMOUS_USER'}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{sub.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-purple/5 text-brand-purple border border-brand-purple/20">
                                                            {sub.subscription_plan || 'manual'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {sub.subscription_expiry ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-white/70 flex items-center gap-2">
                                                                    <Calendar size={14} className="text-gray-600" />
                                                                    {formatDate(sub.subscription_expiry)}
                                                                </span>
                                                                {expired && (
                                                                    <span className="text-[9px] text-red-500 font-black uppercase tracking-widest mt-1">Expired</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-black text-gray-700 tracking-widest">---</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setGrantingEmail(sub.email)}
                                                                className="w-10 h-10 rounded-xl bg-brand-purple/5 border border-brand-purple/10 flex items-center justify-center text-brand-purple hover:bg-brand-purple hover:text-white transition-all"
                                                                title="Extend Access"
                                                            >
                                                                <UserCheck size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRevoke(sub.email)}
                                                                className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                                title="Revoke Access"
                                                            >
                                                                <UserMinus size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <Search size={48} className="text-gray-500" />
                                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                                                        {searchTerm ? 'No matching signals found' : 'No active subscribers in registry'}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
