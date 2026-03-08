import React, { useState } from 'react';
import { Search, UserCheck, UserMinus, Calendar, Clock, Shield, AlertCircle, Users, Activity, ExternalLink } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function SubscriptionTab() {
    const { users, grantSubscription, revokeSubscription, subscriptionsLoading } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [grantingEmail, setGrantingEmail] = useState('');
    const [grantDays, setGrantDays] = useState(30);

    const subscribers = users.filter(u => u.isSubscriber);

    const filteredUsers = users.filter(user =>
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grantingEmail) return;
        await grantSubscription(grantingEmail, grantDays);
        setGrantingEmail('');
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
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
                                    <div className="relative group/input">
                                        <input
                                            type="email"
                                            required
                                            value={grantingEmail}
                                            onChange={(e) => setGrantingEmail(e.target.value)}
                                            placeholder="dj@example.com"
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all placeholder:text-gray-700"
                                        />
                                    </div>
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
                                    className="w-full bg-brand-purple text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-purple-600 transition-all shadow-xl shadow-brand-purple/20 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <UserCheck size={18} />
                                    Authorize Access
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
                </div>

                {/* User Registry */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl h-full flex flex-col">
                        <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="SCANNING USER REGISTRY: ENTER IDENTITY OR HANDLE..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-xs font-black uppercase tracking-[0.1em] text-white focus:border-brand-purple/50 focus:ring-[6px] focus:ring-brand-purple/5 outline-none transition-all placeholder:text-gray-800"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-8 py-6">Operator Identity</th>
                                        <th className="px-8 py-6">Signal Status</th>
                                        <th className="px-8 py-6">Termination Date</th>
                                        <th className="px-8 py-6 text-right">Protocol</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {(filteredUsers.sort((a, b) => (b.isSubscriber ? 1 : 0) - (a.isSubscriber ? 1 : 0)).slice(0, 50)).length > 0 ? (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-brand-purple group-hover:bg-brand-purple/10 group-hover:border-brand-purple/20 transition-all">
                                                            {user.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-white group-hover:text-brand-purple transition-colors">{user.displayName || 'ANONYMOUS_USER'}</div>
                                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {user.isSubscriber ? (
                                                        <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-green-500/5 text-green-500 border border-green-500/20 flex items-center w-fit gap-2">
                                                            <Activity size={10} className="animate-pulse" />
                                                            Locked On
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 text-gray-500 border border-white/5">
                                                            No Signal
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    {user.subscriptionExpiry ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black font-display text-white/70 flex items-center gap-2">
                                                                <Calendar size={14} className="text-gray-600" />
                                                                {formatDate(user.subscriptionExpiry)}
                                                            </span>
                                                            {new Date(user.subscriptionExpiry) < new Date() && (
                                                                <span className="text-[9px] text-red-500 font-black uppercase tracking-widest mt-1">Expended</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-black text-gray-700 tracking-widest">---</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {user.isSubscriber ? (
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`INITIATE PROTOCOL: REVOKE ACCESS FOR ${user.email?.toUpperCase()}?`)) {
                                                                        revokeSubscription(user.email!);
                                                                    }
                                                                }}
                                                                className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/0 hover:shadow-red-500/20"
                                                                title="Revoke Access"
                                                            >
                                                                <UserMinus size={18} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setGrantingEmail(user.email!);
                                                                }}
                                                                className="w-10 h-10 rounded-xl bg-brand-purple/5 border border-brand-purple/10 flex items-center justify-center text-brand-purple hover:bg-brand-purple hover:text-white transition-all shadow-lg shadow-brand-purple/0 hover:shadow-brand-purple/20"
                                                                title="Grant Access"
                                                            >
                                                                <UserCheck size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <Search size={48} className="text-gray-500" />
                                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">No matching signals found in registry</p>
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
