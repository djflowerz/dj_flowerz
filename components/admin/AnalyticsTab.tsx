import React, { useMemo } from 'react';
import {
    TrendingUp, TrendingDown, Users, ShoppingBag, CreditCard,
    Download, FileText, Calendar, ArrowUpRight, ArrowDownRight,
    BarChart2, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useData } from '../../context/DataContext';

const AnalyticsTab: React.FC = () => {
    const {
        orders,
        users,
        subscriptions,
        mixtapes,
        ordersLoading,
        usersLoading,
        subscriptionsLoading
    } = useData();

    // 1. Calculate Summary Stats
    const stats = useMemo(() => {
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
        const subscriberCount = users.filter(u => u.isSubscriber).length;
        const totalDownloads = mixtapes.reduce((sum, m) => sum + (m.downloadsCount || 0), 0);

        return [
            { id: 'revenue', label: 'Total Revenue', value: `KES ${totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-green-400', bg: 'bg-green-500/10', trend: '+12.5%', isUp: true },
            { id: 'users', label: 'Total Users', value: users.length.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: '+5.2%', isUp: true },
            { id: 'subs', label: 'Active Subscribers', value: subscriberCount.toLocaleString(), icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: '+8.1%', isUp: true },
            { id: 'downloads', label: 'Pool Downloads', value: totalDownloads.toLocaleString(), icon: Download, color: 'text-orange-400', bg: 'bg-orange-500/10', trend: '+15.3%', isUp: true }
        ];
    }, [orders, users, mixtapes]);

    // 2. Prepare Chart Data (Revenue over time - last 7 months placeholder logic)
    const revenueData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
        return months.map((month, idx) => ({
            name: month,
            revenue: 15000 + (Math.random() * 10000),
            orders: 20 + Math.floor(Math.random() * 30)
        }));
    }, []);

    const categoryData = [
        { name: 'Apparel', value: 400 },
        { name: 'Digital', value: 300 },
        { name: 'Subscriptions', value: 500 },
        { name: 'Studio', value: 200 },
    ];

    const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

    return (
        <div className="space-y-8">
            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Store Analytics</h2>
                    <p className="text-gray-400">Track your store performance and user growth.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all">
                        <Calendar className="w-4 h-4" />
                        <span>Last 30 Days</span>
                    </button>
                    <button
                        onClick={() => window.open('https://djflowerz.co.ke/api/admin/reports/monthly', '_blank')}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all text-sm font-bold"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 glass-morphism">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div className={`flex items-center space-x-1 text-xs font-bold ${stat.isUp ? 'text-green-400' : 'text-red-400'}`}>
                                <span>{stat.trend}</span>
                                {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-gray-400">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Chart */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 glass-morphism">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                            <BarChart2 className="w-5 h-5 text-purple-400" />
                            <span>Revenue Growth</span>
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#6b7280"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `KES ${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0b0b0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ color: '#ffffff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRev)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 glass-morphism">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                            <PieChartIcon className="w-5 h-5 text-blue-400" />
                            <span>Sales by Category</span>
                        </h3>
                    </div>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0b0b0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsTab;
