// hooks/useEscrowChat.ts
import { useState, useEffect, useCallback } from 'react';

const API_BASE = `${import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke'}/api/escrow`;

export interface ChatMessage {
    id: string;
    escrow_id: string;
    sender_id: string;
    content: string;
    is_system: number;
    attachment_url: string | null;
    created_at: string;
    username: string;
    full_name: string;
}

export function useEscrowChat(escrowId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const fetchMessages = useCallback(async () => {
        if (!escrowId) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('sb-access-token');
            const res = await fetch(`${API_BASE}/${escrowId}/chat`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (e) {
            console.error('[ChatHook] Fetch failed:', e);
        } finally {
            setLoading(false);
        }
    }, [escrowId]);

    useEffect(() => {
        fetchMessages();
        // Poll every 30s for backup (Push is primary for real-time alerting)
        const interval = setInterval(fetchMessages, 30000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    const sendMessage = async (content: string, attachment_url?: string) => {
        if (!escrowId || (!content && !attachment_url)) return;
        setSending(true);
        try {
            const token = localStorage.getItem('sb-access-token');
            const res = await fetch(`${API_BASE}/${escrowId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ content, attachment_url })
            });
            if (res.ok) {
                await fetchMessages();
                return true;
            }
        } catch (e) {
            console.error('[ChatHook] Send failed:', e);
        } finally {
            setSending(false);
        }
        return false;
    };

    return { messages, loading, sending, sendMessage, refresh: fetchMessages };
}
