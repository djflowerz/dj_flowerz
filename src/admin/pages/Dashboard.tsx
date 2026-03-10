import React from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { StatCard } from '../components/StatCard';
import {
    DollarSign, ShoppingBag, Music, Users,
    TrendingUp, Activity, Inbox
} from 'lucide-react';

const Dashboard: React.FC = () => {
    return (
        <AdminLayout title="System Overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <StatCard
                    label="Total Revenue"
                    value="KSh 128,450"
                    icon={DollarSign}
                    trend="+12.5%"
                />
                <StatCard
                    label="Total Orders"
                    value="458"
                    icon={ShoppingBag}
                    color="brand-cyan"
                    trend="+8.2%"
                />
                <StatCard
                    label="Active Mixtapes"
                    value="84"
                    icon={Music}
                    color="brand-yellow"
                />
                <StatCard
                    label="Active Users"
                    value="1,240"
                    icon={Users}
                    color="brand-purple"
                    trend="+15.3%"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black tracking-tighter uppercase">Recent Activity</h3>
                        <Activity size={20} className="text-brand-purple" />
                    </div>
                    <div className="space-y-6">
                        {/* Static placeholder for activity log */}
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-brand-purple/20 transition-all group">
                                <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple group-hover:scale-110 transition-transform">
                                    <ShoppingBag size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white">New Order #ORD-102{i}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">2 minutes ago</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-brand-purple tracking-tighter">KSh 4,500</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black tracking-tighter uppercase">System Status</h3>
                        <Inbox size={20} className="text-brand-purple" />
                    </div>
                    <div className="space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Database (D1)</span>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Optimal</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[95%]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Storage (R2)</span>
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Healthy</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-cyan w-[82%]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Worker Latency</span>
                                <span className="text-[9px] font-black text-brand-purple uppercase tracking-widest">High Speed</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-purple w-[15%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Dashboard;
