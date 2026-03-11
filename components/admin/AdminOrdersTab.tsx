import { useState, useMemo } from 'react';
import { Order } from '../../types';
import { Package, MessageCircle, Truck, Search, Filter, CheckCircle, XCircle, AlertCircle, Zap, ShieldCheck, ExternalLink, Calendar, CreditCard, ShoppingBag, ArrowUpRight, Copy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminOrdersTab() {
  const { orders, updateOrder } = useData();
  const [activeTab, setActiveTab] = useState<'all' | 'fulfillment' | 'whatsapp'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const updateTracking = async (id: string, trackingNumber: string) => {
    try {
      await updateOrder(id, { tracking_number: trackingNumber } as any);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsShipped = async (id: string, trackingNumber: string) => {
    if (!trackingNumber) {
      alert('Please enter a tracking number first.');
      return;
    }
    setUpdatingId(id);
    await updateTracking(id, trackingNumber);
    await updateStatus(id, 'shipped');
    setUpdatingId(null);
  };

  const processRefund = async (id: string) => {
    if (confirm('Are you sure you want to refund this order? This action cannot be undone.')) {
      setUpdatingId(id);
      try {
        await updateOrder(id, { refund_status: 'processed' } as any);
      } catch (err) {
        console.error(err);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  const filteredOrders = orders.filter(order => {
    const custName = (order as any).customer_name || order.customerName || '';
    const custEmail = (order as any).customer_email || order.customerEmail || '';
    const orderId = order.id || '';

    const matchesSearch =
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    if (activeTab === 'fulfillment') {
      const pStatus = (order as any).payment_status || order.paymentStatus;
      return matchesSearch && (order.status === 'processing' || pStatus === 'paid' || order.status === 'pending');
    }
    if (activeTab === 'whatsapp') {
      const pMethod = (order as any).payment_method || (order as any).paymentMethod;
      const notes = (order as any).notes || '';
      return matchesSearch && (pMethod === 'WhatsApp' || notes.includes('WhatsApp'));
    }
    return matchesSearch && matchesStatus;
  });

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at?.startsWith(today) || o.date === today).length;
    const pendingFulfillment = orders.filter(o => o.status === 'processing' || o.status === 'pending').length;
    const monthlyRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((acc, o) => acc + (Number(o.total_amount || (o as any).total) || 0), 0);

    return { todayOrders, pendingFulfillment, monthlyRevenue };
  }, [orders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Orders Pulse', value: stats.todayOrders, icon: Zap, color: 'text-brand-purple', sub: 'Detected Today' },
          { label: 'Pending Buffer', value: stats.pendingFulfillment, icon: Package, color: 'text-amber-500', sub: 'Awaiting Action' },
          { label: 'Revenue Flow', value: formatCurrency(stats.monthlyRevenue), icon: CreditCard, color: 'text-emerald-500', sub: 'All-time Volume' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0B0B0F] border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group shadow-2xl"
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
      <div className="bg-[#0B0B0F] border border-white/5 p-4 rounded-[2.5rem] flex flex-col lg:flex-row gap-6 items-center justify-between shadow-xl backdrop-blur-xl">
        <div className="flex bg-black/40 p-1.5 rounded-[1.8rem] border border-white/5 w-full lg:w-auto">
          {[
            { id: 'all', label: 'All Clusters', icon: ShieldCheck },
            { id: 'fulfillment', label: 'Logistics', icon: Package },
            { id: 'whatsapp', label: 'Comms Hub', icon: MessageCircle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === tab.id
                  ? 'bg-brand-purple text-white shadow-[0_0_20px_rgba(123,92,255,0.3)]'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative group flex-1 lg:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
            <input
              type="text"
              placeholder="Filter Order ID, Email, Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-[1.8rem] pl-12 pr-6 py-4 text-xs text-white placeholder:text-gray-700 focus:border-brand-purple/50 focus:ring-4 focus:ring-brand-purple/5 outline-none transition-all font-medium"
            />
          </div>
          {activeTab === 'all' && (
            <div className="relative group hidden sm:block">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black/40 border border-white/5 rounded-[1.8rem] pl-12 pr-10 py-4 text-xs text-white outline-none appearance-none focus:border-brand-purple/50 transition-all font-medium cursor-pointer"
              >
                <option value="all">Every State</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
            </div>
          )}
        </div>
      </div>

      {/* Orders Ledger */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] overflow-hidden group/row transition-all hover:border-white/20 shadow-lg ${expandedOrder === order.id ? 'ring-2 ring-brand-purple/20' : ''}`}
              >
                <div className="p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                  <div className="flex items-center gap-6 min-w-[240px]">
                    <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-brand-purple shadow-inner group-hover/row:border-brand-purple/30 transition-all">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-brand-purple uppercase tracking-[0.2em] italic">#{order.id.slice(0, 8)}</span>
                        {order.payment_method === 'WhatsApp' && (
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">WhatsApp Origin</span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-white uppercase italic tracking-tight">{order.customer_name || order.customerName || 'Syncing...'}</h4>
                      <p className="text-[10px] font-medium text-gray-600 uppercase tracking-widest">{order.customer_email || order.customerEmail || 'Guest'}</p>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center gap-12 justify-center lg:justify-start">
                    <div className="text-center lg:text-left">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-1">Settlement</p>
                      <p className="text-xl font-black text-white italic tracking-tighter tabular-nums">{formatCurrency(order.total_amount || (order as any).total || 0)}</p>
                    </div>

                    <div className="hidden md:block">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-1">Status Node</p>
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
                          order.status === 'shipped' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30' :
                            order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                              'bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full bg-current ${order.status === 'processing' ? 'animate-ping' : ''}`} />
                        {order.status}
                      </div>
                    </div>

                    <div className="hidden lg:block max-w-[150px]">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] mb-1">Logistics Trace</p>
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest truncate">{order.city || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-purple/20 transition-all active:scale-95">
                      {expandedOrder === order.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-black/40 overflow-hidden"
                    >
                      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Column 1: Fulfillment Commands */}
                        <div className="space-y-6">
                          <h5 className="text-[10px] font-black text-brand-purple uppercase tracking-[0.4em]">Logistics Command</h5>
                          <div className="space-y-4">
                            <div className="relative group">
                              <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={16} />
                              <input
                                type="text"
                                placeholder="Universal Tracking ID"
                                defaultValue={(order as any).tracking_number || order.tracking_number}
                                onBlur={(e) => updateTracking(order.id, e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-xs text-white focus:border-brand-purple/50 outline-none transition-all"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={(e) => {
                                  const input = (e.currentTarget.parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement);
                                  markAsShipped(order.id, input.value);
                                }}
                                disabled={updatingId === order.id}
                                className="bg-brand-purple/10 border border-brand-purple/30 text-brand-purple hover:bg-brand-purple hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {updatingId === order.id ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Mark Shipped
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

                        {/* Column 2: Order Manifest */}
                        <div className="space-y-6">
                          <h5 className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.4em]">Payload Manifest</h5>
                          <div className="space-y-3">
                            {order.items?.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-gray-500">
                                    {item.type === 'digital' ? <Zap size={16} /> : <Package size={16} />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-white italic">{item.productName || item.name}</p>
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{item.quantity} x {formatCurrency(item.price)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Column 3: Transmission Hub */}
                        <div className="space-y-6">
                          <h5 className="text-[10px] font-black text-brand-pink uppercase tracking-[0.4em]">Comms Frequency</h5>
                          <div className="flex flex-col gap-3">
                            <a
                              href={`https://wa.me/${(order.customer_phone || order.customerPhone)?.replace(/\+/g, '').replace(/\s/g, '')}?text=Hello%20${encodeURIComponent(order.customer_name || order.customerName || '')},%20your%20order%20%23${order.id.slice(0, 8)}%20from%20DJ%20Flowerz%20is%20now%20${order.status.toUpperCase()}.%20Ref:%20${(order as any).tracking_number || 'N/A'}`}
                              target="_blank" rel="noreferrer"
                              className="w-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              <MessageCircle size={16} /> WhatsApp Uplink
                            </a>
                            {order.status !== 'cancelled' && order.refund_status !== 'processed' && (
                              <button
                                onClick={() => processRefund(order.id)}
                                className="w-full bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                <AlertCircle size={16} /> Initialize Refund
                              </button>
                            )}
                            <div className="pt-4 border-t border-white/5 p-4 rounded-2xl bg-black/60">
                              <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                <ShieldCheck size={10} /> Data Integrity
                              </p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Payment Node</p>
                                  <p className="text-[10px] font-black text-white italic">{(order as any).payment_method || 'Paystack/Mobile'}</p>
                                </div>
                                <div>
                                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Capture Date</p>
                                  <p className="text-[10px] font-black text-white italic">{new Date(order.created_at || order.createdAt).toLocaleDateString()}</p>
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
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto text-gray-700 border border-white/5">
                <Search size={40} />
              </div>
              <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Ledger Clean: No matching data found</p>
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setActiveTab('all'); }}
                className="text-brand-purple text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Reset Frequency
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
