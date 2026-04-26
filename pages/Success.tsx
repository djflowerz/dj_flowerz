import React, { useEffect, useState } from 'react';
import { useLocation, Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Printer, Package, Music, FileText, ShoppingBag, Copy, CreditCard, Calendar, Loader2, ExternalLink, MessageCircle, Zap, ShieldCheck, Heart, Sparkles, Share2, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { downloadFileSecurely } from '../utils/downloadHelper';
import { Order } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Success: React.FC = () => {
   const { clearCart } = useCart();
   const { formatPrice } = useCurrency();
   const { siteConfig, issueReferralReward, addSubscriber, addOrder, addPayment, addTip, orders, ordersLoading, tips, payments } = useData();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, refreshProfile } = useAuth();
    
    // Parse query params for redirect support
    const queryParams = new URLSearchParams(location.search);
    const queryRef = queryParams.get('reference') || queryParams.get('trxref');
    const queryType = queryParams.get('type') || queryParams.get('metadata_type');

    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(location.state);
    const [isActivating, setIsActivating] = useState(false);
    const [activationAttempts, setActivationAttempts] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // 1. Initial Data Setup
        if (location.state) {
            setOrderData(location.state);
            setLoading(false);
        } else if (id) {
            // If we have an ID but no state, we'll wait for the orders to load (handled in the next effect)
            setLoading(true);
        } else if (queryRef) {
            // Handle redirect from Paystack
            console.log("Success: Detected Paystack redirect with ref:", queryRef);
            const mockState = {
                reference: queryRef,
                type: queryType || 'store', // Default to store if unknown
                amount: queryParams.get('amount') ? parseInt(queryParams.get('amount')!) / 100 : 0,
                email: user?.email,
                customerName: user?.user_metadata?.full_name || 'Member'
            };
            setOrderData(mockState);
            setLoading(false);
            
            if (queryType === 'subscription') {
                setIsActivating(true);
            }
        } else if (!location.pathname.includes('/success') || (!location.state && !id && !queryRef)) {
            navigate('/store');
        }
    }, [location.pathname, location.state, id, queryRef, queryType, navigate]);

    // Handle Polling for Subscription Activation
    useEffect(() => {
        let pollInterval: any;
        
        const type = orderData?.type || queryType;
        const isSub = type === 'subscription';

        if (isSub && !user?.isSubscriber && activationAttempts < 10) {
            setIsActivating(true);
            pollInterval = setInterval(async () => {
                console.log(`Polling for activation... attempt ${activationAttempts + 1}`);
                const updatedUser = await refreshProfile();
                setActivationAttempts(prev => prev + 1);
                
                if (updatedUser?.isSubscriber) {
                    console.log("Subscription activation confirmed!");
                    setIsActivating(false);
                    clearInterval(pollInterval);
                }
            }, 3000); // Poll every 3 seconds
        } else if (user?.isSubscriber && isActivating) {
            setIsActivating(false);
        }

        return () => clearInterval(pollInterval);
    }, [orderData, queryType, user?.isSubscriber, activationAttempts, isActivating, refreshProfile]);

    useEffect(() => {
        const stateToUse = orderData || location.state;
        if (stateToUse?.type === 'store' || stateToUse?.items) {
           clearCart();
        }

        if (stateToUse && stateToUse.reference) {
         const syncToR2 = async () => {
            const { reference, type, amount, email, customerName, message, items } = location.state;

            try {
               const idToCheck = type === 'tip' ? `tip_${reference}` : (location.state.orderId || reference);
               const existing = type === 'tip' ? tips.find(t => t.id === idToCheck) : orders.find(o => o.id === idToCheck);

               if (!existing) {
                  if (type === 'tip') {
                     const tipObj = {
                        id: idToCheck,
                        amount: amount,
                        message: message || 'Generous Tip',
                        email: email || 'guest@djflowerz.co.ke',
                        customerName: customerName || 'Guest Tipper',
                        status: 'completed',
                        createdAt: new Date().toISOString()
                     };
                     await addTip(tipObj);
                     await addPayment({
                        amount: amount,
                        payment_ref: reference,
                        payment_type: 'tip',
                        user_email: email,
                        status: 'success',
                        createdAt: new Date().toISOString()
                     });
                  } else if (type === 'store') {
                     const orderObj: Order = {
                        id: idToCheck,
                        customerName: customerName || 'Guest Customer',
                        customerEmail: email,
                        total: amount || location.state.total || location.state.amount,
                        subtotal: location.state.subtotal || amount || location.state.total,
                        discountAmount: location.state.discountAmount || 0,
                        shippingCost: location.state.shippingCost || 0,
                        shippingAddress: location.state.shippingAddress || null,
                        deliveryMethod: location.state.deliveryType || null,
                        couponCode: location.state.couponCode || null,
                        status: 'completed',
                        paymentStatus: 'paid',
                        date: new Date().toISOString().split('T')[0],
                        referenceCode: reference,
                        items: items || [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                     };
                     await addOrder(orderObj);
                  }
                  if (email) {
                     await addSubscriber(email, `Customer (${type === 'store' ? 'Order' : type === 'tip' ? 'Tip' : 'Subscription'})`);
                  }
               }
            } catch (err) {
               console.warn("Client-side sync error:", err);
            }
         };
         syncToR2();
      }

      if (id && !location.state && !ordersLoading) {
         const foundOrder = orders.find(o => o.id === id);
         if (foundOrder) {
            setOrderData({
               ...foundOrder,
               type: foundOrder.type || 'store',
               orderId: foundOrder.id
            });
            setLoading(false);
         } else {
            setLoading(false);
         }
      }
   }, [id, location.state, clearCart, orders, ordersLoading, tips, payments]);

   const copyRef = () => {
      navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };

   if (loading) {
      return (
         <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center gap-6">
            <div className="relative">
               <Loader2 className="w-16 h-16 text-brand-purple animate-spin" />
               <div className="absolute inset-0 bg-brand-purple/20 rounded-full blur-xl" />
            </div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Initializing Receipt</p>
         </div>
      );
   }

   const state = orderData;
   if (!state && !loading) return <Navigate to="/" replace />;

   const isTip = state.type === 'tip';
   const isSubscription = state.type === 'subscription';
   const isBooking = state.type === 'booking';
   const isStore = state.type === 'store' || (!isTip && !isSubscription && !isBooking && state.items);

   const totalAmount = state.total || state.amount || 0;
   const ref = state.orderId || state.reference || 'N/A';
   const dateStr = state.date || new Date().toLocaleDateString();

   const whatsappNumber = siteConfig.contact.whatsapp.replace(/\+/g, '').replace(/\s/g, '');
   const supportMessage = encodeURIComponent(`Hi DJ Flowerz, I'm reporting an issue with my order.\nOrder ID: ${ref}\nCustomer: ${state.customerName || state.email || 'N/A'}\nIssue: `);
   const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${supportMessage}`;

   return (
      <div className="relative pt-24 pb-20 min-h-screen bg-[#050507] overflow-hidden scroll-smooth">
         {/* Heavy Decoration */}
         <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-purple/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2" />
         </div>

         <div className="relative z-10 max-w-2xl mx-auto px-4">
            {/* Main Ticket */}
            <motion.div
               initial={{ opacity: 0, y: 50, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
               className="relative group"
            >
               {/* Outer Ticket Shadow/Glow */}
               <div className="absolute -inset-1 bg-gradient-to-b from-brand-purple/20 via-transparent to-brand-cyan/20 rounded-[3rem] blur-2xl opacity-50 transition duration-1000 group-hover:opacity-100" />

               <div className="relative bg-[#0B0B0F] rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
                  {/* Header Section */}
                  <div className="relative p-10 text-center border-b border-white/5 border-dashed">
                     <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-purple via-brand-cyan to-brand-purple animate-gradient-x" />

                     <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.4 }}
                        className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                     >
                        <CheckCircle size={40} className="text-emerald-500" />
                     </motion.div>

                     <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter uppercase italic">
                        Transmission <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">Locked</span>
                     </h1>
                     <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em] mb-4">Frequency Response: 200 OK</p>

                     <div className="bg-white/5 border border-white/10 rounded-2xl py-3 px-6 inline-flex items-center gap-3">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ID:</span>
                        <span className="text-sm font-black text-white font-mono tracking-tighter">{ref}</span>
                        <button onClick={copyRef} className={`transition-colors ${copied ? 'text-emerald-500' : 'text-gray-600 hover:text-white'}`}>
                           {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                     </div>
                  </div>

                  {/* Perforation Effect */}
                  <div className="flex justify-between items-center -mx-4 -my-4 relative z-10">
                     <div className="w-8 h-8 rounded-full bg-[#050507] -ml-4" />
                     <div className="flex-1 h-[2px] border-b-2 border-dashed border-white/10 mx-2" />
                     <div className="w-8 h-8 rounded-full bg-[#050507] -mr-4" />
                  </div>

                  <div className="p-8 md:p-12 space-y-12">
                     {/* Core Status Message */}
                     <div className="text-center">
                        <p className="text-gray-400 text-lg font-medium leading-relaxed italic">
                           {isActivating ? (
                               <span className="flex items-center justify-center gap-2 text-brand-purple animate-pulse">
                                   <Loader2 className="w-5 h-5 animate-spin" />
                                   Activating your VIP access protocols...
                               </span>
                           ) : isTip ? 'Your support has been successfully transmitted to the DJ console.' :
                               isSubscription ? 'Access granted. Your Premium ID is now broadcasting.' :
                                  `Connection established. Processing shipment protocols for ${state.customerName || 'User'}.`}
                        </p>
                     </div>

                     {/* Instant Activation Status (Subscribers) */}
                     {isSubscription && user?.isSubscriber && (
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-brand-purple/10 border border-brand-purple/30 rounded-3xl p-6 text-center"
                         >
                             <div className="flex items-center justify-center gap-2 mb-2">
                                 <Sparkles className="text-brand-purple w-5 h-5 animate-pulse" />
                                 <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest">VIP Activation Success</span>
                             </div>
                             <h3 className="text-xl font-black text-white italic mb-2 uppercase tracking-tighter">Account Status: Active</h3>
                             <p className="text-xs text-gray-400 font-medium">Your premium protocols are now synchronized. Refresh the page or check your dashboard for updates.</p>
                         </motion.div>
                     )}

                     {/* Digital Download Hub */}
                     {state.items && state.items.some((item: any) => item.type === 'digital') && (
                        <div className="space-y-6">
                           <div className="flex items-center gap-2 mb-4">
                              <Zap size={16} className="text-brand-purple" />
                              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Download Node Active</h3>
                           </div>

                           {state.items.filter((item: any) => item.type === 'digital').map((item: any, idx: number) => (
                              <motion.div
                                 key={idx}
                                 whileHover={{ scale: 1.02, x: 5 }}
                                 className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group/item shadow-xl"
                              >
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-brand-purple/5 rounded-full blur-3xl -translate-x-4 -translate-y-4" />

                                 <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-black/40 rounded-2xl flex items-center justify-center text-brand-purple border border-white/5 shadow-inner group-hover/item:border-brand-purple/30 transition-all duration-500">
                                       <Music size={32} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <h4 className="text-lg font-black text-white uppercase italic tracking-tight truncate">{item.productName || item.name}</h4>
                                       <div className="flex items-center gap-3 mt-1">
                                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-none">High Fidelity FLAC/MP3</span>
                                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Ready</span>
                                       </div>
                                    </div>
                                 </div>

                                 <div className="mt-6 flex flex-col gap-4">
                                    {item.downloadUrl || item.digitalFileUrl ? (
                                       <motion.button
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onClick={() => downloadFileSecurely(item.downloadUrl || item.digitalFileUrl, {
                                             fileName: item.productName || 'track',
                                             trackId: item.productId || item.id, orderId: ref, type: 'digital_product'
                                          })}
                                          className="w-full py-5 bg-gradient-to-r from-brand-purple via-brand-cyan to-brand-purple bg-[length:200%_100%] animate-gradient-x text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-3"
                                       >
                                          <Download size={20} /> Transmit File
                                       </motion.button>
                                    ) : (
                                       <div className="py-4 px-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-brand-purple animate-ping" />
                                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Link Emailed to {state.email}</span>
                                       </div>
                                    )}

                                    {item.downloadPassword && (
                                       <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl group/pass">
                                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Access Key</span>
                                          <div className="flex items-center gap-3">
                                             <code className="text-sm font-black text-brand-cyan font-mono tracking-[0.2em]">{item.downloadPassword}</code>
                                             <button onClick={() => navigator.clipboard.writeText(item.downloadPassword)} className="text-gray-700 hover:text-white transition-colors">
                                                <Copy size={12} />
                                             </button>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </motion.div>
                           ))}
                        </div>
                     )}

                     {/* Order Totals Container */}
                     <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                           <ShieldCheck size={14} className="text-brand-cyan" />
                           <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Ledger Record</h3>
                        </div>

                        <div className="space-y-4">
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-bold uppercase tracking-widest">Base Subtotal</span>
                              <span className="text-white font-bold tracking-tight">{formatPrice(state.subtotal || totalAmount)}</span>
                           </div>
                           {state.shippingCost > 0 && (
                              <div className="flex justify-between items-center text-xs">
                                 <span className="text-gray-500 font-bold uppercase tracking-widest">Shipping Pulse</span>
                                 <span className="text-white font-bold tracking-tight">+ {formatPrice(state.shippingCost)}</span>
                              </div>
                           )}
                           {state.discountAmount > 0 && (
                              <div className="flex justify-between items-center text-xs">
                                 <span className="text-gray-500 font-bold uppercase tracking-widest">Protocol Discount</span>
                                 <span className="text-emerald-500 font-bold tracking-tight">- {formatPrice(state.discountAmount)}</span>
                              </div>
                           )}

                           <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                              <div>
                                 <p className="text-[9px] font-black text-brand-purple uppercase tracking-[0.4em] mb-1">Total Settlement</p>
                                 <p className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">{formatPrice(totalAmount)}</p>
                              </div>
                              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                 Confirmed
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Action Grid */}
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/5 border-dashed">
                        <Link to="/" className="flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group">
                           <div className="w-10 h-10 rounded-2xl bg-black/40 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                              <ShoppingBag size={20} />
                           </div>
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white">Base</span>
                        </Link>
                        <Link to="/store" className="flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group">
                           <div className="w-10 h-10 rounded-2xl bg-black/40 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                              <Package size={20} />
                           </div>
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white">Gear</span>
                        </Link>
                        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group">
                           <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-all">
                              <MessageCircle size={20} />
                           </div>
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-[#25D366]">Support</span>
                        </a>
                     </div>
                  </div>

                  {/* Footer Strip */}
                  <div className="px-10 py-8 bg-white/5 border-t border-white/5 text-center">
                     <p className="text-[10px] font-medium text-gray-600 leading-relaxed uppercase tracking-widest mb-6">
                        Your transaction was encrypted and processed via Paystack Secure Hub. Digital items are stored in your profile for 30 days. Enjoy the rhythm.
                     </p>
                     <div className="flex items-center justify-center gap-6 grayscale opacity-30 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-1000">
                        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="h-6" />
                        <div className="h-4 w-px bg-white/10" />
                        <img loading="lazy" src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-6" />
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* Post-Transmission Note */}
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 1.2 }}
               className="mt-12 text-center space-y-4"
            >
               <div className="flex items-center justify-center gap-4 text-gray-700 font-black uppercase tracking-[0.3em] text-[10px]">
                  <span>Receipt Synced</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Secure Logout Active</span>
               </div>
               <p className="text-[10px] text-gray-600 max-w-sm mx-auto uppercase leading-relaxed font-bold">
                  Thank you for being part of the DJ Flowerz network. Your support drives the future of Kenyas digital music scene.
               </p>
            </motion.div>
         </div>
      </div>
   );
};

export default Success;