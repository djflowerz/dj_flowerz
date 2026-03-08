/**
 * AdminPaymentListener.tsx
 *
 * Mounts invisibly at the top of AdminDashboard.
 * Opens a persistent WebSocket to /admin/ws → AdminHub DO.
 * On PAYMENT_SUCCESS: plays cash register sound + fires Sonner toast.
 * On USER_SIGNUP: fires blue info toast.
 * On SYNC_COMPLETE / EXPIRY_REMINDERS_SENT / SUBSCRIPTIONS_EXPIRED: fires system toasts.
 * Maintains a rolling `liveSales` list (last 5) via the `onNewSale` callback.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { DollarSign, UserPlus, RefreshCw, AlertTriangle, AlertCircle, Music, Inbox } from 'lucide-react';

const WORKER_WS_URL = (import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke')
    .replace(/^http/, 'ws') + '/admin/ws';

const CASH_REGISTER_URL = 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/audio/cash-register.mp3';

export interface LiveActivity {
    type: 'play' | 'download';
    title: string;
    description?: string;
    time: string;
}

export interface LiveSale {
    amount: number;
    email: string;
    reference: string;
    channel: string;
    time: string;
}

interface Props {
    onNewSale?: (sale: LiveSale) => void;
    onNewActivity?: (activity: LiveActivity) => void;
}

const AdminPaymentListener: React.FC<Props> = ({ onNewSale }) => {
    const wsRef = useRef<WebSocket | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Pre-load the cash register audio asset
    useEffect(() => {
        audioRef.current = new Audio(CASH_REGISTER_URL);
        audioRef.current.preload = 'auto';
    }, []);

    const playCashRegister = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {/* browser autoplay policy — silently skip */ });
    }, []);

    useEffect(() => {
        let retryCount = 0;
        let retryTimer: ReturnType<typeof setTimeout>;

        function connect() {
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            const ws = new WebSocket(WORKER_WS_URL);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                let data: { type: string; payload?: any; message?: string; count?: number };
                try { data = JSON.parse(event.data); } catch { return; }

                switch (data.type) {

                    case 'PAYMENT_SUCCESS': {
                        const p = data.payload as LiveSale;
                        playCashRegister();
                        toast.success(`Payment Received: KES ${p.amount.toLocaleString()}`, {
                            description: `From: ${p.email} | via ${p.channel} | Ref: ${p.reference}`,
                            duration: 12000,
                            icon: <DollarSign className="text-green-500" size={18} />,
                            action: {
                                label: 'View Payments',
                                onClick: () => {
                                    // Dispatch custom event so AdminDashboard can switch tabs
                                    window.dispatchEvent(new CustomEvent('admin:switch-tab', { detail: 'payments' }));
                                }
                            }
                        });
                        onNewSale?.(p);
                        break;
                    }

                    case 'PAYMENT_RECOVERY_NEEDED': {
                        const p = data.payload;
                        toast.error(`⚠️ Action Required: ${p.email} paid KES ${p.amount} but D1 update FAILED`, {
                            description: `Ref: ${p.reference} — Grant access manually in Payments tab.`,
                            duration: 60000,
                            icon: <AlertCircle className="text-red-500" size={18} />,
                        });
                        break;
                    }

                    case 'USER_SIGNUP': {
                        toast.info(`New DJ joined! ${data.message || ''}`, {
                            description: 'Community Directory updated.',
                            duration: 8000,
                            icon: <UserPlus className="text-blue-400" size={18} />,
                        });
                        break;
                    }

                    case 'SYNC_COMPLETE': {
                        toast.success(data.message || 'Paystack sync complete', {
                            icon: <RefreshCw className="text-cyan-400" size={18} />,
                            duration: 6000,
                        });
                        break;
                    }

                    case 'EXPIRY_REMINDERS_SENT': {
                        toast.info(data.message || 'Expiry reminders sent', {
                            icon: <AlertTriangle className="text-amber-400" size={18} />,
                            duration: 6000,
                        });
                        break;
                    }

                    case 'SUBSCRIPTIONS_EXPIRED': {
                        if (data.count && data.count > 0) {
                            toast.warning(`${data.count} subscription(s) expired and deactivated.`, {
                                duration: 8000,
                            });
                        }
                        break;
                    }

                    case 'MIXTAPE_HYPE': {
                        toast(data.message || 'Someone is vibing!', {
                            description: 'Live play tracked in D1.',
                            icon: <Music className="text-pink-500 animate-pulse" size={18} />,
                            duration: 4000,
                        });
                        const p = data.payload || {};
                        onNewActivity?.({
                            type: p.action || 'play',
                            title: p.title || 'Mixtape',
                            description: data.message,
                            time: new Date().toLocaleTimeString()
                        });
                        break;
                    }

                    case 'GIG_INQUIRY': {
                        const p = data.payload;
                        toast.success(`New Gig Inquiry! 🎸`, {
                            description: `${p.client} requested a ${p.type} booking.`,
                            duration: 15000,
                            icon: <Inbox className="text-brand-purple" size={18} />,
                            action: {
                                label: 'Open Pipeline',
                                onClick: () => {
                                    window.dispatchEvent(new CustomEvent('admin:switch-tab', { detail: 'gigs' }));
                                }
                            }
                        });
                        break;
                    }

                }
            };

            ws.onclose = () => {
                // Exponential back-off reconnect (max 30 s)
                const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                retryCount++;
                retryTimer = setTimeout(connect, delay);
            };

            ws.onerror = () => ws.close();
        }

        connect();
        return () => {
            clearTimeout(retryTimer);
            wsRef.current?.close();
        };
    }, [playCashRegister, onNewSale, onNewActivity]);

    // This component renders nothing — just the side-effect
    return null;
};

export default AdminPaymentListener;
