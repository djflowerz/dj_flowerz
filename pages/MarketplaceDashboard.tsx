import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, MessageCircle, CreditCard, AlertTriangle, X,
  Zap, TrendingUp, ChevronRight, DollarSign, Wallet,
  ArrowLeft, ShieldCheck, ShoppingBag, ExternalLink,
  Truck, Package, CheckCircle2, Loader2, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { TrustBadge } from '../components/community/TrustBadge';
import { SellerScorecard } from '../components/community/SellerScorecard';

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
  const navigate = useNavigate();
  const { formatPrice, currency, setCurrency } = useCurrency();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const [dealsResp, postsResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/deals`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses?handle=${user?.handle}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
      ]);
      
      const dealsData = await dealsResp.json();
      const postsData = await postsResp.json();
      
      console.log("[MarketplaceDashboard] Raw Posts Data:", postsData);
      
      setDeals(Array.isArray(dealsData) ? dealsData : []);
      setUserPosts(Array.isArray(postsData) ? postsData.filter((p: any) => p.is_marketplace) : []);
    } catch (e) {
      toast.error("Failed to sync marketplace data");
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

  const handleBoost = async (postId: string) => {
    toast.promise(async () => {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${postId}/boost`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!resp.ok) throw new Error("Boost failed");
      fetchDeals();
      return true;
    }, {
      loading: 'Boosting listing...',
      success: 'Listing boosted! Now at the top of the feed.',
      error: 'Failed to boost listing'
    });
  };

  const handleRequestPayout = async () => {
    if (!payoutAmount || !payoutAccount) return;
    setSubmittingPayout(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/marketplace/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          amount: parseFloat(payoutAmount),
          account_details: payoutAccount
        })
      });
      if (!resp.ok) throw new Error("Payout request failed");
      toast.success("Payout request submitted! Admin will process within 24h.");
      setShowPayoutModal(false);
      setPayoutAmount('');
      setPayoutAccount('');
    } catch (e) {
      toast.error("Failed to submit payout request");
    } finally {
      setSubmittingPayout(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <header className="pt-24 pb-8 flex items-center justify-between">
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                Secure <span className="text-brand-cyan">Escrow Dashboard</span>
              </h1>
              <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">DJ Flowerz Secure Marketplace</p>
           </div>
           <Link to="/community" className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to Feed
           </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           {/* Sidebar Stats */}
           <div className="md:col-span-1 space-y-6">
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                 <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Reputation Status</p>
                 <div className="flex items-center gap-2 text-brand-cyan">
                    <ShieldCheck size={20} />
                    <span className="font-black text-xs">SECURE SYSTEM</span>
                 </div>
              </div>

              {/* Seller Tools */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02]">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Seller Hub</h3>
                 <div className="space-y-3">
                    <button 
                      onClick={() => setShowPayoutModal(true)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-brand-purple/5 border border-brand-purple/10 text-brand-purple hover:bg-brand-purple/10 transition-all group"
                    >
                       <div className="flex items-center gap-2">
                          <Wallet size={14} />
                          <span className="text-[9px] font-black uppercase tracking-widest">Request Payout</span>
                       </div>
                       <ChevronRight size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <div className="pt-2">
                       <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-3">Boost Listings</p>
                       {userPosts.length === 0 ? (
                         <p className="text-[9px] text-gray-500 italic">No active listings to boost</p>
                       ) : (
                         <div className="space-y-2">
                           {userPosts.slice(0, 3).map(post => (
                             <button 
                               key={post.id}
                               onClick={() => handleBoost(post.id)}
                               disabled={Boolean(post.is_featured)}
                               className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left ${
                                 Boolean(post.is_featured)
                                   ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                   : 'bg-white/5 border-white/5 hover:border-brand-cyan/30 text-gray-400 hover:text-brand-cyan'
                               }`}
                             >
                               <div className="min-w-0">
                                 <p className="text-[9px] font-bold truncate">{post.content.substring(0, 20)}...</p>
                                 <p className="text-[8px] opacity-60">{Boolean(post.is_featured) ? 'ACTIVE BOOST' : 'READY TO BOOST'}</p>
                               </div>
                               <Zap size={10} className={Boolean(post.is_featured) ? 'animate-pulse' : ''} />
                             </button>
                           ))}
                         </div>
                       )}
                    </div>
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
                      <DealCard key={deal.id} deal={deal} onUpdate={updateStatus} currentUser={user!} session={session} />
                   ))}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      <AnimatePresence>
        {showPayoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowPayoutModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#16161D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <DollarSign className="text-green-500" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Request Payout</h2>
                <p className="text-white/50 text-sm mb-8 font-medium">Funds will be sent to your registered payment method within 24-48 hours after approval.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Amount to Withdraw ({currency})</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={payoutAmount}
                        onChange={e => setPayoutAmount(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-bold text-white outline-none focus:border-green-500/50 transition-colors"
                        placeholder="0.00"
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 font-black">{currency}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest">Account Details (M-Pesa/Bank)</label>
                    <textarea
                      value={payoutAccount}
                      onChange={e => setPayoutAccount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-brand-purple/50 transition-colors resize-none"
                      placeholder="e.g. M-Pesa 0712345678 or Bank Details..."
                      rows={2}
                    />
                  </div>

                  <button
                    onClick={handleRequestPayout}
                    disabled={submittingPayout || !payoutAmount}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-green-900/20 flex items-center justify-center gap-2"
                  >
                    {submittingPayout ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    {submittingPayout ? 'Processing...' : 'Confirm Payout Request'}
                  </button>

                  <button
                    onClick={() => setShowPayoutModal(false)}
                    className="w-full py-2 text-white/30 hover:text-white/60 text-xs font-black uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DealCard({ deal, onUpdate, currentUser, session }: { deal: Deal, onUpdate: any, currentUser: any, session: any, key?: any }) {
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const isBuyer = deal.buyer_id === currentUser.id;
    const roleLabel = isBuyer ? 'PURCHASE' : 'SALE';
    const statusColor = {
        pending_payment: 'text-amber-400 border-amber-400/20',
        deposited: 'text-brand-cyan border-brand-cyan/20',
        shipped: 'text-brand-purple border-brand-purple/20',
        completed: 'text-emerald-400 border-emerald-400/20',
        disputed: 'text-red-400 border-red-400/20'
    }[deal.status];

    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeLoading, setDisputeLoading] = useState(false);

    const [showShippingModal, setShowShippingModal] = useState(false);
    const [shippingInfo, setShippingInfo] = useState({ company: '', tracking: '' });

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [review, setReview] = useState({ rating: 5, comment: '' });

    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [evidenceDesc, setEvidenceDesc] = useState('');
    const [evidenceFileUrl, setEvidenceFileUrl] = useState('');
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const evidenceInputRef = React.useRef<HTMLInputElement>(null);

    const handleEvidenceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = `${Date.now()}_evidence_${file.name}`;
        toast.promise(async () => {
            const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'x-file-name': fileName,
                    'x-folder': 'dispute-evidence'
                },
                body: await file.arrayBuffer()
            });
            const data = await resp.json();
            if (data.url) setEvidenceFileUrl(data.url);
            return data;
        }, {
            loading: 'Uploading file...',
            success: 'File uploaded',
            error: 'Upload failed'
        });
    };

    const handleSubmitEvidence = async () => {
        if (!evidenceDesc.trim() || !evidenceFileUrl) {
            toast.error("Please provide both a description and a file");
            return;
        }
        setEvidenceLoading(true);
        try {
            const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/deals/${deal.id}/evidence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    file_url: evidenceFileUrl,
                    description: evidenceDesc
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);
            toast.success("Evidence submitted successfully");
            setShowEvidenceModal(false);
            setEvidenceDesc('');
            setEvidenceFileUrl('');
        } catch (err: any) {
            toast.error(`Failed to submit evidence: ${err.message}`);
        } finally {
            setEvidenceLoading(false);
        }
    };

    const handlePaystackPayment = async () => {
       toast.loading("Initializing secure checkout...");
       try {
          const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/deals/${deal.id}/initialize-payment`, {
             method: 'POST',
             headers: {
                'Authorization': `Bearer ${session?.access_token}`
             }
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error);
          
          if (data.authorizationUrl) {
             window.location.href = data.authorizationUrl;
          } else {
             throw new Error("Missing authorization URL");
          }
       } catch (err: any) {
          toast.dismiss();
          toast.error(`Payment failed: ${err.message}`);
       }
    };

    const handleRaiseDispute = async () => {
        if (!disputeReason.trim()) {
            toast.error('Please describe the issue before raising a dispute.');
            return;
        }
        setDisputeLoading(true);
        try {
            const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/escrow/deals/${deal.id}/dispute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ reason: disputeReason })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);
            toast.success('Dispute raised. Our team has been notified and will review within 24h.');
            setShowDisputeModal(false);
            setDisputeReason('');
            onUpdate(deal.id, 'disputed'); // optimistic update
        } catch (err: any) {
            toast.error(`Failed to raise dispute: ${err.message}`);
        } finally {
            setDisputeLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0B0B0F] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">

            {/* Dispute Modal */}
            <AnimatePresence>
            {showDisputeModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowDisputeModal(false); }}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        className="w-full max-w-md bg-[#0F0F13] border border-red-500/20 rounded-3xl p-8 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h2 className="font-black text-white uppercase tracking-tight">Raise Dispute</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Deal #{deal.id.slice(0,8)}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDisputeModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/10 mb-6">
                            <p className="text-[11px] text-amber-400/80 leading-relaxed font-medium">
                                <span className="font-black text-amber-400">Important:</span> Raising a dispute will freeze this transaction and notify our admin team. Only raise a dispute if there is a genuine issue — misuse may result in account restrictions.
                            </p>
                        </div>

                        <div className="mb-5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">What went wrong?</label>
                            <textarea
                                value={disputeReason}
                                onChange={(e) => setDisputeReason(e.target.value)}
                                placeholder="Describe the issue clearly — e.g. item not received, item not as described, seller unresponsive..."
                                rows={5}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-red-400/50 focus:outline-none resize-none transition-all"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDisputeModal(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRaiseDispute}
                                disabled={disputeLoading || !disputeReason.trim()}
                                className="flex-1 py-3 bg-red-500/80 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <AlertTriangle size={14} />
                                {disputeLoading ? 'Submitting...' : 'Confirm Dispute'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

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
                        <h4 className="text-xl font-black text-white mt-1">{formatPrice(Number(deal.amount))}</h4>
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
                   <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl group/seller cursor-pointer" onClick={() => window.open(`/member/${deal.seller_handle}`, '_blank')}>
                       <img src={`https://ui-avatars.com/api/?name=${deal.seller_name || 'U'}`} className="w-8 h-8 rounded-full" alt="" />
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-black truncate">{deal.seller_name}</p>
                            <TrustBadge type="verified" size="xs" showLabel={false} />
                          </div>
                          <p className="text-[10px] text-gray-500">@{deal.seller_handle}</p>
                       </div>
                       <ExternalLink size={12} className="text-gray-600 group-hover/seller:text-brand-purple transition-colors" />
                   </div>
                   
                   {/* Hover/Inline trust summary */}
                   <div className="mt-4 p-4 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/10">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={14} className="text-brand-cyan" />
                        <span className="text-[10px] font-black text-brand-cyan uppercase tracking-widest">Seller Trust Record</span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        This seller uses DJ Flowerz Escrow via Paystack. Funds are only released when you confirm receipt. 
                        Check their <Link to={`/member/${deal.seller_handle}`} className="text-brand-cyan underline">Member Scorecard</Link> for trade history.
                      </p>
                   </div>
                </div>

                <div className="flex flex-col justify-end gap-3">
                   {deal.status === 'pending_payment' && isBuyer && (
                      <div className="space-y-4">
                         <div className="p-5 bg-brand-cyan/10 border border-brand-cyan/20 rounded-2xl">
                            <p className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mb-2 flex items-center gap-2">
                               <ShieldCheck size={14} /> Paystack Secure Escrow
                            </p>
                            <div className="space-y-2 text-[11px] font-bold text-gray-300">
                               <p>1. Pay <span className="text-white font-black text-sm">{formatPrice(Number(deal.amount))}</span> into escrow.</p>
                               <p className="text-[9px] text-gray-500 leading-tight">Your funds will be held by DJ Flowerz until you confirm the item is received and exactly as described.</p>
                            </div>
                         </div>
                         <button 
                           onClick={handlePaystackPayment}
                           className="w-full py-4 bg-brand-cyan text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-cyan/20"
                         >
                            <CreditCard size={16} /> Pay {formatPrice(Number(deal.amount))} via Paystack
                         </button>
                      </div>
                   )}

                   {deal.status === 'shipped' && (
                      <div className="p-4 bg-brand-purple/5 border border-brand-purple/10 rounded-2xl mb-3">
                         <div className="flex items-center gap-2 mb-2">
                            <Truck size={14} className="text-brand-purple" />
                            <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest">Tracking Information</span>
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-white">Carrier: <span className="text-brand-purple">{(deal as any).shipping_company || 'Standard Shipping'}</span></p>
                            <p className="text-xs font-bold text-white">Tracking #: <span className="text-brand-purple">{(deal as any).tracking_number || 'Pending'}</span></p>
                         </div>
                      </div>
                   )}

                   {deal.status === 'deposited' && !isBuyer && (
                      <button 
                        onClick={() => setShowShippingModal(true)}
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

                   {deal.status === 'disputed' && (
                      <div className="w-full py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-3">
                          <div>
                              <p className="text-red-400 font-black text-xs uppercase tracking-widest">⚠ Dispute Under Review</p>
                              <p className="text-[10px] text-gray-500 mt-1">Admin will resolve this within 24–48h.</p>
                          </div>
                          <button 
                             onClick={() => setShowEvidenceModal(true)}
                             className="mx-auto block px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                          >
                             Submit Evidence
                          </button>
                      </div>
                   )}

                   {!['completed', 'disputed'].includes(deal.status) && (
                      <div className="flex gap-2 mt-2">
                        <button 
                           onClick={() => navigate(`/messages?recipientId=${isBuyer ? deal.seller_id : deal.buyer_id}`)}
                           className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                           <MessageCircle size={12} /> Message {isBuyer ? 'Seller' : 'Buyer'}
                        </button>
                        <button 
                           onClick={() => setShowDisputeModal(true)}
                           className="flex-1 py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                           <AlertTriangle size={12} /> Raise Dispute
                        </button>
                      </div>
                   )}

                   {deal.status === 'completed' && (
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 justify-center py-4 text-emerald-400 font-black uppercase text-xs">
                            <CheckCircle2 size={18} /> Transaction Reconciled
                         </div>
                         {isBuyer && (
                            <button 
                              onClick={() => setShowReviewModal(true)}
                              className="w-full py-3 bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-cyan/20 transition-all flex items-center justify-center gap-2"
                            >
                               <ShieldCheck size={14} /> Leave Seller Review
                            </button>
                         )}
                      </div>
                   )}
                </div>
            </div>

            {/* Shipping Modal */}
            <AnimatePresence>
            {showShippingModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowShippingModal(false); }}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        className="w-full max-w-md bg-[#0F0F13] border border-brand-purple/20 rounded-3xl p-8 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-brand-purple/10 text-brand-purple">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <h2 className="font-black text-white uppercase tracking-tight">Shipment Details</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Marking as shipped</p>
                                </div>
                            </div>
                            <button onClick={() => setShowShippingModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Shipping Company</label>
                                <input
                                    type="text"
                                    value={shippingInfo.company}
                                    onChange={(e) => setShippingInfo({ ...shippingInfo, company: e.target.value })}
                                    placeholder="e.g. G4S, Wells Fargo, Pickup Location..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-purple/50 focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Tracking Number / Reference</label>
                                <input
                                    type="text"
                                    value={shippingInfo.tracking}
                                    onChange={(e) => setShippingInfo({ ...shippingInfo, tracking: e.target.value })}
                                    placeholder="Enter the tracking ID or receipt number"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-purple/50 focus:outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => {
                               onUpdate(deal.id, 'shipped', shippingInfo);
                               setShowShippingModal(false);
                            }}
                            className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-purple/20"
                        >
                            Confirm Dispatch
                        </button>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Review Modal */}
            <AnimatePresence>
            {showReviewModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowReviewModal(false); }}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        className="w-full max-w-md bg-[#0F0F13] border border-brand-cyan/20 rounded-3xl p-8 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-brand-cyan/10 text-brand-cyan">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h2 className="font-black text-white uppercase tracking-tight">Rate Your Experience</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Seller Reputation Hub</p>
                                </div>
                            </div>
                            <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-6 flex justify-center gap-2">
                           {[1,2,3,4,5].map(star => (
                              <button 
                                key={star}
                                onClick={() => setReview({ ...review, rating: star })}
                                className={`p-2 transition-all ${review.rating >= star ? 'text-brand-cyan scale-110' : 'text-gray-700 hover:text-gray-500'}`}
                              >
                                 <ShieldCheck size={32} fill={review.rating >= star ? 'currentColor' : 'none'} />
                              </button>
                           ))}
                        </div>

                        <div className="mb-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Detailed Feedback (Optional)</label>
                            <textarea
                                value={review.comment}
                                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                                placeholder="How was the product? Fast shipping? Good communication?"
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-brand-cyan/50 focus:outline-none resize-none transition-all"
                            />
                        </div>

                        <button
                            onClick={async () => {
                               try {
                                  const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/seller/reviews`, {
                                     method: 'POST',
                                     headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session?.access_token}`
                                     },
                                     body: JSON.stringify({
                                        seller_id: deal.seller_id,
                                        deal_id: deal.id,
                                        rating: review.rating,
                                        comment: review.comment
                                     })
                                  });
                                  if (!resp.ok) throw new Error("Failed to submit review");
                                  toast.success("Thank you for your feedback!");
                                  setShowReviewModal(false);
                               } catch (err) {
                                  toast.error("Review submission failed");
                               }
                            }}
                            className="w-full py-4 bg-brand-cyan text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-cyan/20"
                        >
                            Post Review
                        </button>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Evidence Modal */}
            <AnimatePresence>
            {showEvidenceModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowEvidenceModal(false); }}
                >
                    <motion.div
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        className="w-full max-w-md bg-[#0F0F13] border border-red-500/20 rounded-3xl p-8 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h2 className="font-black text-white uppercase tracking-tight">Submit Evidence</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Dispute Resolution</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEvidenceModal(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-all">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Description</label>
                            <textarea
                                value={evidenceDesc}
                                onChange={(e) => setEvidenceDesc(e.target.value)}
                                placeholder="Explain the evidence you are providing..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-red-400/50 focus:outline-none resize-none transition-all"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">File Upload</label>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => evidenceInputRef.current?.click()}
                                    className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    Select File
                                </button>
                                <input
                                    type="file"
                                    ref={evidenceInputRef}
                                    className="hidden"
                                    onChange={handleEvidenceFileUpload}
                                    accept="image/*,application/pdf"
                                />
                                {evidenceFileUrl && (
                                    <span className="text-xs text-green-400 font-bold">File uploaded successfully!</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitEvidence}
                            disabled={evidenceLoading || !evidenceDesc.trim() || !evidenceFileUrl}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {evidenceLoading ? 'Submitting...' : 'Submit Evidence'}
                        </button>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </motion.div>
    );
}

