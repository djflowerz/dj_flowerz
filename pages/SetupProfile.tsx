import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { NeonButton } from '../components/ui/NeonButton';
import { Shield, AtSign, Briefcase, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLES = [
  { id: 'dj', name: 'DJ / Performer', icon: Zap },
  { id: 'producer', name: 'Producer', icon: Shield },
  { id: 'collector', name: 'Collector', icon: Briefcase },
  { id: 'curator', name: 'Curator', icon: AtSign }
];

export default function SetupProfile() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [handle, setHandle] = useState('');
  const [fullName, setFullName] = useState(user?.name || '');
  const [role, setRole] = useState('collector');
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (handle.length > 2) {
      const timer = setTimeout(checkHandle, 500);
      return () => clearTimeout(timer);
    } else {
      setHandleAvailable(null);
    }
  }, [handle]);

  const checkHandle = async () => {
    setIsCheckingHandle(true);
    try {
      const cleanHandle = handle.replace(/^@/, '').toLowerCase();
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/handle/${cleanHandle}`);
      const data = await resp.json();
      setHandleAvailable(data.available);
    } catch (e) {
      setHandleAvailable(false);
    } finally {
      setIsCheckingHandle(false);
    }
  };

  const handleClaim = async () => {
    if (!handleAvailable) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/profiles/handle/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-Actor-Id': user?.id || ''
        },
        body: JSON.stringify({
          handle,
          fullName,
          role
        })
      });
      const data = await resp.json();
      if (data.success) {
        setStep(3);
        setTimeout(() => navigate('/community'), 2500);
      } else {
        setError(data.error || 'Failed to claim handle');
      }
    } catch (e) {
      setError('A system error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#A349F5]/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00F5FF]/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-md"
        >
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-heading mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Claim Your Identity
                </h1>
                <p className="text-white/40">Secure your unique @handle to join the Pulse.</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl space-y-6">
                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-2">FULL NAME</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#A349F5] focus:ring-1 focus:ring-[#A349F5] outline-none transition-all"
                    placeholder="Operator Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-2">CHOOSE HANDLE</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">@</span>
                    <input 
                      type="text" 
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:border-[#00F5FF] focus:ring-1 focus:ring-[#00F5FF] outline-none transition-all"
                      placeholder="username"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isCheckingHandle && <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>}
                      {handleAvailable === true && <CheckCircle2 className="w-5 h-5 text-[#00F5FF]" />}
                      {handleAvailable === false && <span className="text-xs text-red-500">Taken</span>}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={!handleAvailable || !fullName}
                  className="w-full bg-[#A349F5] hover:bg-[#B060F7] disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(163,73,245,0.3)]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-heading mb-2">Define Your Role</h1>
                <p className="text-white/40">How do you interact with the ecosystem?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`p-6 rounded-2xl border transition-all text-left flex flex-col space-y-3 ${
                      role === r.id 
                        ? 'bg-[#A349F5]/20 border-[#A349F5] shadow-[0_0_30px_rgba(163,73,245,0.15)] text-white' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <r.icon className={`w-6 h-6 ${role === r.id ? 'text-[#00F5FF]' : 'text-white/40'}`} />
                    <span className="font-semibold">{r.name}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4 pt-4">
                {error && <p className="text-center text-red-500 text-sm">{error}</p>}
                <button 
                  onClick={handleClaim}
                  disabled={loading}
                  className="w-full bg-[#00F5FF] hover:bg-[#33F7FF] text-[#050505] font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,245,255,0.3)] flex items-center justify-center space-x-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-[#050505]/20 border-t-[#050505] rounded-full animate-spin"></div> : 'Initialize Identity'}
                </button>
                <button 
                  onClick={() => setStep(1)}
                  className="w-full text-white/40 hover:text-white transition-colors text-sm"
                >
                  Back to identity
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-[#00F5FF]/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-[#00F5FF]/50 shadow-[0_0_50px_rgba(0,245,255,0.2)]">
                <CheckCircle2 className="w-12 h-12 text-[#00F5FF]" />
              </div>
              <h1 className="text-5xl font-heading animate-pulse">Welcome, @{handle}</h1>
              <p className="text-white/40">Broadcasting your identity to the Pulse...</p>
              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-12">
                <div className="bg-gradient-to-r from-[#A349F5] to-[#00F5FF] h-full animate-[loading_2s_ease-in-out_forwards]"></div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}} />
    </div>
  );
}
