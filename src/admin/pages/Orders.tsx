import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Package, Eye, Filter, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

const Orders: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            // Add cache-busting timestamp
            const data = await request(`/api/admin/orders?t=${Date.now()}`);
            // Handle both array and result-wrapped responses
            setOrders(Array.isArray(data) ? data : (data.results || []));
        } catch (e) { }
    };

    const updateOrderStatus = async (id: string, status: string) => {
        try {
            await request(`/api/admin/orders/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
            toast.success(`Order status updated to ${status}`);
            loadOrders();
        } catch (e) {
            // Error handled by hook
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} className="text-emerald-500" />;
            case 'pending': return <Clock size={16} className="text-brand-yellow" />;
            case 'cancelled': return <XCircle size={16} className="text-red-500" />;
            default: return <Package size={16} className="text-gray-500" />;
        }
    };

    return (
        <AdminLayout title="Fulfillment Nexus">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:flex-none">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={18} />
                        <input
                            id="order-search"
                            name="orderSearch"
                            type="text"
                            placeholder="FIND ORDER ID..."
                            className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-16 pr-8 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all w-full lg:w-80 shadow-inner"
                        />
                    </div>
                    <button className="bg-[#0B0B0F] border border-white/10 px-8 py-4 rounded-full flex items-center gap-3 hover:bg-white/5 transition-all group">
                        <Filter size={18} className="text-gray-500 group-hover:text-brand-purple transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filter By Status</span>
                    </button>
                </div>

                <div className="flex gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">KSh 45,200 Secured Today</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Signal ID</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Customer</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Transaction</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-right text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Scanning Neural Network...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-40">
                                        <Package size={48} className="text-gray-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">Zero order signals detected in the frequency</span>
                                    </div>
                                </td>
                            </tr>
                        ) : orders.map((order) => (
                            <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-8">
                                    <p className="text-[11px] font-black text-white tracking-widest group-hover:text-brand-purple transition-colors">{order.id}</p>
                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter mt-1">
                                        {new Date(order.created_at).toLocaleString()}
                                    </p>
                                </td>
                                <td className="px-8 py-8">
                                    <div>
                                        <p className="text-sm font-black text-white tracking-tighter group-hover:translate-x-1 transition-transform">
                                            {order.customer_name || order.full_name || order.name || 'Anonymous'}
                                        </p>
                                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{order.customer_email || order.email}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <p className="text-sm font-black text-brand-purple tracking-tighter">KSh {(order.total_amount || 0).toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">{order.payment_status}</p>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(order.status)}
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {order.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex justify-end gap-3">
                                        <button className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-purple/30 transition-all hover:scale-110">
                                            <Eye size={18} />
                                        </button>
                                        {order.status !== 'completed' && (
                                            <button
                                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                                className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all hover:scale-110"
                                                title="Mark as Completed"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        {order.status !== 'cancelled' && (
                                            <button
                                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-500/30 transition-all hover:scale-110"
                                                title="Cancel Order"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default Orders;
