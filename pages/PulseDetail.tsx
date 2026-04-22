import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  MessageSquare, 
  Heart, 
  Repeat, 
  Share2, 
  MoreHorizontal,
  Image as ImageIcon,
  Smile,
  Send,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Activity,
  Bell,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Pulse {
  id: string;
  author_id: string;
  author_handle: string;
  author_name: string;
  author_avatar: string;
  author_tier: string;
  author_verified: boolean;
  content: string;
  media_urls?: string;
  poll_data?: string;
  type: 'text' | 'media' | 'deal' | 'poll';
  is_marketplace: boolean;
  deal_metadata?: string;
  hearts: number;
  echoes: number;
  comments_count: number;
  has_hearted?: string;
  has_echoed?: string;
  created_at: string;
}

const parseJSON = (str: string | undefined, fallback: any = null) => {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (e) { return fallback; }
};

const parseUTC = (dateStr: string) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('Z') || dateStr.includes('+')) return new Date(dateStr);
    return new Date(dateStr.replace(' ', 'T') + 'Z');
};

const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - parseUTC(dateStr).getTime()) / 1000);
    if (seconds < 5) return 'now';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
};

const UserAvatar = ({ src, name, size = 10, className = "", onClick }: { src?: string; name?: string; size?: number; className?: string; onClick?: (e: any) => void }) => {
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
    return (
        <img loading="lazy" src={src || fallback}
            onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
            className={`w-${size} h-${size} rounded-full object-cover ring-1 ring-white/10 flex-shrink-0 ${className}`}
            alt={name}
            onClick={onClick}
        />
    );
};

