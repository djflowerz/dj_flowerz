// components/community/ReportModal.tsx
// Report a user or post with categorized reasons

import React, { useState } from 'react';
import { X, Flag, Send, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const REPORT_REASONS = [
  { value: 'scam', label: '🚨 Scam / Fraud', description: 'This user is trying to steal money or goods.' },
  { value: 'false_info', label: '❌ False Information', description: 'Listing or profile contains misleading/fake details.' },
  { value: 'off_platform_payment', label: '💸 Off-Platform Payment', description: 'Asking to pay via personal M-Pesa or cash outside the site.' },
  { value: 'offensive', label: '🤬 Offensive Content', description: 'Post or profile contains abusive or inappropriate material.' },
  { value: 'impersonation', label: '👤 Impersonation', description: 'Pretending to be another DJ, business, or person.' },
  { value: 'dangerous_goods', label: '⚠️ Dangerous / Illegal Goods', description: 'Attempting to sell prohibited or illegal items.' },
  { value: 'other', label: '📝 Other', description: 'Something else not listed above.' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedHandle: string;
  postId?: string; // if reporting a specific post
  session: any;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportedUserId,
  reportedHandle,
  postId,
  session,
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Please select a reason for the report.');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(`${WORKER_URL}/api/community/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          reason: selectedReason,
          details,
          post_id: postId,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Report failed');
      }
      setSubmitted(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4"
          >
            <div className="bg-[#0e0e12] border border-white/10 rounded-[2rem] max-w-lg w-full overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)] max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Flag size={18} className="text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tighter">Report</h2>
                    <p className="text-[10px] text-gray-500 font-bold">@{reportedHandle}</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
                  <X size={16} />
                </button>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-4xl mb-2">
                    ✅
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">Report Submitted</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                    Thank you for helping keep the DJFlowerz community safe. Our team will review this report and take appropriate action.
                  </p>
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Reports are completely anonymous</p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-8 py-3 bg-brand-purple text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-purple/90 transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 p-6 space-y-4">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Help us understand what's wrong. All reports are anonymous and reviewed by our moderation team.
                  </p>

                  {/* Reason Selection */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reason for Report</p>
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        onClick={() => setSelectedReason(reason.value)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all ${
                          selectedReason === reason.value
                            ? 'bg-red-500/10 border-red-500/30 text-white'
                            : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.04] hover:border-white/10'
                        }`}
                      >
                        <p className="text-[12px] font-bold mb-0.5">{reason.label}</p>
                        <p className="text-[10px] text-gray-500">{reason.description}</p>
                      </button>
                    ))}
                  </div>

                  {/* Details */}
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                      Additional Details <span className="text-gray-600 normal-case font-normal">(optional)</span>
                    </p>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Describe what happened..."
                      maxLength={500}
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-purple/40 focus:outline-none transition-all resize-none"
                    />
                    <p className="text-right text-[9px] text-gray-600 mt-1">{details.length}/500</p>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400/80 text-[10px]">
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    <p>False reports waste our team's time and may result in your own account being reviewed.</p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!selectedReason || submitting}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReportModal;
