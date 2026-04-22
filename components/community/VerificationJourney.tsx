// components/community/VerificationJourney.tsx
// Gamified profile completeness + verification progress tracker (shown on own profile)

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Lock, Star, ChevronDown, ChevronUp,
  Camera, MapPin, FileText, Mail, Phone, Link2,
  ShoppingBag, Users, Shield, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface JourneyStep {
  id: string;
  phase: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  reward: string;
  completed: boolean;
}

interface VerificationJourneyProps {
  profile: any; // ProfileData
  session: any;
  onRequestVerification?: () => void;
}

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

export const VerificationJourney: React.FC<VerificationJourneyProps> = ({
  profile,
  session,
  onRequestVerification,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Derive completed steps from profile data
  const steps: JourneyStep[] = [
    // Phase 1
    {
      id: 'photo',
      phase: 1,
      label: 'Profile Photo',
      description: 'Upload a clear photo of yourself or your business logo',
      icon: <Camera size={16} />,
      reward: '+5 Trust Points',
      completed: !!profile?.avatar_url && !profile.avatar_url.includes('ui-avatars'),
    },
    {
      id: 'bio',
      phase: 1,
      label: 'Write a Bio',
      description: 'Briefly describe your expertise (e.g. "DJ with 5 years experience")',
      icon: <FileText size={16} />,
      reward: '+5 Trust Points',
      completed: !!(profile?.bio && profile.bio.trim().length > 20),
    },
    {
      id: 'location',
      phase: 1,
      label: 'Add Your Location',
      description: 'Tell buyers which city/county you are based in',
      icon: <MapPin size={16} />,
      reward: '+5 Trust Points',
      completed: !!(profile?.location && profile.location.trim()),
    },
    // Phase 2
    {
      id: 'email_verify',
      phase: 2,
      label: 'Verify Your Email',
      description: 'Request admin review and confirm your 6-digit OTP',
      icon: <Mail size={16} />,
      reward: 'Verified Badge 🛡️',
      completed: profile?.verification_status === 'verified' || profile?.is_verified,
    },
    {
      id: 'social_link',
      phase: 2,
      label: 'Link a Social Profile',
      description: 'Connect your Instagram, TikTok, or SoundCloud to prove your identity',
      icon: <Link2 size={16} />,
      reward: '+10 Trust Points',
      completed: (() => {
        try {
          const s = typeof profile?.social_links === 'string'
            ? JSON.parse(profile.social_links)
            : profile?.social_links || {};
          return Object.values(s).some((v: any) => v && v.trim());
        } catch { return false; }
      })(),
    },
    // Phase 3
    {
      id: 'first_listing',
      phase: 3,
      label: 'Post Your First Listing',
      description: 'List a product or service with at least 3 high-quality photos',
      icon: <ShoppingBag size={16} />,
      reward: '+15 Trust Points',
      completed: (profile?.completed_trades || 0) > 0,
    },
    {
      id: 'vouch_peer',
      phase: 3,
      label: 'Vouch for a Community Member',
      description: 'Engage with the community by endorsing someone you have worked with',
      icon: <Users size={16} />,
      reward: '+10 Trust Points',
      completed: false, // would need API check — default false
    },
  ];

  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.completed).length;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);

  const isVerificationPending = profile?.verification_status === 'requested';
  const isVerificationApproved = profile?.verification_status === 'approved';
  const isVerified = profile?.verification_status === 'verified' || profile?.is_verified;

  const handleRequestVerification = async () => {
    setRequesting(true);
    try {
      const resp = await fetch(`${WORKER_URL}/api/profiles/request-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      toast.success('Verification request submitted! Our team will review your profile within 24 hours.');
      if (onRequestVerification) onRequestVerification();
    } catch (e: any) {
      toast.error(e.message || 'Request failed. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const handleSubmitOtp = async () => {
    if (otpInput.length !== 6) {
      toast.error('Please enter the full 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    try {
      const resp = await fetch(`${WORKER_URL}/api/profiles/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ otp_code: otpInput }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      toast.success('🎉 Email verified! Your Verified Member badge is now active.');
      setShowOtpInput(false);
    } catch (e: any) {
      toast.error(e.message || 'Invalid or expired code. Please request a new one.');
    } finally {
      setVerifying(false);
    }
  };

  const phaseLabels: Record<number, string> = {
    1: 'Phase 1: Build Your Identity',
    2: 'Phase 2: Verification Layer',
    3: 'Phase 3: Marketplace Readiness',
  };

  const barColor = completionPercent >= 80
    ? 'from-emerald-500 to-green-400'
    : completionPercent >= 40
    ? 'from-brand-purple to-brand-cyan'
    : 'from-gray-600 to-gray-500';

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
            {isVerified ? <Shield size={18} className="text-emerald-400" /> : <Shield size={18} className="text-brand-purple" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">Verification Journey</p>
              {isVerified && (
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">COMPLETE</span>
              )}
            </div>
            {/* Progress Bar */}
            <div className="h-2 w-full max-w-xs rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-[0_0_8px_rgba(124,58,237,0.5)]`}
              />
            </div>
          </div>
          <span className={`text-2xl font-black ml-2 ${completionPercent >= 80 ? 'text-emerald-400' : 'text-white'}`}>
            {completionPercent}%
          </span>
        </div>
        <div className="ml-3 text-gray-500">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-6 border-t border-white/5">
              {/* Steps by Phase */}
              {[1, 2, 3].map(phase => (
                <div key={phase}>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-5 mb-3">
                    {phaseLabels[phase]}
                  </p>
                  <div className="space-y-2">
                    {steps.filter(s => s.phase === phase).map((step) => (
                      <div
                        key={step.id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                          step.completed
                            ? 'bg-emerald-500/5 border-emerald-500/15'
                            : 'bg-white/[0.02] border-white/5'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          step.completed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-white/5 text-gray-500'
                        }`}>
                          {step.completed ? <CheckCircle2 size={16} /> : step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-black ${step.completed ? 'text-emerald-400 line-through opacity-60' : 'text-white'}`}>
                            {step.label}
                          </p>
                          {!step.completed && (
                            <p className="text-[10px] text-gray-500 mt-0.5">{step.description}</p>
                          )}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full border flex-shrink-0 ${
                          step.completed
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-gray-600 bg-white/5 border-white/5'
                        }`}>
                          {step.completed ? '✓ Done' : step.reward}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Verification CTA */}
              {!isVerified && (
                <div className="mt-6 p-5 rounded-2xl bg-brand-purple/5 border border-brand-purple/15">
                  <p className="text-[11px] font-black text-brand-purple uppercase tracking-widest mb-1">
                    🛡️ Email Verification
                  </p>
                  <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                    Our team manually reviews every verification request to keep the community safe. Complete your profile above first for the best chance of approval.
                  </p>

                  {isVerified && (
                    <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black">
                      <CheckCircle2 size={14} />
                      Verified! Your badge is now active.
                    </div>
                  )}

                  {isVerificationPending && (
                    <div className="flex items-center gap-2 text-amber-400 text-[11px] font-black animate-pulse">
                      <Zap size={14} />
                      Pending Admin Review — we'll email you within 24 hours.
                    </div>
                  )}

                  {isVerificationApproved && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-brand-cyan text-[11px] font-black">
                        <Mail size={14} />
                        ✅ Admin approved! Check your email for your 6-digit OTP.
                      </div>
                      {showOtpInput ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="000000"
                            className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-black tracking-[0.5em] text-white focus:border-brand-cyan focus:outline-none"
                          />
                          <button
                            onClick={handleSubmitOtp}
                            disabled={verifying}
                            className="px-5 py-3 bg-brand-cyan text-black rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-cyan/80 transition-all disabled:opacity-40"
                          >
                            {verifying ? '...' : 'Verify'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowOtpInput(true)}
                          className="w-full py-3 bg-brand-cyan text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-cyan/80 transition-all"
                        >
                          Enter My OTP Code
                        </button>
                      )}
                    </div>
                  )}

                  {!isVerificationPending && !isVerificationApproved && (
                    <button
                      onClick={handleRequestVerification}
                      disabled={requesting || completionPercent < 30}
                      className="w-full py-3 bg-brand-purple text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-purple/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {requesting ? '⏳ Submitting...' :
                        completionPercent < 30
                          ? `Complete your profile first (${completionPercent}% done)`
                          : '🚀 Request Email Verification'}
                    </button>
                  )}
                </div>
              )}

              {isVerified && (
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-center">
                  <p className="text-2xl mb-2">🏆</p>
                  <h3 className="font-black text-emerald-400 uppercase tracking-tighter">Fully Verified!</h3>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Your profile is 100% verified. Buyers are 5x more likely to trade with you.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerificationJourney;
