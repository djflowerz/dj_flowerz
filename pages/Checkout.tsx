import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import {
  Truck, CreditCard, ShieldCheck, MapPin, ChevronDown,
  Check, MessageSquare, Download, Zap, FileText, Package
} from 'lucide-react';
import { INITIAL_SHIPPING_ZONES, KENYAN_COUNTIES, TOWN_TO_ZONE_MAP, SHIPPING_ZONES_CONFIG, COUNTY_TO_TOWNS, SHIPPING_BASE_WEIGHT, SHIPPING_STANDARD_BASE, SHIPPING_HARDSHIP_BASE, SHIPPING_INCREMENT_PER_KG, PREMIUM_SERVICES } from '../constants';
import { ShippingSize } from '../types';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';
import { STORAGE_WORKER_URL } from '../utils/r2';
import { useAuth } from '../context/AuthContext';

/* ─── Digital Delivery Screen ───────────────────────────────────────────── */
interface DownloadItem {
  name: string;
  url: string;
  password?: string;
}
const DigitalDelivery: React.FC<{ downloads: DownloadItem[]; email: string }> = ({ downloads, email }) => (
  <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-8">
    <div className="max-w-2xl w-full text-center space-y-8">
      <div className="w-24 h-24 mx-auto bg-brand-purple/10 rounded-full flex items-center justify-center border border-brand-purple/30">
        <Zap size={44} className="text-brand-purple animate-pulse" />
      </div>
      <div>
        <h1 className="text-4xl font-black tracking-tighter uppercase text-white mb-3">Order Confirmed</h1>
        <p className="text-gray-400">A confirmation email has been sent to <span className="text-brand-purple font-bold">{email}</span></p>
      </div>

      <div className="bg-[#0F0F14] border border-white/10 rounded-[2.5rem] p-8 space-y-4 text-left">
        <div className="flex items-center gap-3 mb-6">
          <Download size={20} className="text-brand-purple" />
          <h3 className="font-black uppercase tracking-widest text-sm text-white">Your Downloads</h3>
        </div>
        {downloads.map((item, i) => (
          <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:border-brand-purple/30 transition-all group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center">
                  <FileText size={18} className="text-brand-purple" />
                </div>
                <div>
                  <p className="font-black text-white text-sm">{item.name}</p>
                  {item.password && (
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Password: <span className="text-brand-cyan">{item.password}</span>
                    </p>
                  )}
                </div>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-brand-purple text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 whitespace-nowrap"
              >
                <Download size={14} /> Download
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
        Downloads expire in 7 days · Contact support if you need help
      </p>
    </div>
  </div>
);

/* ─── Main Checkout Page ─────────────────────────────────────────────────── */
export default function Checkout() {
  const { user, loading } = useAuth() as any;
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const { items, cartTotal, clearCart } = useCart();
  const { storeSettings } = useData();
  const navigate = useNavigate();
  // Determine if cart has physical items
  const hasPhysical = useMemo(() => (items || []).some((i: any) => 
    i.type === 'physical' || 
    (i.type !== 'digital' && i.type !== 'subscription' && i.requiresShipping !== false)
  ), [items]);
  
  const hasDigital = useMemo(() => (items || []).some((i: any) => 
    i.type === 'digital' || i.type === 'subscription' || i.requiresShipping === false
  ), [items]);

  const isDigitalOnly = !hasPhysical;

  const selectedCounty = watch('county');
  const [selectedTown, setSelectedTown] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(INITIAL_SHIPPING_ZONES[0].id);
  const [selectedRateId, setSelectedRateId] = useState<string>(INITIAL_SHIPPING_ZONES[0].rates[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedDownloads, setCompletedDownloads] = useState<DownloadItem[] | null>(null);
  const [completedEmail, setCompletedEmail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [paymentType, setPaymentType] = useState<'pay_full' | 'lipa_pole_pole'>('pay_full');
  const [lipaDuration, setLipaDuration] = useState<number>(3);

  // Towns available for the selected county
  const availableTowns = useMemo(() => COUNTY_TO_TOWNS[selectedCounty] || [], [selectedCounty]);

  // When county changes, reset the town selection
  useEffect(() => {
    setSelectedTown('');
  }, [selectedCounty]);

  // Reset to pay_full if cart becomes digital-only (no installments on digital goods)
  useEffect(() => {
    if (isDigitalOnly && paymentType === 'lipa_pole_pole') {
      setPaymentType('pay_full');
    }
  }, [isDigitalOnly, paymentType]);

  const selectedZone = useMemo(() =>
    INITIAL_SHIPPING_ZONES.find(z => z.id === selectedZoneId) || INITIAL_SHIPPING_ZONES[0]
  , [selectedZoneId]);

  // Calculate total weight of physical items in the cart
  const totalWeight = useMemo(() => {
    if (isDigitalOnly) return 0;
    return items.reduce((sum, item: any) => {
      // Default weight to 0.5kg if not specified for physical products
      const weight = item.weight || (item.type === 'physical' ? 0.5 : 0);
      return sum + (weight * (item.quantity || 1));
    }, 0);
  }, [items, isDigitalOnly]);

  // Determine if the selected town is a hardship area
  const isHardshipArea = useMemo(() => {
    if (!selectedTown || !storeSettings?.shipping?.hardship_towns) return false;
    return storeSettings.shipping.hardship_towns.includes(selectedTown.toLowerCase());
  }, [selectedTown, storeSettings]);

  // Determine the base shipping rate using the linear weight formula
  const baseShippingRate = useMemo(() => {
    if (isDigitalOnly || !storeSettings?.shipping) return 0;
    
    const { base_price, hardship_surcharge, base_weight, increment_price } = storeSettings.shipping;
    const baseRate = Number(base_price) || 0;
    const surcharge = isHardshipArea ? (Number(hardship_surcharge) || 0) : 0;
    
    // Weight-based calculation
    const extraWeight = Math.max(0, totalWeight - (base_weight || 0));
    const extraCost = Math.ceil(extraWeight) * (Number(increment_price) || 0);
    
    return baseRate + surcharge + extraCost;
  }, [isDigitalOnly, isHardshipArea, totalWeight, storeSettings]);

  // Generate dynamic delivery speed options based on G4S / market standard tiers.
  // Labels/timelines come from the PREMIUM_SERVICES constant; surcharge amounts
  // are overridden by `premium_prices` in storeSettings when available.
  const deliverySpeedOptions = useMemo(() => {
    if (isDigitalOnly || !storeSettings?.shipping) return [];
    
    const isNairobi = selectedZoneId === 'zone1';
    const isNearby = selectedZoneId === 'zone1' || selectedZoneId === 'zone2';
    // Safely pull overrides from storeSettings — backend stores flat numbers under premium_prices
    const premiumPrices = storeSettings.shipping.premium_prices || {};

    const overnightSurcharge = Number(premiumPrices.overnight ?? 150);
    const sameDayMin        = Number(premiumPrices.same_day  ?? PREMIUM_SERVICES.same_day.price);
    const oneHourMin        = Number(premiumPrices.one_hour  ?? PREMIUM_SERVICES.one_hour.price);
    
    return [
      { 
        id: 'standard', 
        type: 'standard', 
        label: PREMIUM_SERVICES.standard.label, 
        timeline: PREMIUM_SERVICES.standard.timeline, 
        price: baseShippingRate 
      },
      { 
        id: 'overnight', 
        type: 'express', 
        label: 'Overnight Courier', 
        timeline: '1-2 Business Days', 
        price: baseShippingRate + overnightSurcharge
      },
      ...(isNearby ? [
        { 
          id: 'sameday', 
          type: 'instant', 
          label: PREMIUM_SERVICES.same_day.label,
          timeline: PREMIUM_SERVICES.same_day.timeline, 
          price: Math.max(sameDayMin, baseShippingRate) 
        }
      ] : []),
      ...(isNairobi ? [
        { 
          id: 'onehour', 
          type: 'instant', 
          label: PREMIUM_SERVICES.one_hour.label, 
          timeline: PREMIUM_SERVICES.one_hour.timeline, 
          price: Math.max(oneHourMin, baseShippingRate)
        }
      ] : [])
    ];
  }, [isDigitalOnly, baseShippingRate, selectedZoneId, storeSettings]);

  // Safe fallback to 'standard' if the selected rate ID is not in the generated list
  const selectedSpeed = useMemo(() => {
    return deliverySpeedOptions.find(o => o.id === selectedRateId) || deliverySpeedOptions[0];
  }, [deliverySpeedOptions, selectedRateId]);

  const shippingCost = selectedSpeed ? selectedSpeed.price : 0;

  // Price Calculations
  const subtotal = useMemo(() => items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0), [items]);

  const discountAmount = useMemo(() => {
    if (!activeCoupon) return 0;
    // Map both old 'type' and new 'discount_type' fields for compatibility
    const type = activeCoupon.discount_type || activeCoupon.type;
    const value = activeCoupon.discount_value || activeCoupon.value;
    
    if (type === 'percentage') {
      return (subtotal * value) / 100;
    } else {
      return value;
    }
  }, [activeCoupon, subtotal]);

  const finalTotal = useMemo(() => Math.max(0, subtotal - discountAmount + shippingCost), [subtotal, discountAmount, shippingCost]);



  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      toast.error('Please sign in to continue checkout');
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [user, loading, navigate]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !completedDownloads) {
      navigate('/store');
    }
  }, [items, navigate, completedDownloads]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const resp = await fetch(`${STORAGE_WORKER_URL}/api/coupons/validate?code=${couponCode.trim().toUpperCase()}`);
      const data = await resp.json();
      if (data.success) {
        if (data.min_spend && subtotal < data.min_spend) {
          toast.error(`Minimum spend for this coupon is KES ${data.min_spend.toLocaleString()}`);
          return;
        }
        setActiveCoupon(data);
        toast.success(`Coupon "${data.code}" applied!`);
      } else {
        toast.error(data.error || 'Invalid coupon code');
        setActiveCoupon(null);
      }
    } catch (e) {
      toast.error('Failed to validate coupon');
      setActiveCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleZoneChange = (zoneId: string) => {
    const zone = INITIAL_SHIPPING_ZONES.find(z => z.id === zoneId);
    if (zone) {
      setSelectedZoneId(zoneId);
      setSelectedRateId(zone.rates[0].id);
    }
  };

  // When a town is selected from the dropdown, auto-map it to the correct zone
  const handleTownSelect = (town: string) => {
    setSelectedTown(town);
    if (!town) return;

    const zoneByTown = TOWN_TO_ZONE_MAP[town.toLowerCase()];
    // County-level fallbacks for towns not in TOWN_TO_ZONE_MAP
    const county = selectedCounty;
    let zoneId = zoneByTown;
    if (!zoneId) {
      if (county === 'Nairobi') zoneId = 'zone1';
      else if (['Kiambu', 'Machakos', 'Kajiado'].includes(county)) zoneId = 'zone2';
      else if (['Nakuru', 'Kisumu', 'Uasin Gishu', 'Laikipia', 'Nyandarua'].includes(county)) zoneId = 'zone3';
      else if (['Nyeri', 'Kirinyaga', 'Murang\'a', 'Embu', 'Meru', 'Kericho', 'Kakamega'].includes(county)) zoneId = 'zone4';
      else if (['Mombasa', 'Kilifi', 'Kwale', 'Tana River', 'Lamu'].includes(county)) zoneId = 'zone6';
      else zoneId = 'zone5';
    }
    handleZoneChange(zoneId);
  };

  const onSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      const orderData = {
        customer_id: user?.id,
        customer_name: data.name,
        customer_email: data.email,
        customer_phone: data.phone,
        payment_type: paymentType,
        installments_count: paymentType === 'lipa_pole_pole' ? lipaDuration : null,
        ...(isDigitalOnly ? {} : {
          shipping_county: data.county,
          shipping_town: selectedTown || data.town,
          shipping_landmark: data.landmark,
          shipping_details: data.buildingDetails,
          shipping_address: `${data.buildingDetails}, ${data.landmark}, ${selectedTown || data.town}, ${data.county}`,
          shipping_provider: selectedZone.name,
          shipping_method: selectedSpeed.label,
          shipping_cost: shippingCost,
          whatsapp_updates: data.whatsappUpdates,
          delivery_time: data.deliveryTime,
        }),
        items: items.map((item: any) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          type: item.type || 'physical',
          digital_file_url: item.digitalFileUrl || null,
          download_password: item.downloadPassword || null,
        })),
        order_type: isDigitalOnly ? 'digital' : (hasDigital ? 'mixed' : 'physical'),
        payment_method: 'Paystack',
        total_amount: finalTotal,
        coupon_code: activeCoupon?.code || null,
        discount_amount: discountAmount,
        order_notes: data.orderNotes || '',
        status: 'processing',
        created_at: new Date().toISOString(),
      };

      const response = await fetch(`${STORAGE_WORKER_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }

      const result = await response.json();
      if (!result.success) {
        toast.error('Failed to place order: ' + (result.error || 'Unknown error'));
        return;
      }

      clearCart();

      // Redirect to Paystack instead of using Popup
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        toast.error('Payment initialization failed: Missing authorization URL');
        setIsProcessing(false);
      }

    } catch (err: any) {
      setIsProcessing(false);
      const errorMessage = err.message || 'Error placing order. Please try again.';
      toast.error(errorMessage);
      console.error('Order error:', err);
    }
  };

  // Show digital delivery confirmation screen
  if (completedDownloads) {
    return <DigitalDelivery downloads={completedDownloads} email={completedEmail} />;
  }

  if (loading || !user) {
    return (
      <div className="bg-[#0B0B0F] min-h-screen flex items-center justify-center p-8 mt-16">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full bg-[#0B0B0F] border border-white/10 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none transition-all placeholder:text-gray-700 font-medium text-white";

  return (
    <div className="bg-[#0B0B0F] min-h-screen py-16 px-4 sm:px-6 lg:px-8 text-white mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 bg-brand-purple/10 rounded-2xl border border-brand-purple/20">
            <ShieldCheck className="h-8 w-8 text-brand-purple" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase">Secure Checkout</h2>
            <p className="text-gray-500 font-medium">
              {isDigitalOnly ? 'Digital delivery — instant access after payment' : 'Review your order and shipping details'}
            </p>
          </div>
        </div>

        {/* Cart type banner */}
        {isDigitalOnly && (
          <div className="mb-8 p-5 bg-brand-cyan/5 border border-brand-cyan/20 rounded-3xl flex items-center gap-4">
            <Zap size={24} className="text-brand-cyan flex-shrink-0" />
            <div>
              <p className="font-black text-white uppercase text-sm tracking-widest">Digital Order — Instant Delivery</p>
              <p className="text-[10px] text-gray-500 font-bold mt-0.5">No shipping required. Download links will appear immediately after payment.</p>
            </div>
          </div>
        )}
        {!isDigitalOnly && hasDigital && (
          <div className="mb-8 p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4">
            <Package size={24} className="text-brand-purple flex-shrink-0" />
            <div>
              <p className="font-black text-white uppercase text-sm tracking-widest">Mixed Order</p>
              <p className="text-[10px] text-gray-500 font-bold mt-0.5">Physical items will be shipped. Digital items can be downloaded from your account after payment.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Form */}
          <div className="lg:col-span-8 space-y-8">
            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

              {/* Contact / Billing */}
              <div className="bg-[#15151A] rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center text-brand-purple border border-brand-purple/20">
                    <MapPin size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight uppercase">
                    {isDigitalOnly ? 'Billing Information' : 'Shipping Information'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                    <input type="text" {...register('name', { required: 'Full name is required' })} placeholder="Enter your full name" className={inputCls} />
                    {errors.name && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.name.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                    <input type="email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} placeholder="your@email.com" className={inputCls} />
                    {errors.email && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.email.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number (M-PESA)</label>
                    <input type="tel" {...register('phone', {
                      required: 'Phone number is required',
                      pattern: { value: /^(?:254|\+254|0)?(7|1)(?:(?:[0-9][0-9])|(?:[0-9][0-9]))[0-9]{6}$/, message: 'Invalid Kenyan phone number (e.g. 07xx xxx xxx)' }
                    })} placeholder="07xx xxx xxx" className={inputCls} />
                    {errors.phone && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.phone.message as string}</span>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Order Notes (optional)</label>
                    <input type="text" {...register('orderNotes')} placeholder="e.g. Leave at security, gift message..." className={inputCls} />
                  </div>

                  {/* Physical shipping fields */}
                  {!isDigitalOnly && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Select County</label>
                        <div className="relative">
                          <select {...register('county', { required: 'County is required' })} className={inputCls + ' appearance-none cursor-pointer'}>
                            <option value="" className="bg-[#15151A]">Select your county</option>
                            {KENYAN_COUNTIES.map(county => (
                              <option key={county} value={county} className="bg-[#15151A]">{county}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                        {errors.county && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.county.message as string}</span>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Town / City / Area</label>
                        {availableTowns.length > 0 ? (
                          <div className="relative">
                            <select
                              value={selectedTown}
                              onChange={(e) => handleTownSelect(e.target.value)}
                              className={inputCls + ' appearance-none cursor-pointer'}
                            >
                              <option value="" className="bg-[#15151A]">Select area in {selectedCounty}...</option>
                              {availableTowns.map(t => (
                                <option key={t} value={t} className="bg-[#15151A]">{t}</option>
                              ))}
                            </select>
                            <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={selectedTown}
                            onChange={(e) => handleTownSelect(e.target.value)}
                            placeholder={selectedCounty ? `Enter your area in ${selectedCounty}` : 'Select a county first'}
                            className={inputCls}
                          />
                        )}
                        {!selectedTown && selectedCounty && <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest pl-4">Please select your area</span>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Nearest Landmark / Building</label>
                        <input type="text" {...register('landmark', { required: 'Landmark is required' })} placeholder="e.g. Opposite Shell Petrol Station" className={inputCls} />
                        {errors.landmark && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.landmark.message as string}</span>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Apartment / House / Office Number</label>
                        <input type="text" {...register('buildingDetails', { required: 'Details are required' })} placeholder="e.g. Garden Estate, Block B, House 4" className={inputCls} />
                        {errors.buildingDetails && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.buildingDetails.message as string}</span>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Preferred Delivery Time</label>
                        <div className="relative">
                          <select {...register('deliveryTime')} className={inputCls + ' appearance-none cursor-pointer'}>
                            <option value="any" className="bg-[#15151A]">Anytime (8am - 6pm)</option>
                            <option value="morning" className="bg-[#15151A]">Morning (9am - 12pm)</option>
                            <option value="afternoon" className="bg-[#15151A]">Afternoon (2pm - 5pm)</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center gap-3 p-4 bg-brand-purple/5 rounded-2xl border border-brand-purple/10">
                        <input type="checkbox" id="whatsappUpdates" {...register('whatsappUpdates')} className="w-5 h-5 rounded border-white/10 bg-black/40 text-brand-purple focus:ring-brand-purple" />
                        <label htmlFor="whatsappUpdates" className="text-sm font-bold text-gray-300 flex items-center gap-2 cursor-pointer">
                          <MessageSquare size={16} className="text-brand-purple" />
                          Send my tracking updates to WhatsApp
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Shipping Method — Physical only */}
              {!isDigitalOnly && (
                <div className="bg-[#15151A] rounded-[2.5rem] border border-white/5 p-8 space-y-8 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-cyan/10 rounded-xl flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                      <Truck size={20} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight uppercase">Shipping Method</h3>
                  </div>

                  {/* Delivery region — auto-set from town selection, shown as read-only info */}
                  {selectedTown && (
                    <div className="p-4 bg-brand-purple/5 border border-brand-purple/20 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Delivery Region</p>
                        <p className="font-black text-white text-sm">{INITIAL_SHIPPING_ZONES.find(z => z.id === selectedZoneId)?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-brand-purple" />
                        <span className="text-[10px] font-black text-brand-purple uppercase tracking-widest">Auto-Detected</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Select Delivery Speed</label>
                    <div className="grid grid-cols-1 gap-4">
                      {deliverySpeedOptions.map((rate) => (
                        <button key={rate.id} type="button" onClick={() => setSelectedRateId(rate.id)}
                          className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all duration-300 ${selectedRateId === rate.id ? 'border-brand-purple bg-brand-purple/5 ring-4 ring-brand-purple/10' : 'border-white/5 bg-[#0B0B0F] hover:border-white/20'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectedRateId === rate.id ? 'bg-brand-purple text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>
                              <Truck size={24} />
                            </div>
                            <div>
                              <p className="font-black text-white tracking-tight leading-none mb-1">{rate.label}</p>
                              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{rate.timeline}</p>
                            </div>
                          </div>
                          <span className="text-xl font-black text-brand-cyan">KES {rate.price.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment */}
              <div className="bg-[#15151A] rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight uppercase">Payment Platform</h3>
                </div>

                {/* Payment method toggle — only for physical/mixed orders */}
                {!isDigitalOnly ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" onClick={() => setPaymentType('pay_full')} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${paymentType === 'pay_full' ? 'border-brand-purple bg-brand-purple/10 text-white shadow-lg shadow-brand-purple/20' : 'border-white/5 bg-[#0B0B0F] text-gray-500 hover:border-white/20'}`}>
                        <span className="font-black uppercase tracking-widest text-xs">Pay in Full</span>
                        <span className="text-[10px] font-bold">100% Secure Checkout</span>
                      </button>
                      <button type="button" onClick={() => setPaymentType('lipa_pole_pole')} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${paymentType === 'lipa_pole_pole' ? 'border-brand-cyan bg-brand-cyan/10 text-white shadow-lg shadow-brand-cyan/20' : 'border-white/5 bg-[#0B0B0F] text-gray-500 hover:border-white/20'}`}>
                        <span className="font-black uppercase tracking-widest text-xs">Lipa Pole Pole</span>
                        <span className="text-[10px] font-bold">20% Deposit Today</span>
                      </button>
                    </div>

                    {paymentType === 'lipa_pole_pole' && (
                      <div className="p-5 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Select Installment Duration</label>
                        <div className="relative">
                          <select value={lipaDuration} onChange={(e) => setLipaDuration(Number(e.target.value))} className={inputCls + ' appearance-none cursor-pointer bg-[#0B0B0F]/50'}>
                            <option value="2" className="bg-[#15151A]">2 Months (Deposit + 2 Payments)</option>
                            <option value="3" className="bg-[#15151A]">3 Months (Deposit + 3 Payments)</option>
                            <option value="4" className="bg-[#15151A]">4 Months (Deposit + 4 Payments)</option>
                            <option value="5" className="bg-[#15151A]">5 Months (Deposit + 5 Payments)</option>
                            <option value="6" className="bg-[#15151A]">6 Months (Deposit + 6 Payments)</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-gray-400 bg-black/20 p-4 rounded-xl border border-white/5">
                          <span>Deposit Due Today (20%)</span>
                          <span className="text-brand-cyan font-black text-lg tracking-tight">KES {Math.ceil(finalTotal * 0.2).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Digital orders always pay in full */
                  <div className="p-4 bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl flex items-center gap-3">
                    <Zap size={16} className="text-brand-cyan flex-shrink-0" />
                    <p className="text-xs text-gray-400 font-bold">Digital products must be paid in full for instant delivery.</p>
                  </div>
                )}

                <div className="p-6 bg-[#0B0B0F] rounded-3xl border border-brand-purple/30 flex items-center gap-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-[60px] translate-x-12 -translate-y-12" />
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl z-10">
                    <img src="https://paystack.com/assets/img/logos/merchants/paystack.png" alt="Paystack" className="w-12 h-12 grayscale group-hover:grayscale-0 transition-all duration-500" />
                  </div>
                  <div className="flex-1 z-10">
                    <p className="font-black text-white tracking-tight uppercase mb-1">Paystack Global</p>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.1em]">Instant activation via M-PESA, Visa, Mastercard</p>
                  </div>
                  <div className="flex items-center gap-2 z-10 pr-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active</span>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#15151A] rounded-[2.5rem] border border-white/5 p-8 sticky top-28 shadow-2xl space-y-8">
              <h3 className="text-xl font-black tracking-tight uppercase">Order Summary</h3>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item: any) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-[#0B0B0F] rounded-3xl border border-white/5 group">
                    <div className="h-16 w-16 bg-[#15151A] rounded-2xl overflow-hidden border border-white/5 flex-shrink-0">
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                        : <div className="h-full w-full flex items-center justify-center text-gray-600"><Download size={20} /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-bold">Qty {item.quantity}</span>
                          {item.type === 'digital' && (
                            <span className="text-[9px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Digital</span>
                          )}
                        </div>
                        <span className="text-sm font-black text-brand-purple">KES {(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
 
              {/* Coupon Code Section */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Promo Code</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    id="checkout-coupon-code"
                    name="coupon_code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="ENTER CODE"
                    autoComplete="off"
                    className="flex-1 bg-[#0B0B0F] border border-white/10 rounded-2xl py-3 px-6 focus:ring-2 focus:ring-brand-purple focus:border-transparent outline-none transition-all placeholder:text-gray-700 font-bold text-white text-xs"
                    disabled={activeCoupon || isValidatingCoupon}
                  />
                  <button
                    type="button"
                    onClick={activeCoupon ? () => { setActiveCoupon(null); setCouponCode(''); } : applyCoupon}
                    disabled={isValidatingCoupon || (!couponCode && !activeCoupon)}
                    className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                      activeCoupon 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                        : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                    } disabled:opacity-50`}
                  >
                    {isValidatingCoupon ? '...' : (activeCoupon ? 'Remove' : 'Apply')}
                  </button>
                </div>
                {activeCoupon && (
                  <div className="flex items-center gap-2 px-2 text-green-500 animate-in fade-in slide-in-from-top-1">
                    <Check size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {activeCoupon.code} applied (-KES {discountAmount.toLocaleString()})
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-6 border-t border-white/5">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold text-gray-400">KES {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Shipping</span>
                  <span className={`text-sm font-bold ${isDigitalOnly ? 'text-green-500' : 'text-brand-cyan'}`}>
                    {isDigitalOnly ? 'FREE' : `KES ${shippingCost.toLocaleString()}`}
                  </span>
                </div>
                {activeCoupon && (
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-black text-green-600 uppercase tracking-widest">Discount</span>
                    <span className="text-sm font-bold text-green-500">- KES {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-6 bg-brand-purple/10 rounded-[2rem] border border-brand-purple/20 shadow-inner">
                  <span className="text-sm font-black text-white uppercase tracking-widest leading-none">
                    {paymentType === 'lipa_pole_pole' ? 'Deposit Due Now' : 'Total Payment'}
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white tracking-tighter leading-none">
                      KES {paymentType === 'lipa_pole_pole' ? Math.ceil(finalTotal * 0.2).toLocaleString() : finalTotal.toLocaleString()}
                    </span>
                    {paymentType === 'lipa_pole_pole' && (
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                        Full Price: KES {finalTotal.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className="w-full bg-brand-purple hover:bg-purple-600 text-white rounded-[2rem] py-6 flex items-center justify-center text-xl font-black shadow-2xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em]"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  isDigitalOnly
                    ? <><Zap size={20} className="mr-2" /> Pay & Download · KES {paymentType === 'lipa_pole_pole' ? Math.ceil(finalTotal * 0.2).toLocaleString() : finalTotal.toLocaleString()}</>
                    : `Pay KES ${paymentType === 'lipa_pole_pole' ? Math.ceil(finalTotal * 0.2).toLocaleString() : finalTotal.toLocaleString()}`
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600 font-black uppercase tracking-[0.1em]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-green-500" /> SSL Encrypted
                </div>
                <div className="w-px h-3 bg-white/5" />
                <div className="flex items-center gap-1.5">
                  <CreditCard size={14} className="text-brand-purple" /> Secure Payment
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
