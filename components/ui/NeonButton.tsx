import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/utils';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'purple' | 'white';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  variant = 'cyan',
  size = 'md',
  children,
  className,
  glow = true,
  ...props
}) => {
  const variants = {
    cyan: {
      base: 'border-[#00F5FF]/30 text-[#00F5FF] hover:bg-[#00F5FF]/10',
      glow: 'shadow-[0_0_20px_rgba(0,245,255,0.2)] hover:shadow-[0_0_30px_rgba(0,245,255,0.4)]',
      border: 'border-[#00F5FF]/50'
    },
    purple: {
      base: 'border-[#A349F5]/30 text-[#A349F5] hover:bg-[#A349F5]/10',
      glow: 'shadow-[0_0_20px_rgba(163,73,245,0.2)] hover:shadow-[0_0_30px_rgba(163,73,245,0.4)]',
      border: 'border-[#A349F5]/50'
    },
    white: {
      base: 'border-white/20 text-white hover:bg-white/10',
      glow: 'shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]',
      border: 'border-white/40'
    }
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px] tracking-[0.2em] uppercase font-black',
    md: 'px-8 py-3 text-[11px] tracking-[0.3em] uppercase font-black',
    lg: 'px-12 py-4 text-xs tracking-[0.4em] uppercase font-black'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, letterSpacing: '0.4em' }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative group overflow-hidden border transition-all duration-300 font-heading italic',
        variants[variant].base,
        glow && variants[variant].glow,
        sizes[size],
        className
      )}
      {...props}
    >
      {/* Glitch Overlay Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      
      {/* Neon Corner Accents */}
      <div className={cn("absolute top-0 left-0 w-2 h-2 border-t border-l", variants[variant].border)} />
      <div className={cn("absolute bottom-0 right-0 w-2 h-2 border-b border-r", variants[variant].border)} />
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
