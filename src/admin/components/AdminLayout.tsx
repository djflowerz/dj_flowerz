import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Bell, Search } from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
    return (
        <div className="flex min-h-screen bg-[#050507] text-white">
            <AdminSidebar />

            <main className="flex-1 flex flex-col p-12">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{title}</h2>
                        <div className="w-12 h-1.5 bg-brand-purple rounded-full shadow-[0_0_15px_rgba(123,92,255,0.5)]" />
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group hidden lg:block">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="SEARCH SYSTEM..."
                                className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-16 pr-8 text-[11px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/5 transition-all w-80 placeholder:text-gray-700 shadow-inner"
                            />
                        </div>

                        <button className="w-14 h-14 rounded-2xl bg-[#0B0B0F] border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all shadow-inner relative group">
                            <Bell size={24} className="group-hover:rotate-12 transition-transform" />
                            <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-brand-purple rounded-full border-2 border-[#0B0B0F] animate-pulse" />
                        </button>

                        <div className="flex items-center gap-4 pl-6 border-l border-white/5">
                            <div className="text-right hidden sm:block">
                                <p className="text-[11px] font-black text-white uppercase tracking-widest">Admin User</p>
                                <p className="text-[9px] text-brand-purple font-black uppercase tracking-tighter">System Administrator</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-cyan p-[1px]">
                                <div className="w-full h-full rounded-2xl bg-[#0B0B0F] flex items-center justify-center">
                                    <Users size={24} className="text-white" />
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
