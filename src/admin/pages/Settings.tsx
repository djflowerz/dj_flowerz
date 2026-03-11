import React from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Settings as SettingsIcon, Shield, Database, Bell } from 'lucide-react';

const Settings: React.FC = () => {
    return (
        <AdminLayout title="System Configurations">
            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-10 min-h-[70vh] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-brand-purple/10 rounded-full flex items-center justify-center mb-6">
                    <SettingsIcon size={40} className="text-brand-purple animate-spin-slow" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">Configurations Offline</h2>
                <p className="text-gray-500 max-w-md text-sm mb-8">
                    The advanced matrix configuration panel is currently undergoing scheduled maintenance.
                    Please check back later for system tweaks and preference management.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-colors opacity-50 cursor-not-allowed">
                        <Shield className="text-brand-purple mb-4" size={24} />
                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Security</h4>
                        <p className="text-[10px] text-gray-500 font-medium">Access control & API keys</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-colors opacity-50 cursor-not-allowed">
                        <Database className="text-brand-cyan mb-4" size={24} />
                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Database</h4>
                        <p className="text-[10px] text-gray-500 font-medium">Backups & D1 management</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-colors opacity-50 cursor-not-allowed">
                        <Bell className="text-brand-yellow mb-4" size={24} />
                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Notifications</h4>
                        <p className="text-[10px] text-gray-500 font-medium">Alerts & communications</p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Settings;
