import { useState, useMemo } from 'react';
import { Order } from '../../types';
import { Package, MessageCircle, Truck, Search, Filter, CheckCircle, XCircle, AlertCircle, Zap, ShieldCheck, ExternalLink, Calendar, CreditCard, ShoppingBag, ArrowUpRight, Copy, ChevronDown, ChevronUp, Loader2, Phone, MapPin, Hash, Info } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminOrdersTab() {
  const { orders, updateOrder } = useData();
  const [activeTab, setActiveTab] = useState<'all' | 'fulfillment' | 'whatsapp'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const COURIERS = [
    { id: 'sendy', name: 'Sendy' },
    { id: 'g4s', name: 'G4S' },
    { id: 'wells_fargo', name: 'Wells Fargo' },
    { id: 'fargo_courier', name: 'Fargo Courier' },
    { id: 'pick_up', name: 'In-Store Pickup' },
    { id: 'other', name: 'Other / Custom' }
  ];

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateOrder(id, { status: status as any });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateField = async (id: string, field: keyof Order, value: any) => {
    try {
      await updateOrder(id, { [field]: value } as any);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsShipped = async (id: string, trackingNumber: string, courierName?: string) => {
    if (!trackingNumber) {
      alert('Please enter a tracking number first.');
      return;
    }
    setUpdatingId(id);
    await updateOrder(id, { 
      trackingNumber, 
      courierName, 
      status: 'shipped',
      shippedAt: new Date().toISOString()
    } as any);
    setUpdatingId(null);
  };

  const processRefund = async (id: string) => {
    if (confirm('Are you sure you want to refund this order? This action cannot be undone.')) {
      setUpdatingId(id);
      try {
        await updateOrder(id, { paymentStatus: 'refunded', status: 'cancelled' } as any);
      } catch (err) {
        console.error(err);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  const getLogisticsStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'shipped': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'processing': return 'bg-brand-purple/10 text-brand-purple border-brand-purple/20';
      default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  const filteredOrders = orders.filter(order => {
    const custName = order.customerName || (order as any).customer_name || '';
    const custEmail = order.customerEmail || (order as any).customer_email || '';
    const custPhone = order.customerPhone || (order as any).customer_phone || '';
    const orderId = order.id || '';

    const matchesSearch =
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custPhone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    if (activeTab === 'fulfillment') {
      return matchesSearch && (order.status === 'processing' || order.status === 'pending' || order.status === 'shipped');
    }
    if (activeTab === 'whatsapp') {
      const pMethod = (order as any).payment_method || (order as any).paymentMethod;
      return matchesSearch && (pMethod === 'WhatsApp' || order.id.startsWith('WA_'));
    }
    return matchesSearch && matchesStatus;
  });

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.createdAt?.startsWith(today) || o.date === today).length;
    const pendingFulfillment = orders.filter(o => o.status === 'processing' || o.status === 'pending').length;
    const totalVolume = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (Number(o.total || (o as any).total_amount) || 0), 0);

    return { todayOrders, pendingFulfillment, totalVolume };
  }, [orders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const generateWhatsAppMessage = (order: Order) => {
    const products = (order.items || []).map(item => `- ${item.productName} (x${item.quantity})`).join('%0A');
    const total = formatCurrency(order.total || (order as any).total_amount || 0);
    const greeting = `Hello ${order.customerName || 'Customer'},`;
    const body = `Thank you for your order from DJ FLOWERZ!%0A%0AOrder ID: #${order.id.slice(0, 8)}%0AStatus: ${order.status.toUpperCase()}%0A%0AItems:%0A${products}%0A%0ATotal: ${total}%0A%0A${order.status === 'shipped' ? `Tracking ID: ${order.trackingNumber || 'N/A'}` : 'We will update you once your order is shipped.'}`;
    return `https://wa.me/${(order.customerPhone || (order as any).customer_phone)?.replace(/\+/g, '').replace(/\s/g, '')}?text=${encodeURIComponent(greeting)}%0A%0A${body}`;
  };

  const orderNeedsShipping = (order: Order) => {
    if (!order.items || order.items.length === 0) return true;
    return order.items.some(item => {
      const type = (item as any).type;
      if (type === 'digital' || type === 'subscription') return false;
      const category = (item as any).category?.toLowerCase();
      if (category === 'samples' || category === 'presets' || category === 'course') return false;
      return true;
    });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Orders Pulse', value: stats.todayOrders, icon: Zap, color: 'text-brand-purple', sub: 'Detected Today' },
          { label: 'Inbound Buffer', value: stats.pendingFulfillment, icon: Package, color: 'text-amber-500', sub: 'Awaiting Fulfillment' },
          { label: 'Revenue Flow', value: formatCurrency(stats.totalVolume), icon: CreditCard, color: 'text-emerald-500', sub: 'Cumulative Volume' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0B0B0F]/80 backdrop-blur-3xl border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group shadow-2xl"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 -translate-x-4 -translate-y-4 bg-current ${stat.color.replace('text-', 'bg-')}`} />
            <div className="flex items-center gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">{stat.label}</p>
                <p className="text-2xl font-black text-white tracking-tighter italic">{stat.value}</p>
                <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">{stat.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Control Deck */}
      <div className="bg-[#0B0B0F]/80 backdrop-blur-3xl border border-white/5 p-4 rounded-[3rem] flex flex-col lg:flex-row gap-6 items-center justify-between shadow-xl">
        <div className="flex bg-black/40 p-1.5 rounded-[2rem] border border-white/5 w-full lg:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Orders', icon: ShieldCheck },
            { id: 'fulfillment', label: 'Logistics', icon: Package },
            { id: 'whatsapp', label: 'WhatsApp CRM', icon: MessageCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-[1.6rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-brand-purple text-white shadow-[0_0_20px_rgba(123,92,255,0.4)]'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative group flex-1 lg:w-96">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search Order, Email, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-[2rem] pl-14 pr-6 py-4 text-xs text-white placeholder:text-gray-700 focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all font-medium"
            />
          </div>
          {activeTab === 'all' && (
            <div className="relative group hidden sm:block">
              <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-[2rem] pl-14 pr-12 py-4 text-[10px] font-black uppercase tracking-widest text-white outline-none appearance-none focus:border-brand-purple/50 transition-all cursor-pointer"
              >
                <option value="all">Every State</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
            </div>
          )}
        </div>
      </div>

      {/* Orders Ledger */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-[#0B0B0F]/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden group/row transition-all hover:border-white/20 shadow-xl ${expandedOrder === order.id ? 'ring-2 ring-brand-purple/30 z-10' : ''}`}
              >
                <div 
                  className="p-6 sm:p-8 flex flex-wrap items-center justify-between gap-8 cursor-pointer" 
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-6 min-w-[280px]">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-black/60 border border-white/5 flex items-center justify-center text-brand-purple shadow-inner group-hover/row:border-brand-purple/30 transition-all relative">
                      <ShoppingBag size={28} />
                      {order.paymentStatus === 'paid' && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[#0B0B0F] flex items-center justify-center">
                          <CheckCircle size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-brand-purple uppercase tracking-[0.2em] italic">#{order.id.slice(0, 8)}</span>
                        {order.status === 'delivered' && <CheckCircle size={12} className="text-emerald-500" />}
                      </div>
                      <h4 className="text-xl font-black text-white uppercase italic tracking-tight">{order.customerName || (order as any).customer_name || 'Loading...'}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 group-hover/row:text-gray-300">
                          <MapPin size={10} className="text-brand-purple" /> {order.city || 'Standard Area'}
                        </p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 group-hover/row:text-gray-300">
                          <Phone size={10} className="text-emerald-500" /> {order.customerPhone || (order as any).customer_phone || 'No Phone'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center gap-10 justify-between lg:justify-start">
                    <div className="text-center lg:text-left min-w-[120px]">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-1">Volume</p>
                      <p className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{formatCurrency(order.total || (order as any).total_amount || 0)}</p>
                    </div>

                    <div className="hidden sm:block">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-1">Node Status</p>
                      <div className={`flex items-center gap-2 px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.1em] ${getLogisticsStatusColor(order.status)}`}>
                        <div className={`w-2 h-2 rounded-full bg-current ${order.status === 'processing' || order.status === 'pending' ? 'animate-pulse' : ''}`} />
                        {order.status}
                      </div>
                    </div>

                    <div className="hidden xl:block">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-1">Traceability</p>
                      <p className="text-[10px] font-bold text-white uppercase tracking-[0.1em] bg-white/5 border border-white/5 py-1 px-3 rounded-lg truncate max-w-[180px]">
                        {order.trackingNumber || 'UNASSIGNED'}
                      </p>
                    </div>

                    <div className="hidden md:block text-right">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-1">Timestamp</p>
                      <p className="text-[11px] font-black text-white italic uppercase tracking-tighter tabular-nums">{new Date(order.createdAt || order.date).toLocaleDateString()}</p>
                      <p className="text-[9px] font-bold text-gray-600">{new Date(order.createdAt || order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      className="w-12 h-12 rounded-[1.2rem] bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover/row:text-white group-hover/row:bg-brand-purple transition-all active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedOrder(expandedOrder === order.id ? null : order.id);
                      }}
                    >
                      {expandedOrder === order.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                      className="border-t border-white/5 bg-black/40 overflow-hidden"
                    >
                      <div className="p-8 sm:p-12 space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                          {/* Column 1: Logistics & Fulfillment */}
                          <div className="space-y-8">
                            {orderNeedsShipping(order) && (
                              <div>
                                <h5 className="text-[11px] font-black text-brand-purple uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                  <Truck size={14} /> Logistics Control
                                </h5>
                                <div className="space-y-5">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Courier Provider</label>
                                    <div className="relative">
                                      <select
                                        value={order.courierName || ''}
                                        onChange={(e) => updateField(order.id, 'courierName', e.target.value)}
                                        className="w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-4 text-xs text-white outline-none appearance-none focus:border-brand-purple/50 transition-all font-bold cursor-pointer"
                                      >
                                        <option value="">Select Courier</option>
                                        {COURIERS.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                      </select>
                                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Tracking Identifier</label>
                                    <div className="relative group">
                                      <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={16} />
                                      <input
                                        type="text"
                                        placeholder="Tracking Number"
                                        defaultValue={order.trackingNumber}
                                        onBlur={(e) => updateField(order.id, 'trackingNumber', e.target.value)}
                                        className="w-full bg-black/60 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-xs text-white focus:border-brand-purple/50 outline-none transition-all font-bold"
                                      />
                                      {order.trackingNumber && (
                                        <button 
                                          onClick={() => window.open(`https://www.google.com/search?q=${order.trackingNumber}+tracking`, '_blank')}
                                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                          <ExternalLink size={16} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <button
                                      onClick={() => {
                                        const trkInput = document.querySelector(`input[defaultValue="${order.trackingNumber}"]`) as HTMLInputElement;
                                        markAsShipped(order.id, trkInput?.value || order.trackingNumber || '', order.courierName);
                                      }}
                                      disabled={updatingId === order.id || order.status === 'shipped' || order.status === 'delivered'}
                                      className="bg-brand-purple/10 border border-brand-purple/30 text-brand-purple hover:bg-brand-purple hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-2 group/btn"
                                    >
                                      {updatingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} className="group-hover/btn:translate-x-1 transition-transform" />} Mark Shipped
                                    </button>
                                    <select
                                      value={order.status}
                                      onChange={(e) => updateStatus(order.id, e.target.value)}
                                      className="bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-4 py-4 rounded-2xl outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all text-center"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="processing">Processing</option>
                                      <option value="shipped">Shipped</option>
                                      <option value="delivered">Delivered</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {orderNeedsShipping(order) && (
                              <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                                <h6 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                  <MapPin size={12} /> Shipping Address
                                </h6>
                                <div className="space-y-1">
                                  <p className="text-sm font-black text-white italic truncate">{order.customerName}</p>
                                  <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-wider">{order.address || order.shippingAddress || 'No detailed address provided.'}</p>
                                  <p className="text-[11px] font-black text-brand-purple uppercase tracking-widest mt-2">{order.city || 'Standard Area'}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Column 2: Order Summary & Settlement */}
                          <div className="space-y-8">
                            <div>
                              <h5 className="text-[11px] font-black text-brand-cyan uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                <CreditCard size={14} /> Settlement Flow
                              </h5>
                              <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 space-y-6">
                                <div className="space-y-3">
                                  {order.items?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group/item hover:border-brand-purple/20 transition-all">
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-gray-500 border border-white/5 group-hover/item:text-brand-purple transition-colors">
                                          {item.type === 'digital' ? <Zap size={18} /> : 
                                           item.type === 'subscription' ? <ShieldCheck size={18} /> : 
                                           <Package size={18} />}
                                        </div>
                                        <div>
                                          <p className="text-xs font-black text-white italic uppercase tracking-tight">{item.productName || item.name}</p>
                                          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{item.quantity} x {formatCurrency(item.price)}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[11px] font-black text-white italic tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-6 border-t border-white/5 space-y-3">
                                  <div className="flex justify-between items-center px-2">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Subtotal</span>
                                    <span className="text-[11px] font-bold text-white tabular-nums">{formatCurrency(order.subtotal || order.total)}</span>
                                  </div>
                                  <div className="flex justify-between items-center px-2 text-emerald-400">
                                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><ArrowUpRight size={10} /> Discount</span>
                                    <span className="text-[11px] font-bold tabular-nums">-{formatCurrency(order.discountAmount || 0)}</span>
                                  </div>
                                  <div className="flex justify-between items-center px-2 pt-2 border-t border-white/5">
                                    <span className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Final Total</span>
                                    <span className="text-xl font-black text-brand-purple italic tabular-nums">{formatCurrency(order.total)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-6 rounded-[2rem] bg-brand-purple/5 border border-brand-purple/10 space-y-4">
                              <h6 className="text-[10px] font-black text-brand-purple uppercase tracking-widest flex items-center gap-2">
                                <Info size={12} /> Data Integrity
                              </h6>
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1.5 font-black">Ref Node</p>
                                  <div className="flex items-center gap-2 group">
                                    <p className="text-[10px] font-black text-white italic uppercase tracking-widest truncate">{order.referenceCode || 'NO_REF'}</p>
                                    {order.referenceCode && (
                                      <button onClick={() => { navigator.clipboard.writeText(order.referenceCode!); alert('Copied Ref') }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Copy size={10} className="text-gray-500 hover:text-white" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1.5 font-black">Gateway</p>
                                  <p className="text-[10px] font-black text-brand-cyan italic uppercase tracking-widest">{(order as any).paymentMethod || (order as any).payment_method || 'Paystack/Mobile'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Column 3: Transmission & CRM */}
                          <div className="space-y-8">
                            <div>
                              <h5 className="text-[11px] font-black text-brand-pink uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                <MessageCircle size={14} /> Transmission Hub
                              </h5>
                              <div className="flex flex-col gap-4">
                                <a
                                  href={generateWhatsAppMessage(order)}
                                  target="_blank" rel="noreferrer"
                                  className="w-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white py-5 rounded-[1.8rem] flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg hover:shadow-[#25D366]/20 group/wa"
                                >
                                  <MessageCircle size={18} className="group-hover/wa:rotate-[20deg] transition-transform" /> WhatsApp Direct Uplink
                                </a>
                                
                                {order.status !== 'cancelled' && order.paymentStatus !== 'refunded' && (
                                  <button
                                    onClick={() => processRefund(order.id)}
                                    className="w-full bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white py-5 rounded-[1.8rem] flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all"
                                  >
                                    <AlertCircle size={18} /> Process Force Refund
                                  </button>
                                )}

                                <div className="space-y-1.5 mt-4">
                                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Calendar size={10} /> Internal Operations Notes
                                  </label>
                                  <textarea
                                    className="w-full bg-black/60 border border-white/5 rounded-2xl p-5 text-xs text-white focus:border-brand-purple/50 outline-none transition-all font-medium min-h-[140px] resize-none"
                                    placeholder="Add internal logs, delivery notes, or specific client requests..."
                                    defaultValue={order.adminMessage}
                                    onBlur={(e) => updateField(order.id, 'adminMessage', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="p-8 rounded-[2.5rem] bg-black/60 border border-white/5 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/10 blur-[60px] rounded-full" />
                              <div className="relative z-10 flex flex-col items-center text-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-brand-cyan transition-colors">
                                  <ShieldCheck size={28} />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Customer Integrity</p>
                                  <p className="text-xs font-black text-white tracking-widest">{order.customerEmail}</p>
                                  <p className="text-[9px] font-bold text-brand-purple uppercase tracking-[0.2em] mt-1 italic">Verified Account</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          ) : (
            <div className="py-32 text-center space-y-6">
              <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto text-gray-700 border border-white/5 shadow-2xl animate-pulse">
                <Search size={48} />
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.4em]">Node Silent: No Clusters Found</p>
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); setActiveTab('all'); }}
                  className="text-brand-purple text-[10px] font-black uppercase tracking-[0.2em] hover:underline hover:text-brand-purple/80 transition-colors"
                >
                  Reset Scanning Frequency
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
