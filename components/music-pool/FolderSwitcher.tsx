import React, { useState } from 'react';
import { ChevronDown, Folder, Video, Music, Globe, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FolderSwitcherProps {
  activeHub: string;
  onHubSelect: (hub: string) => void;
  hubs: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
  }>;
}

export const FolderSwitcher: React.FC<FolderSwitcherProps> = ({
  activeHub,
  onHubSelect,
  hubs
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentHub = hubs.find(h => h.id === activeHub) || hubs[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-4 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all shadow-xl group min-w-[240px]"
      >
        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
          {currentHub.icon}
        </div>
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest leading-none mb-1">Source Hub</span>
          <span className="text-sm font-bold text-white truncate">{currentHub.label}</span>
        </div>
        <ChevronDown size={18} className={`ml-auto text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute left-0 right-0 top-full mt-2 z-50 p-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
            >
              {hubs.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => {
                    onHubSelect(hub.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeHub === hub.id 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${activeHub === hub.id ? 'bg-white/20' : 'bg-zinc-800'}`}>
                    {hub.icon}
                  </div>
                  <span className="text-sm font-bold">{hub.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
