import React from 'react';
import {
    LayoutDashboard, ShoppingBag, Package, Music, Users,
    Settings, LogOut, MessageSquare, CreditCard, Crown,
    Mail, Share2, Wallet, Megaphone, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: ShoppingBag, label: 'Products', path: '/admin/products' },
    { icon: Package, label: 'Orders', path: '/admin/orders' },
    { icon: Music, label: 'Mixtapes', path: '/admin/mixtapes' },
    { icon: Mail, label: 'Newsletter', path: '/admin/newsletter' },
    { icon: Wallet, label: 'Lipa Pole Pole', path: '/admin/installments' },
    { icon: Package, label: 'Shipping', path: '/admin/shipping' },
    { icon: Megaphone, label: 'Marketing', path: '/admin/marketing' },
    { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
    { icon: Music, label: 'Music Pool', path: '/admin/pool' },
    { icon: Users, label: 'Profiles', path: '/admin/profiles' },
    { icon: Crown, label: 'Subscribers', path: '/admin/subscriptions' },
    { icon: ShieldAlert, label: 'Command Centre', path: '/admin/command-centre' },
    { icon: ShieldCheck, label: 'Trust Portal', path: '/admin/trust-portal' },
    { icon: Crown, label: 'Governance', path: '/admin/governance' },
];

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
    const location = useLocation();

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={cn(
                "fixed lg:sticky top-0 left-0 z-[70] w-80 h-screen bg-[#060608] border-r border-white/5 flex flex-col p-8 overflow-y-auto transition-transform duration-500 ease-out lg:translate-x-0",
                isOpen ? "translate-x-0 shadow-[20px_0_40px_rgba(0,0,0,0.5)]" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between mb-12 px-4 lg:px-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-purple rounded-2xl flex items-center justify-center shadow-lg shadow-brand-purple/20">
                            <span className="text-white font-black text-xl">DF</span>
                        </div>
                        <div>
                            <h1 className="text-white font-black text-lg tracking-tighter">FLOWERZ</h1>
                            <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Control Center</p>
                        </div>
                    </div>
                    
                    {/* Mobile Close Button */}
                    <button 
                        onClick={onClose}
                        className="lg:hidden p-2 text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={`flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 group ${isActive
                                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon size={22} className={isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                                <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-8 pt-8 border-t border-white/5 space-y-2">
                    <Link 
                        to="/admin/settings" 
                        onClick={onClose}
                        className="flex items-center gap-4 px-6 py-4 rounded-3xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <Settings size={22} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Settings</span>
                    </Link>
                    <button className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-red-500/70 hover:text-red-500 hover:bg-red-500/5 transition-all">
                        <LogOut size={22} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

