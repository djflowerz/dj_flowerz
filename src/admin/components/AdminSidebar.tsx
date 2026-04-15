import React from 'react';
import {
    LayoutDashboard, ShoppingBag, Package, Music, Users,
    Settings, LogOut, Bell, MessageSquare, CreditCard, Crown,
    Mail, Share2, Wallet, Megaphone, ShieldAlert
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: ShoppingBag, label: 'Products', path: '/admin/products' },
    { icon: Package, label: 'Orders', path: '/admin/orders' },
    { icon: Music, label: 'Mixtapes', path: '/admin/mixtapes' },
    { icon: MessageSquare, label: 'Messages', path: '/admin/messages' },
    { icon: Mail, label: 'Newsletter', path: '/admin/newsletter' },
    { icon: Share2, label: 'Affiliates', path: '/admin/affiliates' },
    { icon: Wallet, label: 'Lipa Pole Pole', path: '/admin/installments' },
    { icon: Package, label: 'Shipping', path: '/admin/shipping' },
    { icon: Megaphone, label: 'Marketing', path: '/admin/marketing' },
    { icon: Users, label: 'Profiles', path: '/admin/customers' },
    { icon: Crown, label: 'Subscriptions', path: '/admin/subscriptions' },
    { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
    { icon: Music, label: 'Music Pool', path: '/admin/pool' },
    { icon: ShieldAlert, label: 'Command Centre', path: '/admin/command-centre' },
];

export const AdminSidebar: React.FC = () => {
    const location = useLocation();

    return (
        <aside className="w-80 h-screen bg-[#060608] border-r border-white/5 flex flex-col p-8 sticky top-0 overflow-y-auto">
            <div className="flex items-center gap-4 mb-12 px-4">
                <div className="w-12 h-12 bg-brand-purple rounded-2xl flex items-center justify-center shadow-lg shadow-brand-purple/20">
                    <span className="text-white font-black text-xl">DF</span>
                </div>
                <div>
                    <h1 className="text-white font-black text-lg tracking-tighter">FLOWERZ</h1>
                    <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Control Center</p>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
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
                <Link to="/admin/settings" className="flex items-center gap-4 px-6 py-4 rounded-3xl text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                    <Settings size={22} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Settings</span>
                </Link>
                <button className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-red-500/70 hover:text-red-500 hover:bg-red-500/5 transition-all">
                    <LogOut size={22} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};
