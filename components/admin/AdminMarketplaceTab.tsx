import React, { useState, useEffect } from 'react';
import { 
  Handshake, Search, Filter, ShieldCheck, Clock, 
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  ExternalLink, User, MessageSquare, MoreVertical,
  ChevronRight, ArrowRight, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';

interface EscrowDeal {
  id: string;
  pulse_id: string;
  seller_id: string;
  buyer_id: string;
  amount: number;
  status: 'pending_payment' | 'awaiting_escrow' | 'in_escrow' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
  created_at: string;
  pulse_content?: string;
  seller_handle?: string;
  seller_name?: string;
  buyer_handle?: string;
  buyer_name?: string;
}

export default function AdminMarketplaceTab() {
  const [deals, setDeals] = useState<EscrowDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState<EscrowDeal | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { resolveDispute } = useData();

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/escrow/deals');
      if (!res.ok) throw new Error('Failed to fetch deals');
      const data = await res.json();
      const rawDeals = data.deals || data.results || [];
      setDeals(Array.isArray(rawDeals) ? rawDeals : []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const updateDealStatus = async (dealId: string, newStatus: string) => {
    setIsUpdating(true);
    const prevStatus = deals.find(d => d.id === dealId)?.status;
    
    // Optimistic update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus as any } : d));

    try {
      const res = await fetch(`/api/escrow/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      toast.success(`Deal status updated to ${newStatus}`);
      if (selectedDeal?.id === dealId) {
        setSelectedDeal(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err: any) {
      toast.error(err.message);
      // Revert on error
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: prevStatus as any } : d));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolveDispute = async (dealId: string, resolution: 'release_to_seller' | 'refund_to_buyer') => {
    setIsUpdating(true);
    try {
      const res = await resolveDispute(dealId, resolution);
      if (res.success) {
        toast.success(`Dispute resolved: ${resolution.replace(/_/g, ' ')}`);
        fetchDeals();
        setSelectedDeal(null);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = 
      deal.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.seller_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.buyer_handle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20';
      case 'pending_payment': return 'bg-brand-pink/10 text-brand-pink border-brand-pink/20';
      case 'awaiting_escrow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'in_escrow': return 'bg-brand-purple/10 text-brand-purple border-brand-purple/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'disputed': return 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse';
      default: return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Handshake className="text-brand-purple" size={32} />
            Shield Escrow Registry
          </h3>
          <p className="text-sm text-gray-500 font-medium mt-1">Monitor the Shield Escrow protocol and resolve network node disputes</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchDeals}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-xl"
            title="Refresh Registry"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Active Escrow</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              {deals.filter(d => ['pending_payment', 'awaiting_escrow', 'in_escrow'].includes(d.status)).length}
            </p>
         </div>
         <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Total Volume</p>
            <p className="text-3xl font-black text-brand-cyan tracking-tighter">
              KES {deals.reduce((acc, d) => acc + d.amount, 0).toLocaleString()}
            </p>
         </div>
         <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Fee Yield (7%)</p>
            <p className="text-3xl font-black text-brand-purple tracking-tighter">
              KES {Math.floor(deals.reduce((acc, d) => acc + d.amount, 0) * 0.07).toLocaleString()}
            </p>
         </div>
         <div className="bg-[#0B0B0F] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[10px] text-gray-600 uppercase font-black tracking-[0.2em] mb-1">Success Rate</p>
            <p className="text-3xl font-black text-emerald-500 tracking-tighter">
              {deals.length > 0 ? Math.round((deals.filter(d => d.status === 'completed').length / deals.length) * 100) : 0}%
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
                placeholder="Search Deal #, Seller, or Buyer..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-6 outline-none focus:border-brand-purple/50 transition-all text-sm font-bold"
              />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-2xl py-3 px-6 outline-none focus:border-brand-purple/50 transition-all text-sm font-bold appearance-none cursor-pointer text-gray-400"
              >
                 <option value="all">ALL STATUSES</option>
                 <option value="pending_payment">PENDING PAYMENT</option>
                 <option value="awaiting_escrow">AWAITING ESCROW</option>
                 <option value="in_escrow">IN ESCROW</option>
                 <option value="shipped">SHIPPED</option>
                 <option value="completed">COMPLETED</option>
                 <option value="cancelled">CANCELLED</option>
                 <option value="disputed">DISPUTED</option>
              </select>
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                 <tr>
                    <th className="px-8 py-6">Deal Identity</th>
                    <th className="px-8 py-6">Parties</th>
                    <th className="px-8 py-6">Item Quantum</th>
                    <th className="px-8 py-6">Asset Value</th>
                    <th className="px-8 py-6">Current Protocol</th>
                    <th className="px-8 py-6 text-right">Ops</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] text-sm">
                 {loading ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Synchronizing Pulse Grid Protocol...</td></tr>
                 ) : filteredDeals.length === 0 ? (
                    <tr><td colSpan={6} className="px-8 py-20 text-center text-gray-600 font-bold italic">No trades detected in the current filter wavelength.</td></tr>
                 ) : Array.isArray(filteredDeals) && filteredDeals.map(deal => (
                    <tr key={deal.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                       <td className="px-8 py-6">
                          <div className="flex flex-col">
                             <span className="font-black text-brand-purple tracking-tighter">#{deal.id.split('-').slice(0, 2).join('-')}</span>
                             <span className="text-[10px] text-gray-500 font-bold">{new Date(deal.created_at).toLocaleDateString()}</span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                             <div className="text-right">
                                <p className="text-[11px] font-black text-white truncate max-w-[120px]">{deal.seller_name}</p>
                                <p className="text-[9px] text-brand-cyan font-bold">@S:{deal.seller_handle}</p>
                             </div>
                             <ArrowRight size={14} className="text-gray-700" />
                             <div>
                                <p className="text-[11px] font-black text-white truncate max-w-[120px]">{deal.buyer_name}</p>
                                <p className="text-[9px] text-brand-purple font-bold">@B:{deal.buyer_handle}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <p className="text-[11px] font-black text-white truncate max-w-[200px]" title={deal.pulse_content}>
                            {deal.pulse_content?.slice(0, 40)}...
                          </p>
                       </td>
                       <td className="px-8 py-6 font-black text-white">
                          KES {deal.amount.toLocaleString()}
                       </td>
                       <td className="px-8 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(deal.status)}`}>
                             {deal.status.replace('_', ' ')}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-brand-purple/10 hover:border-brand-purple/30 text-gray-500 hover:text-brand-purple transition-all">
                             <ChevronRight size={18} />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      {/* Deal Drill-down Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-3xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
              <div className="p-8 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
                 <div>
                    <h4 className="text-2xl font-black text-white tracking-tight">Deal Investigation</h4>
                    <p className="text-xs text-brand-purple font-black uppercase tracking-widest mt-1">Transaction Protocol #{selectedDeal.id}</p>
                 </div>
                 <button onClick={() => setSelectedDeal(null)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-2 gap-8 text-sm">
                    <div className="space-y-4">
                       <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest border-b border-white/5 pb-2">Seller Infrastructure</p>
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan font-black">S</div>
                          <div>
                             <p className="font-black text-white">{selectedDeal.seller_name}</p>
                             <p className="text-xs text-brand-cyan font-bold">@ {selectedDeal.seller_handle}</p>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest border-b border-white/5 pb-2">Buyer Infrastructure</p>
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-black">B</div>
                          <div>
                             <p className="font-black text-white">{selectedDeal.buyer_name}</p>
                             <p className="text-xs text-brand-purple font-bold">@ {selectedDeal.buyer_handle}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest border-b border-white/5 pb-2">Deal Context</p>
                    <p className="text-gray-400 text-sm leading-relaxed italic">{selectedDeal.pulse_content}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                       <span className="text-lg font-black text-white tracking-widest uppercase">Contract Value</span>
                       <span className="text-3xl font-black text-brand-cyan">KES {selectedDeal.amount.toLocaleString()}</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest border-b border-white/5 pb-2">State Governance</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       <button 
                         onClick={() => updateDealStatus(selectedDeal.id, 'awaiting_escrow')}
                         disabled={isUpdating}
                         className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedDeal.status === 'awaiting_escrow' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20'}`}
                       >
                         Mark Paid
                       </button>
                       <button 
                         onClick={() => updateDealStatus(selectedDeal.id, 'in_escrow')}
                         disabled={isUpdating}
                         className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedDeal.status === 'in_escrow' ? 'bg-brand-purple text-white border-brand-purple' : 'bg-brand-purple/10 text-brand-purple border-brand-purple/20 hover:bg-brand-purple/20'}`}
                       >
                         Release to Escrow
                       </button>
                       <button 
                         onClick={() => updateDealStatus(selectedDeal.id, 'completed')}
                         disabled={isUpdating}
                         className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedDeal.status === 'completed' ? 'bg-brand-cyan text-black border-brand-cyan' : 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20 hover:bg-brand-cyan/20'}`}
                       >
                         Release to Seller
                       </button>
                       <button 
                         onClick={() => updateDealStatus(selectedDeal.id, 'cancelled')}
                         disabled={isUpdating}
                         className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedDeal.status === 'cancelled' ? 'bg-red-500 text-white border-red-500' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'}`}
                       >
                         Terminate Deal
                       </button>
                    </div>
                 </div>

                  {selectedDeal.status === 'disputed' && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-black uppercase tracking-widest">Dispute Resolution Protocol</span>
                      </div>
                      <p className="text-xs text-gray-400">This transaction has been flagged for manual oversight. Select the final destination of the escrow funds.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleResolveDispute(selectedDeal.id, 'release_to_seller')}
                          disabled={isUpdating}
                          className="py-4 bg-emerald-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                        >
                          Release to Seller
                        </button>
                        <button 
                          onClick={() => handleResolveDispute(selectedDeal.id, 'refund_to_buyer')}
                          disabled={isUpdating}
                          className="py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-400 transition-all"
                        >
                          Refund to Buyer
                        </button>
                      </div>
                    </div>
                  )}
               </div>

              <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                 <button className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Audit Logs</button>
                 <button className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Contact Parties</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
