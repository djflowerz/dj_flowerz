import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Camera, Mic, MicOff, CameraOff, PhoneOff, 
  Copy, Share2, Users, MessageSquare, 
  Settings, Shield, Info, Maximize2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const VideoSession: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      toast.error("Invalid Session ID");
      navigate('/sessions');
      return;
    }

    // Dynamic loading of Jitsi External API if it's not already there
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [sessionId, navigate]);

  const joinSession = () => {
    if (!(window as any).JitsiMeetExternalAPI) {
      toast.error("Video server initializing... try again in 2 seconds.");
      return;
    }

    const domain = 'meet.jit.si';
    const options = {
      roomName: `DJFlowerz_Session_${sessionId}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: user?.name || 'Guest DJ'
      },
      configOverwrite: {
        startWithAudioMuted: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'security'
        ],
      }
    };

    const api = new (window as any).JitsiMeetExternalAPI(domain, options);
    
    api.addEventListeners({
      videoConferenceJoined: () => setIsJoined(true),
      videoConferenceLeft: () => navigate('/sessions'),
      audioMuteStatusChanged: (payload: any) => setIsMuted(payload.muted),
      videoMuteStatusChanged: (payload: any) => setIsVideoOff(payload.muted)
    });

    setIsJoined(true);
  };

  const copyInvite = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white overflow-hidden flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="h-20 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple border border-brand-purple/30">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">Secure Consultation</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Session ID: {sessionId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={copyInvite}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {copied ? <Share2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Invite Guest'}
          </button>
          <button 
             onClick={() => navigate('/sessions')}
             className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      </header>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <main className="flex-1 relative flex">
        {!isJoined && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#050507]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full p-12 rounded-[3rem] bg-[#0B0B0F] border border-white/10 text-center space-y-8 shadow-[0_0_100px_rgba(138,43,226,0.1)]"
            >
              <div className="w-24 h-24 mx-auto bg-brand-purple/10 rounded-[2rem] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-brand-purple/20 blur-2xl rounded-full animate-pulse" />
                <Users size={40} className="text-brand-purple relative z-10" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight uppercase">Ready to Sync?</h2>
                <p className="text-gray-500 text-xs font-medium px-4">Ensure your camera and microphone are operational before establishing the connection.</p>
              </div>

              <div className="flex justify-center gap-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10"><Mic size={20} className="text-gray-400" /></div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10"><Camera size={20} className="text-gray-400" /></div>
              </div>

              <button 
                onClick={joinSession}
                className="w-full py-5 rounded-[1.5rem] bg-brand-purple text-white font-black uppercase tracking-widest text-xs hover:brightness-110 shadow-lg shadow-brand-purple/20 transition-all active:scale-[0.98]"
              >
                Establish Uplink
              </button>
            </motion.div>
          </div>
        )}

        {/* Jitsi iFrame Container */}
        <div 
          ref={jitsiContainerRef} 
          className="w-full h-full bg-black z-10"
        />

        {/* Floating Sidebar (Optional chat/notes) */}
        <div className="hidden lg:flex w-80 h-full border-l border-white/5 bg-[#0B0B0F] flex-col">
           <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Session Intel</h3>
              <Info size={14} className="text-gray-600" />
           </div>
           
           <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="p-5 rounded-2xl bg-brand-purple/5 border border-brand-purple/10 space-y-2">
                 <p className="text-[9px] font-black uppercase text-brand-purple">Safety Protocol</p>
                 <p className="text-[11px] text-gray-400 leading-relaxed font-medium">This session is encrypted. Do not share your password or SKU secrets with unauthorized units.</p>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Active Units</h4>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-brand-cyan border border-brand-cyan/20">DF</div>
                    <span className="text-xs font-bold text-gray-300">DJ FLOWERZ (Host)</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-700 border border-white/5">?</div>
                    <span className="text-xs font-bold text-gray-600 italic">Waiting for guest...</span>
                 </div>
              </div>
           </div>

           <div className="p-6 bg-black/20 border-t border-white/5">
              <button className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-2">
                 <MessageSquare size={14} /> Local Chat Log
              </button>
           </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="h-16 bg-black/60 border-t border-white/5 flex items-center justify-center px-8 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">
         <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}>
            Connected to DJ Flowerz Private Broadcast Sector
         </motion.div>
      </footer>
    </div>
  );
};

export default VideoSession;
