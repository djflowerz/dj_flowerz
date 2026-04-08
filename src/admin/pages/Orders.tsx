import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { Package, Eye, Filter, CheckCircle, Clock, XCircle, Search, Truck, MapPin, Phone, User, Calendar, DollarSign, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Order } from '@/types';

const Orders: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (session) loadOrders();
    }, [session]);

    const loadOrders = async () => {
        try {
            const data = await request(`/api/admin/orders?t=${Date.now()}`);
            const results = Array.isArray(data) ? data : (data.results || []);
            setOrders(results.map((o: any) => ({
                ...o,
                items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
                total: o.total_amount || 0,
                customerName: o.customer_name || 'N/A',
                customerEmail: o.customer_email || 'N/A',
                customerPhone: o.customer_phone,
                shippingStatus: o.shipping_status,
                trackingNumber: o.tracking_number,
                courierName: o.shipping_provider || o.courierName,
                estimatedArrival: o.expected_arrival || o.estimatedArrival,
                courierDriverName: o.courier_driver_name,
                courierDriverContact: o.courier_driver_contact
            })));
        } catch (e) { }
    };

    const handleUpdateOrder = async (orderId: string, updates: Partial<Order>) => {
        setIsSaving(true);
        try {
            // Map camelCase back to snake_case for the backend if needed, 
            // but the worker usually handles standard PUT.
            // Let's ensure the payload uses fields the backend expects.
            const payload = {
                status: updates.status,
                shipping_status: updates.shippingStatus,
                tracking_number: updates.trackingNumber,
                shipping_provider: updates.courierName,
                expected_arrival: updates.estimatedArrival,
                delivery_time: updates.deliveryTime,
                courier_driver_name: updates.courierDriverName,
                courier_driver_contact: updates.courierDriverContact,
                notes: updates.adminMessage
            };

            await request(`/api/admin/orders/${orderId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            toast.success('Order intelligence updated');
            loadOrders();
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, ...updates });
            }
        } catch (e) {
            toast.error('Failed to update order nexus');
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} className="text-emerald-500" />;
            case 'shipped': return <Truck size={14} className="text-blue-500" />;
            case 'pending': return <Clock size={14} className="text-brand-yellow" />;
            case 'cancelled': return <XCircle size={14} className="text-red-500" />;
            default: return <Package size={14} className="text-gray-500" />;
        }
    };

    const filteredOrders = orders.filter(o => 
      (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Fulfillment Nexus">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:flex-none">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={18} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            type="text"
                            placeholder="FIND SIGNAL ID OR CLIENT..."
                            className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-16 pr-8 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all w-full lg:w-80 shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Global Order Synchronicity Active</p>
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
                        {loading && orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Scanning Grid...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-40">
                                        <Package size={48} className="text-gray-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">No order signals detected</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-8">
                                    <p className="text-[11px] font-black text-white tracking-widest group-hover:text-brand-purple transition-colors">{order.id}</p>
                                    <p className="text-[9px] font-bold text-gray-600 mt-1 whitespace-nowrap">
                                        {new Date(order.createdAt || (order as any).created_at).toLocaleString()}
                                    </p>
                                </td>
                                <td className="px-8 py-8">
                                    <div>
                                        <p className="text-sm font-black text-white tracking-tighter group-hover:translate-x-1 transition-transform">
                                            {order.customerName}
                                        </p>
                                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{order.customerEmail}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <p className="text-sm font-black text-brand-purple tracking-tighter">KSh {order.total.toLocaleString()}</p>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">{order.paymentStatus}</p>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(order.status)}
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {order.status}
                                            </span>
                                        </div>
                                        {order.shippingStatus && (
                                           <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-7 italic">
                                              Shipment: {order.shippingStatus.replace('_', ' ')}
                                           </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex justify-end gap-3">
                                        <button 
                                            onClick={() => setSelectedOrder(order)}
                                            className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-purple/30 transition-all hover:scale-110"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        {order.status !== 'completed' && (
                                            <button
                                                onClick={() => handleUpdateOrder(order.id, { status: 'completed' })}
                                                className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-emerald-500 hover:border-emerald-500/30 transition-all hover:scale-110"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" onClick={() => setSelectedOrder(null)} />
                    
                    <div className="relative w-full max-w-5xl bg-[#0B0B0F] border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden max-h-full overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 bg-white/[0.02]">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tighter uppercase mb-1">Order Details</h2>
                                <p className="text-[10px] font-bold text-brand-purple uppercase tracking-[0.2em]">{selectedOrder.id}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Left Col: Customer & Items */}
                            <div className="lg:col-span-2 space-y-10">
                                <section>
                                    <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <User size={14} className="text-brand-purple" /> Customer Intel
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Full Name</p>
                                            <p className="text-sm font-black text-white">{selectedOrder.customerName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Email Terminal</p>
                                            <p className="text-sm font-black text-white">{selectedOrder.customerEmail}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Phone Signal</p>
                                            <p className="text-sm font-black text-white">{selectedOrder.customerPhone || 'Not Provided'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">City/Location</p>
                                            <p className="text-sm font-black text-white">{selectedOrder.city || 'N/A'}</p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Package size={14} className="text-brand-purple" /> Manifest Items
                                    </h3>
                                    <div className="space-y-4">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-5 rounded-2xl group hover:border-brand-purple/20 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-brand-purple font-black">
                                                        {item.quantity}x
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white tracking-tight">{item.productName}</p>
                                                        {item.variant && <p className="text-[9px] font-bold text-gray-600 uppercase mt-1">Variant: {item.variant}</p>}
                                                    </div>
                                                </div>
                                                <p className="text-sm font-black text-white">KSh {(item.price * item.quantity).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Transaction</p>
                                            <p className="text-2xl font-black text-brand-purple">KSh {selectedOrder.total.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Right Col: Logistics & Admin */}
                            <div className="space-y-10">
                                <section className="space-y-6">
                                    <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                        <Truck size={14} className="text-brand-purple" /> Logistics Nexus
                                    </h3>
                                    <div className="space-y-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem]">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-2">Shipping Status</label>
                                            <select 
                                                value={selectedOrder.shippingStatus || 'pending'}
                                                onChange={(e) => handleUpdateOrder(selectedOrder.id, { shippingStatus: e.target.value as any })}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-5 text-[11px] font-black text-white uppercase tracking-widest outline-none focus:border-brand-purple/50"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="packed">Packed</option>
                                                <option value="shipped">On Transit</option>
                                                <option value="out_for_delivery">Out for Delivery</option>
                                                <option value="delivered">Delivered</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-2">Tracking Signal</label>
                                            <input 
                                                type="text"
                                                value={selectedOrder.trackingNumber || ''}
                                                onChange={(e) => setSelectedOrder({...selectedOrder, trackingNumber: e.target.value})}
                                                onBlur={(e) => handleUpdateOrder(selectedOrder.id, { trackingNumber: e.target.value })}
                                                placeholder="Enter tracking ID..."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-5 text-[11px] font-black text-white/80 outline-none focus:border-brand-purple/50 placeholder:text-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-2">Courier / Provider</label>
                                            <input 
                                                type="text"
                                                value={selectedOrder.courierName || ''}
                                                onChange={(e) => setSelectedOrder({...selectedOrder, courierName: e.target.value})}
                                                onBlur={(e) => handleUpdateOrder(selectedOrder.id, { courierName: e.target.value })}
                                                placeholder="DHL, G4S, Sendy etc."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-5 text-[11px] font-black text-white/80 outline-none focus:border-brand-purple/50 placeholder:text-gray-800"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                        <Phone size={14} className="text-brand-purple" /> Driver Intel
                                    </h3>
                                    <div className="space-y-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem]">
                                        <div>
                                            <input 
                                                type="text"
                                                value={selectedOrder.courierDriverName || ''}
                                                onChange={(e) => setSelectedOrder({...selectedOrder, courierDriverName: e.target.value})}
                                                onBlur={(e) => handleUpdateOrder(selectedOrder.id, { courierDriverName: e.target.value })}
                                                placeholder="Driver Name..."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-5 text-[11px] font-black text-white/80 outline-none focus:border-brand-purple/50 placeholder:text-gray-800"
                                            />
                                        </div>
                                        <div>
                                            <input 
                                                type="text"
                                                value={selectedOrder.courierDriverContact || ''}
                                                onChange={(e) => setSelectedOrder({...selectedOrder, courierDriverContact: e.target.value})}
                                                onBlur={(e) => handleUpdateOrder(selectedOrder.id, { courierDriverContact: e.target.value })}
                                                placeholder="Driver Contact..."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-5 text-[11px] font-black text-white/80 outline-none focus:border-brand-purple/50 placeholder:text-gray-800"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                                        <DollarSign size={14} className="text-emerald-500" /> Payment & Arrival
                                    </h3>
                                    <div className="space-y-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem]">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-2">Exp. Arrival Time</label>
                                            <input 
                                                type="text"
                                                value={selectedOrder.estimatedArrival || ''}
                                                onChange={(e) => setSelectedOrder({...selectedOrder, estimatedArrival: e.target.value})}
                                                onBlur={(e) => handleUpdateOrder(selectedOrder.id, { estimatedArrival: e.target.value })}
                                                placeholder="2-3 Days, Today 4PM etc."
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-5 text-[11px] font-black text-white/80 outline-none focus:border-brand-purple/50"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleUpdateOrder(selectedOrder.id, { paymentStatus: 'paid' })}
                                            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${selectedOrder.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                                        >
                                            {selectedOrder.paymentStatus === 'paid' ? 'PAID & VERIFIED' : 'MARK AS PAID'}
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Orders;
