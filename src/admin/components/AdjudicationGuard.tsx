// src/admin/components/AdjudicationGuard.tsx
import React, { useState } from 'react';
import { ShieldAlert, Lock, X, CheckCircle2 } from 'lucide-react';

interface AdjudicationGuardProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => void;
    title: string;
    description: string;
    actionLabel: string;
    amount: number;
}

export const AdjudicationGuard: React.FC<AdjudicationGuardProps> = ({
    isOpen, onClose, onConfirm, title, description, actionLabel, amount
}) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    
    if (!isOpen) return null;

    const handleVerify = () => {
        if (pin.length === 6) {
            onConfirm(pin);
            setPin('');
            setError(false);
            onClose();
        } else {
            setError(true);
            if (navigator.vibrate) navigator.vibrate(200);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#0B0B0F] border border-white/10 rounded-[3rem] p-10 relative shadow-2xl overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-purple/20 blur-[100px] rounded-full" />
                
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-6">
                        <ShieldAlert size={32} />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">{title}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{description}</p>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-8 text-center">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Transaction Impact</p>
                    <p className="text-3xl font-black text-white tracking-tighter">KES {amount.toLocaleString()}</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 text-center flex items-center justify-center gap-2">
                            <Lock size={12} /> Enter Platform Security PIN
                        </p>
                        <input 
                            type="password"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => {
                                setPin(e.target.value.replace(/\D/g, ''));
                                setError(false);
                            }}
                            className={`w-full bg-black/40 border ${error ? 'border-red-500' : 'border-white/10'} rounded-2xl px-4 py-4 text-center text-2xl font-black tracking-[1em] text-white focus:outline-none focus:border-brand-purple transition-all`}
                            placeholder="••••••"
                        />
                        {error && (
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-3 text-center animate-bounce">
                                Access Denied: Incorrect PIN
                            </p>
                        )}
                    </div>

                    <button 
                        onClick={handleVerify}
                        disabled={pin.length !== 6}
                        className="w-full py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                    >
                        {actionLabel}
                        <CheckCircle2 size={16} />
                    </button>
                </div>
                
                <p className="text-[8px] text-center text-gray-600 uppercase font-bold tracking-widest mt-8">
                    By confirming, you authorize a final financial release from the escrow vault.
                </p>
            </div>
        </div>
    );
};
