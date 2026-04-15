// src/components/PushBanner.tsx
import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldCheck, Sparkles } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { cn } from '@/utils';

export const PushBanner: React.FC = () => {
    const { isSubscribed, subscribeToPush, isSupported } = usePushNotifications();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(() => localStorage.getItem('push_banner_dismissed') === 'true');

    useEffect(() => {
        // Show after a delay if not subscribed and not dismissed
        if (isSupported && !isSubscribed && !isDismissed) {
            const timer = setTimeout(() => setIsVisible(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [isSupported, isSubscribed, isDismissed]);

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('push_banner_dismissed', 'true');
    };

    const handleEnable = async () => {
        const success = await subscribeToPush();
        if (success) {
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0B0B0F]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 group">
                {/* ── DESIGN ACCENTS ── */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 blur-[50px] -z-10 group-hover:bg-brand-purple/20 transition-all duration-700" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-brand-cyan/10 blur-[50px] -z-10" />

                <button 
                    onClick={handleDismiss}
                    className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="flex gap-6 items-start">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-cyan p-[1px] flex-shrink-0 animate-pulse">
                        <div className="w-full h-full rounded-2xl bg-[#0B0B0F] flex items-center justify-center">
                            <Bell size={24} className="text-white" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Enable Smart Alerts</h4>
                            <Sparkles size={12} className="text-brand-purple" />
                        </div>
                        <p className="text-[13px] font-bold text-gray-300 leading-relaxed mb-6">
                            Never miss a deal. Get instant push notifications for funded deals, shipping updates, and P2P messages.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleEnable}
                                className="w-full py-4 rounded-2xl bg-white text-[#050507] text-[11px] font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all transform active:scale-95 shadow-xl shadow-white/5"
                            >
                                Notify My Device
                            </button>
                            <div className="flex items-center justify-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                                <ShieldCheck size={10} className="text-emerald-500" />
                                100% SECURE & PRIVATE
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
