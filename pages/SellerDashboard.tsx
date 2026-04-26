import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, TrendingUp, Clock, CheckCircle2, 
  ArrowUpRight, Landmark, History, AlertCircle,
  BarChart3, LayoutDashboard, Store, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';

interface SellerStats {
  total_earned: number;
  pending_escrow: number;
  available_balance: number;
  total_withdrawn: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  account_details: string;
  created_at: string;
}

export default function SellerDashboard() {
  const { session } = useAuth();
  const { formatPrice, currency } = useCurrency();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ average_rating: number, total_reviews: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResp, payoutResp, reviewResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/seller/stats`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/payout/history`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL || '/api'}/seller/reviews`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
      ]);
      
      const [statsData, payoutData, reviewData] = await Promise.all([
        statsResp.json(),
        payoutResp.json(),
        reviewResp.json()
      ]);

      setStats(statsData);
      setPayouts(payoutData);
      setReviews(reviewData.reviews);
      setReviewStats({ average_rating: reviewData.average_rating, total_reviews: reviewData.total_reviews });
    } catch (e) {
      toast.error("Failed to sync financial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const handleRequestPayout = async () => {
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (Number(payoutAmount) > (stats?.available_balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }
    if (!payoutAccount.trim()) {
      toast.error("Please provide payout account details (e.g. M-Pesa number)");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/payout/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          amount: Number(payoutAmount),
          account_details: payoutAccount
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error);
      }

      toast.success("Payout request submitted! Admin will process it within 24h.");
      setShowPayoutModal(false);
      setPayoutAmount('');
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pb-20 pt-24">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
             <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
               Seller <span className="text-brand-cyan">Hub</span>
             </h1>
             <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Manage your marketplace earnings & store</p>
          </div>
          
          <div className="flex gap-3">
             <Link to="/seller/store" className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border border-white/5">
                <Store size={16} /> My Listings
             </Link>
             <Link to="/marketplace/dashboard" className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 border border-white/5">
                <ShoppingCart size={16} /> Order History
             </Link>
          </div>
        </header>

        {/* Financial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <StatCard 
             title="Total Earned" 
             value={formatPrice(stats?.total_earned || 0)} 
             icon={<TrendingUp className="text-emerald-400" />} 
             subtitle="Lifetime marketplace revenue"
           />
           <StatCard 
             title="Pending Escrow" 
             value={formatPrice(stats?.pending_escrow || 0)} 
             icon={<Clock className="text-amber-400" />} 
             subtitle="Locked until buyer confirms receipt"
             highlight
           />
           <StatCard 
             title="Available Balance" 
             value={formatPrice(stats?.available_balance || 0)} 
             icon={<Wallet className="text-brand-cyan" />} 
             subtitle="Ready for withdrawal"
             action={
               <button 
                 onClick={() => setShowPayoutModal(true)}
                 disabled={!stats?.available_balance || stats.available_balance <= 0}
                 className="mt-4 w-full py-3 bg-brand-cyan text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30"
               >
                 Request Payout
               </button>
             }
           />
        </div>

        {/* Secondary Info Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left Col: Activity / Chart placeholder */}
           <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-white/[0.02]">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                       <BarChart3 size={20} className="text-brand-cyan" /> 
                       Performance Overview
                    </h3>
                    <div className="flex gap-2">
                       {['7D', '1M', 'ALL'].map(t => (
                         <button key={t} className="px-3 py-1 text-[10px] font-black rounded-lg bg-white/5 text-gray-500 hover:text-white transition-colors">{t}</button>
                       ))}
                    </div>
                 </div>
                 
                 {/* Simulated Chart Area */}
                 <div className="h-64 flex items-end justify-between gap-2 px-4 mb-4">
                    {[30, 45, 25, 60, 80, 55, 90, 70, 100, 85, 110, 95].map((h, i) => (
                      <motion.div 
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: i * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-brand-cyan/20 to-brand-cyan/60 rounded-t-lg group relative"
                      >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            +{formatPrice(Math.floor(Math.random() * 5000))}
                         </div>
                      </motion.div>
                    ))}
                 </div>
                 <div className="flex justify-between px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                    <span>Jan</span>
                    <span>Jun</span>
                    <span>Dec</span>
                 </div>
              </div>

               {/* Payout History */}
               <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <History size={20} className="text-brand-purple" /> 
                        Payout History
                     </h3>
                  </div>
                  
                  {payouts.length === 0 ? (
                    <div className="py-12 text-center text-gray-600 font-bold uppercase text-[10px] tracking-widest">No payout history yet</div>
                  ) : (
                    <div className="space-y-4">
                       {payouts.map(payout => (
                         <div key={payout.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-4">
                               <div className={`p-3 rounded-xl ${payout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>
                                  <Landmark size={20} />
                               </div>
                               <div>
                                  <p className="text-sm font-black text-white">{formatPrice(payout.amount)}</p>
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(payout.created_at).toLocaleDateString()}</p>
                               </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                               payout.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                               payout.status === 'failed' ? 'bg-red-500/10 text-red-400' : 
                               'bg-amber-400/10 text-amber-400'
                            }`}>
                               {payout.status}
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>

               {/* Recent Reviews */}
               <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <BarChart3 size={20} className="text-brand-cyan" /> 
                        Seller Reputation
                     </h3>
                     <div className="text-right">
                        <div className="text-xl font-black text-brand-cyan">{(reviewStats?.average_rating || 0).toFixed(1)}/5.0</div>
                        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{reviewStats?.total_reviews || 0} REVIEWS</div>
                     </div>
                  </div>

                  {reviews.length === 0 ? (
                    <div className="py-12 text-center text-gray-600 font-bold uppercase text-[10px] tracking-widest">No reviews received yet</div>
                  ) : (
                    <div className="space-y-6">
                       {reviews.map(review => (
                          <div key={review.id} className="p-6 rounded-3xl bg-white/[0.01] border border-white/5">
                             <div className="flex items-center gap-3 mb-4">
                                <img src={review.buyer_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.buyer_id}`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                                <div>
                                   <p className="text-xs font-black text-white">{review.buyer_name}</p>
                                   <div className="flex gap-0.5 mt-0.5">
                                      {[1,2,3,4,5].map(s => (
                                         <div key={s} className={`w-1.5 h-1.5 rounded-full ${s <= review.rating ? 'bg-brand-cyan' : 'bg-white/10'}`} />
                                      ))}
                                   </div>
                                </div>
                                <div className="ml-auto text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                   {new Date(review.created_at).toLocaleDateString()}
                                </div>
                             </div>
                             <p className="text-sm text-gray-400 leading-relaxed italic font-medium">"{review.comment || 'No comment provided'}"</p>
                          </div>
                       ))}
                    </div>
                  )}
               </div>
           </div>

           {/* Right Col: Payout Status / Policy */}
           <div className="space-y-6">
              <div className="glass-panel rounded-3xl p-8 border border-white/5 bg-white/[0.02]">
                 <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 mb-6">
                    <Landmark size={20} className="text-brand-purple" />
                    Payout Rules
                 </h3>
                 <ul className="space-y-4">
                    <li className="flex gap-3">
                       <div className="mt-1"><CheckCircle2 size={14} className="text-emerald-400" /></div>
                       <p className="text-xs text-gray-400 leading-relaxed"><span className="text-white font-bold">10% Commission</span> automatically deducted on every completed sale.</p>
                    </li>
                    <li className="flex gap-3">
                       <div className="mt-1"><CheckCircle2 size={14} className="text-emerald-400" /></div>
                       <p className="text-xs text-gray-400 leading-relaxed"><span className="text-white font-bold">48h Hold</span> on large first-time payouts for security verification.</p>
                    </li>
                    <li className="flex gap-3">
                       <div className="mt-1"><CheckCircle2 size={14} className="text-emerald-400" /></div>
                       <p className="text-xs text-gray-400 leading-relaxed">Payouts via <span className="text-white font-bold">M-Pesa</span> are typically processed within 2-6 hours.</p>
                    </li>
                 </ul>
              </div>

              <div className="p-6 rounded-3xl bg-amber-400/5 border border-amber-400/10">
                 <div className="flex items-center gap-2 mb-3 text-amber-400">
                    <AlertCircle size={18} />
                    <span className="font-black text-xs uppercase tracking-widest">Seller Protection</span>
                 </div>
                 <p className="text-[11px] text-gray-500 leading-relaxed">
                    Always use the platform's escrow system. Transactions made outside of DJ Flowerz are NOT protected and may lead to account suspension.
                 </p>
              </div>
           </div>
        </div>

        {/* Payout Request Modal */}
        <AnimatePresence>
          {showPayoutModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="w-full max-w-md bg-[#0F0F13] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
               >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-cyan to-brand-purple" />
                  
                  <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Request <span className="text-brand-cyan">Payout</span></h2>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">Funds will be sent to your preferred account</p>
                  
                  <div className="space-y-6">
                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Amount to Withdraw ({currency})</label>
                        <div className="relative">
                           <input 
                             type="number" 
                             value={payoutAmount}
                             onChange={(e) => setPayoutAmount(e.target.value)}
                             placeholder="e.g. 5000"
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-white focus:border-brand-cyan/50 focus:outline-none transition-all placeholder:text-gray-800"
                           />
                           <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-cyan">MAX: {formatPrice(stats?.available_balance || 0)}</div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">M-Pesa Number / Bank Details</label>
                        <textarea 
                          value={payoutAccount}
                          onChange={(e) => setPayoutAccount(e.target.value)}
                          placeholder="e.g. M-Pesa: 0712345678"
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-brand-cyan/50 focus:outline-none transition-all placeholder:text-gray-800 resize-none"
                        />
                     </div>

                     <div className="flex gap-4 pt-4">
                        <button 
                          onClick={() => setShowPayoutModal(false)}
                          className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 transition-all"
                        >
                           Cancel
                        </button>
                        <button 
                          onClick={handleRequestPayout}
                          disabled={submitting || !payoutAmount || !payoutAccount}
                          className="flex-1 py-4 bg-brand-cyan text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                        >
                           {submitting ? 'Processing...' : 'Confirm Request'}
                           <ArrowUpRight size={16} />
                        </button>
                     </div>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle, highlight, action }: { title: string, value: string, icon: React.ReactNode, subtitle: string, highlight?: boolean, action?: React.ReactNode }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`relative overflow-hidden p-8 rounded-[2.5rem] border transition-all ${
        highlight 
          ? 'bg-gradient-to-br from-brand-cyan/10 to-transparent border-brand-cyan/20 shadow-lg shadow-brand-cyan/5' 
          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
      }`}
    >
       <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</p>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
             {icon}
          </div>
       </div>
       <h2 className="text-3xl font-black tracking-tighter mb-1">{value}</h2>
       <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{subtitle}</p>
       {action && action}
    </motion.div>
  );
}
