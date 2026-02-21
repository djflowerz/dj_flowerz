
import React, { useEffect, useState } from 'react';
import { useLocation, Link, Navigate, useParams } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Printer, Package, Music, FileText, ShoppingBag, Copy, CreditCard, Calendar, Loader2, ExternalLink, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { supabase } from '../utils/supabase'; // Updated import
import { downloadFileSecurely } from '../utils/downloadHelper';
import { Order } from '../types';

// Helper to map Supabase snake_case to CamelCase for Order
const mapSupabaseOrder = (data: any): any => ({
   ...data,
   customerName: data.customer_name || data.customerName,
   customerEmail: data.customer_email || data.customerEmail,
   paymentStatus: data.payment_status || data.paymentStatus,
   referenceCode: data.reference_code || data.referenceCode,
   shippingAddress: data.shipping_address || data.shippingAddress,
   trackingNumber: data.tracking_number || data.trackingNumber,
   courierName: data.courier_name || data.courierName,
   estimatedArrival: data.estimated_arrival || data.estimatedArrival,
   pickupLocation: data.pickup_location || data.pickupLocation,
   receiptUrl: data.receipt_url || data.receiptUrl,
   adminMessage: data.admin_message || data.adminMessage,
   shippedAt: data.shipped_at || data.shippedAt,
   deliveryMethod: data.delivery_method || data.deliveryMethod,
   couponCode: data.coupon_code || data.couponCode,
   discountAmount: data.discount_amount || data.discountAmount,
   shippingCost: data.shipping_cost || data.shippingCost,
   subtotal: data.subtotal || data.subtotal,
   createdAt: data.created_at || data.createdAt,
   updatedAt: data.updated_at || data.updatedAt,
   orderId: data.id // Ensure ID is mapped if needed by component logic
});

