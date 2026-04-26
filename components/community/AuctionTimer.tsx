import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertCircle } from 'lucide-react';

interface AuctionTimerProps {
  endAt: string; // ISO datetime string
  onExpire?: () => void;
}

export const AuctionTimer: React.FC<AuctionTimerProps> = ({ endAt, onExpire }) => {
  const calcRemaining = () => {
    const diff = new Date(endAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, diff };
  };

  const [remaining, setRemaining] = useState(calcRemaining);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const r = calcRemaining();
      if (!r) {
        setExpired(true);
        setRemaining(null);
        onExpire?.();
        clearInterval(timer);
      } else {
        setRemaining(r);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endAt]);

  if (expired || !remaining) {
    return (
      <span className="flex items-center gap-1 text-red-400 text-[10px] font-black uppercase tracking-widest">
        <AlertCircle size={10} /> Auction Ended
      </span>
    );
  }

  const urgent = remaining.diff < 3600000; // under 1 hour
  const color = urgent ? 'text-red-400' : remaining.diff < 86400000 ? 'text-yellow-400' : 'text-brand-cyan';

  return (
    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${color}`}>
      <Clock size={10} className={urgent ? 'animate-pulse' : ''} />
      {remaining.d > 0 && `${remaining.d}d `}
      {remaining.h > 0 && `${remaining.h}h `}
      {`${remaining.m}m ${remaining.s}s`}
    </span>
  );
};
