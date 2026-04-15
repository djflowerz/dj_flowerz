import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, AlertCircle, RefreshCw, Loader2, Wallet, 
    ArrowUpRight, ArrowDownLeft, History, DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { useMyEscrows, EscrowTransaction } from '../hooks/useEscrow';
import { useWallet, WalletTransaction } from '../hooks/useWallet';
import EscrowWidget from '../components/EscrowWidget';
import OffersManager from '../src/components/community/OffersManager';
import { toast } from 'sonner';

const EscrowManager: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [activeTab, setActiveTab] = useState<'buying' | 'selling' | 'offers' | 'courtroom' | 'wallet'>(isAdmin ? 'courtroom' : 'buying');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { balance, transactions: walletTxns, loading: walletLoading, refresh: refreshWallet, withdraw } = useWallet();

    const { escrows: buyingEscrows, loading: buyLoading, refresh: refreshBuying } = useMyEscrows('buyer');
    const { escrows: sellingEscrows, loading: sellLoading, refresh: refreshSelling } = useMyEscrows('seller');
    const { escrows: courtroomEscrows, loading: courtLoading, refresh: refreshCourt } = useMyEscrows('admin');

    if (!user) return <Navigate to="/login" replace />;

    const loading = buyLoading || sellLoading || courtLoading || walletLoading;
    const activeEscrows = 
        activeTab === 'buying' ? buyingEscrows : 
        activeTab === 'selling' ? sellingEscrows : 
        activeTab === 'courtroom' ? courtroomEscrows : [];

    const refresh = () => { refreshBuying(); refreshSelling(); refreshWallet(); if (isAdmin) refreshCourt(); };

    const STATE_COLOR: Record<string, string> = {
        PENDING:   'text-amber-400 bg-amber-500/10',
        FUNDED:    'text-emerald-400 bg-emerald-500/10',
        SHIPPED:   'text-blue-400 bg-blue-500/10',
        DELIVERED: 'text-emerald-400 bg-emerald-500/10',
        RELEASED:  'text-emerald-400 bg-emerald-500/10',
        DISPUTED:  'text-red-400 bg-red-500/10',
        RESOLVED:  'text-emerald-400 bg-emerald-500/10',
        REFUNDED:  'text-emerald-400 bg-emerald-500/10',
        CANCELLED: 'text-gray-500 bg-white/5',
    };

    return (
        <div className="pt-32 pb-24 min-h-screen bg-[#050507] relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-purple/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-brand-purple" size={20} />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Escrow & Clearance</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-display font-black text-white italic tracking-tighter uppercase leading-[0.8] mb-2">
                            Order <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">Clearance</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">P2P Marketplace Lifecycle Management</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={refresh}
                            disabled={loading}
                            className="p-3 glass-card border border-white/10 rounded-xl text-gray-400 hover:text-white transition disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        </button>
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl">
                            {(['buying', 'selling', 'offers', 'wallet', ...(isAdmin ? ['courtroom'] : [])] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setActiveTab(t); setSelectedId(null); }}
                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                        activeTab === t ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {t === 'offers' ? 'Negotiations' : t === 'courtroom' ? 'Courtroom ⚖️' : t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <RefreshCw className="text-brand-purple animate-spin" size={32} />
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Synchronizing Ledger...</p>
                    </div>
                ) : activeTab === 'offers' ? (
                    <OffersManager userId={user.id} />
                ) : activeTab === 'wallet' ? (
                    <WalletOverview 
                        balance={balance} 
                        transactions={walletTxns} 
                        onWithdraw={withdraw} 
                        loading={walletLoading}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Left: Escrow list */}
                        <div className="lg:col-span-2 space-y-3">
                            {activeEscrows.length === 0 ? (
                                <div className="py-16 text-center glass-card rounded-3xl border border-white/5 space-y-4">
                                    <AlertCircle className="mx-auto text-gray-700" size={40} />
                                    <h3 className="text-gray-400 font-black uppercase tracking-[0.3em] text-sm">No Active Escrows</h3>
                                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                                        Buy or sell items in the community to activate escrow.
                                    </p>
                                    <div className="pt-4">
                                        <Link to="/community" className="px-8 py-3 bg-brand-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple/80 transition">
                                            Visit Community
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                activeEscrows.map(escrow => (
                                    <motion.button
                                        key={escrow.id}
                                        onClick={() => setSelectedId(escrow.id === selectedId ? null : escrow.id)}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`w-full text-left glass-card rounded-2xl border transition-all overflow-hidden ${
                                            selectedId === escrow.id
                                                ? 'border-brand-purple/40 shadow-[0_0_20px_rgba(124,58,237,0.1)]'
                                                : 'border-white/5 hover:border-white/15'
                                        }`}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="text-xs font-semibold text-white truncate flex-1">{escrow.item_description}</p>
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${STATE_COLOR[escrow.state] ?? 'text-gray-500 bg-white/5'}`}>
                                                    {escrow.state}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black text-brand-purple">KES {escrow.amount_kes.toLocaleString()}</span>
                                                <span className="text-[9px] text-gray-600">{new Date(escrow.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {selectedId === escrow.id && <div className="h-0.5 bg-gradient-to-r from-brand-purple to-brand-cyan" />}
                                    </motion.button>
                                ))
                            )}
                        </div>

                        {/* Right: Detail widget */}
                        <div className="lg:col-span-3">
                            <AnimatePresence mode="wait">
                                {selectedId ? (
                                    <motion.div
                                        key={selectedId}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <EscrowWidget escrowId={selectedId} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-64 glass-card rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-3"
                                    >
                                        <ShieldCheck size={32} className="text-gray-700" />
                                        <p className="text-xs text-gray-600 font-medium">Select a transaction to view details</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {/* Scammer Reporting Floating Button (Only visible on certain screens if needed) */}
            {activeTab !== 'courtroom' && (
                <div className="fixed bottom-8 right-8 z-50">
                     <button 
                        onClick={() => toast.info('Anti-Scam Shield Active', { description: 'Select a transaction and use the "Report" button if you suspect fraud.' })}
                        className="p-4 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-full text-red-400 shadow-2xl transition group"
                     >
                         <AlertCircle size={24} />
                         <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                             Anti-Scam Center
                         </span>
                     </button>
                </div>
            )}
        </div>
    );
};

export default EscrowManager;

function WalletOverview({ balance, transactions, onWithdraw, loading }: { balance: number; transactions: WalletTransaction[]; onWithdraw: (a: number) => Promise<any>; loading: boolean }) {
    const [withdrawAmount, setWithdrawAmount] = useState('');
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Balance Card */}
            <div className="lg:col-span-1 space-y-6">
                <div className="glass-card rounded-3xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-purple/30 transition-colors" />
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-brand-purple/10 rounded-2xl border border-brand-purple/20">
                                <Wallet className="text-brand-purple" size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available Balance</p>
                                <h2 className="text-4xl font-display font-black text-white italic">
                                    KES <span className="text-brand-purple">{balance.toLocaleString()}</span>
                                </h2>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Request Payout</p>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">KES</span>
                                    <input 
                                        type="number"
                                        placeholder="Min 500"
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-3 text-white text-sm focus:outline-none focus:border-brand-purple transition"
                                    />
                                </div>
                                <button 
                                    onClick={() => onWithdraw(Number(withdrawAmount))}
                                    disabled={loading || !withdrawAmount || Number(withdrawAmount) < 500 || Number(withdrawAmount) > balance}
                                    className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-cyan hover:text-black transition disabled:opacity-50"
                                >
                                    Withdraw
                                </button>
                            </div>
                            <p className="text-[9px] text-gray-600 font-medium italic">
                                * Payouts are processed via Paystack/M-Pesa within 24 hours.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl border border-white/5 p-6 bg-gradient-to-br from-brand-purple/5 to-transparent">
                     <div className="flex items-start gap-4">
                         <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                             <ShieldCheck size={18} />
                         </div>
                         <div className="space-y-1">
                             <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Escrow Trust Shield</h4>
                             <p className="text-[10px] text-gray-500 leading-relaxed">
                                 Funds are held securely by DJ Flowerz. Sellers are paid only after buyers confirm receipt or 7 days pass without dispute.
                             </p>
                         </div>
                     </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-brand-cyan" />
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white italic">Transaction Registry</h3>
                    </div>
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Showing last 50 entries</span>
                </div>

                <div className="space-y-2">
                    {transactions.length === 0 ? (
                        <div className="py-20 text-center glass-card border border-white/5 rounded-3xl opacity-50">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-600">No activity recorded yet</p>
                        </div>
                    ) : (
                        transactions.map(txn => (
                            <div key={txn.id} className="glass-card border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl border ${
                                        txn.type === 'CREDIT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                        txn.type === 'WITHDRAWAL' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                        'bg-white/5 border-white/10 text-gray-400'
                                    }`}>
                                        {txn.type === 'CREDIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-black text-white uppercase tracking-wider">
                                                {txn.type === 'CREDIT' ? 'Sales Revenue' : 'Withdrawal Request'}
                                            </p>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                txn.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                txn.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {txn.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-600 font-medium">
                                            {txn.escrow_id ? `Order Ref: #${txn.escrow_id.slice(-6)}` : `ID: ${txn.id.slice(-8)}`} • {new Date(txn.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${txn.amount_kes > 0 ? 'text-emerald-400' : 'text-white'}`}>
                                        {txn.amount_kes > 0 ? '+' : ''}{txn.amount_kes.toLocaleString()} KES
                                    </p>
                                    <p className="text-[9px] text-gray-700 font-bold uppercase tracking-tighter">Cleared Balance</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
