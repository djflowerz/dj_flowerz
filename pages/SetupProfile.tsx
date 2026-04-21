import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, AtSign, PenLine, MapPin, 
  CheckCircle2, AlertCircle, Loader2, 
  ArrowRight, Sparkles, Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const SetupProfile: React.FC = () => {
  const { user, finalizeProfile, checkUsername, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    display_name: user?.name || '',
    bio: '',
    location: '',
    avatar_url: user?.avatarUrl || '',
    website: '',
    instagram: '',
    twitter: '',
    soundcloud: ''
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Redirect if already complete
  useEffect(() => {
    if (isProfileComplete && user?.username) {
      navigate('/community', { replace: true });
    }
  }, [isProfileComplete, user, navigate]);

  // Username validation logic
  useEffect(() => {
    if (!form.username) {
      setUsernameStatus('idle');
      return;
    }

    if (form.username.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking');
      try {
        const available = await checkUsername(form.username);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.username, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== 'available') {
      toast.error("Please choose a valid & available handle.");
      return;
    }

    setLoading(true);
    try {
      await finalizeProfile({
        username: form.username,
        display_name: form.display_name,
        bio: form.bio,
        location: form.location,
        avatar_url: form.avatar_url,
        website: form.website,
        instagram: form.instagram,
        twitter: form.twitter,
        soundcloud: form.soundcloud
      });
      toast.success("Identity established!", {
        description: "Welcome to the DJ Flowerz community."
      });
      navigate('/community', { replace: true });
    } catch (err: any) {
      toast.error("Command Failed", {
        description: err.message || "Could not finalize profile."
      });
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white pt-32 pb-20 px-6 flex flex-col items-center justify-center overflow-hidden relative">
      {/* Ambient backgrounds */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-brand-cyan/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-brand-purple/10 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-xl z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-black uppercase tracking-[0.2em] mb-4"
          >
            <Sparkles size={12} />
            Onboarding Protocol
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">
            Establish Your Identity
          </h1>
          <p className="text-gray-500 font-medium max-w-md mx-auto leading-relaxed">
            Choose how you'll be known in the DJ Flowerz universe. Your handle is unique and serves as your digital signature.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-panel p-8 rounded-[32px] border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10 space-y-8">
              {/* Profile Picture Preview */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group/avatar">
                  <div className="w-24 h-24 rounded-full border-2 border-white/10 p-1 bg-black/40 overflow-hidden">
                    {form.avatar_url ? (
                      <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-gray-600">
                        <User size={32} />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity cursor-not-allowed">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avatar synced from login</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <AtSign size={12} />
                    Unique Handle
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/20 transition-all font-bold placeholder:text-gray-700"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <AnimatePresence mode="wait">
                        {usernameStatus === 'checking' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Loader2 size={16} className="text-brand-purple animate-spin" />
                          </motion.div>
                        )}
                        {usernameStatus === 'available' && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                            <CheckCircle2 size={16} />
                          </motion.div>
                        )}
                        {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-red-500">
                            <AlertCircle size={16} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Min 3 chars, letters/nums/underscores</p>
                    {usernameStatus === 'taken' && <span className="text-[9px] text-red-500 font-bold uppercase">Already Claimed</span>}
                    {usernameStatus === 'available' && <span className="text-[9px] text-emerald-500 font-bold uppercase">Handle Available</span>}
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <User size={12} />
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. DJ Flowerz"
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold placeholder:text-gray-700"
                    required
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <PenLine size={12} />
                  Tell the community about yourself
                </label>
                <textarea
                  placeholder="Official DJ for the streets... Music is life."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold placeholder:text-gray-700 resize-none"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <MapPin size={12} />
                  Base of Operations
                </label>
                <input
                  type="text"
                  placeholder="Nairobi, Kenya"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold placeholder:text-gray-700"
                />
              </div>

              {/* Social Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Instagram</label>
                  <input
                    type="text"
                    placeholder="@djflowerz"
                    value={form.instagram}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold placeholder:text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Twitter / X</label>
                  <input
                    type="text"
                    placeholder="@djflowerz"
                    value={form.twitter}
                    onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold placeholder:text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">SoundCloud</label>
                  <input
                    type="text"
                    placeholder="soundcloud.com/djflowerz"
                    value={form.soundcloud}
                    onChange={(e) => setForm({ ...form, soundcloud: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold placeholder:text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Website</label>
                  <input
                    type="url"
                    placeholder="https://djflowerz.co.ke"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold placeholder:text-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || usernameStatus !== 'available'}
            className="w-full group relative overflow-hidden flex items-center justify-center gap-3 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all hover:gap-5 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-cyan via-white to-brand-purple translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 opacity-20" />
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Finalize Identity
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
          By proceeding, you agree to established Community Protocols.
        </p>
      </motion.div>
    </div>
  );
};

export default SetupProfile;
