import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Send, Search, MessageCircle, Loader2, Check, CheckCheck,
  Image, MoreVertical, Phone, Video, Info, X, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://djflowerz-worker.ianmuriithi58.workers.dev';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string;
  last_message_at: string;
  unread_count_1: number;
  unread_count_2: number;
  p1_name: string;
  p1_avatar: string;
  p1_handle: string;
  p2_name: string;
  p2_avatar: string;
  p2_handle: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  media_url: string | null;
  is_read: number;
  created_at: string;
  sender_name: string;
  sender_avatar: string;
  sender_handle: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function NewMessageModal({ onClose, onStartConversation }: { onClose: () => void; onStartConversation: (userId: string, name: string) => void }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setUsers([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`${WORKER_URL}/api/search?q=${encodeURIComponent(query)}&type=users`);
        const d = await r.json() as any;
        setUsers(d.users || []);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#111118] border border-white/10 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold text-white">New Message</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
            <Search size={14} className="text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search people…"
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
            />
            {loading && <Loader2 size={14} className="text-purple-400 animate-spin" />}
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {users.map(u => (
            <button
              key={u.user_id}
              onClick={() => onStartConversation(u.user_id, u.display_name)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-purple-800/50 overflow-hidden flex-shrink-0">
                {u.avatar_url
                  ? <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{(u.display_name || '?')[0]}</div>
                }
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{u.display_name}</p>
                <p className="text-white/40 text-xs">@{u.handle}</p>
              </div>
            </button>
          ))}
          {!loading && query && users.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">No users found</p>
          )}
          {!query && (
            <p className="text-center text-white/20 text-sm py-8">Search for a person to message</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DirectMessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const actorId = user?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!actorId) return;
    try {
      const r = await fetch(`${WORKER_URL}/api/dm/conversations`, {
        headers: { 'X-Actor-Id': actorId }
      });
      const d = await r.json() as any;
      setConversations(d.conversations || []);
    } catch {}
    setLoadingConvs(false);
  }, [actorId]);

  const fetchMessages = useCallback(async (convId: string) => {
    if (!actorId) return;
    setLoadingMsgs(true);
    try {
      const r = await fetch(`${WORKER_URL}/api/dm/messages/${convId}`, {
        headers: { 'X-Actor-Id': actorId }
      });
      const d = await r.json() as any;
      setMessages(d.messages || []);
    } catch {}
    setLoadingMsgs(false);
  }, [actorId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setActiveConv(conv);
        fetchMessages(conv.id);
      }
    }
  }, [conversationId, conversations, fetchMessages]);

  // Handle recipientId bridge
  useEffect(() => {
    const rid = searchParams.get('recipientId');
    if (rid && !loadingConvs) {
      const existing = conversations.find(c => c.participant_1 === rid || c.participant_2 === rid);
      if (existing) {
        openConversation(existing);
      } else {
        startNewConversation(rid, 'there');
      }
    }
  }, [searchParams, conversations, loadingConvs]);

  // Poll for new messages when a conversation is open
  useEffect(() => {
    if (!activeConv) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(activeConv.id), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = (conv: Conversation) => {
    setActiveConv(conv);
    fetchMessages(conv.id);
    navigate(`/messages/${conv.id}`, { replace: true });
  };

  const sendMessage = async (mediaUrl?: string) => {
    if ((!newMsg.trim() && !mediaUrl) || !activeConv || !actorId) return;
    const recipientId = activeConv.participant_1 === actorId ? activeConv.participant_2 : activeConv.participant_1;
    setSending(true);
    try {
      const r = await fetch(`${WORKER_URL}/api/dm/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Actor-Id': actorId },
        body: JSON.stringify({ 
          recipient_id: recipientId, 
          content: newMsg.trim() || "",
          media_url: mediaUrl || null
        })
      });
      if (r.ok) {
        setNewMsg('');
        fetchMessages(activeConv.id);
        fetchConversations();
      } else {
        toast.error('Failed to send message');
      }
    } catch {
      toast.error('Network error');
    }
    setSending(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !actorId) return;

    setUploading(true);
    try {
      const filename = `${actorId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const r = await fetch(`${WORKER_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'x-file-name': filename,
          'x-folder': 'dms'
        },
        body: file
      });

      if (r.ok) {
        const { url } = await r.json() as any;
        await sendMessage(url);
      } else {
        toast.error('Failed to upload image');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Network error during upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startNewConversation = async (recipientId: string, name: string) => {
    if (!actorId) return;
    setShowNewMsg(false);
    setSending(true);
    try {
      const r = await fetch(`${WORKER_URL}/api/dm/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Actor-Id': actorId },
        body: JSON.stringify({ recipient_id: recipientId, content: `Hey ${name}! 👋` })
      });
      if (r.ok) {
        const d = await r.json() as any;
        await fetchConversations();
        navigate(`/messages/${d.conversation_id}`, { replace: true });
      }
    } catch { toast.error('Failed to start conversation'); }
    setSending(false);
  };

  const getOtherParticipant = (conv: Conversation) => {
    if (!actorId) return { name: conv.p1_name, avatar: conv.p1_avatar, handle: conv.p1_handle };
    if (conv.participant_1 === actorId) return { name: conv.p2_name, avatar: conv.p2_avatar, handle: conv.p2_handle };
    return { name: conv.p1_name, avatar: conv.p1_avatar, handle: conv.p1_handle };
  };

  const getUnreadCount = (conv: Conversation) => {
    if (!actorId) return 0;
    return conv.participant_1 === actorId ? conv.unread_count_1 : conv.unread_count_2;
  };

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white mr-1">
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="font-black text-white text-lg tracking-tight">Messages</h1>
        </div>
        <button
          onClick={() => setShowNewMsg(true)}
          className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/50"
        >
          <Plus size={16} className="text-white" />
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {loadingConvs ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-purple-400 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 px-6">
            <MessageCircle size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-semibold text-sm">No messages yet</p>
            <p className="text-white/20 text-xs mt-1">Start a conversation with someone</p>
            <button
              onClick={() => setShowNewMsg(true)}
              className="mt-6 px-6 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-500 transition-colors"
            >
              New Message
            </button>
          </div>
        ) : (
          conversations.map(conv => {
            const other = getOtherParticipant(conv);
            const unread = getUnreadCount(conv);
            const isActive = activeConv?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${isActive ? 'bg-purple-600/15 border-l-2 border-purple-500' : 'hover:bg-white/3 border-l-2 border-transparent'}`}
              >
                <div className="w-11 h-11 rounded-full bg-purple-800/50 overflow-hidden flex-shrink-0 relative">
                  {other.avatar
                    ? <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">{(other.name || '?')[0].toUpperCase()}</div>
                  }
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0B0B0F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold truncate ${unread > 0 ? 'text-white' : 'text-white/80'}`}>{other.name}</span>
                    <span className="text-white/30 text-xs flex-shrink-0 ml-2">{timeAgo(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${unread > 0 ? 'text-white/70 font-medium' : 'text-white/40'}`}>{conv.last_message || 'Start chatting…'}</p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 ml-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">{unread > 9 ? '9+' : unread}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const ChatPanel = () => {
    if (!activeConv) return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <MessageCircle size={64} className="text-white/8" />
        <p className="text-white/30 text-sm font-medium">Select a conversation to start chatting</p>
        <button onClick={() => setShowNewMsg(true)} className="px-5 py-2.5 bg-purple-600/20 text-purple-300 text-sm font-bold rounded-full border border-purple-500/30 hover:bg-purple-600/30 transition-colors">
          New Message
        </button>
      </div>
    );

    const other = getOtherParticipant(activeConv);
    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8 bg-[#0B0B0F]/50 backdrop-blur-sm">
          {isMobile && (
            <button onClick={() => { setActiveConv(null); navigate('/messages', { replace: true }); }} className="text-white/60 hover:text-white">
              <ArrowLeft size={18} />
            </button>
          )}
          <Link to={`/member/${other.handle}`} className="flex items-center gap-2 flex-1 min-w-0 group">
            <div className="w-8 h-8 rounded-full bg-purple-800/50 overflow-hidden flex-shrink-0">
              {other.avatar
                ? <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(other.name || '?')[0]}</div>
              }
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate group-hover:text-purple-300 transition-colors">{other.name}</p>
              <p className="text-white/30 text-xs">@{other.handle} · Online</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Voice call (coming soon)">
              <Phone size={15} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Video call (coming soon)">
              <Video size={15} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors" title="Info">
              <Info size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loadingMsgs ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="text-purple-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-full bg-purple-800/30 overflow-hidden">
                {other.avatar
                  ? <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">{(other.name || '?')[0]}</div>
                }
              </div>
              <p className="text-white/60 font-semibold">{other.name}</p>
              <p className="text-white/30 text-sm text-center">Say hi! This is the beginning<br />of your conversation.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.sender_id === actorId;
              const showAvatar = !isMine && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && (
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 overflow-hidden ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                      {other.avatar
                        ? <img src={other.avatar} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold">{(other.name || '?')[0]}</div>
                      }
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-white/8 text-white/90 border border-white/8 rounded-bl-sm'
                    }`}>
                      {msg.media_url && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                          <img 
                            src={msg.media_url} 
                            alt="Sent image" 
                            className="max-w-full h-auto object-cover hover:scale-[1.02] transition-transform cursor-pointer"
                            onClick={() => window.open(msg.media_url!, '_blank')}
                          />
                        </div>
                      )}
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-white/25 text-[10px]">{timeAgo(msg.created_at)}</span>
                      {isMine && (msg.is_read ? <CheckCheck size={10} className="text-purple-400" /> : <Check size={10} className="text-white/30" />)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="px-4 py-3 border-t border-white/8 bg-[#0B0B0F]/50 backdrop-blur-sm">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-purple-500/40 transition-colors">
              <textarea
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Message ${other.name}…`}
                rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none resize-none max-h-24 leading-relaxed"
                style={{ scrollbarWidth: 'none' }}
              />
              <button 
                className={`text-white/30 hover:text-white/60 transition-colors flex-shrink-0 ${uploading ? 'animate-pulse' : ''}`} 
                title="Send image"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-900/50 flex-shrink-0"
            >
              {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-5rem)] flex overflow-hidden">
      {showNewMsg && <NewMessageModal onClose={() => setShowNewMsg(false)} onStartConversation={startNewConversation} />}

      {/* Desktop: split layout. Mobile: show either list or chat */}
      {(!isMobile || !activeConv) && (
        <div className={`${isMobile ? 'w-full' : 'w-80 border-r border-white/8'} flex flex-col bg-[#0B0B0F]`}>
          <ConversationList />
        </div>
      )}
      {(!isMobile || activeConv) && (
        <div className="flex-1 flex flex-col bg-[#0D0D14]">
          <ChatPanel />
        </div>
      )}
    </div>
  );
}
