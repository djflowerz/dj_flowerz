import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
    expiryDate: string;
    variant?: 'default' | 'premium';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiryDate, variant = 'default' }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [isUrgent, setIsUrgent] = useState(false);
    const [isWarning, setIsWarning] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiryDate).getTime();

            if (isNaN(expiry)) {
                setTimeLeft(null);
                setIsUrgent(false);
                setIsWarning(false);
                return;
            }

            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
                setIsUrgent(true);
                setIsWarning(false);
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setIsUrgent(d === 0 && h < 24);
            setIsWarning(d > 0 && d < 3);
            setTimeLeft({ d, h, m, s });
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timer);
    }, [expiryDate]);

    if (!timeLeft) return null;

    if (variant === 'premium') {
        const units = [
            { label: 'Days', value: timeLeft.d },
            { label: 'Hours', value: timeLeft.h },
            { label: 'Mins', value: timeLeft.m },
            { label: 'Secs', value: timeLeft.s }
        ];

        return (
            <div className="flex items-center gap-2">
                {units.map((unit, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg border border-white/10 glass-panel font-black text-lg md:text-xl ${idx === 0 ? 'text-brand-purple' : 'text-white'}`}>
                            {unit.value.toString().padStart(2, '0')}
                        </div>
                        <span className="text-[8px] uppercase tracking-tighter mt-1 text-gray-500 font-bold">{unit.label}</span>
                    </div>
                ))}
            </div>
        );
    }

    const statusClasses = isUrgent
        ? "bg-red-500/20 text-red-500 border-red-500/30"
        : isWarning
            ? "bg-orange-500/20 text-orange-500 border-orange-500/30"
            : "bg-brand-purple/20 text-brand-purple border-brand-purple/30";

    return (
        <div className={`flex items-center gap-2 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors duration-500 ${statusClasses}`}>
            <Clock size={10} className={isUrgent ? "animate-pulse" : ""} />
            {`${timeLeft.d}d ${timeLeft.h}h ${timeLeft.m}m ${timeLeft.s}s`}
        </div>
    );
};