const Success: React.FC = () => {
   const { clearCart } = useCart();
   const { siteConfig, issueReferralReward, addSubscriber } = useData();
   const { id } = useParams<{ id: string }>();
   const location = useLocation();
   const [loading, setLoading] = useState(!!id);
   const [orderData, setOrderData] = useState<any>(location.state);

   useEffect(() => {
      // Clear cart if we just came from checkout
      if (location.state?.type === 'store' || location.state?.items) {
         clearCart();
      }

      // Proactive persistence check: 
      // If we have location.state (meaning we just finished payment) 
      // but the data isn't in DB yet (because webhook is slow/dev),
      // we attempt a client-side save.
      if (location.state && location.state.reference) {
         const syncToSupabase = async () => {
            const { reference, type, amount, email, customerName, message, items } = location.state;

            try {
               // 1. Check if order/tip already exists to avoid duplicates
               const table = type === 'tip' ? 'tips' : 'orders';
               const idToCheck = type === 'tip' ? `tip_${reference}` : (location.state.orderId || reference);

               const { data: existing } = await supabase
                  .from(table)
                  .select('id')
                  .eq(type === 'tip' ? 'id' : 'id', idToCheck)
                  .maybeSingle();

               if (!existing) {
                  console.log(`Syncing ${type} to Supabase...`);

                  if (type === 'tip') {
                     // Save to tips table
                     await supabase.from('tips').insert({
                        id: idToCheck,
                        amount: amount,
                        message: message || 'Generous Tip',
                        email: email || 'guest@djflowerz.com',
                        status: 'completed',
                        created_at: new Date().toISOString()
                     });

                     // Also save to payments table for the main dashboard revenue stat
                     await supabase.from('payments').insert({
                        amount: amount,
                        payment_ref: reference,
                        payment_type: 'tip',
                        user_email: email,
                        status: 'success',
                        created_at: new Date().toISOString()
                     });
                  } else if (type === 'store') {
                     // Save to orders table
                     await supabase.from('orders').insert({
                        id: idToCheck,
                        customer_name: customerName || 'Guest Customer',
                        customer_email: email,
                        total: amount || location.state.total,
                        subtotal: location.state.subtotal || amount || location.state.total,
                        discount_amount: location.state.discountAmount || 0,
                        shipping_cost: location.state.shippingCost || 0,
                        shipping_address: location.state.shippingAddress || null,
                        delivery_method: location.state.deliveryType || null,
                        coupon_code: location.state.couponCode || null,
                        status: 'completed',
                        payment_status: 'paid',
                        date: new Date().toISOString().split('T')[0],
                        reference_code: reference,
                        type: 'store',
                        items: items || [],
                        created_at: new Date().toISOString()
                     });

                     // Update Coupon Usage if applied
                     if (location.state.couponCode) {
                        const { data: coupon, error: couponFetchError } = await supabase
                           .from('coupons')
                           .select('id, usage_count')
                           .eq('code', location.state.couponCode.toUpperCase())
                           .single();

                        if (!couponFetchError && coupon) {
                           await supabase
                              .from('coupons')
                              .update({ usage_count: (coupon.usage_count || 0) + 1 })
                              .eq('id', coupon.id);
                        }
                     }
                  } else if (type === 'subscription') {
                     // Handle Referral Reward
                     try {
                        const { data: profile } = await supabase.from('profiles').select('id, name, referred_by').eq('email', email).single();
                        if (profile) {
                           const referrerId = profile.referred_by || location.state.referrerId;

                           if (referrerId) {
                              // Check if already rewarded for this referee
                              const { data: existingLog } = await supabase.from('referral_logs').select('id').eq('referee_id', profile.id).maybeSingle();
                              if (!existingLog) {
                                 const { data: referrer } = await supabase.from('profiles').select('name').eq('id', referrerId).single();
                                 await issueReferralReward({
                                    referrerId: referrerId,
                                    refereeId: profile.id,
                                    referrerName: referrer?.name || 'User',
                                    refereeName: profile.name,
                                    planPurchased: location.state.plan || 'Plan',
                                    discountApplied: location.state.discount || 0
                                 });

                              }
                           }
                        }
                     } catch (refErr) {
                        console.warn("Referral reward error:", refErr);
                     }
                  }

                  // Automatically add to newsletter subscribers if we have an email
                  if (email) {
                     await addSubscriber(email, `Customer (${type === 'store' ? 'Order' : type === 'tip' ? 'Tip' : 'Subscription'})`);
                  }
               }
            } catch (err) {
               console.warn("Client-side sync error:", err);
            }
         };
         syncToSupabase();
      }

      // Fetch order if ID is provided and we don't have state
      if (id && !location.state) {
         const fetchOrder = async () => {
            try {
               const { data, error } = await supabase
                  .from('orders')
                  .select('*')
                  .eq('id', id)
                  .single();

               if (error) {
                  console.error("Supabase fetch error:", error);
                  return;
               }

               if (data) {
                  const mappedOrder = mapSupabaseOrder(data);

                  // Enrich items with download info if missing
                  if (mappedOrder.items && Array.isArray(mappedOrder.items)) {
                     const enrichedItems = await Promise.all(mappedOrder.items.map(async (item: any) => {
                        if (item.type === 'digital' && (!item.downloadUrl && !item.digitalFileUrl)) {
                           const { data: prod } = await supabase
                              .from('products')
                              .select('digital_file_url, download_password')
                              .eq('id', item.productId || item.id)
                              .single();

                           if (prod) {
                              return {
                                 ...item,
                                 downloadUrl: prod.digital_file_url,
                                 digitalFileUrl: prod.digital_file_url,
                                 downloadPassword: prod.download_password
                              };
                           }
                        }
                        return item;
                     }));
                     mappedOrder.items = enrichedItems;
                  }

                  setOrderData({
                     ...mappedOrder,
                     items: mappedOrder.items.map((item: any) => ({
                        ...item,
                        // Ensure fields consistent for UI
                        digitalFileUrl: item.digitalFileUrl || item.downloadUrl,
                        downloadUrl: item.downloadUrl || item.digitalFileUrl,
                        downloadPassword: item.downloadPassword || item.password
                     })),
                     type: 'store', // Treat fetched orders as store orders for layout
                     orderId: data.id
                  });
               }
            } catch (error) {
               console.error("Error fetching order:", error);
            } finally {
               setLoading(false);
            }
         };
         fetchOrder();
      }
   }, [id, location.state, clearCart]);

   if (loading) {
      return (
         <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-brand-purple animate-spin" />
         </div>
      );
   }

   const state = orderData;

   if (!state && !loading) {
      return <Navigate to="/" replace />;
   }

   // Determine contents based on type
   const isTip = state.type === 'tip';
   const isSubscription = state.type === 'subscription';
   const isBooking = state.type === 'booking';
   const isStore = state.type === 'store' || (!isTip && !isSubscription && !isBooking && state.items); // Default to store if items exist

   const totalAmount = state.total || state.amount || 0;
   const ref = state.orderId || state.reference || 'N/A';
   const dateStr = state.date || new Date().toLocaleDateString();

   // WhatsApp Support Link
   const whatsappNumber = siteConfig.contact.whatsapp.replace(/\+/g, '').replace(/\s/g, '');
   const supportMessage = encodeURIComponent(`Hi DJ Flowerz, I'm reporting an issue with my order.\nOrder ID: ${ref}\nCustomer: ${state.customerName || state.email || 'N/A'}\nIssue: `);
   const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${supportMessage}`;

   return (
      <div className="relative pt-24 pb-20 min-h-screen bg-[#0B0B0F] overflow-hidden">
         {/* Background Decorative Elements */}
         <div className="absolute inset-0 z-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070')] bg-cover bg-center opacity-[0.03] scale-105"></div>
         </div>

         <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Success Header */}
            <div className="text-center mb-10 animate-fade-in-up">
               <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
                  <CheckCircle size={40} className="text-green-500" />
               </div>
               <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2 tracking-tight">
                  Success!
               </h1>
               <p className="text-gray-400 text-lg max-w-md mx-auto">
                  {isTip ? 'Thank you for your generous contribution.' :
                     isSubscription ? 'Your account has been upgraded. Welcome!' :
                        `Thank you, ${state.customerName || 'Customer'}. Your order is confirmed.`}
               </p>
               {state.email && <p className="text-sm text-gray-500 mt-3">A confirmation has been sent to <span className="text-white font-medium">{state.email}</span></p>}
            </div>

            {/* Main Receipt Container */}
            <div className="bg-[#15151A]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden mb-8">

               {/* Reference Strip */}
               <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Order Info</span>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                     REF: <span className="text-brand-purple font-mono cursor-pointer hover:underline" onClick={() => navigator.clipboard.writeText(ref)}>{ref}</span>
                     <Copy size={12} className="text-gray-600" />
                  </span>
               </div>

               <div className="p-6 md:p-10 space-y-8">

                  {/* Specific Content Types */}
                  {isTip && (
                     <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center italic text-gray-300">
                        "{state.message || 'Thank you for the support!'}"
                     </div>
                  )}

                  {isSubscription && (
                     <div className="flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 border border-white/10">
                        <div className="w-16 h-16 bg-brand-purple rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-purple/30">
                           <CreditCard size={32} />
                        </div>
                        <div>
                           <p className="text-white font-bold text-xl">{state.plan} Membership</p>
                           <p className="text-sm text-gray-400">Your pro features are now active. Enjoy unlimited access!</p>
                        </div>
                     </div>
                  )}

                  {isBooking && (
                     <div className="flex items-center gap-5 p-6 rounded-2xl bg-white/5 border border-white/10">
                        <div className="w-16 h-16 bg-brand-cyan rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-cyan/30">
                           <Calendar size={32} />
                        </div>
                        <div>
                           <p className="text-white font-bold text-xl">{state.serviceName || state.service || 'Studio Session'}</p>
                           <p className="text-sm text-gray-400">{state.date} at {state.time}</p>
                        </div>
                     </div>
                  )}

                  {/* Digital Downloads Section - Primary for Digital Products */}
                  {state.items && state.items.some((item: any) => item.type === 'digital') && (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Digital Products</h3>
                           <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-brand-cyan hover:underline flex items-center gap-1 uppercase font-black"
                           >
                              Download Issues? <ExternalLink size={10} />
                           </a>
                        </div>
                        {state.items.filter((item: any) => item.type === 'digital').map((item: any, idx: number) => (
                           <div key={idx} className="group flex flex-col items-center text-center gap-6 p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-brand-purple/50 transition duration-300 shadow-xl">
                              {/* Product Info */}
                              <div className="flex flex-col items-center gap-4 w-full">
                                 <div className="w-16 h-16 bg-gray-800/50 rounded-2xl flex items-center justify-center group-hover:bg-brand-purple/20 transition shadow-inner">
                                    <Music size={32} className="text-brand-purple" />
                                 </div>
                                 <div className="space-y-1">
                                    <h4 className="text-xl text-white font-bold leading-tight">{item.productName || item.name}</h4>
                                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">qty: {item.quantity}</p>
                                 </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-col items-center gap-5 w-full max-w-xs">
                                 {item.downloadUrl || item.digitalFileUrl ? (
                                    <>
                                       <button
                                          onClick={() => downloadFileSecurely(item.downloadUrl || item.digitalFileUrl, {
                                             fileName: item.productName || 'download',
                                             trackId: item.productId || item.id,
                                             orderId: ref,
                                             type: 'digital_product'
                                          })}
                                          className="w-full px-8 py-4 bg-brand-purple hover:bg-brand-purple/80 text-white font-bold rounded-2xl transition flex items-center justify-center gap-3 shadow-lg shadow-brand-purple/30 text-lg hover:-translate-y-0.5"
                                       >
                                          <Download size={22} />
                                          Download Now
                                       </button>

                                       {item.downloadPassword && (
                                          <div className="flex flex-col items-center gap-3 w-full">
                                             <div className="flex items-center gap-2">
                                                <div className="h-px w-8 bg-white/10" />
                                                <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">Password</span>
                                                <div className="h-px w-8 bg-white/10" />
                                             </div>
                                             <div className="flex items-center gap-3 px-5 py-3 bg-black/40 rounded-xl border border-white/5 transition hover:border-brand-cyan/30 group/key">
                                                <code className="text-base text-brand-cyan font-mono font-bold tracking-widest">{item.downloadPassword}</code>
                                                <button
                                                   onClick={() => navigator.clipboard.writeText(item.downloadPassword)}
                                                   className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-500 hover:text-white"
                                                   title="Copy Password"
                                                >
                                                   <Copy size={14} />
                                                </button>
                                             </div>
                                          </div>
                                       )}
                                    </>
                                 ) : (
                                    <div className="flex flex-col items-center gap-2 py-4 px-6 rounded-2xl bg-brand-purple/5 border border-brand-purple/10">
                                       <span className="text-sm text-brand-purple font-black italic flex items-center gap-2 uppercase tracking-tight">
                                          <FileText size={16} /> Link sent to your email
                                       </span>
                                       <p className="text-[10px] text-gray-500 uppercase font-bold">Check your inbox or spam folder</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}

                  {/* Order Summary & Physical Items */}
                  {isStore && (
                     <div className="pt-4 border-t border-white/5">
                        <div className="flex flex-col gap-6">
                           {state.items && state.items.filter((i: any) => i.type !== 'digital').length > 0 && (
                              <div className="space-y-4">
                                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Items Summary</h3>
                                 <div className="space-y-3">
                                    {state.items.filter((i: any) => i.type !== 'digital').map((item: any, idx: number) => (
                                       <div key={idx} className="flex justify-between items-center text-sm">
                                          <span className="text-gray-300">{item.productName || item.name} <span className="text-gray-500 ml-1">x{item.quantity}</span></span>
                                          <span className="text-white font-medium">KES {(item.price * item.quantity).toLocaleString()}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Financial Totals */}
                           <div className="bg-black/20 p-6 rounded-2xl space-y-3 border border-white/5">
                              <div className="flex justify-between text-sm">
                                 <span className="text-gray-400">Subtotal</span>
                                 <span className="text-white font-medium">KES {(state.subtotal || totalAmount).toLocaleString()}</span>
                              </div>
                              {state.discountAmount > 0 && (
                                 <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Discount Applied {state.couponCode && `(${state.couponCode})`}</span>
                                    <span className="text-green-500 font-medium">- KES {state.discountAmount.toLocaleString()}</span>
                                 </div>
                              )}
                              {state.shippingCost > 0 && (
                                 <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Shipping {state.deliveryType === 'door' ? '(Home Delivery)' : '(Station Pickup)'}</span>
                                    <span className="text-white font-medium">+ KES {state.shippingCost.toLocaleString()}</span>
                                 </div>
                              )}
                              <div className="flex justify-between text-sm">
                                 <span className="text-gray-400">Processing Fee</span>
                                 <span className="text-white font-medium text-green-500">FREE</span>
                              </div>
                              <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                 <span className="text-lg font-bold text-white">Total Amount</span>
                                 <span className="text-2xl font-bold bg-gradient-to-r from-brand-purple to-brand-cyan bg-clip-text text-transparent">
                                    KES {totalAmount.toLocaleString()}
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Receipt Footer Info */}
                  <div className="text-center space-y-4 pt-4">
                     <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5"><FileText size={14} /> Receipt Emailed</span>
                        <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {dateStr}</span>
                     </div>
                     <p className="text-xs text-gray-600 leading-relaxed px-10">
                        Your transaction was processed safely via Paystack. Digital download links are valid for 30 days. For support, reach out via WhatsApp at {siteConfig.contact.whatsapp}.
                     </p>
                  </div>
               </div>

               {/* Actions Bottom Bar */}
               <div className="px-6 py-6 bg-white/5 border-t border-white/10 flex flex-col sm:flex-row gap-4">
                  <Link
                     to="/"
                     className="flex-1 py-3.5 text-center bg-transparent border border-white/10 rounded-2xl text-white hover:bg-white/5 transition font-bold text-sm"
                  >
                     Return to Home
                  </Link>
                  <a
                     href={whatsappUrl}
                     target="_blank"
                     rel="noreferrer"
                     className="flex-1 py-3.5 text-center bg-[#25D366] text-white rounded-2xl hover:bg-[#128C7E] transition font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                  >
                     <MessageCircle size={18} />
                     Report Issue
                  </a>
                  <Link
                     to={isStore ? "/store" : isSubscription ? "/music-pool" : "/mixtapes"}
                     className="flex-1 py-3.5 text-center bg-white text-black rounded-2xl hover:bg-gray-200 transition font-bold text-sm flex items-center justify-center gap-2"
                  >
                     {isStore ? 'Continue Shopping' : isSubscription ? 'Go to Music Pool' : 'Browse Mixtapes'}
                     <ArrowRight size={18} />
                  </Link>
               </div>
            </div>

            {/* Support Link */}
            <div className="text-center">
               <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition text-xs font-bold uppercase tracking-widest">
                  Need help with your order? <ExternalLink size={12} />
               </a>
            </div>
         </div>
      </div>
   );
};

export default Success;