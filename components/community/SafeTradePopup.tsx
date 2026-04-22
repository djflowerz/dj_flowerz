// components/community/SafeTradePopup.tsx
// Security warning modal shown before any marketplace escrow is initiated

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface SafeTradePopupProps {
  isOpen: boolean;
  onConfirm: () => void; // proceed with the trade
  onClose: () => void;
  sellerName?: string;
  amount?: number;
}

export const SafeTradePopup: React.FC<SafeTradePopupProps> = ({
  isOpen,
  onConfirm,
  onClose,
  sellerName,
  amount,
}) => {
  const formatKES = (v: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(v);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4"
          >
            <div className="bg-[#0e0e12] border border-white/10 rounded-[2rem] max-w-md w-full overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-brand-purple/20 to-brand-cyan/5 p-8 border-b border-white/5">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                    <Shield size={28} className="text-brand-purple" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                      🛡️ Your Safety
                    </h2>
                    <p className="text-[11px] font-bold text-brand-purple uppercase tracking-widest">is Our Priority</p>
                  </div>
                </div>
                {amount && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl w-fit">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Deal Value:</p>
                    <p className="text-brand-cyan font-black">{formatKES(amount)}</p>
                    {sellerName && <p className="text-gray-400 text-[10px] font-bold">• @{sellerName}</p>}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-8 space-y-5">
                <div className="space-y-4">
                  {/* On-site benefit */}
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-emerald-400 uppercase tracking-wider mb-1">✅ Stay Protected</p>
                      <p className="text-[12px] text-gray-300 leading-relaxed">
                        Trades made through our site are held in <strong className="text-white">secure escrow</strong>. Payment is only released to the seller after <em>you confirm receipt</em>.
                      </p>
                    </div>
                  </div>

                  {/* Off-site risk */}
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-red-400 uppercase tracking-wider mb-1">⚠️ Off-Site Risks</p>
                      <p className="text-[12px] text-gray-300 leading-relaxed">
                        If you pay a seller directly (personal M-Pesa or cash), <strong className="text-white">we cannot help you</strong> if things go wrong. These trades are ineligible for dispute resolution.
                      </p>
                    </div>
                  </div>

                  {/* Reputation */}
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-brand-purple/5 border border-brand-purple/10">
                    <div className="w-8 h-8 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp size={16} className="text-brand-purple" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-brand-purple uppercase tracking-wider mb-1">📈 Build Reputation</p>
                      <p className="text-[12px] text-gray-300 leading-relaxed">
                        Only on-site trades earn you <strong className="text-white">Trusted badges</strong> and verified reviews that other buyers can see.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={onConfirm}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
                  >
                    ✅ I Understand, Trade Safely
                  </button>
                  <Link
                    to="/refund"
                    onClick={onClose}
                    className="text-center text-[10px] text-gray-400 hover:text-white transition-colors underline underline-offset-4"
                  >
                    Read our Safety & Refund Guidelines
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SafeTradePopup;
