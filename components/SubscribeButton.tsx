import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface SubscribeButtonProps {
    plan: {
        id: string;
        name: string;
        price: number;
        isTrial?: boolean;
    };
    referralInfo?: {
        code: string;
        discount: number;
        discountType?: 'flat' | 'percentage';
        referrerId: string;
    };
    className?: string;
}

const SubscribeButton: React.FC<SubscribeButtonProps> = ({ plan, referralInfo, className }) => {
    const { user, activateTrial } = useAuth();
    const { isFirstTimeSubscriber, referralSettings } = useData();
    const navigate = useNavigate();
    const [isFirstTimer, setIsFirstTimer] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (user?.id) {
            isFirstTimeSubscriber(user.id).then(setIsFirstTimer);
        }
    }, [user?.id, isFirstTimeSubscriber]);

    const calculateAmount = () => {
        let basePrice = plan.price;
        let discount = 0;
        let discountType: 'flat' | 'percentage' = 'percentage';

        // 1. Check for manual referral code first (usually higher precedence)
        if (referralInfo) {
            discount = referralInfo.discount;
            discountType = referralInfo.discountType || 'percentage';
        }
        // 2. Otherwise check for first-time discount
        else if (isFirstTimer && referralSettings.firstTimeDiscountEnabled) {
            discount = referralSettings.firstTimeDiscount || 0;
            discountType = referralSettings.firstTimeDiscountType || 'percentage';
        }

        if (discountType === 'flat') {
            return Math.max(0, Math.round((basePrice - discount) * 100));
        }

        // Percentage discount
        return Math.round(basePrice * (1 - (discount / 100))) * 100;
    };

    const finalAmount = calculateAmount();

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payments/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'subscription',
                    amount: finalAmount, // KES kobo
                    email: user?.email,
                    metadata: {
                        userId: user?.id,
                        userEmail: user?.email,
                        customerName: user?.name || 'Guest',
                        plan: plan.name,
                        planId: plan.id,
                        referralCode: referralInfo?.code,
                        referrerId: referralInfo?.referrerId,
                        discount: referralInfo?.discount || (isFirstTimer ? referralSettings?.firstTimeDiscount : 0),
                        discountType: referralInfo?.discountType || referralSettings?.firstTimeDiscountType || 'percentage',
                    },
                    callback_url: `${window.location.origin}/success`
                })
            });

            const data = await response.json();
            if (data.authorizationUrl) {
                window.location.href = data.authorizationUrl;
            } else {
                throw new Error(data.error || "Failed to initialize payment");
            }
        } catch (error: any) {
            console.error('Payment Error:', error);
            toast.error(error.message || "Payment initialization failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleTrialActivation = async () => {
        if (!user) {
            navigate('/login', { state: { from: '/music-pool' } });
            return;
        }

        if (user.hasUsedTrial) {
            alert("You have already used your free trial.");
            return;
        }

        setLoading(true);
        try {
            await activateTrial();
            navigate('/success', {
                state: {
                    type: 'subscription',
                    reference: `trial_${user.id}_${Date.now()}`,
                    amount: 0,
                    plan: plan.name,
                    email: user?.email,
                    date: new Date().toLocaleDateString()
                }
            });
        } catch (error: any) {
            alert(error.message || "Failed to activate trial");
        } finally {
            setLoading(false);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();

        if (plan.isTrial) {
            handleTrialActivation();
            return;
        }

        if (!user) {
            navigate('/login', { state: { from: '/music-pool' } });
            return;
        }

        handleSubscribe();
    };

    return (
        <button
            onClick={handleClick}
            className={className}
            disabled={loading}
        >
            {loading ? 'Activating...' : plan.isTrial ? 'Start Free Trial' : 'Subscribe Now'}
        </button>
    );
};

export default SubscribeButton;
