// components/community/TrustBadge.tsx
// Reusable trust badge chip — renders the correct icon, label, and color for any badge type

import React, { useState } from 'react';
import {
  ShieldCheck, Zap, Package, Trophy, Wrench,
  AlertTriangle, Repeat2, Leaf, Star
} from 'lucide-react';

export type BadgeType =
  | 'verified'
  | 'caution'
  | 'fast_responder'
  | 'quick_shipper'
  | 'elite_performer'
  | 'top_vendor'
  | 'established'
  | 'repeat_clients'
  | 'aura_elite'
  | 'aura_legendary';

interface BadgeConfig {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  border: string;
  tooltip: string;
  glow?: string;
}

const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
  verified: {
    icon: <ShieldCheck size={11} />,
    label: 'Verified Identity',
    color: 'text-[#4cd7f6]',
    bg: 'bg-[#4cd7f6]/10',
    border: 'border-[#4cd7f6]/20',
    tooltip: 'Identity verified through our system. Secure trading enabled.',
    glow: 'shadow-[0_0_10px_rgba(76,215,246,0.2)]',
  },
  aura_elite: {
    icon: <Star size={11} />,
    label: 'Top Member',
    color: 'text-[#7c3aed]',
    bg: 'bg-[#7c3aed]/10',
    border: 'border-[#7c3aed]/20',
    tooltip: 'Distinguished top status within the community.',
    glow: 'shadow-[0_0_10px_rgba(124,58,237,0.2)]',
  },
  aura_legendary: {
    icon: <Trophy size={11} />,
    label: 'Legendary',
    color: 'text-[#f59e0b]',
    bg: 'bg-[#f59e0b]/10',
    border: 'border-[#f59e0b]/20',
    tooltip: 'Legendary status: Exceptional trust and contribution to the scene.',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  },
  caution: {
    icon: <AlertTriangle size={11} />,
    label: 'Under Review',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    tooltip: '⚠️ Caution: Potential trust variance detected. Secure payment mandatory.',
  },
  fast_responder: {
    icon: <Zap size={11} />,
    label: 'Fast Response',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    tooltip: 'Ultra-fast response time (Active responder).',
  },
  quick_shipper: {
    icon: <Package size={11} />,
    label: 'Rapid Delivery',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    tooltip: 'Ships or delivers items within 24 hours of payment confirmation.',
  },
  elite_performer: {
    icon: <Trophy size={11} />,
    label: 'Top Posts',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    tooltip: 'Has completed 50+ successful trades with a 95%+ positive rating.',
  },
  top_vendor: {
    icon: <Wrench size={11} />,
    label: 'Gear Specialist',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    tooltip: 'Gear specialist with zero "damaged equipment" disputes on record.',
  },
  established: {
    icon: <Leaf size={11} />,
    label: 'Legacy Member',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    tooltip: 'Has been an active member of the community for over 12 months.',
  },
  repeat_clients: {
    icon: <Repeat2 size={11} />,
    label: 'Vouched',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    tooltip: 'Multiple operators have returned to trade with this seller — highly reliable.',
  },
};

interface TrustBadgeProps {
  type: BadgeType;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  type,
  size = 'sm',
  showLabel = true,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const config = BADGE_CONFIG[type];
  if (!config) return null;

  const padding = size === 'xs' ? 'px-1.5 py-0.5' : size === 'sm' ? 'px-2 py-1' : 'px-3 py-1.5';
  const textSize = size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : 'text-xs';
  const pulse = type === 'caution' ? 'animate-pulse' : '';

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 rounded-full border cursor-help transition-all hover:scale-105 ${padding} ${config.color} ${config.bg} ${config.border} ${pulse} ${config.glow || ''} ${className}`}
      >
        {config.icon}
        {showLabel && (
          <span className={`font-black uppercase tracking-widest ${textSize}`}>
            {config.label}
          </span>
        )}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-64 p-3 bg-[#050508] border border-white/10 rounded-xl text-[11px] text-gray-300 leading-relaxed shadow-2xl pointer-events-none animate-in fade-in duration-150 backdrop-blur-xl">
          <div className="font-black text-white uppercase tracking-tighter mb-1 flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
            {config.label}
          </div>
          {config.tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#050508]" />
        </div>
      )}
    </div>
  );
};

// Convenience: render a row of badges from an array of badge types
export const TrustBadgeRow: React.FC<{
  badges: BadgeType[];
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}> = ({ badges, size = 'sm', className = '' }) => {
  if (!badges || badges.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <TrustBadge key={badge} type={badge} size={size} />
      ))}
    </div>
  );
};

export default TrustBadge;
