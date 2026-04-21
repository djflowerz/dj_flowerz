import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { StatCard } from '../components/StatCard';
import {
    DollarSign, ShoppingBag, Music, Users,
    Activity, Inbox, Heart, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';

interface DashboardStats {
    totalRevenue: number;
    confirmedRevenue: number;
    totalOrders: number;
    activeMixtapes: number;
    activeUsers: number;
    totalTips: number;
    totalUsers: number;
    recentActivity: Array<{
        id: string;
        type: string;
        email?: string;
        name?: string;
        amount: number;
        status?: string;
        createdAt: string;
    }>;
}

const Dashboard: React.FC = () => {
    const { request } = useAdminApi();
    const { session } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        const fetchDashboardStats = async () => {
            try {
                const data = await request('/api/admin/dashboard');
                setStats(data);
            } catch (error) {
                console.error("Dashboard error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardStats();
    }, [session, request]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
    };

    const handleSync = async () => {
        try {
            toast.loading("Recovering missing payments...");
            const res = await request('/api/admin/sync-paystack', { method: 'POST' });
            if (res.success) {
                toast.success(`Sync Complete: Recovered ${res.synced} payment(s)`);
                // Refresh data
                const data = await request('/api/admin/dashboard');
                setStats(data);
            }
        } catch (e) {
            toast.error("Sync failed");
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <AdminLayout title="System Overview">
            <div className="flex justify-end mb-8">
                <button 
                    onClick={handleSync}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-purple/10 border border-brand-purple/20 rounded-2xl text-[11px] font-black uppercase tracking-widest text-brand-purple hover:bg-brand-purple/20 transition-all group"
                >
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    Sync with Paystack
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <StatCard
                    label="Total Revenue"
                    value={loading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
                    subtext={!loading && (stats?.confirmedRevenue || 0) > 0 ? `${formatCurrency(stats?.confirmedRevenue || 0)} confirmed` : `KES ${(stats?.totalRevenue || 0).toLocaleString()} total`}
                    icon={DollarSign}
                />
                <StatCard
                    label="Store Orders"
                    value={loading ? '...' : (stats?.totalOrders || 0).toString()}
                    icon={ShoppingBag}
                    color="brand-cyan"
                />
                <StatCard
                    label="Active Mixtapes"
                    value={loading ? '...' : (stats?.activeMixtapes || 0).toString()}
                    icon={Music}
                    color="brand-yellow"
                />
                <StatCard
                    label="Total Tips"
                    value={loading ? '...' : formatCurrency(stats?.totalTips || 0)}
                    icon={Heart}
                    color="brand-pink"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-2xl font-black tracking-tighter uppercase">Recent Activity</h3>
                        <Activity size={20} className="text-brand-purple" />
                    </div>
                    <div className="space-y-6">
                        {loading && <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading activity...</p>}
                        {!loading && stats?.recentActivity.length === 0 && (
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No recent orders found.</p>
                        )}
                        {!loading && stats?.recentActivity.map((activity) => (
                            <div key={activity.id} className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-brand-purple/20 transition-all group">
                                <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple group-hover:scale-110 transition-transform flex-shrink-0">
                                    {activity.type === 'payment' ? <DollarSign size={20} /> : <ShoppingBag size={20} />}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white truncate">
                                        {activity.name || activity.email || (activity.type === 'payment' ? 'Subscription Payment' : `Order #${activity.id.slice(0, 12)}`)}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">
                                        {activity.email && activity.name ? activity.email : (activity.email || 'No email provided')}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{formatDate(activity.createdAt)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-brand-purple tracking-tighter">{formatCurrency(activity.amount)}</p>
                                    {activity.status && (
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${
                                            (activity.status === 'paid' || activity.status === 'success' || activity.status === 'completed') ? 'text-emerald-400' : 'text-yellow-400'
                                        }`}>{activity.status}</p>
                                    )}
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