export default function PulseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session, isAuthenticated } = useAuth();
  
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [replies, setReplies] = useState<Pulse[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchPulse();
    if (session) fetchUnread();
  }, [id, session]);

  const fetchUnread = async () => {
    try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/notifications/unread`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const data = await resp.json();
        setUnreadCount(data.unread || 0);
    } catch (e) {}
  };

  const fetchPulse = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setPulse(data.pulse);
        setReplies(data.replies);
      } else {
        toast.error("Signal not found");
        navigate('/community');
      }
    } catch (e) {
      toast.error("Failed to load signal");
    } finally {
      setLoading(false);
    }
  };

  const handleInteract = async (pulseId: string, type: 'heart' | 'echo') => {
    if (!isAuthenticated) {
      toast.error("Sign in to interact");
      return;
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses/${pulseId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ type })
      });
      
      if (resp.ok) {
        const data = await resp.json();
        // Update local state for main pulse or replies
        if (pulse?.id === pulseId) {
            setPulse(prev => prev ? {
                ...prev,
                [type === 'heart' ? 'hearts' : 'echoes']: data.reacted ? prev[type === 'heart' ? 'hearts' : 'echoes'] + 1 : prev[type === 'heart' ? 'hearts' : 'echoes'] - 1,
                [type === 'heart' ? 'has_hearted' : 'has_echoed']: data.reacted ? 'yes' : null
            } : null);
        } else {
            setReplies(prev => prev.map(p => p.id === pulseId ? {
                ...p,
                [type === 'heart' ? 'hearts' : 'echoes']: data.reacted ? p[type === 'heart' ? 'hearts' : 'echoes'] + 1 : p[type === 'heart' ? 'hearts' : 'echoes'] - 1,
                [type === 'heart' ? 'has_hearted' : 'has_echoed']: data.reacted ? 'yes' : null
            } : p));
        }
      }
    } catch (e) {}
  };

  const postReply = async () => {
    if (!replyContent.trim() || isPosting) return;
    setIsPosting(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/pulses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          content: replyContent,
          parent_id: id,
          type: 'text'
        })
      });

      if (resp.ok) {
        setReplyContent('');
        fetchPulse();
        toast.success("Reply posted");
      }
    } catch (e) {
      toast.error("Failed to post reply");
    } finally {
      setIsPosting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center"><Activity className="animate-spin text-brand-purple" /></div>;
  if (!pulse) return null;

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      <div className="max-w-7xl mx-auto flex justify-center">
        {/* Left Sidebar */}
        <nav className="hidden md:flex flex-col w-64 h-screen sticky top-0 py-8 gap-8 pr-4">
          <Link to="/" className="text-2xl font-black tracking-tighter text-brand-purple flex items-center gap-2 mb-4 px-4">
            <Activity size={32} /> DJF
          </Link>

          <div className="space-y-2">
            <Link to="/community" className="flex items-center gap-4 p-4 rounded-full text-white bg-white/5 font-black text-sm uppercase tracking-widest transition-all">
              <TrendingUp size={20} /> Latest Signals
            </Link>
            <Link to="/notifications" className="flex items-center gap-4 p-4 rounded-full text-gray-500 hover:text-white hover:bg-white/5 font-black text-sm uppercase tracking-widest transition-all relative">
              <Bell size={20} /> Notifications
              {unreadCount > 0 && (
                <span className="absolute top-3 left-8 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-[#0B0B0F]">
                    {unreadCount}
                </span>
              )}
            </Link>
            <Link to="/marketplace" className="flex items-center gap-4 p-4 rounded-full text-gray-500 hover:text-white hover:bg-white/5 font-black text-sm uppercase tracking-widest transition-all">
              <ShoppingBag size={20} /> Marketplace
            </Link>
            <Link to={`/op/${user?.handle}`} className="flex items-center gap-4 p-4 rounded-full text-gray-500 hover:text-white hover:bg-white/5 font-black text-sm uppercase tracking-widest transition-all">
              <User size={20} /> My Identity
            </Link>
          </div>
        </nav>

        {/* Thread Feed */}
        <main className="w-full max-w-[600px] min-h-screen border-x border-white/5">
          <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0B0B0F]/80 border-b border-white/5 p-4 flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-black">Signal Thread</h1>
          </header>

          <div className="p-4 border-b border-white/5">
            <div className="flex gap-4">
              <UserAvatar src={pulse.author_avatar} name={pulse.author_name} size={12} onClick={() => navigate(`/op/${pulse.author_handle}`)} className="cursor-pointer" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-white hover:underline cursor-pointer" onClick={() => navigate(`/op/${pulse.author_handle}`)}>{pulse.author_name}</p>
                        <p className="text-sm text-gray-500">@{pulse.author_handle}</p>
                    </div>
                    <button className="text-gray-500 hover:text-brand-purple p-2 rounded-full hover:bg-brand-purple/10 transition-all">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xl leading-relaxed text-gray-100 whitespace-pre-wrap">
                {pulse.content}
            </div>

            <div className="mt-4 py-4 border-y border-white/5 flex items-center gap-6 text-sm text-gray-500">
                <span><span className="text-white font-bold">{pulse.hearts}</span> Hearts</span>
                <span><span className="text-white font-bold">{pulse.echoes}</span> Echoes</span>
                <span><span className="text-white font-bold">{pulse.comments_count}</span> Replies</span>
            </div>

            <div className="pt-2 flex items-center justify-between max-w-sm text-gray-500">
                <button 
                    onClick={() => handleInteract(pulse.id, 'echo')}
                    className={`flex items-center gap-2 p-3 rounded-full transition-all ${pulse.has_echoed ? 'text-green-500 bg-green-500/10' : 'hover:text-green-500 hover:bg-green-500/10'}`}
                >
                    <Repeat size={22} />
                </button>
                <button 
                    onClick={() => handleInteract(pulse.id, 'heart')}
                    className={`flex items-center gap-2 p-3 rounded-full transition-all ${pulse.has_hearted ? 'text-red-500 bg-red-500/10' : 'hover:text-red-500 hover:bg-red-500/10'}`}
                >
                    <Heart size={22} className={pulse.has_hearted ? 'fill-current' : ''} />
                </button>
                <button className="p-3 rounded-full hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all">
                    <Share2 size={22} />
                </button>
            </div>
          </div>

          {/* Reply Composer */}
          <div className="p-4 border-b border-white/5 flex gap-4">
            <UserAvatar src={user?.avatarUrl} name={user?.name} size={11} />
            <div className="flex-1">
                <textarea 
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Signal back..."
                    className="w-full bg-transparent border-none text-lg outline-none placeholder:text-gray-600 resize-none min-h-[60px]"
                />
                <div className="flex justify-end items-center mt-2 pt-2 border-t border-white/5">
                    <button 
                        onClick={postReply}
                        disabled={!replyContent.trim() || isPosting}
                        className="px-6 py-2 bg-brand-purple disabled:opacity-50 text-white rounded-full font-black text-sm hover:scale-105 active:scale-95 transition-all"
                    >
                        {isPosting ? 'Sending...' : 'Reply'}
                    </button>
                </div>
            </div>
          </div>

          {/* Replies List */}
          <div className="divide-y divide-white/5">
            {replies.map((reply) => (
              <div key={reply.id} className="p-4 hover:bg-white/[0.02] transition-all">
                <div className="flex gap-4">
                    <UserAvatar src={reply.author_avatar} name={reply.author_name} size={10} onClick={() => navigate(`/op/${reply.author_handle}`)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-white">@{reply.author_handle}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500">{timeAgo(reply.created_at)}</span>
                        </div>
                        <div className="mt-1 text-gray-200">
                            {reply.content}
                        </div>
                        <div className="mt-3 flex items-center gap-6 text-gray-500">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleInteract(reply.id, 'heart'); }}
                                className={`flex items-center gap-1.5 transition-all ${reply.has_hearted ? 'text-red-500' : 'hover:text-red-500'}`}
                            >
                                <Heart size={16} className={reply.has_hearted ? 'fill-current' : ''} />
                                <span className="text-xs font-bold">{reply.hearts}</span>
                            </button>
                        </div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar Placeholder */}
        <aside className="hidden lg:block w-80 sticky top-0 h-screen p-8">
            {/* Trends or suggestions can go here */}
        </aside>
      </div>
    </div>
  );
}
