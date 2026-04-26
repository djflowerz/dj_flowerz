import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const paymentRef = queryParams.get('reference') || queryParams.get('trxref');

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
  const hasImportItems = useMemo(() => (items || []).some((i: any) => 
    i.shippingTier === 'air' || i.shippingTier === 'sea' || i.shipping_tier === 'air' || i.shipping_tier === 'sea'
  ), [items]);

  // Logic for Friday Shipments
  const shippingInfo = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const hour = now.getHours();
    
    // Dispatch is every Friday. 
    // Orders before Friday 12:00 PM (noon) ship THIS Friday.
    // Orders after Friday 12:00 PM ship NEXT Friday.
    let daysUntilDispatch = (5 - day + 7) % 7;
    if (day === 5 && hour >= 12) {
      daysUntilDispatch = 7;
    }
    
    const dispatchDate = new Date(now);
    dispatchDate.setDate(now.getDate() + daysUntilDispatch);
    
    // Calculate Arrival based on tier
    const tier = items.find(i => i.shippingTier === 'sea' || i.shipping_tier === 'sea') ? 'sea' : 
                 (items.find(i => i.shippingTier === 'air' || i.shipping_tier === 'air') ? 'air' : 'local');
    
    let minDays = 1, maxDays = 3;
    if (tier === 'air') { minDays = 7; maxDays = 14; }
    else if (tier === 'sea') { minDays = 30; maxDays = 45; }
    
    const minArrival = new Date(dispatchDate);
    minArrival.setDate(dispatchDate.getDate() + minDays);
    
    const maxArrival = new Date(dispatchDate);
    maxArrival.setDate(dispatchDate.getDate() + maxDays);

    return {
      dispatchDate: dispatchDate.toLocaleDateString('en-KE', { weekday: 'long', month: 'short', day: 'numeric' }),
      arrivalRange: `${minArrival.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })} - ${maxArrival.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      tier
    };
  }, [items]);

  const selectedCounty = watch('county');
  const [selectedTown, setSelectedTown] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>(INITIAL_SHIPPING_ZONES[0].id);
  const [selectedRateId, setSelectedRateId] = useState<string>(INITIAL_SHIPPING_ZONES[0].rates[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedDownloads, setCompletedDownloads] = useState<DownloadItem[] | null>(null);
  const [completedEmail, setCompletedEmail] = useState('');
  const [paymentType, setPaymentType] = useState<'pay_full' | 'lipa_pole_pole'>('pay_full');
  const [lipaDuration, setLipaDuration] = useState<number>(3);
  const [currentStep, setCurrentStep] = useState(1);
  const maxSteps = isDigitalOnly ? 2 : 3;

  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<any>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

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
    if (isDigitalOnly || !items) return 0;
    return items.reduce((sum, item: any) => {
      // Default weight to 0.5kg if not specified for physical products
      // Ensure we parse the weight as a number
      const itemWeight = Number(item.weight);
      const weight = !isNaN(itemWeight) ? itemWeight : (item.type === 'physical' ? 0.5 : 0);
      const quantity = Number(item.quantity) || 1;
      return sum + (weight * quantity);
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
    const baseWeight = Number(base_weight) || 0;
    const incrementPrice = Number(increment_price) || 0;
    
    // Weight-based calculation
    const extraWeight = Math.max(0, (Number(totalWeight) || 0) - baseWeight);
    const extraCost = Math.ceil(extraWeight) * incrementPrice;
    
    const total = baseRate + surcharge + extraCost;
    return isNaN(total) ? 0 : total;
  }, [isDigitalOnly, isHardshipArea, totalWeight, storeSettings]);

  // DJ Flowerz Regional Shipping Matrix (Flat Fees)
  const shippingCost = useMemo(() => {
    if (isDigitalOnly || !items.length) return 0;
    
    // Check if any physical item belongs to DJ Flowerz (default true)
    const hasDJFlowerzItems = items.some((i: any) => 
      (i.type === 'physical' || i.requiresShipping) && (!i.vendor || i.vendor === 'DJ Flowerz')
    );

    if (!hasDJFlowerzItems) return 0;

    // Nairobi vs Towns vs Remote
    if (selectedZoneId === 'zone1') return 300; // Nairobi
    if (selectedZoneId === 'zone5') return 1000; // Remote/Hardship
    if (selectedZoneId) return 600; // All other towns
    
    return 300; // Fallback
  }, [isDigitalOnly, items, selectedZoneId]);

  // Total Patience Points
  const totalPoints = useMemo(() => {
    return items.reduce((sum: number, item: any) => {
      const tier = item.shippingTier || 'local';
      const points = tier === 'sea' ? 150 : (tier === 'air' ? 50 : 0);
      return sum + (points * (item.quantity || 1));
    }, 0);
  }, [items]);

  // Price Calculations
  const subtotal = useMemo(() => items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0), [items]);

  const discountAmount = useMemo(() => {
    if (!activeCoupon) return 0;
    // Map both old 'type' and new 'discount_type' fields for compatibility
    const type = activeCoupon.discount_type || activeCoupon.type;
    const value = Number(activeCoupon.discount_value || activeCoupon.value) || 0;
    
    if (type === 'percentage') {
      return (subtotal * value) / 100;
    } else {
      return value;
    }
  }, [activeCoupon, subtotal]);

  const finalTotal = useMemo(() => {
    const total = (Number(subtotal) || 0) - (Number(discountAmount) || 0) + (Number(shippingCost) || 0);
    return Math.max(0, isNaN(total) ? 0 : total);
  }, [subtotal, discountAmount, shippingCost]);



  // Redirect if not authenticated (Store/Subscription strictly require auth)
  useEffect(() => {
    if (!loading && !user && !paymentRef) {
      toast.error('Please sign in to continue checkout');
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [user, loading, navigate, paymentRef]);


  // Redirect if cart is empty
  useEffect(() => {
    if ((items || []).length === 0 && !completedDownloads) {
      navigate('/store');
    }
  }, [items, navigate, completedDownloads]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    // Block coupons for 7-Day Access plan to protect pricing integrity
    const hasWeeklyPlan = (items || []).some((i: any) => 
        i.type === 'subscription' && (i.price === 200 || i.id === 'weekly' || (i.name && i.name.toLowerCase().includes('7-day')))
    );

    if (hasWeeklyPlan) {
      toast.error("Coupons cannot be applied to the 7-Day Access plan.");
      setCouponCode('');
      return;
    }

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
    if (!data) return;
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
          shipping_provider: "Local Distribution",
          shipping_method: "Regional Dispatch",
          shipping_cost: shippingCost,
          patience_points: totalPoints,
          whatsapp_updates: data.whatsappUpdates,
          delivery_time: data.deliveryTime,
        }),
        items: items.map((item: any) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price,
          type: item.type || 'physical',
          shipping_tier: item.shippingTier || 'local',
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
  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = watch();
    
    if (currentStep === 1) {
      if (!data.name || !data.email || !data.phone) {
        toast.error("Please fill in all contact details");
        return;
      }
      if (isDigitalOnly) setCurrentStep(3);
      else setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!data.county || !selectedTown || !data.landmark || !data.buildingDetails) {
        toast.error("Please fill in shipping details");
        return;
      }
      setCurrentStep(3);
    }
  };

  const currentProgress = (currentStep / 3) * 100;
  const showBackButton = currentStep > 1;

  const handleBack = () => {
    if (currentStep === 3 && isDigitalOnly) setCurrentStep(1);
    else setCurrentStep(prev => prev - 1);
  };

  // Show digital delivery confirmation screen OR payment success screen
  if (completedDownloads || paymentRef) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-8 mt-16">
        <div className="max-w-md w-full text-center space-y-8 bg-[#15151A] p-12 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-purple to-brand-cyan" />
          
          <div className="w-24 h-24 mx-auto bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30">
            <Check size={48} className="text-green-500 animate-bounce" />
          </div>
          
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-white mb-2">Order Confirmed</h1>
            <p className="text-gray-400 text-sm">
              Your payment has been successfully processed. 
              {paymentRef && <span className="block mt-2 font-mono text-[10px] opacity-50">REF: {paymentRef}</span>}
            </p>
          </div>

          <div className="space-y-4 pt-6">
            <button 
              onClick={() => navigate('/account')}
              className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} /> View My Content
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
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

        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex justify-between mb-4 px-2">
            {[
              { id: 1, label: 'Contact', icon: MapPin },
              { id: 2, label: 'Shipping', icon: Truck, hidden: isDigitalOnly },
              { id: 3, label: 'Review & Pay', icon: CreditCard }
            ].filter(s => !s.hidden).map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center gap-2 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                  currentStep >= s.id 
                    ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20' 
                    : 'bg-white/5 border-white/10 text-gray-600'
                }`}>
                  <s.icon size={20} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                  currentStep >= s.id ? 'text-white' : 'text-gray-600'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 blur-[0.5px]">
             <div 
               className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(147,51,234,0.5)]"
               style={{ width: `${currentProgress}%` }}
             />
          </div>
        </div>

        {/* Cart type banner */}
        {isDigitalOnly && (
          <div className="mb-8 p-5 bg-brand-cyan/5 border border-brand-cyan/20 rounded-3xl flex items-center gap-4 backdrop-blur-md">
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

              {/* Step 1: Contact / Billing */}
              {currentStep === 1 && (
                <div className="bg-[#15151A]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-purple/10 rounded-xl flex items-center justify-center text-brand-purple border border-brand-purple/20">
                      <MapPin size={20} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight uppercase">
                      Contact Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                      <input type="text" id="checkout-name" {...register('name', { required: 'Full name is required' })} placeholder="Enter your full name" className={inputCls} />
                      {errors.name && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.name.message as string}</span>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                      <input type="email" id="checkout-email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } })} placeholder="your@email.com" className={inputCls} />
                      {errors.email && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.email.message as string}</span>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number (M-PESA)</label>
                      <input type="tel" id="checkout-phone" {...register('phone', {
                        required: 'Phone number is required',
                        pattern: { value: /^(?:254|\+254|0)?(7|1)(?:(?:[0-9][0-9])|(?:[0-9][0-9]))[0-9]{6}$/, message: 'Invalid Kenyan phone number (e.g. 07xx xxx xxx)' }
                      })} placeholder="07xx xxx xxx" className={inputCls} />
                      {errors.phone && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest pl-4">{errors.phone.message as string}</span>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Order Notes (optional)</label>
                      <input type="text" id="checkout-notes" {...register('orderNotes')} placeholder="e.g. Leave at security, gift message..." className={inputCls} />
                    </div>
                  </div>
                  
                  <button type="button" onClick={handleNext} className="w-full bg-brand-purple py-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all mt-4">
                    Continue to {isDigitalOnly ? 'Payment' : 'Shipping'}
                  </button>
                </div>
              )}

              {/* Step 2: Shipping Method — Physical only */}
              {currentStep === 2 && !isDigitalOnly && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-[#15151A]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-cyan/10 rounded-xl flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                          <Truck size={20} />
                        </div>
                        <h3 className="text-xl font-black tracking-tight uppercase">Shipping Details</h3>
                      </div>
                      <button type="button" onClick={handleBack} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition">
                        ← Back
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Select County</label>
                        <div className="relative">
                          <select id="checkout-county" {...register('county', { required: 'County is required' })} className={inputCls + ' appearance-none cursor-pointer'}>
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
                        <div className="relative">
                          <select
                            id="checkout-town-select"
                            value={selectedTown}
                            onChange={(e) => handleTownSelect(e.target.value)}
                            className={inputCls + ' appearance-none cursor-pointer'}
                          >
                            <option value="" className="bg-[#15151A]">Select area in {selectedCounty || 'county'}...</option>
                            {availableTowns.map(t => (
                              <option key={t} value={t} className="bg-[#15151A]">{t}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Nearest Landmark</label>
                        <input type="text" id="checkout-landmark" {...register('landmark', { required: 'Landmark is required' })} placeholder="e.g. Near Shell Station" className={inputCls} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">House / Building Details</label>
                        <input type="text" id="checkout-building" {...register('buildingDetails', { required: 'Building is required' })} placeholder="e.g. Block A, Hse 4" className={inputCls} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#15151A]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-cyan/10 rounded-xl flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                        <Zap size={20} />
                      </div>
                      <h3 className="text-xl font-black tracking-tight uppercase">Confirm Regional Delivery</h3>
                    </div>

                    <div className="p-6 rounded-3xl border-2 border-brand-purple bg-brand-purple/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-purple flex items-center justify-center text-white shadow-lg">
                                <Truck size={24} />
                            </div>
                            <div>
                                <p className="font-black text-white tracking-tight leading-none mb-1">
                                    {selectedZoneId === 'zone1' ? 'Nairobi Dispatch' : 'Upcountry Regional Dispatch'}
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Delivered via Sacco / Local Courier (1-3 Days)
                                </p>
                            </div>
                        </div>
                        <span className="text-xl font-black text-brand-cyan">KES {shippingCost.toLocaleString()}</span>
                    </div>

                    <div className="flex gap-4 mt-6">
                      <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 bg-white/5 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                        Back
                      </button>
                      <button type="button" onClick={handleNext} className="flex-[2] bg-brand-purple py-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-brand-purple/20 transition-all transform hover:-translate-y-1">
                        Continue to Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-[#15151A]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 border border-green-500/20">
                        <CreditCard size={20} />
                      </div>
                      <h3 className="text-xl font-black tracking-tight uppercase">Finalize Payment</h3>
                    </div>

                    {!isDigitalOnly && (
                      <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => setPaymentType('pay_full')} className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${paymentType === 'pay_full' ? 'border-brand-purple bg-brand-purple/10 text-white shadow-lg' : 'border-white/5 bg-[#0B0B0F] text-gray-500 hover:border-white/20'}`}>
                          <span className="font-black uppercase tracking-widest text-xs">Full Payment</span>
                          <span className="text-[10px] font-bold">100% Secure</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setPaymentType('lipa_pole_pole');
                          }} 
                          className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${paymentType === 'lipa_pole_pole' ? 'border-brand-cyan bg-brand-cyan/10 text-white shadow-lg' : 'border-white/5 bg-[#0B0B0F] text-gray-500 hover:border-white/20'}`}
                        >
                          <span className="font-black uppercase tracking-widest text-xs">Installments</span>
                          <span className="text-[10px] font-bold">20% Deposit</span>
                        </button>
                      </div>
                    )}

                    {!isDigitalOnly && (
                      <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-3">
                        <div className="flex items-center gap-3 text-brand-cyan">
                          <Truck size={18} />
                          <h4 className="font-black uppercase text-xs tracking-widest">Delivery Estimate</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Dispatch Friday</p>
                            <p className="font-bold text-sm text-white">{shippingInfo.dispatchDate}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Expected Arrival</p>
                            <p className="font-bold text-sm text-brand-cyan">{shippingInfo.arrivalRange}</p>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-600 font-medium italic">
                          * Orders made by Friday 12:00 PM ship the same week. Later orders shift to the next Friday cycle.
                        </p>
                      </div>
                    )}

                    {paymentType === 'lipa_pole_pole' && (
                      <div className="p-6 bg-brand-cyan/5 border border-brand-cyan/20 rounded-3xl space-y-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Duration</label>
                        <select id="checkout-lipa-duration" value={lipaDuration} onChange={(e) => setLipaDuration(Number(e.target.value))} className={inputCls}>
                          <option value="2">2 Months (35% Monthly)</option>
                          <option value="3">3 Months (26.6% Monthly)</option>
                          <option value="4">4 Months (20% Monthly)</option>
                        </select>
                      </div>
                    )}

                    <div className="p-6 bg-[#0B0B0F] rounded-3xl border border-brand-purple/30 flex items-center gap-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-[60px] translate-x-12 -translate-y-12" />
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl z-10">
                        <img loading="lazy" src="https://paystack.com/assets/img/logos/merchants/paystack.png" alt="Paystack" className="w-12 h-12 grayscale group-hover:grayscale-0 transition-all duration-500" />
                      </div>
                      <div className="flex-1 z-10">
                        <p className="font-black text-white tracking-tight uppercase mb-1">Paystack Checkout</p>
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.1em]">M-PESA / Visa / Mastercard</p>
                      </div>
                      <div className="flex items-center gap-2 z-10">
                        <ShieldCheck size={16} className="text-green-500" />
                      </div>
                    </div>

                    {/* Coupon Section */}
                    <div className="p-6 bg-[#0B0B0F] rounded-3xl border border-white/5 space-y-4">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Have a Coupon?</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="ENTER CODE"
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-widest focus:border-brand-purple outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={isValidatingCoupon || !couponCode}
                          className="bg-white/5 hover:bg-white/10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                          {isValidatingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                      {activeCoupon && (
                        <div className="flex items-center justify-between text-xs font-bold text-green-500 bg-green-500/5 p-3 rounded-xl border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <Zap size={14} />
                            <span>Coupon "{activeCoupon.code}" Applied!</span>
                          </div>
                          <button type="button" onClick={() => { setActiveCoupon(null); setCouponCode(''); }} className="text-red-500 hover:text-red-400">Remove</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button type="button" onClick={() => setCurrentStep(isDigitalOnly ? 1 : 2)} className="flex-1 bg-white/5 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                      Back
                    </button>
                    <button type="submit" disabled={isProcessing} className="flex-[2] bg-brand-purple py-5 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-brand-purple/30 transition-all text-xl">
                      {isProcessing ? 'Processing...' : 'Pay with Paystack'}
                    </button>
                  </div>
                </div>
              )}
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
                        ? <img loading="lazy" src={item.image_url} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
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
                {totalPoints > 0 && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap size={16} className="text-emerald-500" />
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Patience Rewards</p>
                        <p className="text-[8px] font-bold text-emerald-500 uppercase">You'll earn {totalPoints} Points</p>
                      </div>
                    </div>
                    <Check size={16} className="text-emerald-500" />
                  </div>
                )}
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
                    onClick={activeCoupon ? () => { setActiveCoupon(null); setCouponCode(''); } : handleApplyCoupon}
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
