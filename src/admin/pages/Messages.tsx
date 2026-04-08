import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import {
    MessageSquare, Send, Search, User, Clock,
    Circle, RefreshCw, Mail, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const Messages: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [threads, setThreads] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [reply, setReply] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (session) loadThreads();
    }, [session]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadThreads = async () => {
        try {
            const data = await request('/api/admin/chat/sessions');
            setThreads(Array.isArray(data) ? data : (data?.messages || []));
        } catch {
            // endpoint may not exist yet - show empty state
        }
    };

    const loadMessages = async (thread: any) => {
        setSelected(thread);
        try {
            const data = await request(`/api/chat/session/${thread.id}`);
            setMessages(Array.isArray(data) ? data : (data?.messages || []));
        } catch {
            setMessages([]);
        }
    };

    const handleReply = async () => {
        if (!reply.trim() || !selected) return;
        setSending(true);
        try {
            await request(`/api/chat/reply`, {
                method: 'POST',
                body: JSON.stringify({ sessionId: selected.id, text: reply.trim() }),
            });
            toast.success('Reply sent');
            setReply('');
            loadMessages(selected);
        } catch {
            toast.error('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const filtered = threads.filter(t =>
        (t.visitor_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (t.visitor_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (t.subject?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Message Center">
            <div className="flex gap-8 h-[75vh] min-h-[600px]">
                {/* Thread list */}
                <div className="w-96 flex-shrink-0 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative group flex-1">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={15} />
                            <input
                                type="text"
                                placeholder="SEARCH MESSAGES..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50"
                            />
                        </div>
                        <button
                            onClick={loadThreads}
                            className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-gray-500 hover:text-brand-purple hover:border-brand-purple/30 transition-all flex-shrink-0"
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] overflow-hidden flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Loading...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-20 flex flex-col items-center gap-6 opacity-40 px-6">
                                <MessageSquare size={40} className="text-gray-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">No messages yet</span>
                            </div>
                        ) : filtered.map(thread => (
                            <button
                                key={thread.id}
                                onClick={() => loadMessages(thread)}
                                className={`w-full flex items-start gap-4 px-6 py-5 text-left border-b border-white/[0.03] transition-all hover:bg-white/[0.02] ${selected?.id === thread.id ? 'bg-brand-purple/5 border-l-2 border-l-brand-purple' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 flex-shrink-0 mt-0.5">
                                    <User size={16} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[11px] font-black text-white truncate">{thread.visitor_name || thread.visitor_email || 'Unknown'}</p>
                                        {thread.unread > 0 && (
                                            <span className="w-5 h-5 rounded-full bg-brand-purple text-white text-[8px] font-black flex items-center justify-center flex-shrink-0 ml-2">
                                                {thread.unread}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest truncate">{thread.subject || thread.visitor_email}</p>
                                    {thread.last_message && (
                                        <p className="text-[9px] text-gray-700 mt-1 truncate">{thread.last_message}</p>
                                    )}
                                </div>
                                <ChevronRight size={12} className="text-gray-700 flex-shrink-0 mt-2" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message thread */}
                <div className="flex-1 flex flex-col">
                    {!selected ? (
                        <div className="flex-1 bg-[#0B0B0F] border border-white/5 rounded-[3rem] flex flex-col items-center justify-center gap-6 opacity-40">
                            <MessageSquare size={56} className="text-gray-600" />
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">Select a conversation</p>
                        </div>
                    ) : (
                        <>
                            {/* Thread header */}
                            <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] px-10 py-7 mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white tracking-tighter">{selected.visitor_name || 'User'}</p>
                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                            <Mail size={10} /> {selected.visitor_email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Circle size={8} className="text-emerald-500 fill-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Online</span>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 overflow-y-auto mb-4">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                                        <MessageSquare size={36} className="text-gray-600" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No messages in this thread</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {messages.map((msg, i) => {
                                            const isAdmin = msg.sender === 'admin' || msg.role === 'admin';
                                            return (
                                                <div key={msg.id || i} className={`flex gap-4 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ${isAdmin ? 'bg-brand-purple/20 text-brand-purple' : 'bg-white/5 text-gray-500'}`}>
                                                        <User size={14} />
                                                    </div>
                                                    <div className={`max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                                        <div className={`rounded-3xl px-6 py-4 ${isAdmin ? 'bg-brand-purple/20 rounded-tr-md' : 'bg-white/5 rounded-tl-md'}`}>
                                                            <p className="text-[12px] font-medium text-white leading-relaxed">{msg.message || msg.content || msg.text}</p>
                                                        </div>
                                                        <p className="text-[8px] font-bold text-gray-700 uppercase tracking-widest px-2 flex items-center gap-1">
                                                            <Clock size={8} />
                                                            {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Just now'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={bottomRef} />
                                    </div>
                                )}
                            </div>

                            {/* Reply box */}
                            <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-4 flex items-end gap-4">
                                <textarea
                                    placeholder="Type your reply..."
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }
                                    }}
                                    rows={2}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[12px] text-white font-medium outline-none focus:border-brand-purple/50 resize-none placeholder:text-gray-700 transition-all"
                                />
                                <button
                                    onClick={handleReply}
                                    disabled={sending || !reply.trim()}
                                    className="w-14 h-14 bg-brand-purple rounded-2xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-purple/20"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default Messages;
