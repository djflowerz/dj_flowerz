import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, hover = true }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative bg-white/[0.03] border border-white/[0.05] backdrop-blur-[20px] rounded-2xl overflow-hidden
        ${hover ? 'hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300' : ''}
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {/* Subtle interior glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'purple' | 'cyan' | 'gold' | 'ghost';
  glow?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const NeonButton: React.FC<NeonButtonProps> = ({ 
  children, 
  variant = 'purple', 
  glow = true, 
  size = 'md',
  className = '',
  ...props 
}) => {
  const themes = {
    purple: 'bg-[#A349F5] text-white hover:bg-[#B060F7] shadow-[0_0_20px_rgba(163,73,245,0.3)]',
    cyan: 'bg-[#00F5FF] text-[#050505] hover:bg-[#33F7FF] shadow-[0_0_20px_rgba(0,245,255,0.3)]',
    gold: 'bg-[#FFD700] text-[#050505] hover:bg-[#FFE44D] shadow-[0_0_20px_rgba(255,215,0,0.3)]',
    ghost: 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 rounded-xl',
    lg: 'px-8 py-4 text-lg font-bold rounded-2xl'
  };

  return (
    <button 
      className={`
        relative inline-flex items-center justify-center font-semibold transition-all duration-300 active:scale-95
        ${themes[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
