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
  onEditProfile?: () => void;
}

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

export const VerificationJourney: React.FC<VerificationJourneyProps> = ({
  profile,
  session,
  onRequestVerification,
  onEditProfile,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Derived states
  const isContactVerified = profile?.verification_status === 'contact_verified' || profile?.verification_status === 'approved' || profile?.verification_status === 'verified' || profile?.is_verified;
  const isBadgeRequested = profile?.verification_status === 'requested';
  const isBadgeApproved = profile?.verification_status === 'approved';
  const hasBadge = profile?.verification_status === 'verified';

  // Derive completed steps from profile data
  const steps: JourneyStep[] = [
    // Phase 1: Build Your Identity
    {
      id: 'photo',
      phase: 1,
      label: 'Profile Photo',
      description: 'Upload a clear photo or logo',
      icon: <Camera size={16} />,
      reward: '+5 Trust Points',
      completed: !!profile?.avatar_url && !profile.avatar_url.includes('ui-avatars'),
    },
    {
      id: 'bio',
      phase: 1,
      label: 'Write a Bio',
      description: 'Description of your expertise',
      icon: <FileText size={16} />,
      reward: '+5 Trust Points',
      completed: !!(profile?.bio && profile.bio.trim().length > 0),
    },
    {
      id: 'location',
      phase: 1,
      label: 'Add Your Location',
      description: 'Specify your city or county',
      icon: <MapPin size={16} />,
      reward: '+5 Trust Points',
      completed: !!(profile?.location && profile.location.trim()),
    },
    // Phase 2: Trust Baseline
    {
      id: 'contact_verify',
      phase: 2,
      label: 'Verify Reachability',
      description: 'Verify your Email, Phone or WhatsApp via OTP',
      icon: <Mail size={16} />,
      reward: '+10 Trust Points',
      completed: isContactVerified,
    },
    {
      id: 'social_link',
      phase: 2,
      label: 'Link Social Profile',
      description: 'Connect Instagram, TikTok, etc.',
      icon: <Link2 size={16} />,
      reward: '+10 Trust Points',
      completed: (() => {
        try {
          const s = typeof profile?.social_links === 'string' ? JSON.parse(profile.social_links) : profile?.social_links || {};
          return Object.values(s).some((v: any) => v && v.trim());
        } catch { return false; }
      })(),
    },
    // Phase 3: The Crown
    {
      id: 'badge',
      phase: 3,
      label: 'Verified Badge 🛡️',
      description: 'Official community Trust Badge application',
      icon: <Shield size={16} />,
      reward: 'Verified Badge 🛡️',
      completed: hasBadge,
    },
  ];

  const completedStepsCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const completionPercent = Math.round((completedStepsCount / totalSteps) * 100);

  const eligibilitySteps = steps.filter(s => s.id !== 'badge');
  const eligibleCount = eligibilitySteps.filter(s => s.completed).length;
  const isEligibleForBadge = eligibleCount === eligibilitySteps.length;

  const isVerified = hasBadge || profile?.is_verified;

  const [verifMethod, setVerifMethod] = useState<'email' | 'whatsapp' | 'phone'>('email');
  const [verifContact, setVerifContact] = useState('');

  const handleSendContactOtp = async () => {
    if (!verifContact.trim()) {
      toast.error(`Please enter your ${verifMethod}.`);
      return;
    }
    setRequesting(true);
    try {
      const resp = await fetch(`${WORKER_URL}/api/profiles/contact/send-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': profile?.id || ''
        },
        body: JSON.stringify({ method: verifMethod, contact: verifContact })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      toast.success(`Verification code sent to your ${verifMethod}! Enter it below.`);
      setShowOtpInput(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP');
    } finally {
      setRequesting(false);
    }
  };

  const handleVerifyContact = async () => {
    if (otpInput.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setVerifying(true);
    try {
      const resp = await fetch(`${WORKER_URL}/api/profiles/contact/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': profile?.id || ''
        },
        body: JSON.stringify({ otp_code: otpInput }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      toast.success('Reachability verified! You are closer to your badge.');
      setShowOtpInput(false);
      if (onRequestVerification) onRequestVerification();
    } catch (e: any) {
      toast.error(e.message || 'Invalid code');
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestBadge = async () => {
    setRequesting(true);
    try {
      const resp = await fetch(`${WORKER_URL}/api/profiles/request-badge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Actor-Id': profile?.id || ''
        }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      toast.success('Badge request submitted! Admin will notify you once approved.');
      if (onRequestVerification) onRequestVerification();
    } catch (e: any) {
      toast.error(e.message || 'Failed to request badge');
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
          'X-Actor-Id': profile?.id || ''
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
                    {steps.filter(s => s.phase === phase).map((step) => {
                      const isEditableStep = ['photo', 'bio', 'location', 'social_link'].includes(step.id) && !step.completed;
                      return (
                        <div
                          key={step.id}
                          onClick={() => {
                            if (isEditableStep && onEditProfile) onEditProfile();
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                            step.completed
                              ? 'bg-emerald-500/5 border-emerald-500/15'
                              : isEditableStep
                              ? 'bg-white/[0.02] border-white/5 hover:border-brand-purple/50 cursor-pointer hover:bg-white/[0.04]'
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
                    );
                  })}
                  </div>
                </div>
              ))}

          {/* Reachability & Badge Verification */}
          <div className="p-5 relative border-t border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isContactVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-purple/20 text-brand-purple'
              }`}>
                {isContactVerified ? <CheckCircle2 size={16} /> : <Shield size={16} />}
              </div>
              <div>
                <p className={`text-[12px] font-black ${isContactVerified ? 'text-emerald-400 opacity-60' : 'text-white'}`}>
                  Phase 2: Contact Verification
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Verify your reachability</p>
              </div>
            </div>

            {!hasBadge && (
              <div className="mt-4 p-5 rounded-2xl bg-brand-purple/5 border border-brand-purple/15">
                <p className="text-[11px] font-black text-brand-purple uppercase tracking-widest mb-3">
                  {isContactVerified ? '🛡️ Badge Application' : '🛡️ Reachability Verification'}
                </p>
                
                {!isContactVerified && (
                  <>
                      <div className="flex gap-2 mb-4">
                        {['email', 'phone', 'whatsapp'].map((m) => (
                          <button
                            key={m}
                            onClick={() => setVerifMethod(m as any)}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${
                              verifMethod === m
                                ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                : 'border-white/10 text-gray-500 hover:border-white/20'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      {!showOtpInput ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={verifContact}
                            onChange={(e) => setVerifContact(e.target.value)}
                            placeholder={`Enter ${verifMethod}`}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-purple outline-none"
                          />
                          <button
                            onClick={handleSendContactOtp}
                            disabled={requesting}
                            className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black text-xs uppercase"
                          >
                            {requesting ? '...' : `Send OTP via ${verifMethod}`}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="text"
                            maxLength={6}
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit OTP"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl text-center font-black"
                          />
                          <button
                            onClick={handleVerifyContact}
                            disabled={verifying}
                            className="w-full py-4 bg-brand-cyan text-black rounded-2xl font-black text-xs uppercase"
                          >
                            {verifying ? '...' : 'Verify OTP'}
                          </button>
                          <button onClick={() => setShowOtpInput(false)} className="w-full text-[10px] uppercase font-black text-gray-500 mt-2">Back</button>
                        </div>
                      )}
                    </>
                  )}

                  {isContactVerified && !hasBadge && (
                    <div className="space-y-4">
                      {isBadgeRequested ? (
                        <div className="flex items-center gap-2 text-amber-400 text-[11px] font-black animate-pulse bg-amber-400/5 p-4 rounded-xl border border-amber-400/10">
                          <Zap size={14} />
                          Reviewing Eligibility — Expected update in 24h.
                        </div>
                      ) : isBadgeApproved ? (
                         <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <p className="text-emerald-400 font-black text-xs uppercase">Badge Eligibility Confirmed!</p>
                            <p className="text-[10px] text-gray-400 mt-1">Check your settings or contact admin to finalize badge display.</p>
                         </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            {isEligibleForBadge 
                              ? "Excellent! Your profile is 100% complete and reachability is verified. You are now eligible for the official Verified Membership Badge." 
                              : "Build your trust level. Complete all Profile and Trust steps to become eligible for the official Badge."}
                          </p>
                          <button
                            onClick={handleRequestBadge}
                            disabled={requesting || !isEligibleForBadge}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                              isEligibleForBadge 
                                ? 'bg-brand-purple text-white shadow-xl shadow-brand-purple/20' 
                                : 'bg-white/5 text-gray-600 grayscale cursor-not-allowed border border-white/5'
                            }`}
                          >
                            {requesting ? '...' : isEligibleForBadge ? '🏆 Apply for Verified Badge' : `Locked: (${eligibleCount}/${eligibilitySteps.length} steps done)`}
                          </button>
                        </>
                      )}
                    </div>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerificationJourney;
