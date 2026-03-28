import React from 'react';
import { Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const UpgradeButton = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    if (!user || !user.isSubscriber || user.subscriptionPlan !== 'trial') return null;

    return (
        <button
            onClick={() => navigate('/premium')}
            className="group relative flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2.5 rounded-xl font-bold text-sm shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.5)] transition-all active:scale-95 overflow-hidden"
        >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out" />
            <Crown className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>GET FULL ACCESS</span>
            <Zap className="w-3 h-3 fill-current animate-pulse" />
        </button>
    );
};
