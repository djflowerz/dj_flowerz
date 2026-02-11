
import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { Trash2, ArrowRight, Minus, Plus, Truck, AlertCircle, CreditCard, Lock, MapPin, Package, Clock, Info, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { usePaystackPayment } from 'react-paystack';

const PICKUP_RATE = 116;

const Cart: React.FC = () => {
  const { items, removeFromCart, updateQuantity, cartSubtotal, taxAmount, cartTotal, clearCart } = useCart();
  const { shippingZones } = useData();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Shipping State
  const [shippingRegion, setShippingRegion] = useState(shippingZones[0]?.id || 'nbi_central');
  const [deliveryType, setDeliveryType] = useState<'door' | 'pickup'>('door');
  const [shippingSpeed, setShippingSpeed] = useState('standard');

  // Helper to determine if product is physical
  const hasPhysicalItems = useMemo(() => items.some(item => {
    const cat = item.category?.toLowerCase() || '';
    // Assume physical unless strictly digital category or type
    if (item.type === 'digital' || ['digital', 'software', 'samples'].includes(cat)) return false;
    // Default to physical
    return true;
  }), [items]);

  // Get Current Zone Config
  const currentZone = shippingZones.find(z => z.id === shippingRegion);
  
  // Create rates map for easy lookup
  const currentRates = useMemo(() => {
      const rates: Record<string, any> = {};
      currentZone?.rates.forEach(r => {
          rates[r.type] = r;
      });
      return rates;
  }, [currentZone]);

  const availableSpeeds = Object.keys(currentRates);

  // Ensure selected speed is valid for new region
  useMemo(() => {
    if (deliveryType === 'door' && !currentRates[shippingSpeed]) {
       // Default to standard if current speed not available, or express if standard not available
       setShippingSpeed(currentRates['standard'] ? 'standard' : (availableSpeeds[0] || 'standard'));
    }
  }, [shippingRegion, deliveryType, currentRates]);

  // Calculate Shipping Cost
  const shippingCost = useMemo(() => {
    if (!hasPhysicalItems) return 0;
    
    if (deliveryType === 'pickup') return PICKUP_RATE;

    if (currentRates[shippingSpeed]) {
       return currentRates[shippingSpeed].price;
    }
    return 0;
  }, [hasPhysicalItems, shippingRegion, deliveryType, shippingSpeed, currentRates]);

  const finalTotal = cartTotal + shippingCost;

  // Paystack Config
  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: finalTotal * 100, // Paystack expects amount in smallest currency unit (cents for KES/NGN)
    publicKey: 'pk_live_2ed6a5c46ebab203998efd1f5d9c22d2dcc05f71',
    currency: 'KES',
    metadata: {
        custom_fields: [
            { display_name: "First Name", variable_name: "first_name", value: firstName },
            { display_name: "Last Name", variable_name: "last_name", value: lastName },
            { display_name: "Phone Number", variable_name: "phone_number", value: phone }
        ]
    }
  };

  // Initialize Paystack hook
  const initializePayment = usePaystackPayment(paystackConfig);

  const onSuccess = (reference: any) => {
      setIsProcessing(false);
      // Order Data
      const orderData = {
         items: [...items], // Copy items before clearing
         total: finalTotal,
         orderId: reference.reference || `ORD-${Date.now()}`,
         date: new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
         email: email 
      };
      
      navigate('/success', { state: orderData });
  };

  const onClose = () => {
      setIsProcessing(false);
      alert("Payment cancelled.");
  };

  const handleCheckout = (e: React.FormEvent) => {
     e.preventDefault();
     if (!email || !firstName || !phone) {
         alert("Please fill in your contact details.");
         return;
     }

     setIsProcessing(true);

     // If order is free, bypass payment
     if (finalTotal === 0) {
        onSuccess({ reference: `FREE-${Date.now()}` });
     } else {
        initializePayment({onSuccess, onClose});
     }
  };

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-white mb-8">Your <span className="text-brand-purple">Cart</span></h1>

        {items.length === 0 ? (
          <div className="text-center py-24 bg-[#15151A] rounded-2xl border border-white/5">
            <p className="text-gray-400 mb-6 text-lg">Your cart is empty.</p>
            <Link to="/store" className="inline-block px-8 py-3 bg-brand-purple text-white font-bold rounded-full hover:bg-purple-600 transition">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Items & Shipping Form */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Items List */}
              <div className="space-y-4">
                 {items.map((item) => (
                  <div key={`${item.id}-${item.selectedVariant}`} className="bg-[#15151A] p-4 rounded-xl border border-white/5 flex gap-4">
                    <div className="w-24 h-24 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                       <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                          <div className="flex justify-between items-start">
                             <h3 className="font-bold text-white text-lg line-clamp-1">{item.name}</h3>
                             <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 transition"><Trash2 size={18} /></button>
                          </div>
                          {item.selectedVariant && <p className="text-sm text-gray-400">Option: {item.selectedVariant}</p>}
                          <p className="text-xs text-brand-cyan mt-1 capitalize">{item.category}</p>
                      </div>
                      
                      <div className="flex justify-between items-end mt-2">
                         <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 text-gray-400 hover:text-white"><Minus size={14} /></button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 text-gray-400 hover:text-white"><Plus size={14} /></button>
                         </div>
                         <p className="font-bold text-brand-purple">
                            {item.price === 0 ? 'Free' : `KES ${(item.price * item.quantity).toLocaleString()}`}
                         </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Form - Only if Physical Items exist */}
              {hasPhysicalItems ? (
                 <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                       <Truck className="text-brand-cyan" size={24} />
                       <h2 className="text-xl font-bold text-white">Shipping & Delivery</h2>
                    </div>
                    
                    {/* Location Selector */}
                    <div className="mb-8">
                        <label className="block text-xs text-gray-500 mb-2 font-bold uppercase flex items-center gap-1"><MapPin size={12}/> Select Your Region</label>
                        <select 
                           value={shippingRegion} 
                           onChange={(e) => setShippingRegion(e.target.value)}
                           className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white focus:border-brand-purple focus:outline-none mb-2"
                        >
                           {shippingZones.map(zone => (
                              <option key={zone.id} value={zone.id}>{zone.name}</option>
                           ))}
                        </select>
                        <p className="text-xs text-gray-500 italic ml-1">{currentZone?.description}</p>
                    </div>

                    {/* Delivery Method Toggle */}
                    <div className="mb-8">
                       <label className="block text-xs text-gray-500 mb-3 font-bold uppercase flex items-center gap-1"><Package size={12}/> Delivery Method</label>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button 
                             type="button"
                             onClick={() => setDeliveryType('door')}
                             className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${deliveryType === 'door' ? 'bg-brand-purple/10 border-brand-purple text-white' : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/30'}`}
                          >
                             <Truck size={24} className={deliveryType === 'door' ? 'text-brand-purple' : 'text-gray-500'} />
                             <span className="font-bold text-sm">Door Delivery</span>
                          </button>
                          <button 
                             type="button"
                             onClick={() => setDeliveryType('pickup')}
                             className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${deliveryType === 'pickup' ? 'bg-brand-purple/10 border-brand-purple text-white' : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/30'}`}
                          >
                             <Package size={24} className={deliveryType === 'pickup' ? 'text-brand-purple' : 'text-gray-500'} />
                             <span className="font-bold text-sm">Pickup Station</span>
                             <span className="text-xs text-brand-cyan font-bold">KES {PICKUP_RATE}</span>
                          </button>
                       </div>
                    </div>

                    {/* Dynamic Speed Options (Only for Door Delivery) */}
                    {deliveryType === 'door' && (
                       <div className="mb-8 animate-fade-in-up">
                          <label className="block text-xs text-gray-500 mb-3 font-bold uppercase flex items-center gap-1"><Clock size={12}/> Select Speed</label>
                          <div className="space-y-3">
                             {availableSpeeds.map(speedKey => {
                                const rate = currentRates[speedKey];
                                if (!rate) return null;
                                return (
                                   <label key={speedKey} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${shippingSpeed === speedKey ? 'bg-brand-purple/10 border-brand-purple' : 'bg-black/20 border-white/10 hover:border-white/20'}`}>
                                      <div className="flex items-center gap-3">
                                         <input 
                                            type="radio" 
                                            name="speed" 
                                            checked={shippingSpeed === speedKey} 
                                            onChange={() => setShippingSpeed(speedKey)}
                                            className="accent-brand-purple w-4 h-4"
                                         />
                                         <div>
                                            <p className="font-bold text-white text-sm">{rate.label}</p>
                                            <p className="text-xs text-gray-400">{rate.timeline}</p>
                                         </div>
                                      </div>
                                      <span className="font-bold text-brand-cyan">KES {rate.price.toLocaleString()}</span>
                                   </label>
                                );
                             })}
                          </div>
                       </div>
                    )}
                    
                    {deliveryType === 'pickup' && (
                       <div className="mb-8 p-4 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl flex items-start gap-3 animate-fade-in-up">
                          <Info size={18} className="text-brand-cyan mt-0.5 flex-shrink-0" />
                          <div>
                             <p className="text-sm text-brand-cyan font-bold mb-1">Post Office Pickup</p>
                             <p className="text-xs text-gray-300">Available at 620 post office outlets countrywide. You will be notified via SMS when your package is ready for collection.</p>
                          </div>
                       </div>
                    )}

                    <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4 pt-6 border-t border-white/5">
                        <h3 className="font-bold text-white mb-4">Contact & Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs text-gray-500 mb-1 font-bold">First Name</label>
                              <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                           <div>
                              <label className="block text-xs text-gray-500 mb-1 font-bold">Last Name</label>
                              <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs text-gray-500 mb-1 font-bold">Email Address</label>
                               <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1 font-bold">Phone Number</label>
                               <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                        </div>
                        
                        {/* Address Fields */}
                        {deliveryType === 'door' ? (
                           <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs text-gray-500 mb-1 font-bold">City / Town</label>
                                    <input required type="text" className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                                 </div>
                                 <div>
                                    <label className="block text-xs text-gray-500 mb-1 font-bold">Postal Code</label>
                                    <input type="text" className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-xs text-gray-500 mb-1 font-bold">Street Address / Location</label>
                                 <input required type="text" placeholder="Street, Building, House No." className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                              </div>
                              <div>
                                 <label className="block text-xs text-gray-500 mb-1 font-bold">Landmark / Delivery Instructions</label>
                                 <input type="text" placeholder="e.g. Next to Total Gas Station" className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                              </div>
                           </>
                        ) : (
                           <div>
                              <label className="block text-xs text-gray-500 mb-1 font-bold">Preferred Pickup Station</label>
                              <input required type="text" placeholder="Enter preferred Post Office Branch or Agent" className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                        )}
                    </form>
                 </div>
              ) : (
                 <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                       <Package size={24} className="text-green-500" />
                    </div>
                    <div>
                       <h3 className="font-bold text-white">Digital Delivery Only</h3>
                       <p className="text-sm text-gray-400">Items will be sent to your email immediately after {finalTotal === 0 ? 'confirmation' : 'payment'}.</p>
                       <form id="checkout-form" onSubmit={handleCheckout} className="mt-4 space-y-3">
                           <div>
                               <label className="block text-xs text-gray-500 mb-1 font-bold">First Name</label>
                               <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1 font-bold">Confirm Email Address</label>
                               <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1 font-bold">Phone (M-Pesa)</label>
                               <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-brand-purple focus:outline-none" />
                           </div>
                       </form>
                    </div>
                 </div>
              )}
            </div>

            {/* Right Side: Order Summary & Pay */}
            <div className="lg:col-span-1">
              <div className="bg-[#15151A] p-6 rounded-2xl border border-white/5 sticky top-24 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>KES {cartSubtotal.toLocaleString()}</span>
                  </div>
                  {finalTotal > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tax (16% VAT Included)</span>
                      <span>KES {taxAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  )}
                  
                  {hasPhysicalItems ? (
                      <div className="flex justify-between text-brand-cyan font-medium border-t border-white/5 pt-2 mt-2">
                        <span>Shipping Fee</span>
                        <span>KES {shippingCost.toLocaleString()}</span>
                      </div>
                  ) : (
                      <div className="flex justify-between text-gray-500 border-t border-white/5 pt-2 mt-2">
                        <span>Shipping</span>
                        <span>Digital - Free</span>
                      </div>
                  )}

                  <div className="border-t border-white/10 pt-4 mt-4 flex justify-between text-white font-bold text-xl">
                    <span>Total Pay</span>
                    <span>KES {finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* The Button triggers the form submission via form attribute */}
                <button 
                  type="submit"
                  form="checkout-form"
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-cyan text-white font-bold rounded-lg hover:shadow-lg hover:shadow-brand-purple/20 transition flex items-center justify-center gap-2"
                >
                   {isProcessing ? (
                      <>Processing <span className="animate-pulse">...</span></>
                   ) : (
                      <>
                        {finalTotal === 0 ? <Download size={18} /> : <CreditCard size={18} />} 
                        {finalTotal === 0 ? 'Get Now (Free)' : `Pay KES ${finalTotal.toLocaleString()}`}
                      </>
                   )}
                </button>

                {finalTotal > 0 && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                     <Lock size={12} /> Secure Payment via Paystack
                  </div>
                )}
                
                <div className="mt-4 text-center">
                   <Link to="/store" className="text-sm text-gray-500 hover:text-white">Continue Shopping</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
