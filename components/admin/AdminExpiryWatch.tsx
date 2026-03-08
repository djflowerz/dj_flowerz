/**
 * AdminExpiryWatch.tsx
 *
 * Shows a live table of DJs whose subscription expires within ±24 hours.
 * Refreshes every 60 seconds automatically.
 * Each row has a pre-filled WhatsApp nudge button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, MessageCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke';

interface ExpiringUser {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    subscription_end_date: string;
    hours_left: number;
}

const AdminExpiryWatch: React.FC = () => {
    const { session } = useAuth() as any;
    const [users, setUsers] = useState<ExpiringUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchExpiring = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const res = await fetch(`${WORKER_URL}/api/admin/expiry-watch`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
            setLastRefresh(new Date());
        } catch (e) {
            console.error('ExpiryWatch fetch failed', e);
        } finally {
            setLoading(false);
        }
    }, [session?.access_token]);

    useEffect(() => {
        fetchExpiring();
        const interval = setInterval(fetchExpiring, 60_000);
        return () => clearInterval(interval);
    }, [fetchExpiring]);

    const whatsAppUrl = (phone: string, name: string, hours: number): string => {
        const clean = phone.replace(/\D/g, '');
        const timeText = hours < 0 ? 'has already expired' : `expires in approximately ${Math.floor(Math.abs(hours))} hours`;
        const msg = encodeURIComponent(
            `Hi ${name || 'DJ'}, your DJ Flowerz Music Pool access ${timeText}. ` +
            `Renew now to keep downloading: https://djflowerz.co.ke/checkout 🎧`
        );
        return `https://wa.me/${clean}?text=${msg}`;
    };

    const urgencyStyle = (hours: number) => {
        if (hours < 0) return 'text-red-500';
        if (hours < 12) return 'text-red-400';
        if (hours < 18) return 'text-amber-400';
        return 'text-orange-400';
    };

    const urgencyBg = (hours: number) => {
        if (hours < 0) return 'bg-red-500/10 border-red-500/20';
        if (hours < 12) return 'bg-red-500/5  border-red-500/10';
        return 'bg-amber-500/5 border-amber-500/10';
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">24-Hour Expiry Watch</h3>
                        <p className="text-[11px] text-gray-500">
                            Last updated: {lastRefresh.toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchExpiring}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-[#0B0B0F] rounded-[2rem] border border-white/5 overflow-hidden">
                {users.length === 0 && !loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <Clock size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">No expiring subscriptions in the next 24 hours</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">DJ / Email</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Time Left</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Expiry</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((u) => (
                                <tr key={u.id} className={`transition-colors hover:bg-white/2 ${urgencyBg(u.hours_left)}`}>
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-white">{u.full_name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500">{u.email}</div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className={`flex items-center gap-1.5 font-black text-sm ${urgencyStyle(u.hours_left)}`}>
                                            <Clock size={13} />
                                            {u.hours_left < 0
                                                ? 'EXPIRED'
                                                : `${Math.floor(u.hours_left)}h ${Math.round((u.hours_left % 1) * 60)}m`}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-gray-400 font-mono">
                                        {new Date(u.subscription_end_date).toLocaleString('en-KE')}
                                    </td>
                                    <td className="px-5 py-4">
                                        {u.phone_number ? (
                                            <a
                                                href={whatsAppUrl(u.phone_number, u.full_name, u.hours_left)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-all"
                                            >
                                                <MessageCircle size={14} /> Nudge on WhatsApp
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-600 italic">No phone on file</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminExpiryWatch;
