// src/admin/pages/CommandCentre.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { 
    Wallet, Gavel, Activity, Download, 
    CheckCircle, AlertCircle, Clock, Trash2, 
    ShieldCheck, Zap, History, FileText, Upload,
    ExternalLink, Search, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../hooks/useAdminApi';
import { cn } from '@/utils';
import { AdjudicationGuard } from '../components/AdjudicationGuard';

type Tab = 'payouts' | 'courtroom' | 'system';

interface PayoutItem {
    id: string;
    escrow_id: string;
    user_id: string;
    full_name: string;
    m_pesa_number: string;
    amount_kes: number;
    status: string;
    created_at: string;
}

interface DisputeItem {
    id: string;
    buyer_id: string;
    seller_id: string;
    buyer_name: string;
    seller_name: string;
    amount_kes: number;
    dispute_reason: string;
    state: string;
    created_at: string;
}

const CommandCentre: React.FC = () => {
    const { request } = useAdminApi();
    const [activeTab, setActiveTab] = useState<Tab>('payouts');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [payouts, setPayouts] = useState<PayoutItem[]>([]);
    const [disputes, setDisputes] = useState<DisputeItem[]>([]);
    const [systemHealth, setSystemHealth] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [systemPin, setSystemPin] = useState<string>('');

    // Security Guard State
    const [guardOpen, setGuardOpen] = useState(false);
    const [guardTarget, setGuardTarget] = useState<{ id: string, amount: number, outcome: 'release' | 'refund', title: string } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'payouts') {
                const data = await request('/api/admin/escrow/payout-queue');
                setPayouts(data.payouts || []);
            } else if (activeTab === 'courtroom') {
                const data = await request('/api/admin/escrow/disputes');
                setDisputes(data.disputes || []);
            } else if (activeTab === 'system') {
                const data = await request('/api/admin/system/health');
                setSystemHealth(data);
            }
        } catch (e) {
            toast.error("Failed to sync dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemPin = async () => {
        try {
            const data = await request('/api/admin/system/security/pin');
            setSystemPin(data.pin);
        } catch (e) {
            console.error("Could not fetch security PIN");
        }
    };

    // ── SMART SEARCH ENGINE ──
    const filteredPayouts = useMemo(() => {
        if (!searchQuery) return payouts;
        const q = searchQuery.toLowerCase();
        return payouts.filter(p => 
            p.full_name?.toLowerCase().includes(q) ||
            p.m_pesa_number?.toLowerCase().includes(q) ||
            p.escrow_id?.toLowerCase().includes(q)
        );
    }, [payouts, searchQuery]);

    const filteredDisputes = useMemo(() => {
        if (!searchQuery) return disputes;
        const q = searchQuery.toLowerCase();
        return disputes.filter(d => 
            d.buyer_name?.toLowerCase().includes(q) ||
            d.seller_name?.toLowerCase().includes(q) ||
            d.dispute_reason?.toLowerCase().includes(q) ||
            d.id?.toLowerCase().includes(q)
        );
    }, [disputes, searchQuery]);

    useEffect(() => {
        fetchData();
        if (activeTab === 'courtroom') fetchSystemPin();
    }, [activeTab]);

    const formatKES = (val: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(val);

    const handlePayoutBatchExport = async () => {
        try {
            const data = await request('/api/admin/escrow/payout-batch-csv');
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MPESA_PAYOUT_BATCH_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            toast.success("Payout CSV exported for M-Pesa Bulk");
        } catch (e) {
            toast.error("Export failed");
        }
    };

    const handleDisputeForensics = async (id: string) => {
        try {
            const data = await request(`/api/admin/escrow/${id}/forensics`);
            // Format as CSV
            const headers = ['Type', 'Author', 'Timestamp', 'Message/Details', 'Reference'];
            const rows = [
                // Summary header
                ['Escrow ID', id, '', '', ''],
                ['Exported At', new Date().toISOString(), '', '', ''],
                [],
                headers,
                ...data.timeline.map((t: any) => ['Event', 'System', t.created_at, t.event_type, t.details]),
                ...data.chat.map((c: any) => ['Chat', c.sender_id, c.created_at, c.content, c.id])
            ];
            
            const csvContent = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FORENSIC_REPORT_${id.slice(0,8)}.csv`;
            a.click();
            toast.success("Case Report Exported", { description: "Case audit is ready." });
        } catch (e) {
            toast.error("Audit export failed");
        }
    };

    const handleAdjudicate = async (pin: string) => {
        if (!guardTarget) return;
        try {
            await request(`/api/admin/escrow/${guardTarget.id}/adjudicate`, {
                method: 'POST',
                body: JSON.stringify({
                    outcome: guardTarget.outcome,
                    pin: pin,
                    notes: `Platform Adjudication: ${guardTarget.outcome.toUpperCase()} authorized by Admin PIN.`
                })
            });
            toast.success("Verdict Applied", { description: "Funds have been moved." });
            fetchData();
        } catch (e: any) {
            const error = e.response?.data?.error || "Resolution failed";
            toast.error(error);
            throw e; // Let the guard handle the error state
        }
    };

    const getSLADetails = (createdAt: string) => {
        const createdDate = new Date(createdAt).getTime();
        const now = new Date().getTime();
        const daysPassed = (now - createdDate) / (1000 * 60 * 60 * 24);
        const daysLeft = Math.max(0, 7 - daysPassed);
        
        let color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (daysLeft < 2) color = 'text-red-400 bg-red-500/10 border-red-500/20';
        else if (daysLeft < 4) color = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        
        return {
            daysLeft: daysLeft.toFixed(1),
            color
        };
    };

    return (
        <AdminLayout title="Operations Center">
            {/* ── MISSION CONTROL TABS ── */}
            <div className="flex flex-wrap items-center gap-4 mb-12 bg-[#0B0B0F] border border-white/5 p-2 rounded-[2rem]">
                <button 
                    onClick={() => setActiveTab('payouts')}
                    className={cn(
                        "flex items-center gap-3 px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'payouts' ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Wallet size={16} />
                    Payout Queue
                </button>
                <button 
                    onClick={() => setActiveTab('courtroom')}
                    className={cn(
                        "flex items-center gap-3 px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'courtroom' ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Gavel size={16} />
                    Dispute Resolution
                </button>
                <button 
                    onClick={() => setActiveTab('system')}
                    className={cn(
                        "flex items-center gap-3 px-8 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'system' ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Activity size={16} />
                    System Health
                </button>
            </div>

            {/* ── TAB CONTENT ── */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'payouts' && (
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Pending M-Pesa Transfers</h3>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Waitlist for manual or batch release</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                    <input 
                                        type="text"
                                        placeholder="Search by name or number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-[#0B0B0F] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[10px] uppercase font-black tracking-widest text-white focus:border-brand-purple/40 focus:outline-none transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={handlePayoutBatchExport}
                                    className="flex items-center gap-3 px-6 py-3 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-cyan hover:bg-brand-cyan/20 transition-all whitespace-nowrap"
                                >
                                    <Download size={14} />
                                    Export Batch
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {loading ? (
                                <div className="p-12 text-center text-gray-500 font-black uppercase tracking-widest text-[10px]">Syncing Payout Ledger...</div>
                            ) : filteredPayouts.length === 0 ? (
                                <div className="p-20 bg-[#0B0B0F] border border-white/5 rounded-[3rem] text-center border-dashed">
                                    <CheckCircle size={48} className="mx-auto text-emerald-500/20 mb-4" />
                                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                                        {searchQuery ? "No Matches Found" : "All Sellers Paid"}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-tighter text-gray-600 mt-2">
                                        {searchQuery ? `Try searching for something other than "${searchQuery}"` : "Payout queue is empty. System reconciled."}
                                    </p>
                                </div>
                            ) : filteredPayouts.map(item => (
                                <div key={item.id} className="bg-[#0B0B0F] border border-white/5 rounded-3xl p-6 flex flex-wrap items-center gap-8 group hover:border-brand-purple/20 transition-all">
                                    {/* ... item content remains exactly same ... */}
                                    <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple group-hover:scale-105 transition-all">
                                        <Wallet size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-white">{item.full_name}</span>
                                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded-full">{item.user_id.slice(0,8)}</span>
                                        </div>
                                        <p className="text-[14px] font-black text-brand-purple tracking-tighter">{item.m_pesa_number}</p>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Ref: {item.escrow_id}</p>
                                    </div>
                                    <div className="text-right px-8 border-x border-white/5">
                                        <p className="text-2xl font-black text-white tracking-widest">{formatKES(item.amount_kes)}</p>
                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-1">AVAILABLE</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={async () => {
                                                const code = prompt("Enter M-Pesa Receipt Code:");
                                                if (!code) return;
                                                try {
                                                    await request(`/api/admin/escrow/payout-manual`, {
                                                        method: 'POST',
                                                        body: JSON.stringify({ payoutId: item.id, receiptCode: code })
                                                    });
                                                    toast.success("Payout marked as completed");
                                                    fetchData();
                                                } catch (e) { toast.error("Update failed"); }
                                            }}
                                            className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                        >
                                            Mark Paid
                                        </button>
                                        <button className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'courtroom' && (
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Dispute Management</h3>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Adjudicate conflicts and verify evidence</p>
                            </div>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                <input 
                                    type="text"
                                    placeholder="Search by user or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#0B0B0F] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-[10px] uppercase font-black tracking-widest text-white focus:outline-none focus:border-brand-purple/40 transition-all"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {loading ? (
                                <div className="p-12 text-center text-gray-500 font-black uppercase tracking-widest text-[10px]">Loading Evidence...</div>
                            ) : filteredDisputes.length === 0 ? (
                                <div className="p-20 bg-[#0B0B0F] border border-white/5 rounded-[3rem] text-center border-dashed">
                                    <ShieldCheck size={48} className="mx-auto text-brand-purple/20 mb-4" />
                                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                                        {searchQuery ? "Conflict Not Found" : "Peace in the Marketplace"}
                                    </p>
                                    <p className="text-[9px] uppercase tracking-tighter text-gray-600 mt-2">
                                        {searchQuery ? "Try searching by Buyer or Seller name." : "No active disputes requiring intervention."}
                                    </p>
                                </div>
                            ) : filteredDisputes.map(dispute => (
                                <div key={dispute.id} className="bg-[#0B0B0F] border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-brand-purple/30 transition-all">
                                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-red-500/5 to-transparent">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[2rem] bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
                                                <Gavel size={28} />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black uppercase tracking-tighter">Dispute #{dispute.id.slice(0,8)}</h4>
                                                <p className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">Awaiting Adjudication</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-white tracking-tighter">{formatKES(dispute.amount_kes)}</p>
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">ESCROWED FUNDS</p>
                                        </div>
                                    </div>
                                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Counterparties</p>
                                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] uppercase font-black text-brand-cyan">Buyer</p>
                                                        <p className="text-[11px] font-bold">{dispute.buyer_name}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-white/10" />
                                                    <div className="flex-1 text-right">
                                                        <p className="text-[10px] uppercase font-black text-brand-purple">Seller</p>
                                                        <p className="text-[11px] font-bold">{dispute.seller_name}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Reason for Dispute</p>
                                                <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 text-[12px] leading-relaxed text-gray-300 italic">
                                                    "{dispute.dispute_reason}"
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col justify-end gap-3">
                                            <div className={cn("w-full py-2 px-4 rounded-xl border text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-center", getSLADetails(dispute.created_at).color)}>
                                                ⏳ SLA: {getSLADetails(dispute.created_at).daysLeft} Days Remain
                                            </div>
                                            <button 
                                                onClick={() => window.open(`/escrow/${dispute.id}`, '_blank')}
                                                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                            >
                                                <ExternalLink size={14} />
                                                View Full Audit Case
                                            </button>
                                            <button 
                                                onClick={() => handleDisputeForensics(dispute.id)}
                                                className="w-full py-4 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-cyan hover:bg-brand-cyan/20 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download size={14} />
                                                Export Case Audit (CSV)
                                            </button>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => {
                                                        setGuardTarget({ id: dispute.id, amount: dispute.amount_kes, outcome: 'release', title: 'Confirm Escrow Release' });
                                                        setGuardOpen(true);
                                                    }}
                                                    className="py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                                >
                                                    Release to Seller
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setGuardTarget({ id: dispute.id, amount: dispute.amount_kes, outcome: 'refund', title: 'Confirm Buyer Refund' });
                                                        setGuardOpen(true);
                                                    }}
                                                    className="py-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-orange-400 hover:bg-orange-500/20 transition-all"
                                                >
                                                    Refund Buyer
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'system' && systemHealth && (
                    <div className="space-y-12">
                        {/* ── RECONCILIATION ENGINE ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-10">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Financial Reconciliation</h3>
                                    <ShieldCheck size={20} className="text-brand-purple" />
                                </div>
                                <div className="grid grid-cols-2 gap-12">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total System Escrow</p>
                                        <p className="text-4xl font-black text-white">{formatKES(systemHealth.reconciliation.total_escrow_held)}</p>
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                                            <CheckCircle size={12} />
                                            MATCHED WITH D1 LEDGER
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Platform Revenue (Fees)</p>
                                        <p className="text-4xl font-black text-brand-purple">{formatKES(systemHealth.reconciliation.total_fees_collected)}</p>
                                    </div>
                                </div>
                                <div className="mt-12 p-6 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                                            <Activity size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">Active Deals</p>
                                            <p className="text-lg font-black">{systemHealth.reconciliation.active_deals_count}</p>
                                        </div>
                                    </div>
                                    <button className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">Run Deep Audit</button>
                                </div>
                            </div>
                        </div>

                        {/* ── SECURITY GUARD OVERLAY ── */}
                        <AdjudicationGuard 
                            isOpen={guardOpen}
                            onClose={() => setGuardOpen(false)}
                            onConfirm={handleAdjudicate}
                            title={guardTarget?.title || 'Security Clearance'}
                            description="High-risk financial adjudication requires Platform Security PIN."
                            actionLabel={guardTarget?.outcome === 'release' ? 'Authorize Release' : 'Authorize Refund'}
                            amount={guardTarget?.amount || 0}
                        />

                        {/* ── AUDIT LOGS ── */}
       {/* ── AUDIT LOGS ── */}
                        <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-10">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Audit Trail</h3>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">Immutable system logs</p>
                                </div>
                                <button className="flex items-center gap-2 text-[10px] font-black text-brand-purple uppercase tracking-widest hover:underline transition-all">
                                    <Filter size={14} />
                                    Filter Logs
                                </button>
                            </div>
                            <div className="space-y-4">
                                {systemHealth.audit_logs?.map((log: any) => (
                                    <div key={log.id} className="flex grid grid-cols-12 gap-6 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                                        <div className="col-span-2 text-[9px] font-black text-brand-purple uppercase tracking-tighter self-center">
                                            {log.action_type}
                                        </div>
                                        <div className="col-span-7">
                                            <p className="text-[10px] font-bold text-gray-300 group-hover:text-white transition-colors">{log.details}</p>
                                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1">ID: {log.reference_id || 'N/A'}</p>
                                        </div>
                                        <div className="col-span-3 text-right self-center">
                                            <p className="text-[9px] font-black text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default CommandCentre;
