import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { 
  Filter, Search, X, Grid, List, Headphones, Disc, Laptop, 
  Smartphone, Battery, Database, Music, Shirt, ShoppingCart, 
  Star, ChevronLeft, ChevronRight, ChevronDown, Check, Copy, 
  Facebook, Twitter, Mail, MessageCircle, SlidersHorizontal, LayoutGrid,
  ShoppingBag, ArrowRight, Play, Flame, Zap, Clock, ShieldCheck, Truck
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { VirtuosoGrid } from 'react-virtuoso';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { STORAGE_WORKER_URL } from '../utils/r2';

// Simple countdown timer for sections
const CountdownTimer = ({ hours, minutes, seconds }: { hours: number, minutes: number, seconds: number }) => {
  const [timeLeft, setTimeLeft] = React.useState({ h: hours, m: minutes, s: seconds });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const format = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="flex gap-2">
      {[
        { val: format(timeLeft.h), label: 'H' },
        { val: format(timeLeft.m), label: 'M' },
        { val: format(timeLeft.s), label: 'S' }
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white">
            {item.val}
          </div>
          <span className="text-[8px] text-gray-500 font-bold mt-1 uppercase">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Default store settings (matches worker defaults)
const DEFAULT_STORE_SETTINGS = {
  heroLabel: 'Limited Time Launch Offer',
  heroTitle: 'Super Discount for early birds',
  promoCode: 'FREE256MAC',
  promoCodeEnabled: true,
  countdownHours: 12,
  countdownMinutes: 45,
  countdownSeconds: 30,
};

export default function Products() {
  const { products, productsLoading, addSubscriber } = useData();
  const { addToCart: addItem } = useCart();
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);

  // Fetch dynamic store hero settings
  useEffect(() => {
    fetch(`${STORAGE_WORKER_URL}/api/store/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStoreSettings({ ...DEFAULT_STORE_SETTINGS, ...data }); })
      .catch(() => {}); // Silently fall back to defaults
  }, []);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || 'All';
  const typeFilter = searchParams.get('type') || 'all';
  const priceFilter = searchParams.get('price') || 'All';
  const ratingFilter = searchParams.get('rating') || 'All';
  const sortOption = searchParams.get('sort') || 'newest';

  useEffect(() => {
    let result = [...products];

    // Filter by Search
    if (searchQuery) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by Category
    if (categoryFilter !== 'All') {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Filter by Type
    if (typeFilter !== 'all') {
      result = result.filter(p => {
        const cat = p.category || '';
        const isDigital = ['Software', 'Samples', 'digital'].includes(cat) || p.type === 'digital';
        return typeFilter === 'digital' ? isDigital : !isDigital;
      });
    }

    // Filter by Price
    if (priceFilter !== 'All') {
      if (priceFilter === 'Free') {
        result = result.filter(p => p.price === 0);
      } else if (priceFilter === 'Paid') {
        result = result.filter(p => p.price > 0);
      }
    }

    // Filter by Rating
    if (ratingFilter !== 'All') {
      const minRating = parseInt(ratingFilter);
      result = result.filter(p => (p.rating || 0) >= minRating);
    }

    // Sort
    if (sortOption === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'hot') {
      result.sort((a, b) => (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0));
    } else if (sortOption === 'top-rated') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortOption === 'most-reviewed') {
      result.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }
    // Default newest handled by DataContext or original order

    setFilteredProducts(result);
  }, [products, searchQuery, categoryFilter, typeFilter, priceFilter, ratingFilter, sortOption]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  if (productsLoading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
    </div>
  );

  const categoriesList = [
    'All', 
    'DJ Equipment', 
    'Audio Equipment', 
    'Headphones', 
    'Microphones', 
    'Computers & Devices', 
    'Studio & Production', 
    'Accessories', 
    'Lighting & Effects',
    'DJ Software',
    'Other'
  ];

  const categoryAssets: Record<string, { icon: React.ReactNode, img: string }> = {
    'All': { icon: <Grid size={24} />, img: 'https://images.unsplash.com/photo-1543967623-010453d4fba7?auto=format&fit=crop&q=80&w=200' },
    'DJ Equipment': { icon: <Disc size={24} />, img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=200' },
    'Audio Equipment': { icon: <Zap size={24} />, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=200' },
    'Headphones': { icon: <Headphones size={24} />, img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=200' },
    'Microphones': { icon: <Music size={24} />, img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=200' },
    'Computers & Devices': { icon: <Laptop size={24} />, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=200' },
    'Studio & Production': { icon: <Database size={24} />, img: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=200' },
    'Accessories': { icon: <Battery size={24} />, img: 'https://images.unsplash.com/photo-1619133300910-b964391cb4f0?auto=format&fit=crop&q=80&w=200' },
    'Lighting & Effects': { icon: <Flame size={24} />, img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=200' },
    'DJ Software': { icon: <LayoutGrid size={24} />, img: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=200' },
    'Other': { icon: <ShoppingBag size={24} />, img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200' }
  };

  const SidebarContent = () => (
    <div className="space-y-8">
      {/* Categories Widget */}
      <div className="bg-[#15151A]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 pb-2 border-b border-white/10">Categories</h3>
        <div className="space-y-3">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => updateFilter('category', cat)}
              className={`flex items-center justify-between w-full group transition-colors ${categoryFilter === cat ? 'text-brand-cyan' : 'text-gray-400 hover:text-white'}`}
            >
              <span className="text-xs font-bold">{cat}</span>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500 group-hover:bg-brand-cyan/20 group-hover:text-brand-cyan transition-colors">
                {products.filter(p => cat === 'All' ? true : p.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Filter Widget */}
      <div className="bg-[#15151A]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 pb-2 border-b border-white/10">Price Range</h3>
        <div className="space-y-3">
          {['All', 'Free', 'Paid'].map(price => (
            <button
              key={price}
              onClick={() => updateFilter('price', price)}
              className={`flex items-center gap-3 w-full group transition-colors ${priceFilter === price ? 'text-brand-cyan' : 'text-gray-400 hover:text-white'}`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${priceFilter === price ? 'bg-brand-cyan border-brand-cyan' : 'border-white/20'}`}>
                {priceFilter === price && <Check size={10} className="text-black" />}
              </div>
              <span className="text-xs font-bold">{price}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rating Filter Widget */}
      <div className="bg-[#15151A]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/5">
        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-6 pb-2 border-b border-white/10">Rating</h3>
        <div className="space-y-3">
          {['All', '5', '4', '3'].map(stars => (
            <button
              key={stars}
              onClick={() => updateFilter('rating', stars)}
              className={`flex items-center gap-3 w-full group transition-colors ${ratingFilter === stars ? 'text-brand-cyan' : 'text-gray-400 hover:text-white'}`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${ratingFilter === stars ? 'bg-brand-cyan border-brand-cyan' : 'border-white/20'}`}>
                {ratingFilter === stars && <Check size={10} className="text-black" />}
              </div>
              <div className="flex items-center gap-1">
                {stars === 'All' ? <span className="text-xs font-bold">All Ratings</span> : (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={10} fill={i < parseInt(stars as string) ? "currentColor" : "none"} className={i < parseInt(stars as string) ? "text-brand-cyan" : "text-gray-600"} />
                    ))}
                    <span className="text-[10px] font-bold ml-1">& Up</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Banner */}
      <div className="aspect-w-3 aspect-h-4 rounded-2xl overflow-hidden relative group">
        <img src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=400" alt="Banner" className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-purple/90 to-transparent p-6 flex flex-col justify-end">
          <p className="text-[10px] font-black text-brand-cyan tracking-widest uppercase mb-1">New Arrival</p>
          <h4 className="text-lg font-black text-white leading-tight mb-3">DJ Controller <br />Pro X2</h4>
          <Link to="/store/dj-controller-pro-x2" className="text-[10px] font-black text-white bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 w-max hover:bg-white hover:text-black transition">SHOP NOW</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#050507] min-h-screen pt-24 pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-20 max-w-[1920px] mx-auto">
        
        {/* ULTIMATE STORE HERO SECTION */}
        <section className="mb-12 rounded-[2rem] overflow-hidden relative group">
          <div className="absolute inset-0 bg-[#0A0A0E]">
            <img 
              src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2000" 
              className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-100 transition-transform duration-1000"
              alt="Hero Backdrop"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-[#050507]/80 to-transparent"></div>
          </div>

          <div className="relative z-10 p-8 md:p-16 lg:p-24 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-[10px] font-black uppercase tracking-widest animate-pulse">
                <Flame size={12} />
                Season Launch 2024
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-outfit font-black text-white leading-[0.9] uppercase tracking-tighter">
                ELEVATE YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple via-white to-brand-cyan">SONIC REALM</span>
              </h1>
              <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed max-w-xl">
                Gear picked for people who take their sound seriously. New drops, pro setups, merch — all in one place.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                <button className="px-8 py-4 bg-brand-cyan text-black font-black rounded-xl hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] transition-all flex items-center gap-2 group/btn">
                  SHOP THE COLLECTION
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <button className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 text-white font-black rounded-xl hover:bg-white/10 transition-all">
                  VIEW DEALS
                </button>
              </div>
            </div>

            <div className="hidden lg:block w-1/3 relative">
               {/* Featured Product Floating Card */}
               <div className="glass-card p-1 rounded-3xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-white rounded-[1.4rem] p-8 aspect-square flex items-center justify-center">
                    <img 
                      src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=600" 
                      className="w-full h-full object-contain mix-blend-multiply" 
                      alt="Featured Controller"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black text-white uppercase">Pro X2 Controller</h3>
                      <span className="text-brand-cyan font-black">$1,499</span>
                    </div>
                    <div className="flex items-center gap-1 text-brand-cyan mb-4">
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <Star size={12} fill="currentColor" />
                      <span className="text-[10px] text-gray-500 ml-1 font-bold">(5.0)</span>
                    </div>
                    <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white hover:bg-white/10 transition">
                      ADD TO CART
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* SUPER DISCOUNT BANNER */}
        <div className="mb-12 bg-gradient-to-r from-brand-purple/20 via-[#15151A] to-brand-cyan/20 border border-white/5 rounded-3xl p-1 shadow-2xl overflow-hidden group">
          <div className="bg-[#0A0A0E] rounded-[1.4rem] p-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
             {/* Decorative patterns */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 blur-[100px] -mr-32 -mt-32"></div>
             
             <div className="flex flex-col md:flex-row items-center gap-8 z-10">
                <div className="flex flex-col items-center md:items-start">
                   <p className="text-[10px] font-black text-brand-cyan tracking-widest uppercase mb-1">{storeSettings.heroLabel}</p>
                   <h2 className="text-2xl md:text-3xl font-black text-white uppercase leading-none">{storeSettings.heroTitle}</h2>
                </div>

                <div className="flex items-center gap-4 border-l border-white/10 pl-8 hidden md:flex">
                   <div className="text-center">
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Remains Until End</p>
                     <CountdownTimer
                       hours={storeSettings.countdownHours}
                       minutes={storeSettings.countdownMinutes}
                       seconds={storeSettings.countdownSeconds}
                     />
                   </div>
                </div>
             </div>

             {storeSettings.promoCodeEnabled && (
               <div className="flex flex-col items-center md:items-end gap-3 z-10">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Use code at checkout</p>
                  <div className="flex items-center gap-2 bg-white/5 border border-dashed border-brand-cyan/50 px-6 py-3 rounded-xl">
                     <span className="text-lg font-black text-brand-cyan tracking-tighter">{storeSettings.promoCode}</span>
                     <button
                       className="p-2 hover:bg-white/10 rounded-lg transition"
                       title="Copy Code"
                       onClick={() => { navigator.clipboard.writeText(storeSettings.promoCode); toast.success('Code copied!'); }}
                     >
                        <Copy size={16} className="text-white/60" />
                     </button>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* BEST SELLERS SECTION */}
        <section className="mb-20">
          <div className="flex items-end justify-between mb-8 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-3xl font-outfit font-black text-white uppercase tracking-tight">Best Sellers</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium">Top performing gear chosen by the community.</p>
            </div>
            <Link to="/store?sort=hot" className="text-xs font-black text-brand-cyan hover:text-white transition-colors flex items-center gap-2 uppercase tracking-widest">
              View All
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Featured Best Seller Tile */}
            {products.filter(p => p.isBestSeller).length > 0 && (
              <div className="lg:col-span-1 glass-card rounded-3xl border border-white/5 overflow-hidden group/featured relative">
                <div className="bg-white p-12 aspect-square flex items-center justify-center relative overflow-hidden">
                   <img 
                      src={products.filter(p => p.isBestSeller)[0]?.image || products.filter(p => p.isBestSeller)[0]?.image_url || "https://images.unsplash.com/photo-1543967623-010453d4fba7?auto=format&fit=crop&q=80&w=600"} 
                      className="w-full h-full object-contain mix-blend-multiply group-hover/featured:scale-110 transition-transform duration-700" 
                      alt="Best Seller" 
                   />
                   <div className="absolute top-4 left-4">
                      <div className="bg-brand-purple text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tight">
                        TOP RATED
                      </div>
                   </div>
                </div>
                <div className="p-8 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-brand-cyan tracking-widest uppercase">{products.filter(p => p.isBestSeller)[0]?.category}</p>
                    <h3 className="text-xl font-black text-white truncate uppercase">{products.filter(p => p.isBestSeller)[0]?.name}</h3>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-2xl font-black text-white">KES {products.filter(p => p.isBestSeller)[0]?.price.toLocaleString()}</span>
                     <div className="flex items-center gap-1 text-brand-cyan">
                       <Star size={10} fill="currentColor" />
                       <span className="text-[10px] font-bold">5.0</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => addItem(products.filter(p => p.isBestSeller)[0], 1)}
                    className="w-full py-4 bg-brand-purple text-white font-black rounded-xl hover:bg-purple-600 transition flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20"
                  >
                    <ShoppingBag size={18} />
                    ADD TO CART
                  </button>
                </div>
              </div>
            )}

            {/* Grid of smaller best sellers */}
            <div className={`grid grid-cols-2 md:grid-cols-3 gap-6 ${products.filter(p => p.isBestSeller).length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              {products.filter(p => p.isBestSeller).slice(products.filter(p => p.isBestSeller).length > 0 ? 1 : 0).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
              {products.filter(p => p.isBestSeller).length === 0 && (
                <p className="text-gray-500 col-span-full">Check back soon for our community's top picks!</p>
              )}
            </div>
          </div>
        </section>

        {/* SPECIAL OFFER & TRENDING SECTION */}
        <section className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
           {/* Special Offer Column */}
           <div className="lg:col-span-4 h-full">
              <div className="flex items-center gap-2 mb-6">
                <Zap size={20} className="text-brand-cyan" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight border-b-2 border-brand-cyan pb-1">Special Offer</h2>
              </div>
              
              {products.find(p => p.isSpecialOffer) ? (
                (() => {
                  const offer = products.find(p => p.isSpecialOffer)!;
                  const originalPrice = offer.compareAtPrice || Math.round(offer.price * 1.25);
                  const discountPercent = Math.round(((originalPrice - offer.price) / originalPrice) * 100);
                  
                  return (
                    <div className="glass-card rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group h-full">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/20 blur-[60px]"></div>
                       
                       <div className="bg-white rounded-[2rem] p-10 aspect-square mb-8 flex items-center justify-center relative overflow-hidden">
                          <img 
                            src={offer.image || offer.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600"} 
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700" 
                            alt="Special Offer Item"
                          />
                          <div className="absolute top-4 right-4 bg-red-500 text-white w-14 h-14 rounded-full flex flex-col items-center justify-center font-black leading-none shadow-xl border-4 border-white">
                             <span className="text-[10px]">SAVE</span>
                             <span className="text-lg">{discountPercent}%</span>
                          </div>
                       </div>

                       <div className="space-y-6 text-center">
                          <div className="space-y-1">
                            <h3 className="text-2xl font-black text-white uppercase">{offer.name}</h3>
                            <div className="flex items-center justify-center gap-1 text-brand-cyan">
                              <Star size={14} fill="currentColor" />
                              <Star size={14} fill="currentColor" />
                              <Star size={14} fill="currentColor" />
                              <Star size={14} fill="currentColor" />
                              <Star size={14} fill="currentColor" />
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-4">
                             <span className="text-3xl font-black text-white">KES {offer.price.toLocaleString()}</span>
                             <span className="text-lg font-bold text-gray-500 line-through">KES {originalPrice.toLocaleString()}</span>
                          </div>

                          <div className="space-y-3 px-4">
                            {offer.offerExpiry && (
                              <>
                                 <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-500 tracking-widest">
                                    <span>Hurry Up! Offer ends in:</span>
                                 </div>
                                 <div className="flex justify-center pt-2">
                                    {/* TODO: Pass actual expiry to CountdownTimer if it supported real dates */}
                                    <CountdownTimer hours={24} minutes={0} seconds={0} />
                                 </div>
                              </>
                            )}
                          </div>

                          <button 
                            onClick={() => addItem(offer, 1)}
                            className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-brand-cyan transition-all transform group-hover:-translate-y-1 shadow-2xl"
                          >
                             GRAB OFFER NOW
                          </button>
                       </div>
                    </div>
                  );
                })()
              ) : (
                <div className="glass-card rounded-[2.5rem] border border-white/5 p-8 flex items-center justify-center h-full min-h-[400px]">
                  <p className="text-gray-500 font-medium">No special offers at the moment.</p>
                </div>
              )}
           </div>

           {/* Trending Section Column */}
           <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-brand-purple" />
                  <h2 className="text-xl font-black text-white uppercase tracking-tight border-b-2 border-brand-purple pb-1">Trending Products</h2>
                </div>
                <div className="flex gap-2">
                   <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-brand-purple transition"><ChevronLeft size={16} /></button>
                   <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white hover:bg-brand-purple transition"><ChevronRight size={16} /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {products.filter(p => p.isTrending).length > 0 ? (
                   products.filter(p => p.isTrending).slice(0, 6).map(product => (
                     <ProductCard key={product.id} product={product} />
                   ))
                 ) : (
                   <p className="text-gray-500 col-span-full">Trending items will appear here.</p>
                 )}
              </div>

              {/* Promo Banner inside Trending */}
              <div className="mt-10 rounded-[2.5rem] bg-gradient-to-br from-[#1E1E26] to-[#0F0F14] border border-white/5 p-10 flex flex-col md:flex-row items-center gap-10 overflow-hidden relative group">
                 <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-purple/10 blur-[80px] -mb-32 -mr-32"></div>
                 <div className="flex-1 space-y-4 relative z-10 text-center md:text-left">
                    <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Sonic Sale</p>
                    <h3 className="text-3xl font-black text-white uppercase leading-none">Shop and Save big <br />on hottest products</h3>
                    <p className="text-xs text-gray-400 font-medium">Extra 15% discount for selected audio interfaces and monitoring gear.</p>
                    <button className="mt-2 inline-flex items-center gap-2 text-[10px] font-black text-brand-cyan uppercase tracking-widest hover:text-white transition group/link">
                       Shop the sale <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                    </button>
                 </div>
                 <div className="w-48 relative z-10 hidden md:block group-hover:rotate-6 transition-transform duration-500">
                    <img src="https://images.unsplash.com/photo-1543967623-010453d4fba7?auto=format&fit=crop&q=80&w=400" className="w-full drop-shadow-2xl" alt="Promo Item" />
                 </div>
              </div>
           </div>
        </section>

        {/* BROWSE ALL PRODUCTS HEADER */}
        <div id="all-products" className="mb-8 border-b border-white/5 pb-4">
            <h2 className="text-3xl font-outfit font-black text-white uppercase tracking-tight">Browse All Gear</h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">Explore our complete catalog of professional musical equipment.</p>
        </div>


        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* LEFT SIDEBAR - Desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
            <SidebarContent />
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1">
            
            {/* Top Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-[#15151A]/50 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-xl">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button 
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition"
                >
                    <SlidersHorizontal size={20} />
                </button>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                  Showing <span className="text-white">{filteredProducts.length}</span> results
                </p>
                <div className="relative flex-1 md:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="w-full bg-black/20 border-transparent rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-cyan/30 transition-all"
                    />
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                {/* View Toggles */}
                <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-brand-cyan text-black shadow-lg shadow-brand-cyan/20' : 'text-gray-500 hover:text-white'}`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-brand-cyan text-black shadow-lg shadow-brand-cyan/20' : 'text-gray-500 hover:text-white'}`}
                  >
                    <List size={18} />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="relative w-40 md:w-48">
                  <select
                    value={sortOption}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                    className="w-full bg-black/20 border border-white/5 rounded-lg py-2.5 pl-4 pr-10 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-300 focus:outline-none focus:bg-black/40 appearance-none cursor-pointer"
                  >
                    <option value="newest" className="bg-[#15151A]">Newest Arrivals</option>
                    <option value="hot" className="bg-[#15151A]">Popular</option>
                    <option value="top-rated" className="bg-[#15151A]">Rating</option>
                    <option value="price-low" className="bg-[#15151A]">Price: Low</option>
                    <option value="price-high" className="bg-[#15151A]">Price: High</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active Filters Bar */}
            {(categoryFilter !== 'All' || priceFilter !== 'All' || ratingFilter !== 'All' || searchQuery) && (
                <div className="flex flex-wrap items-center gap-2 mb-6 animate-in slide-in-from-top-2 duration-300">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2">Filters:</span>
                    {categoryFilter !== 'All' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-[10px] font-bold">
                            {categoryFilter}
                            <X size={12} className="cursor-pointer hover:text-white" onClick={() => updateFilter('category', 'All')} />
                        </div>
                    )}
                    {priceFilter !== 'All' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-[10px] font-bold">
                            {priceFilter}
                            <X size={12} className="cursor-pointer hover:text-white" onClick={() => updateFilter('price', 'All')} />
                        </div>
                    )}
                    {ratingFilter !== 'All' && (
                         <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-[10px] font-bold uppercase">
                            {ratingFilter}+ Stars
                            <X size={12} className="cursor-pointer hover:text-white" onClick={() => updateFilter('rating', 'All')} />
                        </div>
                    )}
                     {searchQuery && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-[10px] font-bold">
                            "{searchQuery}"
                            <X size={12} className="cursor-pointer hover:text-white" onClick={() => updateFilter('search', '')} />
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            setSearchParams(new URLSearchParams());
                        }}
                        className="text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest ml-4 transition"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Product Rendering */}
            <div className="w-full">
              {filteredProducts.length > 0 ? (
                <VirtuosoGrid
                  useWindowScroll
                  data={filteredProducts}
                  listClassName={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-6"}
                  itemContent={(index, product) => (
                    <div key={product.id} className="h-full">
                        <ProductCard product={product} viewMode={viewMode} />
                    </div>
                  )}
                />
              ) : (
                <div className="text-center py-24 bg-[#15151A]/30 rounded-3xl border border-dashed border-white/10">
                  <div className="bg-white/5 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
                    <Search className="h-10 w-10 text-gray-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">No products found</h3>
                  <p className="text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
                  <button
                    onClick={() => setSearchParams(new URLSearchParams())}
                    className="mt-8 px-8 py-3.5 bg-brand-purple text-white rounded-xl hover:bg-purple-600 transition font-bold"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Newsletter Section */}
        <section className="mt-24 mb-10 w-full rounded-[40px] bg-gradient-to-br from-[#15151A] to-[#0B0B0F] border border-white/5 overflow-hidden shadow-2xl relative flex flex-col items-center justify-center p-8 md:p-16 text-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.05] z-0 pointer-events-none"></div>
          <div className="relative z-10 max-w-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 mx-auto shadow-inner">
              <Mail className="text-brand-purple w-8 h-8" />
            </div>
            <h2 className="text-3xl md:text-5xl font-outfit font-black text-white mb-4 tracking-tight">Stay in the Loop</h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed font-medium">Join our newsletter to get exclusive deals, early access to new drops, and the latest gear news straight to your inbox.</p>

             <form className="flex flex-col sm:flex-row gap-3 w-full max-w-lg mx-auto" onSubmit={async (e) => { 
              e.preventDefault(); 
              if (!email) return;
              setIsSubmitting(true);
              try {
                await addSubscriber(email, 'Store Newsletter');
                toast.success('Subscribed successfully!');
                setEmail('');
              } catch (err) {
                toast.error('Failed to subscribe. Please try again.');
              } finally {
                setIsSubmitting(false);
              }
            }}>
              <input
                type="email"
                placeholder="Enter your email address..."
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:bg-black/60 focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50 transition-all font-medium placeholder:text-gray-500 shadow-inner"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-brand-purple text-white font-bold rounded-2xl hover:bg-purple-600 transition-colors shadow-[0_0_20px_rgba(157,78,221,0.3)] hover:shadow-[0_0_30px_rgba(157,78,221,0.5)] active:scale-95 whitespace-nowrap disabled:opacity-50"
              >
                {isSubmitting ? 'Joining...' : 'Subscribe Now'}
              </button>
            </form>
          </div>
        </section>
      </div>

       {/* Mobile Sidebar Overlay */}
       {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in" 
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>
          <div className="relative w-80 max-w-full bg-[#0B0B0F] p-6 overflow-y-auto animate-in slide-in-from-left-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-display font-black text-white uppercase tracking-tight">Filters</h2>
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}
    </div >
  );
}
