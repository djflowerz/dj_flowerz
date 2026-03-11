import React, { useState } from 'react';
import { Lock, MessageCircle, CreditCard, ShieldAlert, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../context/AuthContext';
import { SUBSCRIPTION_PLANS } from '../constants';
import { toast } from 'sonner';

interface AccessDeniedProps {
    onJoinSuccess?: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ onJoinSuccess }) => {
    const { user, activateTrial } = useAuth() as any;
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedPlanId, setSelectedPlanId] = useState<string>(SUBSCRIPTION_PLANS[0].id);
    const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[0];

    // Paystack Configuration
    const paystackConfig = {
        reference: `pool_${(new Date()).getTime()}`,
        email: user?.email || "guest@djflowerz.co.ke",
        amount: selectedPlan.price * 100, // KES to cents
        publicKey: (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || (import.meta as any).env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_live_default',
        currency: 'KES',
        metadata: {
            type: 'subscription',
            planId: selectedPlan.id,
            userId: user?.id,
            userEmail: user?.email,
            customerName: user?.user_metadata?.full_name || 'DJ',
            custom_fields: []
        }
    };

    const initializePayment = usePaystackPayment(paystackConfig);

    const handleSuccess = (reference: any) => {
        toast.success(`Payment successful! Welcome to the Music Pool.`);
        // Optional: refresh user session or reload to trigger access
        if (onJoinSuccess) {
            onJoinSuccess();
        } else {
            window.location.reload();
        }
    };

    const handleClose = () => {
        toast.error('Payment cancelled.');
    };

    const handleJoinNow = async () => {
        if (!user) {
            toast.info("Please sign in or create an account to start your subscription.");
            navigate('/login', { state: { from: location } });
            return;
        }

        if (selectedPlan.price === 0) {
            // Free Trial
            const trialToast = toast.loading("Activating your free trial...");
            try {
                await activateTrial();
                toast.success("Free trial activated! Enjoy the Music Pool.", { id: trialToast });
                if (onJoinSuccess) onJoinSuccess();
                else window.location.reload();
            } catch (error: any) {
                toast.error(error.message || "Failed to activate trial", { id: trialToast });
            }
            return;
        }

        // Trigger Paystack
        initializePayment({ onSuccess: handleSuccess, onClose: handleClose });
    };

    const handleWhatsAppHelp = () => {
        window.open('https://wa.me/254700000000?text=Hello%20DJ%20Flowerz,%20I%20need%20help%20accessing%20the%20Music%20Pool.', '_blank');
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 w-full relative">
            <div className="absolute inset-0 bg-brand-cyan/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-6xl w-full mx-auto relative z-10 py-12">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in-up">
                    <div className="w-20 h-20 bg-gradient-to-tr from-brand-purple to-brand-cyan rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-purple/20">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Members Only Area</h1>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
                        The DJ Flowerz Music Pool is restricted to active subscribers.
                        Choose a plan below to unlock exclusive service packs, high-quality audio, and video edits.
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                    {SUBSCRIPTION_PLANS.filter(p => p.active).map((plan, index) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`relative cursor-pointer flex flex-col rounded-3xl p-6 border transition-all duration-300 ${selectedPlanId === plan.id
                                ? 'bg-gradient-to-b from-brand-purple/20 to-brand-cyan/10 border-brand-cyan shadow-xl shadow-brand-cyan/20'
                                : 'bg-[#15151A] border-white/5 hover:border-white/20'
                                }`}
                        >
                            {plan.isBestValue && (
                                <div className="absolute -top-3 inset-x-0 flex justify-center">
                                    <span className="bg-brand-cyan text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-cyan/20">
                                        Best Value
                                    </span>
                                </div>
                            )}
                            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 border-b border-white/10 pb-4 mb-4">
                                <span className="text-3xl font-black">KES {plan.price.toLocaleString()}</span>
                                {plan.price > 0 && <span className="text-gray-500 text-sm">/{plan.period}</span>}
                            </div>
                            <ul className="space-y-3 mb-6 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                                        <Check size={16} className={`shrink-0 mt-0.5 ${selectedPlanId === plan.id ? 'text-brand-cyan' : 'text-gray-500'}`} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className={`mt-auto w-full py-3 rounded-xl text-center font-bold text-sm transition-all ${selectedPlanId === plan.id
                                ? 'bg-brand-cyan text-black'
                                : 'bg-white/5 text-white'
                                }`}>
                                {selectedPlanId === plan.id ? 'Selected' : 'Select Plan'}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Actions */}
                <div className="max-w-md mx-auto space-y-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <button
                        onClick={handleJoinNow}
                        className="w-full py-5 bg-gradient-to-r from-brand-purple to-brand-cyan hover:from-purple-500 hover:to-brand-cyan text-white font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-brand-purple/20"
                    >
                        {user ? (
                            <>
                                <CreditCard className="w-6 h-6" />
                                Pay KES {selectedPlan.price.toLocaleString()} via Paystack
                            </>
                        ) : (
                            <>
                                <Lock className="w-6 h-6" />
                                Sign In & Subscribe
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleWhatsAppHelp}
                        className="w-full py-4 bg-[#15151A] hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <MessageCircle className="w-5 h-5 text-green-400" />
                        Contact Admin for Support / M-Pesa Till
                    </button>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <ShieldAlert className="w-4 h-4 opacity-50" />
                    <span className="opacity-50 tracking-widest uppercase font-semibold">Secure Access Control by Gatekeeper</span>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
