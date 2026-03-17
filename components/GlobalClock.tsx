import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const GlobalClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Format time in UTC for consistency with reset logic
    const utcHours = time.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = time.getUTCMinutes().toString().padStart(2, '0');
    const utcSeconds = time.getUTCSeconds().toString().padStart(2, '0');
    
    // Also include a local time version but emphasize UTC
    const localTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex flex-col items-end gap-0.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 group hover:border-brand-purple/30 transition-all">
            <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-brand-purple animate-pulse" />
                <span className="text-[14px] font-black font-mono text-white tracking-tighter">
                    {utcHours}:{utcMinutes}:{utcSeconds} <span className="text-[10px] text-brand-purple/80 font-bold ml-0.5">UTC</span>
                </span>
            </div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                {localTime} Local
            </span>
        </div>
    );
};

export default GlobalClock;
