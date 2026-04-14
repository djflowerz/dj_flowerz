import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Package, Truck, CheckCircle, Clock, 
  AlertCircle, ChevronRight, ArrowRight, DollarSign,
  TrendingUp, ShoppingBag, User, MapPin, Search,
  Filter, MoreVertical, Zap, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import OffersManager from '../src/components/community/OffersManager';

const API_URL = import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke';

interface EscrowOrder {
    id: string;
    post_id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    status: 'HELD' | 'SHIPPED' | 'DELIVERED' | 'RELEASED' | 'DISPUTED';
    shipping_address: string;
    tracking_number: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    product_name?: string;
    seller_name?: string;
    buyer_name?: string;
}

const EscrowManager: React.FC = () => {
    const { user } = useAuth();
    const [buyingOrders, setBuyingOrders] = useState<EscrowOrder[]>([]);
    const [sellingOrders, setSellingOrders] = useState<EscrowOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'buying' | 'selling' | 'offers'>('buying');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchOrders = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/escrow/orders?userId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setBuyingOrders(data.buying || []);
                setSellingOrders(data.selling || []);
            }
        } catch (err) {
            toast.error("Cloud synchronization failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [user]);

    const updateStatus = async (orderId: string, status: string, tracking?: string) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch(`${API_URL}/api/escrow/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId, 
                    status, 
                    tracking,
                    userId: user?.id 
                })
            });
            if (res.ok) {
                toast.success(`Order protocol updated: ${status}`);
                fetchOrders();
            } else {
                const error = await res.text();
                toast.error(error || "Authorization required for this state change");
            }
        } catch (err) {
            toast.error("Network protocol error");
        } finally {
            setUpdatingId(null);
        }
    };

    const getStatusUI = (status: string) => {
        switch (status) {
            case 'HELD': return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Funds Held' };
            case 'SHIPPED': return { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Dispatched' };
            case 'DELIVERED': return { color: 'text-brand-purple', bg: 'bg-brand-purple/10', label: 'Delivered' };
            case 'RELEASED': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Completed' };
            case 'DISPUTED': return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'In Dispute' };
            default: return { color: 'text-gray-500', bg: 'bg-gray-500/10', label: status };
        }
    };

    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="pt-32 pb-24 min-h-screen bg-[#050507] relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-purple/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-brand-purple" size={20} />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Escrow & Clearance</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-display font-black text-white italic tracking-tighter uppercase leading-[0.8] mb-2">
                            Order <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">Clearance</span>
                        </h1>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">P2P Marketplace Lifecycle Management</p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl">
                        {(['buying', 'selling', 'offers'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                                    activeTab === t ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {t === 'offers' ? 'Negotiations' : t.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dashboard Grid */}
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <RefreshCw className="text-brand-purple animate-spin" size={32} />
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Synchronizing Ledger...</p>
                    </div>
                ) : activeTab === 'offers' ? (
                    <OffersManager userId={user.id} />
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {(activeTab === 'buying' ? buyingOrders : sellingOrders).length > 0 ? (
                            (activeTab === 'buying' ? buyingOrders : sellingOrders).map(order => {
                                const statusUI = getStatusUI(order.status);
                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="group glass-card rounded-3xl border border-white/5 hover:border-brand-purple/20 transition-all overflow-hidden"
                                    >
                                        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                                            {/* Info Column */}
                                            <div className="flex-1 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Transaction ID: {order.id.slice(-8)}</span>
                                                    </div>
                                                    <div className={`px-4 py-1.5 rounded-full ${statusUI.bg} ${statusUI.color} text-[10px] font-black uppercase tracking-widest border border-current/20`}>
                                                        {statusUI.label}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight group-hover:text-brand-cyan transition-colors">
                                                        {order.product_name || "Community Listing"}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-brand-purple mt-1">
                                                        <DollarSign size={16} />
                                                        <span className="text-xl font-black tracking-tighter">{order.amount.toLocaleString()} KES</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">{activeTab === 'buying' ? 'Counterparty (Seller)' : 'Counterparty (Buyer)'}</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                                                                <User size={16} />
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-300">@{activeTab === 'buying' ? order.seller_name : order.buyer_name}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">Transit Destination</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                                                                <MapPin size={16} />
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-300 truncate">{order.shipping_address}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Column */}
                                            <div className="md:w-72 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-8 gap-6">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Protocol Actions</h4>
                                                    
                                                    {activeTab === 'buying' ? (
                                                        <>
                                                            {order.status === 'SHIPPED' && (
                                                                <button 
                                                                    disabled={updatingId === order.id}
                                                                    onClick={() => updateStatus(order.id, 'DELIVERED')}
                                                                    className="w-full py-4 bg-brand-cyan text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-brand-cyan/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                                                                >
                                                                    Mark as Delivered
                                                                </button>
                                                            )}
                                                            {order.status === 'DELIVERED' && (
                                                                <button 
                                                                    disabled={updatingId === order.id}
                                                                    onClick={() => {
                                                                        if(window.confirm("Release payment to the seller? Ensure you have inspected the items.")) {
                                                                            updateStatus(order.id, 'RELEASED');
                                                                        }
                                                                    }}
                                                                    className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                                                                >
                                                                    Release Funds
                                                                </button>
                                                            )}
                                                            {order.status === 'HELD' && (
                                                                <p className="text-[10px] text-gray-500 font-bold text-center italic">Waiting for Dispatch...</p>
                                                            )}
                                                            {order.status === 'RELEASED' && (
                                                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center">
                                                                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Safe & Secured</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {order.status === 'HELD' && (
                                                                <button 
                                                                    disabled={updatingId === order.id}
                                                                    onClick={() => {
                                                                        const tracking = window.prompt("Enter shipping/tracking details (e.g. G4S Ref #123)");
                                                                        if (tracking) updateStatus(order.id, 'SHIPPED', tracking);
                                                                    }}
                                                                    className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                                                                >
                                                                    Initialize Shipping
                                                                </button>
                                                            )}
                                                            {order.status === 'SHIPPED' && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase text-center">Tracking: {order.tracking_number}</p>
                                                                    <p className="text-[10px] text-amber-500 font-bold text-center italic">Awaiting Buyer Confirmation</p>
                                                                </div>
                                                            )}
                                                            {order.status === 'RELEASED' && (
                                                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center">
                                                                     <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Funds Disbursed</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase">
                                                    <span>Updated</span>
                                                    <span>{new Date(order.updated_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="py-32 text-center glass-card rounded-[3rem] border border-white/5 space-y-4">
                                <AlertCircle className="mx-auto text-gray-800" size={48} />
                                <h3 className="text-gray-400 font-black uppercase tracking-[0.3em]">No Active Assets Found</h3>
                                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Buy or Sell items in the community to activate escrow protocols.</p>
                                <div className="pt-6">
                                    <Link 
                                        to="/community" 
                                        className="px-8 py-3 bg-brand-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all"
                                    >
                                        Visit Community
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EscrowManager;
