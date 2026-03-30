import React, { useEffect, useState } from 'react';
import {
  CreditCard, Calendar, CheckCircle2, AlertCircle, Clock,
  ShieldCheck, Zap, Package, ChevronRight, Hourglass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke';

interface InstallmentPlan {
  id: string;
  order_id: string;
  user_id: string;
  total_amount: number;
  deposit_amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending_deposit' | 'active' | 'completed' | 'frozen' | 'defaulted';
  installments_count: number;
  next_payment_date?: string;
  created_at: string;
  // Joined from orders
  customer_name?: string;
  customer_email?: string;
  items?: string;
  order_status?: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pending_deposit: { label: 'Awaiting Deposit', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    active:          { label: 'Active',           cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
    completed:       { label: 'Completed',        cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    frozen:          { label: 'Frozen',           cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    defaulted:       { label: 'Defaulted',        cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-white/5 text-gray-400 border-white/10' };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit ${cfg.cls}`}>
      {status === 'completed' && <CheckCircle2 size={10} />}
      {status === 'pending_deposit' && <Hourglass size={10} />}
      {status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      {cfg.label}
    </span>
  );
};

const UserInstallments: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      if (!user) return;
      try {
        const { supabase } = await import('../../utils/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const res = await fetch(`${WORKER_URL}/api/installments`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to load installments');
        const data = await res.json();
        setPlans(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error loading plans:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [user]);

  const handlePay = async (planId: string) => {
    setPayingId(planId);
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${WORKER_URL}/api/installments/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ planId })
      });

      const data = await res.json();
      if (data.success && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      console.error(err);
      alert('Payment error: ' + err.message);
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-12">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <div className="w-8 h-8 rounded-full border-t-2 border-brand-purple border-solid" />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center gap-3">
        <AlertCircle size={20} />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="bg-[#111116] border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mb-6">
          <ShieldCheck size={32} className="text-brand-purple" />
        </div>
        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">No Active Plans</h3>
        <p className="text-gray-400 max-w-sm mb-6 text-sm">
          You don't have any Lipa Pole Pole plans yet. Choose "Lipa Pole Pole" at checkout to pay for products in installments.
        </p>
        <a href="/store" className="px-6 py-3 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple rounded-xl text-xs font-bold uppercase transition-colors border border-brand-purple/20">
          Shop Now
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="text-brand-purple" size={24} />
        <h2 className="text-2xl font-black text-white uppercase tracking-wide">My Lipa Pole Pole Plans</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {plans.map((plan) => {
            const amountPaid = plan.paid_amount || 0;
            const totalAmount = plan.total_amount || 0;
            const balance = plan.balance ?? (totalAmount - amountPaid);
            const progress = totalAmount > 0 ? Math.min(100, Math.round((amountPaid / totalAmount) * 100)) : 0;
            const isCompleted = plan.status === 'completed' || balance <= 0;
            const isPendingDeposit = plan.status === 'pending_deposit';

            // Parse items from the joined order
            let orderItems: any[] = [];
            try { orderItems = JSON.parse(plan.items || '[]'); } catch {}

            // Per-installment amount (balance evenly split across remaining count)
            const remainingInstallments = Math.max(1, (plan.installments_count || 3) - 1);
            const nextPaymentAmount = Math.min(Math.ceil(balance / remainingInstallments), balance);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111116] p-6 rounded-3xl border border-white/5 hover:border-brand-purple/30 transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-purple/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Header: Order ID + Status */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Package size={10} /> Order
                    </p>
                    <p className="text-xs font-black text-white font-mono">{plan.order_id}</p>
                    {plan.customer_name && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{plan.customer_name}</p>
                    )}
                  </div>
                  <StatusBadge status={plan.status} />
                </div>

                {/* Order Items preview */}
                {orderItems.length > 0 && (
                  <div className="mb-4 p-3 bg-black/30 rounded-xl border border-white/5 space-y-1">
                    {orderItems.slice(0, 2).map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium truncate max-w-[65%]">
                          {item.product_name || item.name}
                        </span>
                        <span className="text-gray-500 font-bold">
                          x{item.quantity} · KES {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {orderItems.length > 2 && (
                      <p className="text-[10px] text-gray-600 font-bold">+{orderItems.length - 2} more item(s)</p>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs font-medium text-gray-400 mb-2">
                    <span>KES {amountPaid.toLocaleString()} paid</span>
                    <span>KES {totalAmount.toLocaleString()} total</span>
                  </div>
                  <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-brand-purple to-[#ff00ff]"
                    />
                  </div>
                  <div className="mt-1.5 text-right text-[10px] text-brand-purple font-black">{progress}% COMPLETE</div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Remaining</p>
                    <p className="text-sm font-black text-white">KES {balance.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Next Due Date</p>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Calendar size={12} className={plan.status === 'active' ? 'text-green-400' : 'text-gray-500'} />
                      {plan.next_payment_date
                        ? new Date(plan.next_payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                        : 'TBD'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {isPendingDeposit && (
                  <div className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <p className="text-xs text-yellow-400 font-bold">Waiting for your deposit payment to be confirmed. If you already paid, it'll update shortly.</p>
                  </div>
                )}

                {!isCompleted && plan.status === 'active' && (
                  <button
                    onClick={() => handlePay(plan.id)}
                    disabled={!!payingId}
                    className="w-full bg-[#1A1A24] hover:bg-brand-purple text-white rounded-xl py-4 font-black text-xs tracking-[0.2em] relative overflow-hidden transition-all duration-300 disabled:opacity-50 border border-white/5 hover:border-transparent group/btn flex items-center justify-center gap-2"
                  >
                    {payingId === plan.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        INITIALIZING...
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        PAY KES {nextPaymentAmount.toLocaleString()}
                        <ChevronRight size={14} className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                      </>
                    )}
                  </button>
                )}

                {isCompleted && (
                  <div className="w-full bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" />
                    <p className="text-xs text-green-400 font-black uppercase tracking-widest">Fully Paid — Order In Processing</p>
                  </div>
                )}

                {plan.status === 'frozen' && (
                  <div className="w-full bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                    <p className="text-xs text-orange-400 font-medium">This plan is currently frozen. Contact admin to resume.</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UserInstallments;
