import React, { useState, useEffect } from 'react';
import { Lock, MessageCircle, CreditCard, ShieldAlert, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { toast } from 'sonner';
import { useCart } from '../context/CartContext';

interface AccessDeniedProps {
    onJoinSuccess?: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ onJoinSuccess }) => {
    const { user, refreshProfile } = useAuth() as any;
    const { subscriptionPlans, plansLoading } = useData();
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();
    const [isProcessing, setIsProcessing] = useState(false);

    const eligiblePlans = subscriptionPlans.filter(p => p.active);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    
    // Stealth Redirect: If accessed by a non-subscriber/non-admin, redirect to Home.
    // Effectively hides the "Subscription Plans" page from the public eye.
    useEffect(() => {
        if (!plansLoading && !user?.isSubscriber && !user?.isAdmin) {
            navigate('/', { replace: true });
        }
    }, [user, plansLoading, navigate]);

    // Set initial selection when plans load
    useEffect(() => {
        if (eligiblePlans.length > 0 && !selectedPlanId) {
            setSelectedPlanId(eligiblePlans[0].id);
        }
    }, [eligiblePlans, selectedPlanId]);

    const selectedPlan = eligiblePlans.find(p => p.id === selectedPlanId) || eligiblePlans[0];
    
    const handleJoinNow = async () => {
        if (!user) {
            toast.info("Please sign in to subscribe.");
            navigate('/login', { state: { from: location } });
            return;
        }



        // Check for Original VITE_PLAN links first
        const planUrlMap: Record<string, string | undefined> = {
            'weekly': (import.meta as any).env.VITE_PLAN_1_WEEK,
            'monthly': (import.meta as any).env.VITE_PLAN_1_MONTH,
            '3months': (import.meta as any).env.VITE_PLAN_3_MONTHS,
            '6months': (import.meta as any).env.VITE_PLAN_6_MONTHS,
            'yearly': (import.meta as any).env.VITE_PLAN_12_MONTHS,
        };

        const directUrl = planUrlMap[selectedPlan?.id];
        if (directUrl) {
            window.location.href = directUrl;
            return;
        }

        // Fallback: Direct Paystack Redirect Payment Initialization API
        setIsProcessing(true);
        try {
            const response = await fetch('/api/payments/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'subscription',
                    planId: selectedPlan?.id,
                    amount: Math.round((selectedPlan?.price || 0) * 100),
                    email: user?.email || '',
                    metadata: {
                        userId: user?.id,
                        customerName: user?.name || user?.email?.split('@')[0],
                        planName: selectedPlan?.name,
                        plan_type: selectedPlan?.id, // Explicitly pass plan_type for webhook processing
                        type: 'subscription'
                    },
                    callback_url: `${window.location.origin}/checkout`
                })
            });

            const data = await response.json();
            if (data.authorizationUrl) {
                window.location.href = data.authorizationUrl;
            } else {
                throw new Error(data.error || "Failed to initialize payment");
            }
        } catch (err: any) {
            console.error('Payment Error:', err);
            toast.error(err.message || "Payment initialization failed. Please try again.");
            setIsProcessing(false);
        }
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
                        Premium features are restricted to active subscribers.
                        Access exclusive service packs, high-quality audio, and video edits by joining the community.
                    </p>
                </div>

                {plansLoading && eligiblePlans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin" />
                        <p className="text-gray-400 font-medium animate-pulse">Loading subscription plans...</p>
                    </div>
                ) : (
                    <>
                        {/* Plans Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                    {eligiblePlans.map((plan, index) => (
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
                                <span className="text-3xl font-black">KES {(plan.price ?? 0).toLocaleString()}</span>
                                {(plan.price ?? 0) > 0 && <span className="text-gray-500 text-sm">/{plan.period}</span>}

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
                            disabled={isProcessing}
                            className="w-full py-5 bg-gradient-to-r from-brand-purple to-brand-cyan hover:from-purple-500 hover:to-brand-cyan text-white font-black text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-brand-purple/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Initializing Payment...</span>
                                </div>
                            ) : user ? (
                                <>
                                    <CreditCard className="w-6 h-6" />
                                    {selectedPlan ? `Pay KES ${selectedPlan.price.toLocaleString()} via Paystack` : 'Select a Plan'}
                                </>
                            ) : (
                                <>
                                    <Lock className="w-6 h-6" />
                                    Sign In & Subscribe
                                </>
                            )}
                        </button>

                        {user && (
                            <button
                                onClick={async () => {
                                    setIsProcessing(true);
                                    toast.loading("Verifying your subscription status...");
                                    try {
                                        await refreshProfile();
                                        toast.dismiss();
                                        toast.success("Profile refreshed!");
                                    } catch (err) {
                                        toast.dismiss();
                                        toast.error("Failed to refresh status.");
                                    } finally {
                                        setIsProcessing(false);
                                    }
                                }}
                                disabled={isProcessing}
                                className="w-full py-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Check size={18} />
                                I've Already Paid - Refresh Access
                            </button>
                        )}
                        
                        <button
                            onClick={handleWhatsAppHelp}
                            className="w-full py-4 bg-[#15151A] hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <MessageCircle className="w-5 h-5 text-green-400" />
                            Contact Admin for Support / M-Pesa Till
                        </button>
                    </div>

                    </>
                )}

                <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <ShieldAlert className="w-4 h-4 opacity-50" />
                    <span className="opacity-50 tracking-widest uppercase font-semibold">Secure Access Control by Gatekeeper</span>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
