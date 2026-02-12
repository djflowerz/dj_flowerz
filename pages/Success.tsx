import React, { useEffect } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Printer, Package, Music, FileText, ShoppingBag, Copy, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';

const Success: React.FC = () => {
   const { clearCart } = useCart();
   const location = useLocation();
   const state = location.state as {
      type?: 'store' | 'subscription' | 'tip';
      items?: any[];
      total?: number;
      amount?: number;
      orderId?: string;
      reference?: string;
      plan?: string;
      message?: string;
      date?: string;
      email?: string
   } | null;

   useEffect(() => {
      if (state?.type === 'store' || state?.items) {
         clearCart();
      }
   }, [state, clearCart]);

   if (!state) {
      return <Navigate to="/" replace />;
   }

   // Determine contents based on type
   const isTip = state.type === 'tip';
   const isSubscription = state.type === 'subscription';
   const isStore = state.type === 'store' || (!isTip && !isSubscription && state.items); // Default to store if items exist

   const totalAmount = state.total || state.amount || 0;
   const ref = state.orderId || state.reference || 'N/A';
   const dateStr = state.date || new Date().toLocaleDateString();

   return (
      <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
         <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Success Header */}
            <div className="text-center mb-12 animate-fade-in-up">
               <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                  <CheckCircle size={40} className="text-green-500" />
               </div>
               <h1 className="text-4xl font-display font-bold text-white mb-2">
                  {isTip ? 'Thank You for Your Support!' : isSubscription ? 'Subscription Active!' : 'Order Confirmed!'}
               </h1>
               <p className="text-gray-400 text-lg">
                  {isTip ? 'Your tip has been received. We appreciate your generosity!' :
                     isSubscription ? 'Welcome to the inner circle. Start exploring now.' :
                        'Thank you for your purchase. Your order has been received.'}
               </p>
               {state.email && <p className="text-sm text-gray-500 mt-2">Confirmation sent to <span className="text-white font-medium">{state.email}</span></p>}
            </div>

            {/* Transaction Details Card */}
            <div className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden shadow-2xl mb-8">
               <div className="p-6 md:p-8 border-b border-white/5 space-y-6">

                  {/* Key Meta Data */}
                  <div className="grid grid-cols-2 gap-6 text-center md:text-left">
                     <div>
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Reference Code</p>
                        <p className="text-white font-mono font-bold flex items-center justify-center md:justify-start gap-2">
                           {ref} <Copy size={14} className="text-gray-600 cursor-pointer hover:text-white transition" onClick={() => navigator.clipboard.writeText(ref)} />
                        </p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Amount Paid</p>
                        <p className="text-brand-purple font-bold text-xl">KES {totalAmount.toLocaleString()}</p>
                     </div>
                  </div>

                  {/* Specific Content */}
                  {isTip && (
                     <div className="bg-white/5 p-4 rounded-xl text-center">
                        <p className="text-sm text-gray-400 mb-1">Message</p>
                        <p className="text-white italic">"{state.message || 'No message'}"</p>
                     </div>
                  )}

                  {isSubscription && (
                     <div className="flex items-center gap-4 bg-brand-purple/10 p-4 rounded-xl border border-brand-purple/20">
                        <div className="w-12 h-12 bg-brand-purple rounded-lg flex items-center justify-center text-white">
                           <CreditCard size={24} />
                        </div>
                        <div>
                           <p className="text-white font-bold text-lg">{state.plan} Plan</p>
                           <p className="text-sm text-gray-400">Access to {state.plan} Music Pool features</p>
                        </div>
                     </div>
                  )}

                  {isStore && state.items && (
                     <div className="space-y-3">
                        <p className="text-sm font-bold text-gray-400 uppercase">Items Purchased</p>
                        <div className="divide-y divide-white/5">
                           {state.items.map((item, idx) => (
                              <div key={idx} className="py-3 flex justify-between items-center">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-800 rounded bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }}></div>
                                    <div>
                                       <p className="text-sm font-bold text-white line-clamp-1">{item.name}</p>
                                       <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                                    </div>
                                 </div>
                                 <span className="text-sm font-bold text-gray-300">x{item.quantity}</span>
                              </div>
                           ))}
                        </div>
                        <div className="pt-4 border-t border-white/5">
                           <Link to="/account" className="text-brand-purple text-sm font-bold hover:underline">View Downloads in Account</Link>
                        </div>
                     </div>
                  )}
               </div>

               {/* Actions Footer */}
               <div className="p-6 bg-black/20 flex flex-col md:flex-row gap-4">
                  <Link to="/" className="flex-1 py-3 text-center border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition font-bold text-sm">
                     Return Home
                  </Link>
                  {isStore ? (
                     <Link to="/store" className="flex-1 py-3 text-center bg-brand-purple text-white rounded-xl hover:bg-purple-600 transition font-bold text-sm shadow-lg shadow-brand-purple/20">
                        Continue Shopping
                     </Link>
                  ) : isSubscription ? (
                     <Link to="/music-pool" className="flex-1 py-3 text-center bg-brand-purple text-white rounded-xl hover:bg-purple-600 transition font-bold text-sm shadow-lg shadow-brand-purple/20">
                        Start Downloading
                     </Link>
                  ) : (
                     <Link to="/mixtapes" className="flex-1 py-3 text-center bg-brand-purple text-white rounded-xl hover:bg-purple-600 transition font-bold text-sm shadow-lg shadow-brand-purple/20">
                        Listen to Mixtapes
                     </Link>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Success;