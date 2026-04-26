import React from 'react';

interface UserAvatarProps {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
  onClick?: (e: any) => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  src, 
  name, 
  size = 10, 
  className = "",
  onClick
}) => {
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
  
  return (
    <img 
      loading="lazy" 
      src={src || fallback}
      onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
      className={`w-${size} h-${size} rounded-full object-cover ring-1 ring-white/10 flex-shrink-0 ${className}`}
      alt={name}
      onClick={onClick}
    />
  );
};
