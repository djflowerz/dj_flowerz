import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, Heart, MessageSquare, Repeat, 
  ShoppingBag, ShieldCheck, ArrowLeft, 
  CheckCircle2, UserPlus, Info
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'echo' | 'follow' | 'escrow_update' | 'system';
  actor_id: string;
  actor_name: string;
  actor_avatar: string;
  content: string;
  reference_id?: string;
  created_at: string;
}

export default function Notifications() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/notifications`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const data = await resp.json();
        setNotifications(data);
      } catch (e) {
        console.error("Failed to fetch notifications");
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchNotifications();
  }, [session]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={20} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageSquare size={20} className="text-brand-purple" />;
      case 'echo': return <Repeat size={20} className="text-green-500" />;
      case 'follow': return <UserPlus size={20} className="text-brand-cyan" />;
      case 'escrow_update': return <ShoppingBag size={20} className="text-brand-cyan" />;
      default: return <Info size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white pb-20">
      <div className="max-w-2xl mx-auto border-x border-white/5 min-h-screen">
        <header className="sticky top-20 z-20 backdrop-blur-md bg-[#0B0B0F]/80 border-b border-white/5 p-4 flex items-center gap-6">
          <Link to="/community" className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black">Notifications</h1>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-2 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
             <Bell size={48} className="text-gray-800" />
             <h2 className="text-xl font-black">Nothing to see here — yet</h2>
             <p className="text-gray-500 max-w-xs">When folks interact with your transmissions or Shield Escrow pulses, you'll find them here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n) => (
              <motion.div 
                key={n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex gap-4 hover:bg-white/[0.02] cursor-pointer transition-all"
                onClick={() => {
                   if (n.type === 'escrow_update') navigate('/marketplace');
                   else if (n.reference_id) navigate(`/community`); // Could be deep link to pulse
                }}
              >
                <div className="mt-1">{getIcon(n.type)}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <img src={n.actor_avatar || 'https://ui-avatars.com/api/?name=U'} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                    <p className="text-sm">
                      <span className="font-bold text-white">{n.actor_name}</span> 
                      <span className="text-gray-500 ml-1">{n.content}</span>
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                    {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
