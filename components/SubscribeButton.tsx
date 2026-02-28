import React from 'react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SubscribeButtonProps {
    plan: {
        id: string;
        name: string;
        price: number;
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
    const { user } = useAuth();
    const navigate = useNavigate();

    const calculateAmount = () => {
        if (!referralInfo) return Math.round(plan.price * 100);

        if (referralInfo.discountType === 'flat') {
            return Math.max(0, Math.round((plan.price - referralInfo.discount) * 100));
        }

        // Default to percentage (round KES amount first, then multiply by 100 for cents)
        return Math.round(plan.price * (1 - (referralInfo.discount / 100))) * 100;
    };

    const finalAmount = calculateAmount();

    const config = {
        reference: `sub_${plan.id}_${new Date().getTime()}`,
        email: user?.email || 'guest@djflowerz.com',
        amount: finalAmount, // KES cents
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.REACT_APP_PAYSTACK_PUBLIC_KEY || '',
        currency: 'KES',
        metadata: {
            type: 'subscription',
            userId: user?.id,
            userEmail: user?.email,
            customerName: user?.name || 'Guest',
            plan: plan.name,
            planId: plan.id,
            referralCode: referralInfo?.code,
            referrerId: referralInfo?.referrerId,
            discount: referralInfo?.discount,
            discountType: referralInfo?.discountType || 'percentage',
            custom_fields: [
                {
                    display_name: "Plan Name",
                    variable_name: "plan_name",
                    value: plan.name
                },
                {
                    display_name: "Referral Code",
                    variable_name: "referral_code",
                    value: referralInfo?.code || ""
                }
            ]
        }
    };

    const initializePayment = usePaystackPayment(config);

    const onSuccess = (reference: any) => {
        navigate('/success', {
            state: {
                type: 'subscription',
                reference: reference.reference,
                amount: plan.price,
                plan: plan.name,
                email: user?.email,
                discount: referralInfo?.discount || 0,
                referrerId: referralInfo?.referrerId,
                date: new Date().toLocaleDateString()
            }
        });
    };

    const onClose = () => {
        console.log('Payment closed');
    };

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();

        if (!config.publicKey) {
            alert("Payment configuration error: Missing Public Key");
            return;
        }

        if (!user) {
            // Store return url?
            navigate('/login', { state: { from: '/music-pool' } });
            return;
        }

        initializePayment({ onSuccess, onClose });
    };

    return (
        <button
            onClick={handleClick}
            className={className}
        >
            Subscribe Now
        </button>
    );
};

export default SubscribeButton;
