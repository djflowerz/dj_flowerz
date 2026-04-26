import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Filter, CheckCircle2, XCircle, 
  Clock, RefreshCw, User, ExternalLink, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';

interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  account_details: string;
  created_at: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

export default function AdminPayoutsTab() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts');
      if (!res.ok) throw new Error('Failed to fetch payouts');
      const data = await res.json();
      setPayouts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const updatePayoutStatus = async (id: string, status: 'paid' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this payout as ${status}?`)) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error('Failed to update payout');
      
      toast.success(`Payout marked as ${status}`);
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredPayouts = payouts.filter(p => {
    const matchesSearch = 
      (p.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (p.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20';
      case 'pending': return 'bg-brand-purple/10 text-brand-purple border-brand-purple/20 animate-pulse';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <DollarSign className="text-brand-purple" size={32} />
            Marketplace Payouts
          </h3>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage and process seller withdrawal requests</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchPayouts}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-xl"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Pending Requests</p>
            <p className="text-3xl font-black text-brand-purple tracking-tighter">
              {payouts.filter(p => p.status === 'pending').length}
            </p>
         </div>
         <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Total Paid Out</p>
            <p className="text-3xl font-black text-brand-cyan tracking-tighter">
              KES {payouts.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
            </p>
         </div>
         <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Total Pending</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              KES {payouts.filter(p => p.status === 'pending').reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
            </p>
         </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Seller, Email or ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-6 outline-none focus:border-brand-purple/50 transition-all text-sm font-bold"
              />
           </div>
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="bg-black/40 border border-white/10 rounded-2xl py-3 px-6 outline-none focus:border-brand-purple/50 transition-all text-sm font-bold appearance-none cursor-pointer text-gray-400"
           >
              <option value="all">ALL STATUSES</option>
              <option value="pending">PENDING</option>
              <option value="paid">PAID</option>
              <option value="rejected">REJECTED</option>
           </select>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                 <tr>
                    <th className="px-8 py-6">Request ID</th>
                    <th className="px-8 py-6">Seller</th>
                    <th className="px-8 py-6">Amount</th>
                    <th className="px-8 py-6">Account Details</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-sm">
                 {loading ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Syncing Payout Ledger...</td></tr>
                 ) : filteredPayouts.length === 0 ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-600 font-bold italic">No payout requests found.</td></tr>
                 ) : filteredPayouts.map(payout => (
                    <tr key={payout.id} className="hover:bg-white/[0.02] transition-colors group">
                       <td className="px-8 py-6">
                          <div className="flex flex-col">
                             <span className="font-black text-brand-purple tracking-tighter">#{payout.id.slice(0, 8)}</span>
                             <span className="text-[10px] text-gray-500 font-bold">{new Date(payout.created_at).toLocaleDateString()}</span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                             {payout.avatar_url ? (
                               <img src={payout.avatar_url} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                             ) : (
                               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500">
                                 <User size={14} />
                               </div>
                             )}
                             <div>
                                <p className="font-black text-white">{payout.display_name || 'Unknown User'}</p>
                                <p className="text-[10px] text-gray-500 font-bold">{payout.email}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6 font-black text-white">
                          KES {payout.amount.toLocaleString()}
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-[11px] text-gray-400 font-medium max-w-[200px] truncate" title={payout.account_details}>
                            {payout.account_details}
                          </p>
                       </td>
                       <td className="px-8 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(payout.status)}`}>
                             {payout.status}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          {payout.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => updatePayoutStatus(payout.id, 'paid')}
                                disabled={isUpdating}
                                className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                                title="Mark as Paid"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                              <button 
                                onClick={() => updatePayoutStatus(payout.id, 'rejected')}
                                disabled={isUpdating}
                                className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                title="Reject Request"
                              >
                                <XCircle size={18} />
                              </button>
                            </div>
                          )}
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
