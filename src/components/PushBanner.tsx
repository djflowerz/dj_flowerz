import React, { useState, useEffect } from 'react';
import { Bell, X, ShieldCheck, Sparkles, Download } from 'lucide-react';
import { usePWA } from '../../context/PWAContext';

export const PushBanner: React.FC = () => {
    const { 
        isSubscribed, 
        subscribeToPush, 
        isPushSupported: pushSupported,
        isInstallable: installable, 
        installApp 
    } = usePWA();
    
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(() => localStorage.getItem('push_banner_dismissed') === 'true');

    useEffect(() => {
        // Show after a delay if (not subscribed OR installable) and not dismissed
        if ((pushSupported && !isSubscribed) || installable) {
            if (!isDismissed) {
                const timer = setTimeout(() => setIsVisible(true), 5000);
                return () => clearTimeout(timer);
            }
        }
    }, [pushSupported, isSubscribed, installable, isDismissed]);

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('push_banner_dismissed', 'true');
    };

    const handleNotificationEnable = async () => {
        const success = await subscribeToPush();
        if (success) {
            // Don't hide yet if still installable, otherwise hide
            if (!installable) setIsVisible(false);
        }
    };

    const handleInstall = async () => {
        await installApp();
        // The hook handles state update; if no longer installable and subscribed, we can hide
    };

    if (!isVisible) return null;

    // Determine what to show
    const showInstall = installable;
    const showPush = pushSupported && !isSubscribed;

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
                            {showInstall ? <Download size={24} className="text-white" /> : <Bell size={24} className="text-white" />}
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">
                                {showInstall ? 'App Installation' : 'Enable Smart Alerts'}
                            </h4>
                            <Sparkles size={12} className="text-brand-purple" />
                        </div>
                        <p className="text-[13px] font-bold text-gray-300 leading-relaxed mb-6">
                            {showInstall 
                                ? 'Install DJ Flowerz on your home screen for faster access and a premium native experience.'
                                : 'Never miss a deal. Get instant push notifications for funded deals, shipping updates, and P2P messages.'
                            }
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            {showInstall && (
                                <button 
                                    onClick={handleInstall}
                                    className="w-full py-4 rounded-2xl bg-brand-purple text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all transform active:scale-95 shadow-xl shadow-brand-purple/20 flex items-center justify-center gap-2"
                                >
                                    <Download size={14} /> Install App
                                </button>
                            )}
                            
                            {showPush && (
                                <button 
                                    onClick={handleNotificationEnable}
                                    className="w-full py-4 rounded-2xl bg-white text-[#050507] text-[11px] font-black uppercase tracking-widest hover:bg-white/90 transition-all transform active:scale-95 shadow-xl shadow-white/5 flex items-center justify-center gap-2"
                                >
                                    <Bell size={14} /> Notify My Device
                                </button>
                            )}

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
