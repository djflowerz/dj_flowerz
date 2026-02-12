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
    className?: string;
}

const SubscribeButton: React.FC<SubscribeButtonProps> = ({ plan, className }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const config = {
        reference: `sub_${plan.id}_${new Date().getTime()}`,
        email: user?.email || 'guest@djflowerz.com',
        amount: plan.price * 100, // KES cents
        publicKey: import.meta.env.REACT_APP_PAYSTACK_PUBLIC_KEY || '',
        currency: 'KES',
        metadata: {
            custom_fields: [
                {
                    display_name: "Plan Name",
                    variable_name: "plan_name",
                    value: plan.name
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

        initializePayment(onSuccess, onClose);
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
