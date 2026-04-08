import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { Users, Search, Shield, ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const Customers: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [customerList, setCustomerList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (session) loadUsers();
    }, [session]);

    const loadUsers = async () => {
        try {
            const data = await request('/api/admin/users');
            setCustomerList(data || []);
        } catch (e) {
            toast.error("Failed to load users");
        }
    };

    const getRoleIcon = (role: string) => {
        if (role === 'admin') return <ShieldCheck size={16} className="text-brand-purple" />;
        return <Shield size={16} className="text-gray-500" />;
    };

    // D1 stores is_subscriber as integer 1/0, not boolean
    const isSubActive = (isSubscriber: any, expiry: string) => {
        if (!isSubscriber || isSubscriber === 0 || !expiry) return false;
        return new Date(expiry) > new Date();
    };

    const filteredUsers = (customerList || []).filter(user =>
        (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="User Database">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:flex-none">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={18} />
                        <input
                            id="customer-search"
                            name="customerSearch"
                            type="text"
                            placeholder="FIND USER..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-16 pr-8 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all w-full lg:w-80 shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-brand-purple/10 border border-brand-purple/20">
                        <p className="text-[11px] font-black text-brand-purple uppercase tracking-widest">{(customerList || []).length} Total Users</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">User</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Role</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Subscription</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Scanning Database...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-40">
                                        <Users size={48} className="text-gray-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">No users found</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-8">
                                    <p className="text-sm font-black text-white tracking-tighter group-hover:text-brand-purple transition-colors">{user.name || 'Unknown'}</p>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">{user.email}</p>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-2">
                                        {getRoleIcon(user.role)}
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'text-brand-purple' : 'text-gray-400'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    {isSubActive(user.is_subscriber, user.subscription_expiry) ? (
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                                    <CheckCircle size={14} /> Active
                                                </p>
                                                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">
                                                    {(() => {
                                                        const diff = new Date(user.subscription_expiry).getTime() - new Date().getTime();
                                                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                                        return days > 0 ? `${days} DAYS LEFT` : 'EXPIRES TODAY';
                                                    })()}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-700 mt-0.5">
                                                    {new Date(user.subscription_expiry).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={async () => {
                                                    if(window.confirm(`REVOKE ACCESS for ${user.email}?`)) {
                                                        try {
                                                            const res = await request('/api/admin/revoke-access', { 
                                                                method: 'POST', 
                                                                body: JSON.stringify({ email: user.email }) 
                                                            });
                                                            if (res.success) {
                                                                toast.success("Access Revoked");
                                                                loadUsers();
                                                            }
                                                        } catch (e) {
                                                            toast.error("Revoke failed");
                                                        }
                                                    }
                                                }}
                                                className="text-[9px] font-black uppercase tracking-tighter text-red-500/50 hover:text-red-500 transition-colors p-2"
                                            >
                                                Revoke
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                            <XCircle size={14} /> Inactive
                                        </p>
                                    )}
                                </td>

                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${user.presence_status === 'online' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {user.presence_status || 'offline'}
                                        </span>
                                    </div>
                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1">
                                        <Clock size={10} /> Seen: {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Never'}
                                    </p>
                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">
                                        Joined: {new Date(user.created_at).toLocaleDateString()}
                                    </p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default Customers;
