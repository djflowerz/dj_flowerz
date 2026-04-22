// components/community/SellerScorecard.tsx
// Visual trust card shown on PublicProfile and as hover-card on marketplace posts

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Clock, TrendingUp, Star, Users,
  MessageSquare, Calendar, CheckCircle2, AlertTriangle,
  Zap, ExternalLink
} from 'lucide-react';
import { TrustBadgeRow, BadgeType } from './TrustBadge';
import { motion } from 'framer-motion';

interface ScorecardData {
  completed_trades: number;
  cancel_rate: number;
  avg_response_hours: number;
  vouch_count: number;
  badges: BadgeType[];
  account_age_months: number;
  is_verified: boolean;
  strikes: number;
  aura_tier: string;
  primary_role?: string;
  location?: string;
}

interface SellerScorecardProps {
  userId: string;
  handle?: string;
  compact?: boolean; // compact = hover card mode on posts
}

const getCompletionColor = (rate: number) => {
  if (rate >= 90) return { text: 'text-emerald-400', bar: 'bg-emerald-500', label: 'Excellent' };
  if (rate >= 70) return { text: 'text-amber-400', bar: 'bg-amber-500', label: 'Good' };
  return { text: 'text-red-400', bar: 'bg-red-500', label: 'Low' };
};

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

export const SellerScorecard: React.FC<SellerScorecardProps> = ({
  userId,
  handle,
  compact = false,
}) => {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`${WORKER_URL}/api/profiles/${userId}/scorecard`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className={`${compact ? 'p-3' : 'p-6'} rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse`}>
        <div className="h-4 bg-white/5 rounded w-1/2 mb-3" />
        <div className="h-3 bg-white/5 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const completionRate = data.completed_trades > 0
    ? Math.round(((data.completed_trades) / (data.completed_trades + (data.cancel_rate || 0) * data.completed_trades / 100)) * 100)
    : 0;
  const completionColors = getCompletionColor(completionRate);
  const isCaution = data.strikes >= 3;
  const isHardBlocked = data.strikes >= 5;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0e0e12] border border-white/10 rounded-2xl p-4 shadow-2xl w-72"
      >
        {isCaution && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
            <AlertTriangle size={12} />
            ⚠️ Under Review — Use Escrow
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={`text-xl font-black ${completionColors.text}`}>{data.completed_trades}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Trades</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">
              {data.avg_response_hours < 1 ? '<1h' : `${Math.round(data.avg_response_hours)}h`}
            </p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Response</p>
          </div>
          <div>
            <p className="text-xl font-black text-purple-400">{data.vouch_count}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">Vouches</p>
          </div>
        </div>
        {data.badges.length > 0 && (
          <TrustBadgeRow badges={data.badges} size="xs" className="mt-3" />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden"
    >
      {/* Caution Banner */}
      {isCaution && !isHardBlocked && (
        <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <AlertTriangle size={16} className="text-amber-400 animate-pulse" />
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">
            ⚠️ Caution: This user has received {data.strikes} reports in the last 30 days. Use Secure Escrow for any transactions.
          </p>
        </div>
      )}
      {isHardBlocked && (
        <div className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border-b border-red-500/20">
          <AlertTriangle size={16} className="text-red-400" />
          <p className="text-[11px] font-black uppercase tracking-widest text-red-400">
            🚫 This account is currently suspended pending review. Transactions are not recommended.
          </p>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-purple/10 flex items-center justify-center">
              <ShieldCheck size={16} className="text-brand-purple" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-purple">Seller Scorecard</p>
              {data.primary_role && (
                <p className="text-[9px] text-gray-500">{data.primary_role}</p>
              )}
            </div>
          </div>
          {data.is_verified && (
            <span className="flex items-center gap-1 text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
              <CheckCircle2 size={11} /> Verified
            </span>
          )}
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {/* Completion Rate */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Trade Success</p>
            <p className={`text-2xl font-black ${completionColors.text}`}>{data.completed_trades > 0 ? `${completionRate}%` : 'New'}</p>
            <div className="mt-2 h-1 w-full rounded-full bg-white/5">
              <div className={`h-1 rounded-full ${completionColors.bar} transition-all duration-700`} style={{ width: `${completionRate}%` }} />
            </div>
            <p className={`text-[9px] mt-1 font-bold ${completionColors.text}`}>{completionColors.label}</p>
          </div>

          {/* Response Time */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Response Time</p>
            <p className="text-2xl font-black text-white flex items-end gap-1">
              {data.avg_response_hours < 1 ? '<1' : Math.round(data.avg_response_hours)}
              <span className="text-sm text-gray-500 font-bold mb-0.5">h</span>
            </p>
            <p className="text-[9px] text-gray-500 mt-1">
              {data.avg_response_hours < 4 ? '⚡ Excellent' : data.avg_response_hours < 24 ? '✓ Good' : 'Slow'}
            </p>
          </div>

          {/* Total Trades */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Total Trades</p>
            <p className="text-2xl font-black text-white">{data.completed_trades}</p>
            <p className="text-[9px] text-gray-500 mt-1">On-site only</p>
          </div>

          {/* Account Age */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Member Since</p>
            <p className="text-2xl font-black text-white">{data.account_age_months}</p>
            <p className="text-[9px] text-gray-500 mt-1">months</p>
          </div>
        </div>

        {/* Vouches */}
        {data.vouch_count > 0 && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/10">
            <Users size={14} className="text-green-400" />
            <p className="text-[11px] font-black text-green-400">
              {data.vouch_count} established member{data.vouch_count !== 1 ? 's' : ''} have vouched for this seller
            </p>
          </div>
        )}

        {/* Badges */}
        {data.badges.length > 0 && (
          <div className="mb-5">
            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-2">Earned Badges</p>
            <TrustBadgeRow badges={data.badges} size="sm" />
          </div>
        )}

        {/* CTA Button */}
        {handle && (
          <Link
            to={`/marketplace`}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-purple text-white font-black text-[11px] uppercase tracking-widest hover:bg-brand-purple/90 hover:scale-[1.02] transition-all shadow-lg shadow-brand-purple/20"
          >
            <ShieldCheck size={14} />
            Start Secure Trade
          </Link>
        )}
      </div>
    </motion.div>
  );
};

export default SellerScorecard;
