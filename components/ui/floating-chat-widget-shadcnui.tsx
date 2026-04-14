// components/ui/floating-chat-widget-shadcnui.tsx
// Live chat widget — real bi-directional messaging with admin via WhatsApp/Admin Panel

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  MessageSquare,
  Send,
  X,
  User,
  Headphones,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const WORKER_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';
const POLL_INTERVAL = 3000; // 3 seconds

interface ChatMessage {
  id: number;
  session_id?: string;
  sender: 'user' | 'agent' | 'bot';
  text: string;
  created_at: string;
}

interface ChatSession {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: 'bot' | 'human' | 'closed';
  ticket_number?: string;
}

interface ChatSessionResponse {
  session: ChatSession;
  messages: ChatMessage[];
}

// ── Animation variants ──────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95, transformOrigin: "bottom right" },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", damping: 25, stiffness: 300, staggerChildren: 0.04 },
  },
  exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.18 } },
};

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// Simple markdown bold: **text** → <strong>text</strong>
function renderText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ME';

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasUnread(false);
  }, []);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, scrollToBottom]);

  const handleChatScroll = useCallback(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!atBottom);
    if (atBottom) setHasUnread(false);
  }, []);

  // ── Session init ─────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user?.name || user?.email?.split('@')[0] || 'Visitor',
          email: user?.email || null,
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSession(prev => prev ?? { id: data.sessionId, visitor_name: null, visitor_email: null, status: 'bot' });
        // Fetch initial messages
        await pollMessages(data.sessionId, null, true);
      }
    } catch (err) {
      console.error('[Chat] startSession failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ── Poll for new messages ────────────────────────────────────────────────
  const pollMessages = useCallback(async (
    sid: string,
    since: string | null,
    initial = false
  ) => {
    try {
      const url = `${WORKER_URL}/api/chat/session/${sid}${since ? `?since=${encodeURIComponent(since)}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        if (initial) setIsLoading(false);
        return;
      }
      
      const data = await res.json();

      if (initial) {
        setMessages(data.messages || []);
      } else if (data.messages?.length) {
        setMessages(prev => {
          // Filter out any messages that already exist in state (by ID)
          const newMessages = data.messages.filter((msg: ChatMessage) => {
            return !prev.some(p => p.id === msg.id);
          });

          if (newMessages.length === 0) return prev;
          
          const updated = [...prev, ...newMessages];
          // Show unread badge if chat is closed or user scrolled up
          const el = chatAreaRef.current;
          const atBottom = !el || (el.scrollHeight - el.scrollTop - el.clientHeight < 80);
          if (!atBottom) setHasUnread(true);
          
          return updated;
        });
      }

      if (data.session) {
        setSession(data.session);
      }

      if (data.messages?.length) {
        const last = data.messages[data.messages.length - 1];
        setLastPolledAt(last.created_at);
      }
    } catch (err) {
      console.error('[Chat] pollMessages failed:', err);
    } finally {
      if (initial) setIsLoading(false);
    }
  }, []);

  // Open / close
  const toggleOpen = useCallback(async () => {
    setIsOpen(prev => {
      const next = !prev;
      if (next && !session) {
        // Start session on first open
        setTimeout(() => startSession(), 0);
      }
      return next;
    });
    setHasUnread(false);
  }, [session, startSession]);

  // Start polling when session is active
  useEffect(() => {
    if (!session || !isOpen) return;

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      pollMessages(session.id, lastPolledAt);
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session, isOpen, lastPolledAt, pollMessages]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !session || isSending) return;

    setInputText('');
    setIsSending(true);

    try {
      await fetch(`${WORKER_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, text }),
      });
      // Poll immediately to get both the user message and bot/agent response
      await pollMessages(session.id, lastPolledAt);
    } catch (err) {
      console.error('[Chat] sendMessage failed:', err);
    } finally {
      setIsSending(false);
    }
  }, [inputText, session, isSending, pollMessages]);

  // ── Request human agent ──────────────────────────────────────────────────
  const handleRequestHuman = useCallback(async () => {
    if (!session || isEscalating || session.status === 'human') return;
    setIsEscalating(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/chat/human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      // Poll immediately to get the confirmation bot message
      await pollMessages(session.id, lastPolledAt);
      if (data.success) {
        setSession(prev => prev ? { ...prev, status: 'human' } : prev);
      }
    } catch (err) {
      console.error('[Chat] requestHuman failed:', err);
    } finally {
      setIsEscalating(false);
    }
  }, [session, isEscalating, lastPolledAt, pollMessages]);

  const handleReturnToBot = useCallback(async () => {
    if (!session) return;
    try {
      await fetch(`${WORKER_URL}/api/chat/return-to-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      await pollMessages(session.id, null, true);
    } catch (err) {
      console.error('[Chat] returnToBot failed:', err);
    }
  }, [session, pollMessages]);

  const handleCloseSession = useCallback(async () => {
    if (!session) return;
    if (!confirm("Are you sure you want to end this chat session?")) return;
    try {
      await fetch(`${WORKER_URL}/api/chat/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      setSession(null);
      setMessages([]);
      setIsOpen(false);
    } catch (err) {
      console.error('[Chat] closeSession failed:', err);
    }
  }, [session]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    // Simulate upload to R2 (In a real app, you'd use a dedicated endpoint)
    // For now, we'll just send a message saying "File uploaded"
    setIsSending(true);
    try {
      // Logic for actual upload would go here
      // For demo, we send a message
      await fetch(`${WORKER_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: session.id, 
          text: `[File Uploaded: ${file.name}]`,
          fileUrl: `https://pub-8418579cf4314cdba9a528f804297135.r2.dev/uploads/${file.name}`, // Placeholder
          fileType: file.type 
        }),
      });
      await pollMessages(session.id, lastPolledAt);
    } catch (err) {
      console.error('[Chat] fileUpload failed:', err);
    } finally {
      setIsSending(false);
    }
  }, [session, lastPolledAt, pollMessages]);

  const isHumanMode = session?.status === 'human';

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-[360px] sm:w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#131313]/95 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 flex flex-col"
            style={{ height: '520px' }}
          >
            {/* ── Header ── */}
            <div className="relative border-b border-white/10 bg-gradient-to-r from-[#e91e8c]/20 to-[#9c27b0]/20 p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#e91e8c] to-[#9c27b0] flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">DJ</span>
                    </div>
                    <span className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#131313]",
                      isHumanMode ? "bg-emerald-500" : "bg-amber-400"
                    )} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">DJ Flowerz Support</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-white/60">
                        {isHumanMode ? '🟢 Human agent connected' : '🤖 AI Assistant'}
                      </p>
                      {session?.ticket_number && (
                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/40 border border-white/5">
                          #{session.ticket_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {session && session.status !== 'closed' && (
                    <>
                      {isHumanMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
                          title="Return to Bot"
                          onClick={handleReturnToBot}
                        >
                          <ChevronDown className="h-4 w-4 rotate-90" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-white/10 text-white/60 hover:text-red-400"
                        title="End Session"
                        onClick={handleCloseSession}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-white/10 text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Chat Area ── */}
            <div
              ref={chatAreaRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gradient-to-b from-white/5 to-[#131313]/40 relative"
            >
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-[#e91e8c]/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!isLoading && messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isAgent = msg.sender === 'agent';
                const isBot = msg.sender === 'bot';

                return (
                  <motion.div
                    key={msg.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      "flex gap-2.5 max-w-[90%]",
                      isUser ? "self-end flex-row-reverse" : "self-start"
                    )}
                  >
                    {/* Avatar */}
                    {!isUser && (
                      <div className={cn(
                        "h-7 w-7 rounded-full shrink-0 flex items-center justify-center mt-1",
                        isAgent
                          ? "bg-emerald-500/20 border border-emerald-500/30"
                          : "bg-[#e91e8c]/20 border border-[#e91e8c]/30"
                      )}>
                        {isAgent
                          ? <Headphones className="h-3.5 w-3.5 text-emerald-400" />
                          : <span className="text-[10px] font-bold text-[#e91e8c]">DJ</span>
                        }
                      </div>
                    )}
                    {isUser && (
                      <Avatar className="h-7 w-7 shrink-0 mt-1">
                        {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                        <AvatarFallback className="bg-[#e91e8c] text-white font-bold text-[10px]">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Bubble */}
                    <div className="flex flex-col gap-0.5">
                      {!isUser && (
                        <span className="text-[10px] text-white/40 ml-1">
                          {isAgent ? 'DJ Flowerz' : 'Assistant'}
                        </span>
                      )}
                      <div className={cn(
                        "px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                        isUser
                          ? "bg-gradient-to-br from-[#e91e8c] to-[#c2185b] text-white rounded-2xl rounded-tr-sm"
                          : isAgent
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-white rounded-2xl rounded-tl-sm"
                            : "bg-white/5 border border-white/10 text-white/90 rounded-2xl rounded-tl-sm"
                      )}>
                        {renderText(msg.text)}
                      </div>
                      <span className={cn(
                        "text-[10px] text-white/30",
                        isUser ? "text-right" : "text-left ml-1"
                      )}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollBtn && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-[88px] right-4 h-8 w-8 rounded-full bg-[#e91e8c] text-white shadow-lg flex items-center justify-center z-10"
                >
                  <ChevronDown className="h-4 w-4" />
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border border-[#131313]" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── Human Agent CTA Banner ── */}
            {!isHumanMode && !isLoading && (
              <div className="shrink-0 border-t border-white/5 bg-white/3 px-4 py-2">
                <button
                  onClick={handleRequestHuman}
                  disabled={isEscalating}
                  className="w-full text-xs text-white/50 hover:text-[#e91e8c] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <User className="h-3.5 w-3.5" />
                  {isEscalating ? 'Connecting…' : 'Speak to a Human Agent'}
                </button>
              </div>
            )}

            {/* ── Input Area ── */}
            <div className="border-t border-white/10 bg-[#131313]/80 p-3 shrink-0">
              <form
                className="flex items-center gap-2"
                onSubmit={handleSend}
              >
                <div className="relative">
                  <input
                    type="file"
                    id="chat-file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={isSending || isLoading || !session}
                    onClick={() => document.getElementById('chat-file-upload')?.click()}
                    className="h-10 w-10 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </Button>
                </div>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isHumanMode ? "Message DJ Flowerz…" : "Ask me anything…"}
                  disabled={isSending || isLoading || !session}
                  autoComplete="off"
                  className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-white/30 text-white focus:border-[#e91e8c]/50 focus:ring-2 focus:ring-[#e91e8c]/20 disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputText.trim() || isSending || isLoading || !session}
                  className="h-10 w-10 rounded-full bg-[#e91e8c] text-white shadow-lg transition-all hover:bg-[#c2185b] hover:scale-105 disabled:opacity-40"
                >
                  {isSending ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle Button ── */}
      <motion.button
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        onClick={toggleOpen}
        className={cn(
          "cursor-pointer relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300",
          isOpen
            ? "bg-red-600 text-white"
            : "bg-gradient-to-br from-[#e91e8c] to-[#9c27b0] text-white"
        )}
      >
        <span className="absolute inset-0 -z-10 rounded-full bg-inherit opacity-30 blur-xl" />
        {isOpen
          ? <X className="h-6 w-6" />
          : <MessageSquare className="h-6 w-6" />
        }
        {/* Unread badge */}
        {!isOpen && hasUnread && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-[#0a0a0a] animate-pulse" />
        )}
      </motion.button>
    </div>
  );
}
