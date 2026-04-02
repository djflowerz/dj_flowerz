/**
 * AdminPaymentsTab.tsx
 * 
 * Displays the real-time payments dashboard for DJ Flowerz.
 * Features:
 * - Live Sales Feed (WebSocket powered)
 * - Historical Verified Payments Table
 * - Paystack Manual Sync Button
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    CreditCard, DollarSign, RefreshCw, CheckCircle,
    Search, Clock, ExternalLink, Filter, TrendingUp,
    Smartphone, CreditCard as CardIcon, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { STORAGE_WORKER_URL, getAuthHeader } from '../../utils/r2';

interface Payment {
    id: string;
    customer_email: string;
    amount_kes: number;
    channel: string;
    currency: string;
    created_at: string;
}

interface Props {
    liveSales: any[];
}

const AdminPaymentsTab: React.FC<Props> = ({ liveSales }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const authHeader = await getAuthHeader();
            const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/payments`, {
                headers: authHeader
            });
            const data = await res.json();
            setPayments(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch payments', e);
            toast.error('Failed to load transaction history');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleSync = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            const authHeader = await getAuthHeader();
            const res = await fetch(`${STORAGE_WORKER_URL}/api/admin/sync-paystack`, {
                method: 'POST',
                headers: authHeader
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Sync complete! Recovered ${data.synced} missing payment(s).`);
                fetchPayments();
            } else {
                toast.error('Sync failed: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            toast.error('Sync failed. Check connection.');
        } finally {
            setSyncing(false);
        }
    };

    const filteredPayments = payments.filter(p =>
        p.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        today: payments.filter(p => {
            const pDate = new Date(p.created_at).toDateString();
            const today = new Date().toDateString();
            return pDate === today;
        }).reduce((acc, curr) => acc + curr.amount_kes, 0),
        count: payments.filter(p => {
            const pDate = new Date(p.created_at).toDateString();
            const today = new Date().toDateString();
            return pDate === today;
        }).length
    };

    const getChannelIcon = (channel: string) => {
        switch (channel.toLowerCase()) {
            case 'mobile_money': return <Smartphone size={14} />;
            case 'card': return <CardIcon size={14} />;
            case 'bank': return <Building2 size={14} />;
            default: return <CreditCard size={14} />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── Stats Overview ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[60px] rounded-full -mr-12 -mt-12" />
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24} />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Today's Revenue</p>
                    <h4 className="text-3xl font-black text-white">KES {stats.today.toLocaleString()}</h4>
                </div>

                <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[60px] rounded-full -mr-12 -mt-12" />
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                        <CheckCircle size={24} />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Successful Payments</p>
                    <h4 className="text-3xl font-black text-white">{stats.count}</h4>
                </div>

                <div className="bg-[#0B0B0F] p-8 rounded-[3rem] border border-brand-purple/10 border-dashed flex flex-col items-center justify-center gap-4 group">
                    <p className="text-xs text-gray-500 font-bold text-center">Missing a transaction from Paystack?</p>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 bg-brand-purple text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync Missing Payments'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* ── Live Sales Feed ─────────────────────────────────────────────── */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Live Sales</h3>
                    </div>
                    <div className="space-y-3">
                        {liveSales.length === 0 ? (
                            <div className="p-8 text-center bg-[#0B0B0F] rounded-[2rem] border border-white/5">
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Waiting for sales...</p>
                            </div>
                        ) : (
                            liveSales.map((sale, i) => (
                                <div key={i} className="bg-[#0B0B0F] p-5 rounded-2xl border border-white/5 animate-in slide-in-from-right duration-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-emerald-500 uppercase">Success</span>
                                        <span className="text-[10px] text-gray-600 font-mono">{sale.time}</span>
                                    </div>
                                    <div className="text-lg font-black text-white mb-1">KES {sale.amount.toLocaleString()}</div>
                                    <div className="text-[11px] text-gray-400 truncate font-medium">{sale.email}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Detailed Table ──────────────────────────────────────────────── */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Transaction History</h3>
                        <div className="relative group">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-purple transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by email or ref..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-[#0B0B0F] border border-white/5 rounded-2xl py-2 pl-12 pr-4 text-xs text-white outline-none focus:border-brand-purple/50 transition-all w-64"
                            />
                        </div>
                    </div>

                    <div className="bg-[#0B0B0F] rounded-[2rem] border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Channel</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Reference</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Date/Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-600 uppercase text-[10px] font-black tracking-widest">
                                                Loading transaction history...
                                            </td>
                                        </tr>
                                    ) : filteredPayments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-600 uppercase text-[10px] font-black tracking-widest">
                                                No transactions found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPayments.map((p) => (
                                            <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white group-hover:text-brand-purple transition-colors">{p.customer_email}</div>
                                                    <div className="text-[10px] text-gray-600 font-mono mt-0.5 uppercase">Verified DJ</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-white">KES {p.amount_kes.toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 border border-white/5 rounded-full px-3 py-1 bg-white/2 w-fit uppercase">
                                                        {getChannelIcon(p.channel)}
                                                        {p.channel.replace(/_/g, ' ')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                                                        {p.id}
                                                        <ExternalLink size={10} className="text-gray-700" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <Clock size={12} className="text-gray-600" />
                                                        {new Date(p.created_at).toLocaleDateString('en-KE')} at {new Date(p.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
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
            </div>
        </div>
    );
};

export default AdminPaymentsTab;
