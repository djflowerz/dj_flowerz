import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Music, ShoppingBag, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SEEN_KEY = 'guest_prompt_seen_v1';
const DELAY_MS = 45000; // 45 seconds

const perks = [
  { icon: Music, label: 'Exclusive Mixtapes', color: '#A349F5' },
  { icon: ShoppingBag, label: 'Marketplace Access', color: '#00F5FF' },
  { icon: Users, label: 'Community Hub', color: '#F54996' },
];

const GuestConversionModal: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    const seen = sessionStorage.getItem(SEEN_KEY);
    if (seen) return;

    const t = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem(SEEN_KEY, '1');
    }, DELAY_MS);

    return () => clearTimeout(t);
  }, [isAuthenticated]);

  const handleClose = () => setShow(false);

  if (isAuthenticated) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[99994]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            className="fixed inset-0 z-[99995] flex items-center justify-center px-4"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden"
              style={{ pointerEvents: 'all' }}
            >
              {/* Gradient glow border */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(163,73,245,0.5), rgba(0,245,255,0.3), rgba(245,73,150,0.4))',
                  padding: '1px',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />

              <div
                className="relative rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(160deg, #0D0D1A 0%, #060610 60%, #0D0818 100%)',
                  boxShadow: '0 40px 80px rgba(0,0,0,0.9), 0 0 60px rgba(163,73,245,0.15)',
                }}
              >
                {/* Top gradient bar */}
                <div
                  className="h-1 w-full"
                  style={{ background: 'linear-gradient(90deg, #A349F5, #00F5FF, #F54996)' }}
                />

                {/* Close button */}
                <button
                  onClick={handleClose}
                  id="guest-modal-close"
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all z-10"
                >
                  <X size={14} />
                </button>

                <div className="px-7 pt-8 pb-7">
                  {/* Icon */}
                  <div className="flex justify-center mb-5">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(163,73,245,0.25), rgba(0,245,255,0.1))',
                        boxShadow: '0 8px 32px rgba(163,73,245,0.3)',
                      }}
                    >
                      <Sparkles size={30} className="text-[#A349F5]" />
                    </div>
                  </div>

                  {/* Headline */}
                  <h2 className="text-center text-white font-black text-2xl tracking-tight leading-tight mb-2">
                    Join the{' '}
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: 'linear-gradient(90deg, #A349F5, #00F5FF)' }}
                    >
                      DJ Flowerz
                    </span>{' '}
                    Hub
                  </h2>
                  <p className="text-center text-white/40 text-sm leading-relaxed mb-6">
                    Create a free account and unlock the full experience — exclusive drops, community access & more.
                  </p>

                  {/* Perks */}
                  <div className="space-y-2.5 mb-7">
                    {perks.map(({ icon: Icon, label, color }) => (
                      <div
                        key={label}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: `${color}10`, border: `1px solid ${color}20` }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}20` }}
                        >
                          <Icon size={15} style={{ color }} />
                        </div>
                        <span className="text-white/70 text-sm font-semibold">{label}</span>
                        <div
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link to="/signup" onClick={handleClose} id="guest-modal-register">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      className="w-full py-4 rounded-2xl font-black text-black uppercase tracking-wider text-sm mb-3"
                      style={{
                        background: 'linear-gradient(135deg, #A349F5, #00F5FF)',
                        boxShadow: '0 8px 30px rgba(163,73,245,0.4)',
                      }}
                    >
                      Create Free Account
                    </motion.button>
                  </Link>

                  <Link to="/login" onClick={handleClose} id="guest-modal-login">
                    <button className="w-full py-3 rounded-2xl text-white/40 text-sm font-semibold hover:text-white hover:bg-white/5 transition-all border border-white/5">
                      Already have an account? Sign in
                    </button>
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

export default GuestConversionModal;
