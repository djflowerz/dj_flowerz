// components/admin/AdminLiveChatTab.tsx
// Admin Live Chat – view all sessions, read messages, and reply directly

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageSquare, User, Bot, Headphones, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz-worker.ianmuriithiflowerz.workers.dev';
const ADMIN_POLL = 5000; // 5s refresh for sessions list
const CHAT_POLL  = 3000; // 3s refresh for open conversation

interface ChatSession {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: 'bot' | 'human' | 'closed';
  whatsapp_notified: number;
  email_notified: number;
  last_message: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: number;
  sender: 'user' | 'agent' | 'bot';
  text: string;
  created_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  switch (status) {
    case 'human':
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">🟢 Human</span>;
    case 'closed':
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">Closed</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">🤖 Bot</span>;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

// ── Main component ───────────────────────────────────────────────────────────

export function AdminLiveChatTab() {
  const { token } = useAuth() as any;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [lastMsgAt, setLastMsgAt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatPollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // ── Fetch sessions list ──────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/chat/sessions`, { headers: authHeader });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Sync active session status if changed
        if (activeSession) {
          const updated = data.find((s: ChatSession) => s.id === activeSession.id);
          if (updated) setActiveSession(updated);
        }
      }
    } catch (err) {
      console.error('[AdminChat] fetchSessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [activeSession, token]);

  // Start session list polling
  useEffect(() => {
    fetchSessions();
    sessionPollRef.current = setInterval(fetchSessions, ADMIN_POLL);
    return () => { if (sessionPollRef.current) clearInterval(sessionPollRef.current); };
  }, [fetchSessions]);

  // ── Fetch messages for active session ───────────────────────────────────
  const fetchMessages = useCallback(async (sessionId: string, since: string | null, initial = false) => {
    try {
      const url = `${WORKER_URL}/api/chat/session/${sessionId}${since ? `?since=${encodeURIComponent(since)}` : ''}`;
      const res = await fetch(url, { headers: authHeader });
      if (!res.ok) return;
      const data = await res.json();

      if (initial) {
        setMessages(data.messages || []);
      } else if (data.messages?.length) {
        setMessages(prev => [...prev, ...data.messages]);
      }

      if (data.messages?.length) {
        const last = data.messages[data.messages.length - 1];
        setLastMsgAt(last.created_at);
      }
    } catch (err) {
      console.error('[AdminChat] fetchMessages:', err);
    }
  }, [token]);

  const openSession = useCallback(async (session: ChatSession) => {
    setActiveSession(session);
    setMessages([]);
    setLastMsgAt(null);
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    await fetchMessages(session.id, null, true);
  }, [fetchMessages]);

  useEffect(() => {
    if (!activeSession) return;
    if (chatPollRef.current) clearInterval(chatPollRef.current);
    chatPollRef.current = setInterval(() => {
      fetchMessages(activeSession.id, lastMsgAt);
    }, CHAT_POLL);
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [activeSession, lastMsgAt, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send reply ───────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeSession || isSending) return;
    setIsSending(true);
    const text = replyText.trim();
    setReplyText('');

    // Optimistic
    setMessages(prev => [...prev, { id: Date.now(), sender: 'agent', text, created_at: new Date().toISOString() }]);

    try {
      await fetch(`${WORKER_URL}/api/chat/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ sessionId: activeSession.id, text }),
      });
      await fetchMessages(activeSession.id, lastMsgAt);
      fetchSessions();
    } catch (err) {
      console.error('[AdminChat] sendReply:', err);
    } finally {
      setIsSending(false);
    }
  };

  // ── Close / reopen session ───────────────────────────────────────────────
  const toggleClose = async () => {
    if (!activeSession) return;
    const newStatus = activeSession.status === 'closed' ? 'human' : 'closed';
    await fetch(`${WORKER_URL}/api/admin/chat/sessions/${activeSession.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ status: newStatus }),
    });
    setActiveSession(prev => prev ? { ...prev, status: newStatus } : prev);
    fetchSessions();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e]">

      {/* ── Sessions Sidebar ── */}
      <div className="w-72 shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#e91e8c]" />
            Live Chat
          </h3>
          <button
            onClick={fetchSessions}
            className="h-7 w-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {isLoadingSessions && (
            <div className="p-6 text-center text-white/30 text-sm">Loading…</div>
          )}
          {!isLoadingSessions && sessions.length === 0 && (
            <div className="p-6 text-center text-white/30 text-sm">No chat sessions yet</div>
          )}
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => openSession(s)}
              className={`w-full text-left p-3 hover:bg-white/5 transition-colors ${
                activeSession?.id === s.id ? 'bg-white/8 border-l-2 border-[#e91e8c]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {s.visitor_name || 'Visitor'}
                  </p>
                  {s.visitor_email && (
                    <p className="text-[10px] text-white/40 truncate">{s.visitor_email}</p>
                  )}
                </div>
                {statusBadge(s.status)}
              </div>
              {s.last_message && (
                <p className="mt-1.5 text-xs text-white/40 truncate leading-relaxed">
                  {s.last_message}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-white/25">{timeAgo(s.updated_at)}</span>
                <span className="text-[10px] text-white/25">{s.message_count} msgs</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Conversation Panel ── */}
      {!activeSession ? (
        <div className="flex-1 flex items-center justify-center text-white/20 flex-col gap-3">
          <MessageSquare className="h-12 w-12 opacity-30" />
          <p className="text-sm">Select a conversation</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conversation header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
            <div>
              <h4 className="text-sm font-bold text-white">
                {activeSession.visitor_name || 'Visitor'}
              </h4>
              <p className="text-xs text-white/40">
                {activeSession.visitor_email || 'No email'} · {activeSession.id.slice(0, 8)}…
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeSession.whatsapp_notified ? (
                <span className="text-[10px] text-emerald-400">✓ WhatsApp notified</span>
              ) : null}
              {statusBadge(activeSession.status)}
              <button
                onClick={toggleClose}
                className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
              >
                {activeSession.status === 'closed' ? 'Reopen' : 'Close'}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gradient-to-b from-white/3 to-transparent">
            {messages.map(msg => {
              const isAgent = msg.sender === 'agent';
              const isUser  = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[80%] ${isAgent ? 'self-end flex-row-reverse' : 'self-start'}`}
                >
                  {/* Avatar */}
                  <div className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                    isAgent ? 'bg-[#e91e8c]/20' :
                    isUser  ? 'bg-blue-500/20' :
                              'bg-amber-500/20'
                  }`}>
                    {isAgent ? <Headphones className="h-3.5 w-3.5 text-[#e91e8c]" />
                             : isUser ? <User className="h-3.5 w-3.5 text-blue-400" />
                             : <Bot className="h-3.5 w-3.5 text-amber-400" />}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-white/30 mx-1">
                      {isAgent ? 'You (Admin)' : isUser ? activeSession.visitor_name || 'User' : 'Bot'}
                    </span>
                    <div className={`px-3.5 py-2 text-sm leading-relaxed ${
                      isAgent
                        ? 'bg-[#e91e8c]/15 border border-[#e91e8c]/20 text-white rounded-2xl rounded-tr-sm'
                        : isUser
                          ? 'bg-white/8 border border-white/10 text-white rounded-2xl rounded-tl-sm'
                          : 'bg-amber-500/5 border border-amber-500/15 text-white/70 rounded-2xl rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                    <span className={`text-[10px] text-white/20 mx-1 ${isAgent ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply input */}
          {activeSession.status !== 'closed' && (
            <div className="p-3 border-t border-white/10 shrink-0">
              <form onSubmit={handleSend} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply…"
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e91e8c]/50 focus:ring-2 focus:ring-[#e91e8c]/20 transition-all"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="h-10 w-10 rounded-full bg-[#e91e8c] text-white flex items-center justify-center hover:bg-[#c2185b] transition-colors disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <p className="mt-1.5 text-[10px] text-white/25 text-center">
                Reply will also appear in the user's chat widget on the website
              </p>
            </div>
          )}
          {activeSession.status === 'closed' && (
            <div className="p-4 border-t border-white/10 text-center text-xs text-white/30">
              Session closed · <button onClick={toggleClose} className="text-[#e91e8c] hover:underline">Reopen to reply</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
