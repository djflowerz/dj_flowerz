import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

interface SubscriptionTimerProps {
    expiryDate: string | Date | null;
    onExpired?: () => void;
}

const SubscriptionTimer: React.FC<SubscriptionTimerProps> = ({ expiryDate, onExpired }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

    function calculateTimeLeft(): TimeLeft | null {
        if (!expiryDate) return null;

        const difference = +new Date(expiryDate) - +new Date();
        if (difference <= 0) return null;

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    }

    useEffect(() => {
        // Initial calculation
        const initial = calculateTimeLeft();
        setTimeLeft(initial);
        if (!initial && expiryDate) onExpired?.();

        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (!remaining && expiryDate) {
                clearInterval(timer);
                onExpired?.();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [expiryDate]);

    if (!expiryDate || !timeLeft) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-medium">
                <AlertTriangle size={14} className="text-amber-400" />
                <span>ACCESS EXPIRED</span>
            </div>
        );
    }

    const isLow = timeLeft.days < 3;

    return (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl backdrop-blur-md transition-all duration-500 border-2 ${isLow
                ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            }`}>
            <div className={`p-1.5 rounded-lg ${isLow ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                {isLow ? (
                    <AlertTriangle size={16} className="text-red-400" />
                ) : (
                    <ShieldCheck size={16} className="text-emerald-400" />
                )}
            </div>

            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.1em] leading-none mb-1">
                    {isLow ? 'Urgent Renewal' : 'Vip Access'}
                </span>
                <div className={`text-sm font-black font-mono tracking-wider ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                    {timeLeft.days}d : {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
                </div>
            </div>
        </div>
    );
};

export default SubscriptionTimer;
