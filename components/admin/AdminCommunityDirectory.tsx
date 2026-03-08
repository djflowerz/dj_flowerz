/**
 * AdminCommunityDirectory.tsx
 * 
 * Shows a table of all registered DJs.
 * Features:
 * - Search by name/email/referral code
 * - Subscription status indicator
 * - Wallet balance display
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, Crown, Circle,
    Mail, Phone, Calendar, Wallet,
    Zap, Filter, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke';

interface User {
    id: string;
    supabase_id: string;
    full_name: string;
    email: string;
    phone: string;
    referral_code: string;
    referral_balance_kes: number;
    is_subscriber: number;
    subscription_end: string;
    created_at: string;
}

const AdminCommunityDirectory: React.FC = () => {
    const { session } = useAuth() as any;
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const res = await fetch(`${WORKER_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch users', e);
        } finally {
            setLoading(false);
        }
    }, [session?.access_token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.referral_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/20">
                        <Users size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Community Directory</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{users.length} Registered DJs</p>
                    </div>
                </div>

                <div className="relative group">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-purple transition-colors" />
                    <input
                        type="text"
                        placeholder="Search DJs by name, email or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#0B0B0F] border border-white/5 rounded-2xl py-2 pl-12 pr-4 text-xs text-white outline-none focus:border-brand-purple/50 transition-all w-full md:w-80"
                    />
                </div>
            </div>

            <div className="bg-[#0B0B0F] rounded-[2rem] border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">DJ / Member</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Ref Code / Wallet</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Expiry</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-600 uppercase text-[10px] font-black tracking-widest">
                                        Loading directory...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-600 uppercase text-[10px] font-black tracking-widest">
                                        No matching DJs found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.supabase_id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center text-gray-400 font-black text-xs uppercase border border-white/5 group-hover:border-brand-purple/30 group-hover:scale-105 transition-all">
                                                    {u.full_name?.substring(0, 2) || 'DJ'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-brand-purple transition-colors">{u.full_name || 'Anonymous DJ'}</div>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium lowercase">
                                                            <Mail size={10} /> {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="text-[11px] font-mono font-black text-brand-purple py-0.5 px-2 bg-brand-purple/10 border border-brand-purple/20 rounded-md w-fit tracking-wider">
                                                    {u.referral_code}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500">
                                                    <Wallet size={10} /> KES {u.referral_balance_kes.toLocaleString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.is_subscriber === 1 ? (
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 border border-emerald-500/10 rounded-full px-3 py-1 bg-emerald-500/5 w-fit uppercase tracking-widest">
                                                    <Crown size={12} /> Pro Member
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 border border-white/5 rounded-full px-3 py-1 bg-white/2 w-fit uppercase tracking-widest">
                                                    <Circle size={10} /> Expired
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                <Calendar size={12} className="text-gray-600" />
                                                {u.subscription_end ? new Date(u.subscription_end).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[11px] text-gray-500 font-mono">
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminCommunityDirectory;
