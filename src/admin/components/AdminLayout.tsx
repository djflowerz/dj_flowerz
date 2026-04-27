import React, { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Bell, Search, Users, ChevronRight, ShoppingCart, MessageSquare, Music, Ticket, Headphones, ShieldAlert, Calendar, DollarSign, ShieldCheck, Menu, X } from 'lucide-react';
import { useAdminApi } from '../hooks/useAdminApi';
import { Link } from 'react-router-dom';
import { cn } from '@/utils';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
    const { request } = useAdminApi();
    const [notifications, setNotifications] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const data = await request('/api/admin/notifications', {}, true);
            setNotifications(data);
        } catch (e) {
            console.warn("[AdminLayout] Notifications fetch failed", e);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 120000); // 2 minutes
        return () => clearInterval(interval);
    }, [request]);

    const totalCount = notifications?.total || 0;
    const breakdown = notifications?.breakdown || {};

    const getIcon = (key: string) => {
        switch (key) {
            case 'orders': return <ShoppingCart size={14} />;
            case 'payouts': return <DollarSign size={14} />;
            case 'chat': return <MessageSquare size={14} />;
            case 'tracks': return <Music size={14} />;
            case 'tickets': return <Ticket size={14} />;
            case 'studio': return <Headphones size={14} />;
            case 'maintenance': return <ShieldAlert size={14} />;
            case 'gigs': return <Calendar size={14} />;
            case 'verification': return <ShieldCheck size={14} />;
            default: return <Bell size={14} />;
        }
    };

    const getLabel = (key: string) => {
        switch (key) {
            case 'orders': return 'New Orders';
            case 'payouts': return 'Payout Requests';
            case 'chat': return 'Live Chats';
            case 'tracks': return 'Pool Updates';
            case 'tickets': return 'Support Tickets';
            case 'studio': return 'Studio Bookings';
            case 'maintenance': return 'Maintenance';
            case 'gigs': return 'Gig Inquiries';
            case 'verification': return 'Verification Queue';
            default: return key;
        }
    };

    const getLink = (key: string) => {
        switch (key) {
            case 'orders': return '/admin/orders';
            case 'payouts': return '/admin/payments';
            case 'chat': return '/admin/chat';
            case 'tracks': return '/admin/pool';
            case 'tickets': return '/admin/support';
            case 'studio': return '/admin/bookings';
            case 'maintenance': return '/admin/studio';
            case 'gigs': return '/admin/bookings';
            case 'verification': return '/admin/trust-portal';
            default: return '/admin';
        }
    };

    return (
        <div className="flex min-h-screen bg-[#050507] text-white relative">
            <AdminSidebar 
                isOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
            />

            <main className="flex-1 flex flex-col p-4 md:p-8 lg:p-12 transition-all duration-300">
                <header className="flex justify-between items-center mb-8 md:mb-12">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Toggle */}
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden w-12 h-12 rounded-xl bg-[#0B0B0F] border border-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"
                        >
                            <Menu size={24} />
                        </button>
                        
                        <div>
                            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-1 md:mb-2">{title}</h2>
                            <div className="w-8 md:w-12 h-1 md:h-1.5 bg-brand-purple rounded-full shadow-[0_0_15px_rgba(123,92,255,0.5)]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="relative group hidden xl:block">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="SEARCH SYSTEM..."
                                className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-16 pr-8 text-[11px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/5 transition-all w-80 placeholder:text-gray-700 shadow-inner"
                            />
                        </div>

                        <div className="relative">
                            <button 
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#0B0B0F] border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all shadow-inner relative group"
                            >
                                <Bell size={20} className={cn("md:w-6 md:h-6 group-hover:rotate-12 transition-transform", totalCount > 0 && "text-brand-purple")} />
                                {totalCount > 0 && (
                                    <div className="absolute top-2 right-2 md:top-4 md:right-4 w-4 h-4 md:w-5 md:h-5 bg-brand-purple rounded-full border-2 border-[#0B0B0F] flex items-center justify-center text-[8px] md:text-[9px] font-black text-white shadow-[0_0_10px_rgba(123,92,255,0.5)]">
                                        {totalCount > 9 ? '9+' : totalCount}
                                    </div>
                                )}
                            </button>

                            {showDropdown && (
                                <div className="absolute right-0 mt-4 w-72 bg-[#0B0B0F] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Intelligence Briefing</h3>
                                        <span className="text-[10px] font-bold text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded-full">{totalCount} Critical</span>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {Object.entries(breakdown).some(([_, count]) => (count as number) > 0) ? (
                                            Object.entries(breakdown)
                                                .filter(([_, count]) => (count as number) > 0)
                                                .map(([key, count]) => (
                                                    <Link 
                                                        key={key} 
                                                        to={getLink(key)}
                                                        onClick={() => setShowDropdown(false)}
                                                        className="flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors border-b border-white/5 group"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-brand-purple group-hover:bg-brand-purple/10 transition-all">
                                                            {getIcon(key)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[11px] font-bold text-white mb-0.5">{getLabel(key)}</p>
                                                            <p className="text-[9px] text-gray-500 uppercase tracking-tighter">{count as number} ACTION ITEMS PENDING</p>
                                                        </div>
                                                        <ChevronRight size={14} className="text-gray-700 group-hover:text-white transition-colors" />
                                                    </Link>
                                                ))
                                        ) : (
                                            <div className="p-12 text-center text-gray-600">
                                                <ShieldAlert size={32} className="mx-auto mb-3 opacity-20" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">System optimized</p>
                                                <p className="text-[9px] mt-1">NO PENDING NOTIFICATIONS</p>
                                            </div>
                                        )}
                                    </div>
                                    <Link 
                                        to="/admin" 
                                        className="block p-4 text-center text-[9px] font-black text-brand-purple hover:bg-brand-purple/5 transition-colors uppercase tracking-widest"
                                        onClick={() => setShowDropdown(false)}
                                    >
                                        View System Overview
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4 pl-3 md:pl-6 border-l border-white/5">
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-widest">Admin User</p>
                                <p className="text-[8px] md:text-[9px] text-brand-purple font-black uppercase tracking-tighter">System Administrator</p>
                            </div>
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-cyan p-[1px]">
                                <div className="w-full h-full rounded-xl md:rounded-2xl bg-[#0B0B0F] flex items-center justify-center">
                                    <Users size={20} className="md:w-6 md:h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>


                <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    );
};
