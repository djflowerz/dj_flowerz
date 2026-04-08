import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, DollarSign, Heart, Search } from 'lucide-react';
import { toast } from 'sonner';

const Payments: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'sale' | 'tip'>('all');
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        if (session) loadData();
    }, [session]);

    const syncPaystack = async () => {
        setSyncing(true);
        try {
            const result = await request('/api/admin/sync-paystack', { method: 'POST' });
            toast.success(`Synced ${result.synced} new transaction(s) from Paystack`);
            await loadData();
        } catch (e) {
            toast.error('Paystack sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const loadData = async () => {
        try {
            const [paymentsData, tipsData] = await Promise.all([
                request('/api/admin/payments'),
                request('/api/admin/finances/tips')
            ]);

            const normalizedPayments = (Array.isArray(paymentsData) ? paymentsData : []).map((p: any) => ({
                id: p.id,
                email: p.customer_email || 'Anonymous',
                amount: p.amount_kes || 0,
                method: p.method || 'Paystack',
                type: 'sale',
                status: p.status || 'success',
                createdAt: p.created_at
            }));

            const normalizedTips = (Array.isArray(tipsData) ? tipsData : []).map((t: any) => ({
                id: t.id,
                email: t.donor_email || 'Anonymous',
                name: t.donor_name,
                amount: t.amount || 0,
                method: 'Direct Tip',
                type: 'tip',
                status: t.status || 'success',
                createdAt: t.created_at
            }));

            const combined = [...normalizedPayments, ...normalizedTips]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setTransactions(combined);
        } catch (e) {
            toast.error("Failed to load financial data");
        }
    };

    const filteredTransactions = transactions.filter(t => 
        filter === 'all' ? true : t.type === filter
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <AdminLayout title="Financial Intelligence">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        All Signals
                    </button>
                    <button 
                        onClick={() => setFilter('sale')}
                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'sale' ? 'bg-brand-cyan text-white shadow-lg shadow-brand-cyan/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        Sales Only
                    </button>
                    <button 
                        onClick={() => setFilter('tip')}
                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'tip' ? 'bg-brand-pink text-white shadow-lg shadow-brand-pink/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        Tips Only
                    </button>
                </div>

                <div className="flex gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Total Processed</p>
                        <p className="text-xl font-black text-white tracking-tighter">
                            {formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0))}
                        </p>
                    </div>
                    <button
                        onClick={syncPaystack}
                        disabled={syncing}
                        className="px-6 py-3 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {syncing ? 'Syncing...' : '⟳ Sync Paystack'}
                    </button>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Signal Origin</th>
                            <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Transaction ID</th>
                            <th className="px-10 py-10 text-[11px) font-black uppercase tracking-[0.3em] text-gray-500">Type</th>
                            <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Method</th>
                            <th className="px-10 py-10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 text-right">Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-10 py-32 text-center text-gray-600 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                                    Decoding cryptographic ledger...
                                </td>
                            </tr>
                        ) : filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-10 py-32 text-center text-gray-600 font-black uppercase tracking-[0.3em] text-[10px]">
                                    No transaction signals detected in this range
                                </td>
                            </tr>
                        ) : filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-10 py-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${tx.type === 'tip' ? 'bg-brand-pink/10 text-brand-pink' : 'bg-brand-cyan/10 text-brand-cyan'}`}>
                                            {tx.type === 'tip' ? <Heart size={20} /> : <CreditCard size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white tracking-tighter truncate max-w-[200px]">
                                                {tx.name || tx.email}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-10 py-10">
                                    <p className="text-[11px] font-black text-gray-400 font-mono tracking-widest">{tx.id.slice(0, 16)}...</p>
                                </td>
                                <td className="px-10 py-10">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${tx.type === 'tip' ? 'bg-brand-pink/10 text-brand-pink border border-brand-pink/20' : 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20'}`}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="px-10 py-10">
                                    <p className="text-[11px] font-black text-white uppercase tracking-[0.1em]">{tx.method}</p>
                                </td>
                                <td className="px-10 py-10 text-right">
                                    <p className="text-lg font-black text-emerald-400 tracking-tighter">{formatCurrency(tx.amount)}</p>
                                    <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest mt-1">CONFIRMED</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default Payments;
