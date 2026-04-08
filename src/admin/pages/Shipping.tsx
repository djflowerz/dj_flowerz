import React, { useState, useEffect } from 'react';
import {
    Package, Search, Truck, CheckCircle, Clock, AlertCircle,
    Edit, MapPin, User, Phone, X, RefreshCw
} from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { toast } from 'sonner';

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    total_amount: number;
    status: string;
    shipping_status: string;
    tracking_number: string;
    courier_name: string;
    courier_driver_name: string;
    courier_driver_contact: string;
    estimated_arrival: string;
    shipping_address: string;
    created_at: string;
}

const STATUS_MAP: Record<string, { label: string; chip: string; icon: React.ReactNode }> = {
    pending:          { label: 'Pending',          chip: 'bg-gray-500/10 border-gray-500/20 text-gray-400',   icon: <Clock size={12} /> },
    shipped:          { label: 'Shipped',           chip: 'bg-blue-500/10 border-blue-500/20 text-blue-400',   icon: <Truck size={12} /> },
    out_for_delivery: { label: 'Out for Delivery',  chip: 'bg-orange-500/10 border-orange-500/20 text-orange-400', icon: <Truck size={12} /> },
    delivered:        { label: 'Delivered',         chip: 'bg-green-500/10 border-green-500/20 text-green-400', icon: <CheckCircle size={12} /> },
    cancelled:        { label: 'Cancelled',         chip: 'bg-red-500/10 border-red-500/20 text-red-400',      icon: <X size={12} /> },
};

const FILTERS = ['all', 'pending', 'shipped', 'out_for_delivery', 'delivered'];

