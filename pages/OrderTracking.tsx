import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Package, Truck, CheckCircle, Clock, MapPin, 
  ChevronRight, ArrowLeft, MessageCircle, AlertCircle,
  ShieldCheck, Zap, ExternalLink, Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

const OrderTracking: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !email) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const resp = await fetch(`/api/orders/track?id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`);
      const data = await resp.json();

      if (resp.ok) {
        setOrder(data);
      } else {
        setError(data.error || 'Order not found. Please check your credentials.');
      }
    } catch (err) {
      setError('Failed to fetch order details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-amber-500' },
    { key: 'processing', label: 'Processing', icon: Package, color: 'text-blue-500' },
    { key: 'shipped', label: 'In Transit', icon: Truck, color: 'text-brand-purple' },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-emerald-500' }
  ];

  const getStatusIndex = (status: string) => {
    const indices: Record<string, number> = {
      'pending': 0,
      'processing': 1,
      'shipped': 2,
      'delivered': 3,
      'completed': 3,
      'cancelled': -1
    };
    return indices[status.toLowerCase()] ?? 0;
  };

  const currentStatusIndex = order ? getStatusIndex(order.status) : -1;

  return (
    <div className="relative pt-32 pb-24 min-h-screen bg-[#050507] overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-purple/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
          >
            <ShieldCheck size={14} className="text-brand-cyan" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Secure Logistics Hub</span>
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-4 tracking-tighter uppercase italic">
            Track Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">Cargo</span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto text-lg italic">
            Enter your transaction details to intercept current shipping status and delivery coordinates.
          </p>
        </div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl mb-12"
        >
          <form onSubmit={handleTrack} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Order Frequency (ID)</label>
              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-purple transition-colors" />
                <input
                  id="tracking-order-id"
                  name="orderId"
                  type="text"
                  required
                  placeholder="e.g. ORD-12345"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-mono focus:outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Billing Signal (Email)</label>
              <input
                id="tracking-email"
                name="email"
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white font-medium focus:outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50 transition-all placeholder:text-gray-700"
              />
            </div>

            <button
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-brand-purple via-brand-cyan to-brand-purple bg-[length:200%_100%] hover:bg-[100%_0%] transition-all duration-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Clock className="animate-spin" size={20} /> INTERCEPTING...
                </>
              ) : (
                <>
                  <Zap size={20} /> INITIATE TRACKING
                </>
              )}
            </button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-medium"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}
        </motion.div>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {order && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              className="space-y-8"
            >
              {/* Status Stepper */}
              <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 relative">
                  {/* Connection Line (Desktop) */}
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0 hidden md:block" />
                  
                  {steps.map((step, idx) => {
                    const isCompleted = currentStatusIndex >= idx;
                    const isCurrent = currentStatusIndex === idx;
                    
                    return (
                      <div key={idx} className="flex flex-row md:flex-col items-center gap-6 md:gap-4 relative z-10 w-full md:w-auto group">
                        <div className={`
                          w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all duration-700
                          ${isCompleted ? `bg-black border-${step.key === 'pending' ? 'amber-500' : step.key === 'processing' ? 'blue-500' : step.key === 'shipped' ? 'brand-purple' : 'emerald-500'}/50 ${step.color} shadow-[0_0_30px_rgba(0,0,0,0.5)]` : 'bg-[#0B0B0F] border-white/5 text-gray-700'}
                          ${isCurrent ? 'scale-125 ring-4 ring-white/5' : ''}
                        `}>
                          <step.icon size={28} className={isCurrent ? 'animate-pulse' : ''} />
                        </div>
                        <div className="text-left md:text-center min-w-0 flex-1 md:flex-none">
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isCompleted ? 'text-white' : 'text-gray-700'}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <span className="text-[9px] font-black text-brand-cyan uppercase tracking-widest animate-pulse">Active Node</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logistics Details */}
                <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-xl space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck size={16} className="text-brand-purple" />
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Logistics Intelligence</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Shipping Pulse</span>
                      <span className="text-white font-bold">{order.shipping_provider || 'Pending dispatch...'}</span>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tracking Code</span>
                      <div className="flex items-center gap-2">
                         <span className="text-brand-cyan font-mono font-black">{order.tracking_number || 'TBA'}</span>
                         {order.tracking_number && <ExternalLink size={12} className="text-gray-500" />}
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-brand-purple/5 rounded-2xl border border-brand-purple/20">
                      <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest">ETA Projection</span>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-brand-purple" />
                        <span className="text-white font-black">{order.estimated_arrival ? new Date(order.estimated_arrival).toLocaleDateString() : 'Syncing...'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Target */}
                <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-xl space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={16} className="text-brand-cyan" />
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Drop Coordinates</h3>
                  </div>

                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 italic">
                    <p className="text-gray-300 leading-relaxed font-medium">
                      {order.shippingAddress || 'Digital delivery node active.'}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Verification Complete
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Method</p>
                      <p className="text-xs font-bold text-white capitalize">{order.deliveryMethod || 'Standard'}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Payload</p>
                      <p className="text-xs font-bold text-white">{order.items?.length || 0} Components</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Manifest */}
              <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-xl">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-brand-purple" />
                      <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Cargo Manifest</h3>
                    </div>
                    <span className="text-xs font-bold text-white bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                       ID: {order.id}
                    </span>
                 </div>

                 <div className="space-y-4">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-brand-purple/30 transition-all">
                        <div className="w-16 h-16 bg-white overflow-hidden rounded-xl flex-shrink-0 p-2">
                          <img 
                            src={item.image || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products/placeholder.jpg'} 
                            alt={item.productName} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-white uppercase italic tracking-tight truncate">{item.productName}</h4>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                             QTY: {item.quantity} | {item.type || 'Physical'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-brand-cyan tracking-tight">KES {item.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                 </div>

                 <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] mb-4 text-center">Protocol Sync Status: Active</p>
                    <div className="flex gap-4 w-full">
                       <Link to="/store" className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                          <ArrowLeft size={14} /> Back to Store
                       </Link>
                       <a 
                        href={`https://wa.me/254790000000?text=${encodeURIComponent(`Query regarding Order ID: ${order.id}`)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 py-4 bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
                       >
                          <MessageCircle size={14} /> Secure Support
                       </a>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}
          
          {!order && !loading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-20 text-center space-y-8"
            >
              <div className="max-w-xs mx-auto space-y-4 opacity-30">
                 <Package size={60} className="mx-auto text-gray-500" />
                 <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Awaiting Uplink</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderTracking;
