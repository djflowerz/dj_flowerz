/**
 * AdminCommunityDirectory.tsx
 * 
 * Shows a table of all registered DJs with management actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, Crown, Circle,
    Mail, Phone, Calendar, Wallet,
    Zap, Filter, MoreHorizontal, Edit2, Trash2, X, Save, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://api.djflowerz.co.ke';

interface User {
    id: string; // This is the unique identifier (matches 'id' in D1)
    full_name: string;
    email: string;
    phone_number: string; // Matches 'phone_number' in D1
    referral_code: string;
    referral_balance_kes: number;
    is_subscriber: number;
    subscription_plan?: 'trial' | 'weekly' | 'monthly' | 'pro';
    subscription_end_date: string; // Matches 'subscription_end_date' in D1
    created_at: string;
}

const GrantAccessModal: React.FC<{
    user: User;
    onClose: () => void;
    onRefresh: () => void;
}> = ({ user, onClose, onRefresh }) => {
    const [plan, setPlan] = useState<'trial' | 'weekly' | 'monthly' | 'pro'>('monthly');
    const [loading, setLoading] = useState(false);

    const handleGrant = async (action: 'grant' | 'revoke') => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${WORKER_URL}/api/admin/subscriptions/manage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    plan: action === 'grant' ? plan : null,
                    action
                })
            });

            if (res.ok) {
                onRefresh();
                onClose();
            }
        } catch (err) {
            console.error("Failed to update subscription", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-[#0B0B0F] w-full max-w-md rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3 font-black text-white uppercase tracking-widest text-sm">
                        <ShieldCheck className="text-brand-purple" size={18} /> Manage Access
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Target Member</div>
                        <div className="text-sm font-bold text-white">{user.email}</div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">Select Plan Duration</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'trial', label: '1 Week Trial' },
                                { id: 'weekly', label: '1 Week Paid' },
                                { id: 'monthly', label: '1 Month Paid' },
                                { id: 'pro', label: 'Yearly / Pro' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPlan(p.id as any)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all ${plan === p.id
                                        ? 'border-brand-purple bg-brand-purple/10'
                                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                                        }`}
                                >
                                    <div className={`text-[10px] font-black uppercase mb-1 ${plan === p.id ? 'text-brand-purple' : 'text-gray-500'}`}>
                                        {p.id}
                                    </div>
                                    <div className="text-xs font-bold text-white">{p.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => handleGrant('grant')}
                        disabled={loading}
                        className="w-full bg-brand-purple text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-purple/20 hover:shadow-brand-purple/40 hover:bg-brand-purple/90 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? "Syncing D1..." : "Activate Subscription Now"}
                    </button>

                    <button
                        onClick={() => handleGrant('revoke')}
                        disabled={loading}
                        className="w-full text-[10px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-[0.2em] py-2 transition-colors"
                    >
                        Revoke All Access
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminCommunityDirectory: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [managingUser, setManagingUser] = useState<User | null>(null);
    const [updating, setUpdating] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setLoading(false);
                return;
            }

            const res = await fetch(`${WORKER_URL}/api/admin/users?t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch users', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingUser) return;

        setUpdating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const formData = new FormData(e.currentTarget);

            const payload = {
                full_name: formData.get('full_name'),
                phone_number: formData.get('phone_number'),
                is_subscriber: formData.get('is_subscriber') === '1' ? 1 : 0,
                referral_balance_kes: Number(formData.get('referral_balance_kes')) || 0,
                referral_code: formData.get('referral_code')
            };

            const res = await fetch(`${WORKER_URL}/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setEditingUser(null);
                setTimeout(() => fetchUsers(), 500);
            }
        } catch (e) {
            console.error('Update failed', e);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you absolutely sure? This user will be deleted from the system.')) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${WORKER_URL}/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session?.access_token}` }
            });

            if (res.ok) {
                setTimeout(() => fetchUsers(), 500);
            }
        } catch (e) {
            console.error('Delete failed', e);
        }
    };

    const toggleAccess = async (u: User) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const payload = { is_subscriber: u.is_subscriber === 1 ? 0 : 1 };

            const res = await fetch(`${WORKER_URL}/api/admin/users/${u.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) setTimeout(() => fetchUsers(), 500);
        } catch (e) {
            console.error('Toggle access failed', e);
        }
    };

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
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">DJ / Member</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Plan / Expiry</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Referrals</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
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
                                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center text-gray-400 font-black text-xs uppercase border border-white/5">
                                                    {(u.full_name || u.email || 'DJ').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-white group-hover:text-brand-purple transition-colors">
                                                            {u.full_name || u.email?.split('@')[0] || 'Anonymous DJ'}
                                                        </div>
                                                        {u.role && (
                                                            <div className="px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple text-[8px] font-black uppercase tracking-tighter border border-brand-purple/20">
                                                                {u.role}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-500 lowercase font-medium">
                                                        <Mail size={10} /> {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-[10px] font-black text-brand-purple uppercase tracking-widest">
                                                    {u.subscription_plan || 'N/A'}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono">
                                                    {u.subscription_end_date
                                                        ? new Date(u.subscription_end_date).toLocaleDateString()
                                                        : 'No Expiry'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                const isExpired = u.subscription_end_date ? new Date(u.subscription_end_date) < new Date() : true;
                                                const isActive = u.is_subscriber === 1 && !isExpired;

                                                if (isActive) {
                                                    return (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 border border-emerald-500/10 rounded-full px-3 py-1 bg-emerald-500/5 w-fit uppercase tracking-widest">
                                                            <Crown size={12} /> ACTIVE
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-red-500/50 border border-red-500/5 rounded-full px-3 py-1 bg-red-500/2 w-fit uppercase tracking-widest">
                                                        <X size={10} /> {isExpired && u.subscription_end_date ? 'EXPIRED' : 'INACTIVE'}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-[11px] font-mono font-black text-white/70">
                                                    {u.referral_code}
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500/70">
                                                    KES {(u.referral_balance_kes || 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setManagingUser(u)}
                                                    title="Manage Access"
                                                    className={`p-2 rounded-lg border transition-all ${u.is_subscriber === 1
                                                        ? 'bg-brand-purple/5 border-brand-purple/10 text-brand-purple/50 hover:text-brand-purple hover:bg-brand-purple/10'
                                                        : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10'
                                                        }`}
                                                >
                                                    <ShieldCheck size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingUser(u)}
                                                    className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="p-2 rounded-lg bg-red-500/5 border border-red-500/5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setEditingUser(null)} />
                    <form
                        onSubmit={handleUpdateUser}
                        className="relative w-full max-w-lg bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/20">
                                    <Edit2 size={18} />
                                </div>
                                <h3 className="font-black text-white tracking-tight text-lg">Edit DJ Profile</h3>
                            </div>
                            <button type="button" onClick={() => setEditingUser(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                    <input
                                        name="full_name"
                                        defaultValue={editingUser.full_name}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                                    <input
                                        name="phone_number"
                                        defaultValue={editingUser.phone_number}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 font-medium font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Referral Code</label>
                                    <input
                                        name="referral_code"
                                        defaultValue={editingUser.referral_code}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 font-medium font-mono"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Wallet (KES)</label>
                                        <input
                                            name="referral_balance_kes"
                                            type="number"
                                            defaultValue={editingUser.referral_balance_kes}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">Sub Status</label>
                                        <select
                                            name="is_subscriber"
                                            defaultValue={editingUser.is_subscriber}
                                            className="w-full bg-[#111116] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 font-medium appearance-none"
                                        >
                                            <option value="1">PRO (Active)</option>
                                            <option value="0">BASIC (Inactive)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updating}
                                className="w-full py-4 rounded-xl bg-brand-purple text-white text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={14} />
                                {updating ? 'Syncing...' : 'Save Member Details'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {managingUser && (
                <GrantAccessModal
                    user={managingUser}
                    onClose={() => setManagingUser(null)}
                    onRefresh={fetchUsers}
                />
            )}
        </div>
    );
};

export default AdminCommunityDirectory;
