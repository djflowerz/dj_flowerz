
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const CountdownTimer: React.FC<{ expiryDate: string }> = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [isWarning, setIsWarning] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime();
            const expiry = new Date(expiryDate).getTime();

            if (isNaN(expiry)) {
                setTimeLeft('---');
                setIsUrgent(false);
                setIsWarning(false);
                return;
            }

            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                setIsUrgent(true);
                setIsWarning(false);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setIsUrgent(days === 0 && hours < 24);
            setIsWarning(days > 0 && days < 3);
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        };

        const timer = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(timer);
    }, [expiryDate]);

    const statusClasses = isUrgent
        ? "bg-red-500/20 text-red-500 border-red-500/30"
        : isWarning
            ? "bg-orange-500/20 text-orange-500 border-orange-500/30"
            : "bg-brand-purple/20 text-brand-purple border-brand-purple/30";

    return (
        <div className={`flex items-center gap-2 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors duration-500 ${statusClasses}`}>
            <Clock size={10} className={isUrgent ? "animate-pulse" : ""} />
            {timeLeft}
        </div>
    );
};
