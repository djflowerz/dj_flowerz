import React, { useEffect, useState } from 'react';
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Clock, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InstallmentPlan } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke';

const UserInstallments: React.FC = () => {
    const { user } = useAuth();
    const { payInstallment } = useData();
    const [plans, setPlans] = useState<InstallmentPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payingId, setPayingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            if (!user) return;
            try {
                // We use supabase session for Auth header
                const { supabase } = await import('../../utils/supabase');
                const { data: { session } } = await supabase.auth.getSession();
                
                if (!session) throw new Error("Not authenticated");

                const res = await fetch(`${WORKER_URL}/api/installments`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                
                if (!res.ok) throw new Error("Failed to load installments");
                const data = await res.json();
                // Filter locally just in case, though backend should only return user's plans
                const userPlans = Array.isArray(data) ? data.filter(p => p.userId === user.id || p.user_id === user.id) : [];
                setPlans(userPlans);
            } catch (err: any) {
                console.error("Error loading plans:", err);
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
            await payInstallment(planId);
            // The browser will redirect to Paystack, so we might not reach here
        } catch (err) {
            console.error(err);
        } finally {
            setPayingId(null);
        }
    };

    if (loading) {
        return (
            <div className="w-full flex justify-center py-12">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
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
                <p className="text-gray-400 max-w-sm mb-6 text-sm">You don't have any active Lipa Pole Pole (installment) plans. Contact admin to set up a flexible payment plan for premium services.</p>
                <a href="#support" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase transition-colors">
                    Contact Support
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-wide">
                <Clock className="text-brand-purple" />
                My Installment Plans
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatePresence>
                    {plans.map((plan) => {
                        const amountPaid = plan.amountPaid || plan.amount_paid || 0;
                        const totalAmount = plan.totalAmount || plan.total_amount || 0;
                        const installmentsCount = plan.installmentsCount || plan.installments_count || 1;
                        
                        const progress = Math.min(100, Math.round((amountPaid / totalAmount) * 100));
                        const remainingAmount = Math.max(0, totalAmount - amountPaid);
                        const installmentAmount = Math.ceil(totalAmount / installmentsCount);
                        const nextDue = Math.min(installmentAmount, remainingAmount);
                        const isCompleted = plan.status === 'completed' || amountPaid >= totalAmount;

                        return (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#111116] p-6 rounded-3xl border border-white/5 hover:border-brand-purple/30 transition-all duration-300 relative overflow-hidden group"
                            >
                                {/* Background glow effect */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plan Ref</span>
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400 font-mono">
                                                #{plan.id.substring(0, 8)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white capitalize">
                                            Lipa Pole Pole Plan
                                        </h3>
                                    </div>
                                    
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
                                        isCompleted ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                        plan.status === 'frozen' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                        plan.status === 'defaulted' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                        'bg-brand-purple/10 text-brand-purple border border-brand-purple/20'
                                    }`}>
                                        {isCompleted && <CheckCircle2 size={12} />}
                                        {plan.status === 'frozen' && <AlertCircle size={12} />}
                                        {isCompleted ? 'Completed' : plan.status}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-xs font-medium text-gray-400 mb-2">
                                        <span>KES {amountPaid.toLocaleString()} Paid</span>
                                        <span>KES {totalAmount.toLocaleString()} Total</span>
                                    </div>
                                    <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/5">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-gradient-to-r from-brand-purple to-[#ff00ff] relative"
                                        >
                                            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{
                                                backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                                            }} />
                                        </motion.div>
                                    </div>
                                    <div className="mt-2 text-right text-[10px] text-brand-purple font-black">
                                        {progress}% COMPLETE
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Next Payment</p>
                                        <p className="text-sm font-bold text-white flex items-center gap-2">
                                            <CreditCard size={14} className="text-brand-purple" />
                                            KES {nextDue.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Due Date</p>
                                        <p className="text-sm font-bold text-white flex items-center gap-2">
                                            <Calendar size={14} className={plan.status === 'active' ? 'text-green-400' : 'text-gray-400'} />
                                            {plan.nextPaymentDate || plan.next_payment_date ? new Date(plan.nextPaymentDate || plan.next_payment_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Action */}
                                {!isCompleted && plan.status === 'active' && (
                                    <button
                                        onClick={() => handlePay(plan.id)}
                                        disabled={payingId === plan.id}
                                        className="w-full bg-[#1A1A24] hover:bg-brand-purple text-white hover:text-white rounded-xl py-4 font-black text-xs tracking-[0.2em] relative overflow-hidden transition-all duration-300 disabled:opacity-50 group border border-white/5"
                                    >
                                        {payingId === plan.id ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                INITIALIZING...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2 relative z-10">
                                                <Zap size={16} />
                                                PAY NEXT INSTALLMENT
                                            </span>
                                        )}
                                        {/* Hover glare effect */}
                                        <div className="absolute top-0 -inset-full h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                                    </button>
                                )}

                                {plan.status === 'frozen' && (
                                    <div className="w-full bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                                        <p className="text-xs text-orange-400 font-medium">This plan is currently frozen. Please contact admin to resume.</p>
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
