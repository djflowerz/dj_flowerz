import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, ShieldCheck, Clock, CheckCircle2, 
  ArrowLeft, ExternalLink, Package, Truck, 
  AlertCircle, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Deal {
  id: string;
  pulse_id: string;
  seller_id: string;
  buyer_id: string;
  amount: number;
  status: 'pending_payment' | 'deposited' | 'shipped' | 'completed' | 'disputed';
  created_at: string;
  pulse_content?: string;
  seller_handle?: string;
  seller_name?: string;
}

export default function MarketplaceDashboard() {
  const { user, session } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/deals`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await resp.json();
      setDeals(data);
    } catch (e) {
      toast.error("Failed to sync marketplace deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchDeals();
  }, [session]);

  const updateStatus = async (dealId: string, status: string) => {
    toast.promise(async () => {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status })
      });
      if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error);
      }
      fetchDeals();
      return true;
    }, {
      loading: 'Updating deal status...',
      success: 'Status updated!',
      error: (err) => `Failed: ${err.message}`
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <header className="pt-24 pb-8 flex items-center justify-between">
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                Marketplace <span className="text-brand-cyan">Escrow</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Secure Commerce Portal</p>
           </div>
           <Link to="/community" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to Feed
           </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           {/* Sidebar Stats */}
           <div className="md:col-span-1 space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Protection Level</p>
                 <div className="flex items-center gap-2 text-brand-cyan">
                    <ShieldCheck size={20} />
                    <span className="font-black text-xs">TIER 1 SECURE</span>
                 </div>
              </div>
           </div>

           {/* Tabs / Deals list */}
           <div className="md:col-span-3 space-y-6">
              {loading ? (
                <div className="flex justify-center p-12">
                   <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin" />
                </div>
              ) : deals.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                   <ShoppingBag size={48} className="mx-auto text-gray-800 mb-4" />
                   <h3 className="text-xl font-bold">No active deals</h3>
                   <p className="text-gray-500 text-sm mt-2">Your purchases and sales will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {deals.map(deal => (
                      <DealCard key={deal.id} deal={deal} onUpdate={updateStatus} currentUser={user!} />
                   ))}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onUpdate, currentUser }: { deal: Deal, onUpdate: any, currentUser: any }) {
    const isBuyer = deal.buyer_id === currentUser.id;
    const roleLabel = isBuyer ? 'PURCHASE' : 'SALE';
    const statusColor = {
        pending_payment: 'text-amber-400 border-amber-400/20',
        deposited: 'text-brand-cyan border-brand-cyan/20',
        shipped: 'text-brand-purple border-brand-purple/20',
        completed: 'text-emerald-400 border-emerald-400/20',
        disputed: 'text-red-400 border-red-400/20'
    }[deal.status];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0B0B0F] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 flex flex-wrap items-center justify-between gap-6 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-white/5 border ${statusColor}`}>
                       <ShoppingBag size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{roleLabel}</span>
                             <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {deal.status.replace('_', ' ')}
                             </span>
                        </div>
                        <h4 className="text-xl font-black text-white mt-1">KES {Number(deal.amount).toLocaleString()}</h4>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">TX REF: {deal.id.slice(0,13)}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">{new Date(deal.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Item Details</p>
                   <p className="text-sm text-gray-300 italic mb-4 leading-relaxed">"{deal.pulse_content}"</p>
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                       <img src={`https://ui-avatars.com/api/?name=${deal.seller_name || 'U'}`} className="w-8 h-8 rounded-full" alt="" />
                       <div>
                          <p className="text-xs font-black">{deal.seller_name}</p>
                          <p className="text-[10px] text-gray-500">@{deal.seller_handle}</p>
                       </div>
                   </div>
                </div>

                <div className="flex flex-col justify-end gap-3">
                   {deal.status === 'pending_payment' && isBuyer && (
                      <button 
                        onClick={() => onUpdate(deal.id, 'deposited')}
                        className="w-full py-4 bg-brand-cyan text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-cyan/20"
                      >
                         <CheckCircle2 size={16} /> Mark as Paid (M-Pesa)
                      </button>
                   )}

                   {deal.status === 'deposited' && !isBuyer && (
                      <button 
                        onClick={() => onUpdate(deal.id, 'shipped')}
                        className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20"
                      >
                         <Truck size={16} /> Mark as Shipped
                      </button>
                   )}

                   {deal.status === 'shipped' && isBuyer && (
                      <button 
                        onClick={() => onUpdate(deal.id, 'completed')}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                         <Package size={16} /> Confirm Receipt
                      </button>
                   )}

                   {deal.status !== 'completed' && (
                     <button className="w-full py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all mt-2">
                        Raise Dispute
                     </button>
                   )}

                   {deal.status === 'completed' && (
                      <div className="flex items-center gap-2 justify-center py-4 text-emerald-400 font-black uppercase text-xs">
                         <CheckCircle2 size={18} /> Transaction Reconciled
                      </div>
                   )}
                </div>
            </div>
        </motion.div>
    );
}
