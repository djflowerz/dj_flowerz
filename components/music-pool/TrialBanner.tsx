import React, { useEffect, useState } from 'react';
import { Clock, Zap, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_WORKER_URL } from '../../utils/r2';

export const TrialBanner = () => {
  const { user } = useAuth();
  const [trialData, setTrialData] = useState<{
    has_trial: boolean;
    days_left: number;
    expires_at: string;
    status: string;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (user?.isSubscriber && user?.subscriptionPlan === 'trial') {
      fetch(`${STORAGE_WORKER_URL}/api/trial/status`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.has_trial && data.status === 'active') {
          setTrialData(data);
        }
      })
      .catch(err => console.error("Error fetching trial status:", err));
    }
  }, [user]);

  if (!trialData || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white overflow-hidden relative"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full hidden sm:block">
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="font-semibold text-sm sm:text-base">Free Trial Active</span>
              <span className="text-white/80 text-xs sm:text-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {trialData.days_left === 0 ? 'Expiring Today!' : `${trialData.days_left} days remaining`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = '/premium'}
              className="bg-white text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-yellow-300 hover:text-indigo-900 transition-all flex items-center gap-1 shadow-lg active:scale-95"
            >
              UPGRADE NOW
              <ArrowRight className="w-3 h-3" />
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Progress Bar Background */}
        <div className="absolute bottom-0 left-0 h-1 bg-black/20 w-full" />
        {/* Progress Bar Fill (7 days = 100%) */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(trialData.days_left / 7) * 100}%` }}
          className="absolute bottom-0 left-0 h-1 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"
        />
      </motion.div>
    </AnimatePresence>
  );
};
