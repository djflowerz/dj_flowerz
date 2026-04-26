import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, CheckCircle, XCircle, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface InterestModalProps {
  pulse: {
    id: string;
    author_id: string;
    author_name: string;
    author_avatar: string;
    author_handle: string;
    content: string;
    deal_metadata?: any;
    listing_status?: string;
  };
  existingInterest?: {
    id: string;
    status: string;
    buyer_message: string;
    seller_reply?: string;
  } | null;
  onClose: () => void;
  onInterestSent: (interestId: string) => void;
  onProceedToEscrow: () => void;
}

export const InterestModal: React.FC<InterestModalProps> = ({
  pulse, existingInterest, onClose, onInterestSent, onProceedToEscrow
}) => {
  const { user, session } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const dealMeta = pulse.deal_metadata
    ? (typeof pulse.deal_metadata === 'string' ? JSON.parse(pulse.deal_metadata) : pulse.deal_metadata)
    : null;

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/marketplace/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'X-Actor-Id': user?.id || '',
        },
        body: JSON.stringify({ pulse_id: pulse.id, message }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        setError(data.error || 'Failed to send interest');
      } else {
        setSent(true);
        onInterestSent(data.interest_id);
      }
    } catch (e) {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAccepted = existingInterest?.status === 'accepted';
  const isDeclined = existingInterest?.status === 'declined';
  const isPending = existingInterest?.status === 'pending';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d14] shadow-2xl overflow-hidden"
          initial={{ scale: 0.92, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-900/30 to-cyan-900/20">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-brand-cyan" />
              <span className="font-bold text-white text-sm">
                {existingInterest ? 'Deal Thread' : 'Chat to Buy'}
              </span>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Listing preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <img src={pulse.author_avatar} alt={pulse.author_name} className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/40" />
              <div className="min-w-0">
                <p className="text-white/90 text-xs font-semibold">{pulse.author_name}</p>
                <p className="text-white/50 text-[11px] truncate">{pulse.content?.slice(0, 60)}...</p>
                {dealMeta?.price && (
                  <p className="text-brand-cyan text-[11px] font-black mt-0.5">KES {Number(dealMeta.price).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Status banner for existing interest */}
            {existingInterest && (
              <div className={`rounded-xl p-3 border text-sm ${
                isAccepted ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                isDeclined ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }`}>
                <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                  {isAccepted ? <CheckCircle size={14} /> : isDeclined ? <XCircle size={14} /> : <Lock size={14} />}
                  {isAccepted ? 'Seller Accepted!' : isDeclined ? 'Seller Declined' : 'Pending Seller Response'}
                </div>
                <div className="space-y-2">
                  <div className="bg-black/20 rounded-lg p-2 text-white/70 text-xs">
                    <span className="text-white/40 text-[10px]">Your message:</span>
                    <p>{existingInterest.buyer_message}</p>
                  </div>
                  {existingInterest.seller_reply && (
                    <div className="bg-purple-500/10 rounded-lg p-2 text-white/80 text-xs">
                      <span className="text-white/40 text-[10px]">Seller replied:</span>
                      <p>{existingInterest.seller_reply}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* New interest form */}
            {!existingInterest && !sent && (
              <>
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Your message to the seller</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Introduce yourself and ask any questions about the item (condition, meeting point, etc.)..."
                    className="w-full h-28 rounded-xl bg-white/5 border border-white/10 text-white text-sm p-3 resize-none focus:outline-none focus:border-brand-cyan/50 placeholder:text-white/25"
                    maxLength={500}
                  />
                  <p className="text-white/30 text-[10px] text-right mt-1">{message.length}/500</p>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  onClick={handleSend}
                  disabled={loading || !message.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                  {loading ? 'Starting Chat...' : 'Start Chat'}
                </button>
              </>
            )}

            {/* Sent confirmation */}
            {sent && (
              <div className="text-center py-4">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-white font-semibold text-sm">Chat Request Sent!</p>
                <p className="text-white/50 text-xs mt-1">The seller will be notified. Watch your notifications for their response.</p>
              </div>
            )}

            {/* Accepted → Pay via Escrow CTA */}
            {isAccepted && (
              <motion.button
                onClick={() => { onClose(); onProceedToEscrow(); }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                <CheckCircle size={16} />
                Pay Now via Escrow
              </motion.button>
            )}

            {/* Info footer */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Lock size={12} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-blue-300/80 text-[10px] leading-relaxed">
                Payments are only available after the seller accepts. All transactions go through our Escrow system for your protection.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
