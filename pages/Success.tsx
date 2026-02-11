import React, { useEffect } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Printer, Package, Music, FileText, ShoppingBag, Copy } from 'lucide-react';
import { useCart } from '../context/CartContext';

const Success: React.FC = () => {
  const { clearCart } = useCart();
  const location = useLocation();
  const state = location.state as { items: any[], total: number, orderId: string, date: string, email?: string } | null;

  useEffect(() => {
    if (state) {
        clearCart();
    }
  }, [state, clearCart]);

  if (!state) {
    return <Navigate to="/" replace />;
  }

  const { items, total, orderId, date, email } = state;
  
  // Identify digital items for download section
  const digitalItems = items.filter(item => 
    item.type === 'digital' || 
    ['digital', 'software', 'samples'].includes(item.category?.toLowerCase()) || 
    item.category?.toLowerCase() === 'digital'
  );

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Hero */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">Order Confirmed!</h1>
          <p className="text-gray-400 text-lg">Thank you for your purchase. Your order has been received.</p>
          {email && <p className="text-sm text-gray-500 mt-2">A confirmation email has been sent to <span className="text-white font-medium">{email}</span></p>}
        </div>

        {/* Order Meta Bar */}
        <div className="bg-[#15151A] rounded-xl border border-white/5 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
           <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Order Number</p>
              <p className="text-white font-mono font-bold text-lg flex items-center gap-2 justify-center md:justify-start">
                 {orderId} <Copy size={14} className="text-gray-600 cursor-pointer hover:text-white transition" onClick={() => navigator.clipboard.writeText(orderId)} />
              </p>
           </div>
           <div className="h-px w-full md:w-px md:h-10 bg-white/10"></div>
           <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Date</p>
              <p className="text-white font-bold">{date}</p>
           </div>
           <div className="h-px w-full md:w-px md:h-10 bg-white/10"></div>
           <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Amount</p>
              <p className="text-brand-purple font-bold text-xl">KES {total.toLocaleString()}</p>
           </div>
           <div className="h-px w-full md:w-px md:h-10 bg-white/10"></div>
           <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Payment Method</p>
              <p className="text-white font-bold">Paystack / Mobile Money</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left Column: Order Items */}
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="font-bold text-white flex items-center gap-2"><ShoppingBag size={20} className="text-brand-cyan" /> Order Summary</h2>
                    <span className="text-sm text-gray-500">{items.length} Items</span>
                 </div>
                 <div className="divide-y divide-white/5">
                    {items.map((item, idx) => (
                       <div key={idx} className="p-6 flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                             <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                             <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-white line-clamp-1">{item.name}</h3>
                                <p className="font-bold text-white text-sm">KES {(item.price * item.quantity).toLocaleString()}</p>
                             </div>
                             <p className="text-xs text-gray-400 mb-2 capitalize">{item.category} {item.selectedVariant && `• ${item.selectedVariant}`}</p>
                             <div className="flex justify-between items-center">
                                <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-400">Qty: {item.quantity}</span>
                                {item.type === 'digital' && <span className="text-[10px] text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded font-bold uppercase">Digital Delivery</span>}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="p-6 bg-black/20 border-t border-white/5">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                       <span>Subtotal</span>
                       <span>KES {total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                       <span>Total Paid</span>
                       <span>KES {total.toLocaleString()}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Downloads & Actions */}
           <div className="space-y-8">
              
              {/* Digital Downloads Section */}
              {digitalItems.length > 0 && (
                 <div className="bg-gradient-to-br from-[#1A1A24] to-[#0B0B0F] rounded-2xl border border-brand-purple/30 p-6 shadow-lg shadow-brand-purple/5">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                       <Download size={20} className="text-brand-purple" /> Your Downloads
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                       Your digital files are ready. Links expire in 7 days.
                    </p>
                    <div className="space-y-4">
                       {digitalItems.map((item, idx) => (
                          <div key={idx} className="bg-[#15151A] p-4 rounded-xl border border-white/10 hover:border-brand-purple/50 transition group">
                             <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white transition">
                                   {['software', 'digital'].includes(item.category.toLowerCase()) ? <FileText size={18} /> : <Music size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <p className="text-sm font-bold text-white truncate">{item.name}</p>
                                   <p className="text-[10px] text-gray-500">12.5 MB • MP3/ZIP</p>
                                </div>
                             </div>
                             <a 
                               href={item.digitalFileUrl || '#'} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="block w-full py-2 bg-brand-purple text-white text-xs font-bold text-center rounded-lg hover:bg-purple-600 transition"
                             >
                                Download Now
                             </a>
                             {item.downloadPassword && (
                                <div className="mt-2 text-center">
                                   <p className="text-[10px] text-gray-500">Password: <span className="text-white font-mono select-all bg-white/10 px-1 rounded">{item.downloadPassword}</span></p>
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                 </div>
              )}

              {/* Action Buttons */}
              <div className="bg-[#15151A] rounded-2xl border border-white/5 p-6">
                 <h2 className="font-bold text-white mb-4">Actions</h2>
                 <div className="space-y-3">
                    <button onClick={() => window.print()} className="w-full py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition flex items-center justify-center gap-2 text-sm font-medium">
                       <Printer size={16} /> Print Receipt
                    </button>
                    <Link to="/store" className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 text-sm">
                       Continue Shopping <ArrowRight size={16} />
                    </Link>
                 </div>
              </div>

              {/* Support */}
              <div className="text-center p-4">
                 <p className="text-xs text-gray-500">
                    Need help with your order? <Link to="/contact" className="text-brand-cyan hover:underline">Contact Support</Link>
                 </p>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default Success;