const Shipping: React.FC = () => {
    const { request } = useAdminApi();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [draft, setDraft] = useState<Partial<Order>>({});

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await request('/api/admin/orders');
            if (data) setOrders(Array.isArray(data) ? data : (data.orders || []));
        } catch { /* silent */ } finally { setLoading(false); }
    };

    const openEdit = (order: Order) => {
        setEditingOrder(order);
        setDraft({
            shipping_status: order.shipping_status || 'pending',
            tracking_number: order.tracking_number || '',
            courier_name: order.courier_name || '',
            courier_driver_name: order.courier_driver_name || '',
            courier_driver_contact: order.courier_driver_contact || '',
            estimated_arrival: order.estimated_arrival?.split('T')[0] || '',
        });
    };

    const handleSave = async () => {
        if (!editingOrder) return;
        setSaving(true);
        try {
            await request(`/api/admin/orders/${editingOrder.id}`, {
                method: 'PUT',
                body: JSON.stringify(draft),
            });
            toast.success(`Shipping updated for #${editingOrder.order_number}`);
            setEditingOrder(null);
            await fetchOrders();
        } catch { toast.error('Failed to update shipping info'); }
        finally { setSaving(false); }
    };

    const filtered = orders.filter(o => {
        const matchSearch =
            (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.tracking_number || '').toLowerCase().includes(search.toLowerCase());
        return filter === 'all' ? matchSearch : matchSearch && o.shipping_status === filter;
    });

    const counts = {
        pending: orders.filter(o => !o.shipping_status || o.shipping_status === 'pending').length,
        shipped: orders.filter(o => o.shipping_status === 'shipped').length,
        out_for_delivery: orders.filter(o => o.shipping_status === 'out_for_delivery').length,
        delivered: orders.filter(o => o.shipping_status === 'delivered').length,
    };

    return (
        <AdminLayout title="Shipment Control">
            {/* Edit Modal */}
            {editingOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="px-10 py-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Update Shipping</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Order #{editingOrder.order_number} · {editingOrder.customer_name}</p>
                            </div>
                            <button onClick={() => setEditingOrder(null)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-10 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Shipping Status</label>
                                <select value={draft.shipping_status || 'pending'}
                                    onChange={e => setDraft(p => ({ ...p, shipping_status: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all">
                                    {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                                        <option key={v} value={v}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Tracking #</label>
                                    <input type="text" placeholder="e.g., GS1234567KE" value={draft.tracking_number || ''}
                                        onChange={e => setDraft(p => ({ ...p, tracking_number: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white font-mono focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Courier</label>
                                    <input type="text" placeholder="e.g., G4S Express" value={draft.courier_name || ''}
                                        onChange={e => setDraft(p => ({ ...p, courier_name: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Driver Name</label>
                                    <input type="text" placeholder="Driver full name" value={draft.courier_driver_name || ''}
                                        onChange={e => setDraft(p => ({ ...p, courier_driver_name: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Driver Contact</label>
                                    <input type="tel" placeholder="+254 700 000 000" value={draft.courier_driver_contact || ''}
                                        onChange={e => setDraft(p => ({ ...p, courier_driver_contact: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Estimated Arrival</label>
                                <input type="date" value={draft.estimated_arrival || ''}
                                    onChange={e => setDraft(p => ({ ...p, estimated_arrival: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setEditingOrder(null)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Cancel</button>
                                <button onClick={handleSave} disabled={saving}
                                    className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Truck size={14} />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                {[
                    { label: 'Pending', count: counts.pending, icon: <Clock size={24} />, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
                    { label: 'Shipped', count: counts.shipped, icon: <Truck size={24} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                    { label: 'Out for Delivery', count: counts.out_for_delivery, icon: <Truck size={24} />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
                    { label: 'Delivered', count: counts.delivered, icon: <CheckCircle size={24} />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                ].map(s => (
                    <div key={s.label} className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-7 flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>{s.icon}</div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
                            <h4 className="text-3xl font-black text-white tracking-tighter">{s.count}</h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                {/* Toolbar */}
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Active Shipments</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Track logistics and update courier data</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                            <input type="text" placeholder="ORDER #, NAME, OR TRACKING..." value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all" />
                        </div>
                        <div className="flex gap-1.5">
                            {FILTERS.map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-white/5 text-gray-500 border border-white/10 hover:text-white hover:bg-white/10'}`}>
                                    {f === 'all' ? 'All' : STATUS_MAP[f]?.label ?? f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="divide-y divide-white/[0.03]">
                    {loading && (
                        <div className="flex flex-col items-center gap-4 py-32">
                            <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Syncing Logistics Grid...</p>
                        </div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="flex flex-col items-center gap-6 py-32 opacity-30">
                            <Package size={48} className="text-gray-500" />
                            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No shipments match your filter.</p>
                        </div>
                    )}
                    {filtered.map(order => {
                        const s = STATUS_MAP[order.shipping_status] ?? STATUS_MAP.pending;
                        return (
                            <div key={order.id} className="p-8 hover:bg-white/[0.01] transition-colors group">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    {/* Left: customer info */}
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-[10px] font-mono text-brand-purple font-bold">#{order.order_number}</span>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${s.chip}`}>
                                                {s.icon} {s.label}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-black text-white group-hover:text-brand-purple transition-colors flex items-center gap-2">
                                            <User size={16} className="text-brand-purple shrink-0" />
                                            {order.customer_name}
                                        </h3>
                                        <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
                                            {order.shipping_address && (
                                                <span className="flex items-center gap-1.5"><MapPin size={12} /> {order.shipping_address}</span>
                                            )}
                                            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>

                                    {/* Right: logistics info + edit */}
                                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 min-w-[140px]">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Driver</p>
                                            <p className="text-[12px] font-black text-white flex items-center gap-1.5">
                                                <Truck size={13} className="text-brand-purple" />
                                                {order.courier_driver_name || <span className="text-gray-600 font-normal">Not assigned</span>}
                                            </p>
                                            {order.courier_driver_contact && (
                                                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Phone size={10} /> {order.courier_driver_contact}
                                                </p>
                                            )}
                                        </div>

                                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 min-w-[130px]">
                                            <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Tracking</p>
                                            <p className="text-[12px] font-black text-white font-mono">{order.tracking_number || <span className="text-gray-600 font-normal">N/A</span>}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{order.courier_name || 'Standard'}</p>
                                        </div>

                                        {order.estimated_arrival && (
                                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 min-w-[120px]">
                                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">ETA</p>
                                                <p className="text-[12px] font-black text-white">
                                                    {new Date(order.estimated_arrival).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        )}

                                        <button onClick={() => openEdit(order)}
                                            className="w-12 h-12 bg-brand-purple/10 border border-brand-purple/20 rounded-2xl flex items-center justify-center text-brand-purple hover:bg-brand-purple hover:text-white transition-all shadow-lg shadow-brand-purple/10">
                                            <Edit size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
};

export default Shipping;
