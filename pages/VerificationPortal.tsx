import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  ShieldCheck, 
  Cpu, 
  Fingerprint, 
  ShieldAlert, 
  RefreshCcw, 
  CheckCircle2, 
  Clock,
  Award,
  Zap,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VerificationPortal: React.FC = () => {
  const { user } = useAuth();
  const { requestSync, verifyOtp, requestBadge } = useData();
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [syncRequested, setSyncRequested] = useState(false);

  // Derived state from user profile
  const isVerified = user?.isVerified;
  const status = user?.verificationStatus || 'none';
  const auraTier = user?.auraTier || 'Aura Matrix';

  const handleRequestSync = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await requestSync();
      if (res.success) {
        setSyncRequested(true);
        setMessage({ type: 'success', text: 'Neural Sync requested. Check your registered channel for OTP.' });
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to request sync.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Connection failed. Please retry.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;
    
    setLoading(true);
    setMessage(null);
    try {
      const res = await verifyOtp(otp);
      if (res.success) {
        setMessage({ type: 'success', text: 'Neural Sync Complete. Identity Verified.' });
        setOtp('');
      } else {
        setMessage({ type: 'error', text: res.message || 'Invalid OTP.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Verification failed. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBadge = async (type: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await requestBadge(type);
      if (res.success) {
        setMessage({ type: 'success', text: `${type} request submitted to the Matrix.` });
      } else {
        setMessage({ type: 'error', text: res.message || 'Request failed.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Request failed. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-purple/10 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-cyan/10 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="scanline"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-electric-purple/30 bg-electric-purple/5 mb-4">
            <ShieldCheck className="w-4 h-4 text-electric-purple" />
            <span className="text-xs font-bold tracking-widest uppercase text-electric-purple">Neural Sync Portal</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter">
            TRUST THE <span className="text-gradient-cyan">MATRIX</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Verify your identity and elevate your Aura status to unlock premium platform capabilities.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status Panel */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-1"
          >
            <div className="glass-card p-6 rounded-2xl h-full border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Fingerprint className="w-24 h-24 text-cyber-cyan" />
              </div>
              
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyber-cyan" />
                Aura Identity
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Tier Level</label>
                  <div className="text-2xl font-bold text-aura-gold flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    {auraTier}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 block">Verification Status</label>
                  <div className={`text-xl font-bold flex items-center gap-2 ${isVerified ? 'text-cyber-cyan' : 'text-gray-400'}`}>
                    {isVerified ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                    {status.toUpperCase()}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {isVerified && (
                      <span className="px-3 py-1 rounded-md bg-cyber-cyan/10 border border-cyber-cyan/30 text-[10px] font-bold text-cyber-cyan flex items-center gap-1">
                        <Award className="w-3 h-3" /> VERIFIED
                      </span>
                    )}
                    {user?.role === 'admin' && (
                      <span className="px-3 py-1 rounded-md bg-aura-gold/10 border border-aura-gold/30 text-[10px] font-bold text-aura-gold flex items-center gap-1">
                        <Award className="w-3 h-3" /> ELITE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sync Terminal */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-2"
          >
            <div className="glass-panel p-8 rounded-3xl border border-white/5 relative h-full">
              <div className="absolute top-4 right-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                </div>
              </div>

              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Cpu className="w-8 h-8 text-electric-purple" />
                Neural Sync
              </h2>
              <p className="text-gray-400 mb-8">
                Connect your account to the matrix oversight system. This protocol requires a one-time cryptographic proof.
              </p>

              <AnimatePresence mode="wait">
                {message && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mb-6 p-4 rounded-xl border ${
                      message.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    } flex items-center gap-3 text-sm`}
                  >
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {!isVerified ? (
                <div className="space-y-8">
                  {status === 'none' && !syncRequested ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center">
                      <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h4 className="text-lg font-bold mb-2">Protocol Initialized</h4>
                      <p className="text-sm text-gray-500 mb-6">Start the sync process to receive your Neural Badge.</p>
                      <button
                        onClick={handleRequestSync}
                        disabled={loading}
                        className="btn-premium flex items-center gap-2 mx-auto"
                      >
                        {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                        REQUEST NEURAL SYNC
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-cyber-cyan" />
                          CRYPTOGRAPHIC OTP
                        </label>
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full bg-void border border-white/10 rounded-xl px-6 py-4 text-3xl font-mono tracking-[0.5em] text-center text-cyber-cyan focus:border-cyber-cyan/50 focus:outline-none transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || otp.length < 6}
                        className="w-full btn-premium py-4 flex items-center justify-center gap-3 text-lg"
                      >
                        {loading ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                        COMPLETE IDENTITY SYNC
                      </button>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest">
                        <span>Awaiting Input...</span>
                        <button type="button" onClick={handleRequestSync} className="hover:text-cyber-cyan flex items-center gap-1">
                          <RefreshCcw className="w-3 h-3" /> Resend Protocol
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 bg-cyber-cyan/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyber-cyan/30 animate-pulse">
                    <CheckCircle2 className="w-12 h-12 text-cyber-cyan" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Sync Success</h2>
                  <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                    Your identity is now part of the Aura Matrix. You have full access to platform features and Shield Escrow protection.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={() => handleRequestBadge('Verified DJ')}
                      className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <Award className="w-4 h-4 text-aura-gold" /> REQUEST DJ BADGE
                    </button>
                    <button 
                      onClick={() => handleRequestBadge('Verified Producer')}
                      className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <Award className="w-4 h-4 text-cyber-cyan" /> REQUEST PRODUCER BADGE
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Benefits Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-white/5">
            <ShieldCheck className="w-8 h-8 text-cyber-cyan mb-4" />
            <h4 className="text-lg font-bold mb-2">Shield Escrow</h4>
            <p className="text-sm text-gray-500">Enable secure transactions with platform-backed escrow protection.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/5">
            <Zap className="w-8 h-8 text-aura-gold mb-4" />
            <h4 className="text-lg font-bold mb-2">Priority Marketplace</h4>
            <p className="text-sm text-gray-500">Verified users appear at the top of marketplace listings and search results.</p>
          </div>
          <div className="glass-card p-6 rounded-2xl border border-white/5">
            <Award className="w-8 h-8 text-electric-purple mb-4" />
            <h4 className="text-lg font-bold mb-2">Elite Status</h4>
            <p className="text-sm text-gray-500">Unlock the "Verified" badge on your profile and increase platform trust.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPortal;
