import React from 'react';
import { AlertCircle, Clock, MessageCircle, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';

const AdminExpiryWatch: React.FC = () => {
    const { expiringUsers, refreshExpiringUsers, expiringUsersLoading } = useData();

    const whatsAppUrl = (phone: string, name: string, hours: number, date: string): string => {
        const clean = (phone || '').replace(/\D/g, '');
        const timeText = hours < 0 ? 'has already expired' : `expires in approximately ${Math.floor(Math.abs(hours))} hours`;
        const dateStr = new Date(date).toLocaleDateString();
        const msg = encodeURIComponent(
            `Hi ${name || 'DJ'}, your DJ Flowerz Music Pool access ${timeText} (${dateStr}). ` +
            `Renew now to keep downloading and get 7-day VIP access for only KES 200: https://djflowerz.co.ke/checkout 🎧`
        );
        return `https://wa.me/${clean}?text=${msg}`;
    };

    const getStatusInfo = (hours: number, dateStr: string) => {
        const expiryDate = new Date(dateStr);
        const now = new Date();
        const isExpired = hours < 0 || expiryDate < now;
        const isToday = !isExpired && expiryDate.toDateString() === now.toDateString();

        if (isExpired) {
            return {
                label: 'EXPIRED',
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/20',
                rowHighlight: 'border-l-4 border-red-500 bg-red-900/10'
            };
        }
        if (isToday) {
            return {
                label: 'EXPIRING TODAY',
                color: 'text-yellow-400',
                bg: 'bg-yellow-500/10 border-yellow-500/20',
                rowHighlight: 'bg-yellow-900/5 border-l-4 border-yellow-500/50'
            };
        }
        return {
            label: 'EXPIRING SOON',
            color: 'text-brand-purple',
            bg: 'bg-brand-purple/10 border-brand-purple/20',
            rowHighlight: ''
        };
    };

    const formatTimeRemaining = (hours: number) => {
        const absHours = Math.abs(hours);
        const h = Math.floor(absHours);
        const m = Math.round((absHours % 1) * 60);

        if (hours < 0) return `Ended ${h}h ${m}m ago`;
        return `Ends in ${h}h ${m}m`;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-purple/10 rounded-xl text-brand-purple">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">Advanced Expiry Watch</h3>
                        <p className="text-[11px] text-gray-500">
                            Monitoring ±48 hour window from D1 Matrix
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => refreshExpiringUsers?.()}
                    disabled={expiringUsersLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    <RefreshCw size={14} className={expiringUsersLoading ? 'animate-spin' : ''} />
                    Refresh Matrix
                </button>
            </div>

            {/* Table */}
            <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                {!expiringUsers || expiringUsers.length === 0 ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock size={40} className="opacity-20" />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest mb-1">Matrix Clear</h4>
                        <p className="text-xs">No imminent expirations detected in the next 48 hours.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Subscribers / Identity</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Countdown</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Exact Expiry</th>
                                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Retention Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {expiringUsers.map((u: any) => {
                                    const status = getStatusInfo(u.hours_left, u.subscription_end_date);
                                    return (
                                        <tr key={u.id} className={`transition-all duration-300 hover:bg-white/[0.04] ${status.rowHighlight}`}>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-black text-xs uppercase">
                                                        {(u.full_name || u.email || '?')[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-base tracking-tight">{u.full_name || 'VIP Member'}</div>
                                                        <div className="text-[11px] text-gray-500 font-medium">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.color}`}>
                                                    <Clock size={12} />
                                                    {status.label}
                                                </div>
                                                <div className={`mt-2 text-xs font-bold ${status.color} opacity-80 pl-1`}>
                                                    {formatTimeRemaining(u.hours_left)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-xs text-white font-black tracking-widest uppercase">
                                                    {new Date(u.subscription_end_date).toLocaleDateString('en-KE', { 
                                                        day: 'numeric', 
                                                        month: 'short', 
                                                        year: 'numeric' 
                                                    })}
                                                </div>
                                                <div className="text-[10px] text-gray-500 mt-1 font-mono uppercase">
                                                    {new Date(u.subscription_end_date).toLocaleTimeString('en-KE', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {u.phone_number ? (
                                                    <a
                                                        href={whatsAppUrl(u.phone_number, u.full_name, u.hours_left, u.subscription_end_date)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-green-500/20 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/5 group"
                                                    >
                                                        <MessageCircle size={16} className="group-hover:rotate-12 transition-transform" /> 
                                                        Nudge via WhatsApp
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-black uppercase tracking-widest italic opacity-50 bg-white/5 py-2 px-4 rounded-xl w-fit">
                                                        <AlertCircle size={12} />
                                                        Missing Phone
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminExpiryWatch;
