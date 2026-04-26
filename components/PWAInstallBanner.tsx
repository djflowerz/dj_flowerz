import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

const DISMISSED_KEY = 'pwa_banner_dismissed_v1';

const PWAInstallBanner: React.FC = () => {
  const { isInstallable, installApp, isInstalled } = usePWA();
  const [show, setShow] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isInstallable || isInstalled) return;
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;
    // Slight delay so the page loads before banner appears
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await installApp();
    } finally {
      setInstalling(false);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          id="pwa-install-banner"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 180 }}
          className="fixed bottom-0 left-0 right-0 z-[99990] px-4 pb-safe"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div
            className="max-w-lg mx-auto rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(10,10,10,0.98) 0%, rgba(20,10,35,0.98) 100%)',
              border: '1px solid rgba(163,73,245,0.3)',
              boxShadow: '0 -8px 40px rgba(163,73,245,0.2), 0 30px 60px rgba(0,0,0,0.9)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Purple accent line */}
            <div
              className="h-0.5 w-full"
              style={{ background: 'linear-gradient(90deg, #A349F5, #00F5FF, #A349F5)' }}
            />

            <div className="px-5 py-4 flex items-center gap-4">
              {/* Icon */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(163,73,245,0.2), rgba(0,245,255,0.1))' }}
              >
                <Smartphone size={24} className="text-[#A349F5]" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm tracking-tight leading-tight">
                  Install DJ Flowerz
                </p>
                <p className="text-white/40 text-xs mt-0.5 leading-snug">
                  Add to home screen for the best experience — fast, offline-ready & native feel.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleInstall}
                  disabled={installing}
                  id="pwa-install-btn"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide text-black transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #A349F5, #00F5FF)',
                    boxShadow: '0 4px 20px rgba(163,73,245,0.4)',
                    opacity: installing ? 0.7 : 1,
                  }}
                >
                  <Download size={13} />
                  {installing ? 'Installing…' : 'Install'}
                </motion.button>

                <button
                  onClick={handleDismiss}
                  id="pwa-banner-dismiss"
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/5 transition-all"
                  aria-label="Dismiss install banner"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
