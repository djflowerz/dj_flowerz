import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-16 h-16">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-white/10 rounded-full animate-pulse"></div>
        {/* Spinning Gradient */}
        <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        {/* Inner Glow */}
        <div className="absolute inset-2 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-full blur-md"></div>
      </div>
      <p className="text-sm font-medium tracking-widest text-gray-400 uppercase animate-pulse">
        Loading...
      </p>
    </div>
  );
};

export default LoadingSpinner;
