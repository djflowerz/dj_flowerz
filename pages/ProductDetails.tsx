import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import {
  Star, Heart, ShieldCheck, Truck, RefreshCw, ChevronRight,
  Minus, Plus, PlayCircle, Check, AlertTriangle, Share2,
  Facebook, Twitter, Instagram, MessageCircle, Copy
} from 'lucide-react';
import { motion } from 'motion/react';

// Mock data for extended product features
// Removed MOCK_REVIEWS

// MOCK_VARIANTS removed

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { products, productsLoading, reviews, reviewsLoading, addReview } = useData();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'video'>('description');
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [copied, setCopied] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', userName: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (productsLoading || !products.length) return;

    const foundProduct = products.find(p => p.slug === slug || p.id === slug);
    if (foundProduct) {
      setProduct(foundProduct);
      setSelectedImage(foundProduct.image || foundProduct.image_url);

      // Initialize variant selection
      if (foundProduct?.variantGroups && Array.isArray(foundProduct.variantGroups)) {
        const initialVariants: Record<string, string> = {};
        foundProduct.variantGroups.forEach(group => {
          if (group?.name) {
            const options = group.options || (group.variants || []).map(v => v.name);
            if (options.length > 0) {
              initialVariants[group.name] = options[0];
            }
          }
        });
        setSelectedVariantOptions(initialVariants);
      }
    } else {
      setProduct(null);
    }

    const filtered = products.filter(p => (p.slug !== slug && p.id !== slug));
    setRelatedProducts(filtered.slice(0, 4));
  }, [slug, products, productsLoading]);

  // Update current variant based on selection
  useEffect(() => {
    let matched: ProductVariant | null = null;

    // 1. Try top-level variants (combinations)
    if (product?.variants?.length) {
      const selectedValues = Object.values(selectedVariantOptions);
      if (selectedValues.length === 0) {
        matched = product.variants[0] || null;
      } else {
        matched = product.variants.find(v => {
          if (!v || !v.name) return false;
          const selectionString = selectedValues.join(', ');
          if (v.name === selectionString) return true;
          // Try if all selected values are in the name
          return selectedValues.every((val: any) => v.name?.toLowerCase().includes(String(val).toLowerCase()));
        }) || null;
      }
    }

    // 2. Fallback to nested variants in groups if no top-level match
    if (!matched && product?.variantGroups) {
      for (const group of product.variantGroups) {
        const selectedOption = selectedVariantOptions[group.name];
        if (selectedOption && group.variants) {
          const v = group.variants.find(v => v.name === selectedOption);
          if (v) {
            matched = {
              ...v,
              // Ensure we have correct prices even if not defined in the nested variant
              price: v.price || product.price,
              discountPrice: v.discountPrice !== undefined ? v.discountPrice : product.discountPrice,
              compareAtPrice: v.compareAtPrice !== undefined ? v.compareAtPrice : product.compareAtPrice
            };
            break; 
          }
        }
      }
    }

    if (matched) {
      setCurrentVariant(matched);
      if (matched.image || matched.image_url) {
        setSelectedImage(matched.image || matched.image_url);
      }
    } else {
      setCurrentVariant(null);
    }
  }, [selectedVariantOptions, product]);

  const handleAddToCart = () => {
    if (product) {
      const selectedVariantString = Object.entries(selectedVariantOptions)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      // If the product has variants, we pass the selection to context
      addToCart({
        ...product,
        selectedVariant: selectedVariantString || undefined
      } as any, quantity);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setIsSubmittingReview(true);

    try {
      await addReview(product.id, reviewForm.rating, reviewForm.comment);
      alert("Review submitted successfully!");
      setReviewForm({ rating: 5, comment: '', userName: '' });
    } catch (err: any) {
      alert("Failed to submit review: " + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShare = (platform: string) => {
    if (!product) return;

    // Construct canonical URL using slug for better SEO/readability
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/store/${product.slug || product.id}`;
    const text = `Check out ${product.name} on DJ Flowerz!`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
    }
  };

  // Dynamic hotspots management
  const [activeHotspot, setActiveHotspot] = useState<{ title: string; description: string } | null>(null);

  const showTooltip = (hotspot: { title: string; description: string }) => {
    setActiveHotspot(hotspot);
    setTimeout(() => setActiveHotspot(null), 5000);
  };

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center pt-20 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col items-center justify-center text-white pt-20">
        <h2 className="text-2xl font-bold mb-4 tracking-tight">Product not found</h2>
        <Link to="/store" className="bg-brand-purple px-6 py-2 rounded-lg font-bold hover:bg-purple-600 transition-all">Back to Store</Link>
      </div>
    );
  }

  const activePriceVar = currentVariant || product;
  const displayPrice = (activePriceVar.discountPrice || activePriceVar.price || product.price) || 0;
  const originalPrice = activePriceVar.compareAtPrice || (activePriceVar.discountPrice ? activePriceVar.price : product.compareAtPrice);
  const hasDiscount = !!(activePriceVar.discountPrice || activePriceVar.compareAtPrice);

  const formatPrice = (p: any) => {
    if (p === undefined || p === null) return '0';
    return Number(p).toLocaleString();
  };

  const galleryImages = (product.images && product.images.length > 0)
    ? product.images
    : [product.image || product.image_url || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products/placeholder.jpg'].filter(Boolean);

  return (
    <div className="bg-[#0A0A0F] text-white selection:bg-brand-purple/30 font-sans min-h-screen">
      <main className="pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* ZONE 1: THE PURCHASE ZONE */}
          <div className="grid lg:grid-cols-2 gap-16 mb-24 items-start">
            {/* Sticky Gallery */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-gradient-to-br from-white/[0.03] to-transparent rounded-[2.5rem] overflow-hidden aspect-square border border-white/5 relative group">
                <motion.img
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={selectedImage || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/60 to-transparent"></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {galleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-square rounded-2xl overflow-hidden glass-panel p-1 cursor-pointer transition-all ${selectedImage === img ? 'border-brand-purple/50 bg-brand-purple/10 opacity-100' : 'border-white/5 opacity-50 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover rounded-xl" alt={`Thumb ${idx}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Controls */}
            <div className="space-y-10">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-white/5 backdrop-blur-md px-3 py-1 rounded-lg text-brand-purple text-[10px] font-bold uppercase tracking-widest border border-brand-purple/20">
                    {product.brand || 'Premium'}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-400 text-sm">
                    <span>★★★★★</span>
                    <span className="text-gray-500 text-xs ml-1">(4.9/5 • Verified Reviews)</span>
                  </div>
                </div>
                <h1 className="font-display font-bold text-5xl md:text-6xl text-white mb-6 leading-tight tracking-tighter uppercase">{product.name}</h1>
                <div 
                  className="text-gray-400 text-xl leading-relaxed font-light product-description-html"
                  dangerouslySetInnerHTML={{ __html: product.description || 'Elevate your creative workflow with this masterfully engineered piece of hardware.' }}
                />
              </div>

              {/* Variant Selectors */}
              <div className="space-y-8">
               {product.variantGroups?.map((group) => {
                  if (!group?.name) return null;
                  return (
                    <div key={group.name} className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em]">{group.name}</span>
                        <span className="text-white text-xs font-bold">{selectedVariantOptions[group.name]}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(group.options || (group.variants || []).map(v => v.name)).map((option) => {
                          if (!option) return null;
                          const isSelected = selectedVariantOptions[group.name] === option;
                          return (
                            <button
                              key={option}
                              onClick={() => setSelectedVariantOptions(prev => ({ ...prev, [group?.name as string]: option }))}
                              className={`px-6 py-3 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-col pt-4">
                  <span className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Current Valuation</span>
                  <div className="flex items-baseline gap-4">
                    <span className="text-5xl text-white font-black tracking-tighter">KSh {formatPrice(displayPrice)}</span>
                    {originalPrice && originalPrice > displayPrice && (
                      <span className="text-xl text-gray-700 line-through font-bold">KSh {formatPrice(originalPrice)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleAddToCart}
                    className="flex-[2] py-5 rounded-2xl bg-gradient-to-r from-brand-purple to-purple-600 text-white font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(123,92,255,0.3)] hover:scale-[1.02] transition-transform active:scale-95"
                  >
                    <span>Add to Bag</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                  </button>
                  <button className="bg-white/[0.03] backdrop-blur-xl px-8 py-5 rounded-2xl font-bold flex items-center justify-center border border-white/5 hover:border-white/10 group transition-all">
                    <Heart className="w-6 h-6 group-hover:scale-125 group-hover:fill-brand-purple group-hover:text-brand-purple transition-all duration-300" />
                  </button>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Active Inventory - Ready to Dispatch</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <ShieldCheck className="w-4 h-4 text-brand-purple" />
                    <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">12 Months Premium Protection Coverage</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-12 items-center border-t border-white/5 pt-10">
                <div className="flex items-center gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg group-hover:bg-brand-purple/20">🛡️</div>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Secure<br />Encryption</span>
                </div>
                <div className="flex items-center gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg group-hover:bg-brand-cyan/20">🔄</div>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Authentic<br />Returns</span>
                </div>
              </div>
            </div>
          </div>

          {/* ZONE 2: THE DISCOVERY ZONE */}
          <div className="space-y-32 mb-32">
            {/* Interactive Hotspots Section */}
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-12 mb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-6 tracking-tighter uppercase">Engineered for Excellence</h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto font-light">Explore the blueprint of premium craftsmanship and technical innovation.</p>
              </div>
              <div className="lg:col-span-7">
                <div className="bg-white/[0.01] rounded-[3rem] overflow-hidden relative border border-white/5 group shadow-inner shadow-brand-purple/5">
                  <img src={product.image || product.image_url} className="w-full h-auto opacity-40 group-hover:opacity-60 transition-opacity" alt="Specs" />

                  {/* Dynamic Hotspots */}
                  {(product.hotspots || []).map((hs, idx) => (
                    <div 
                      key={idx}
                      className="absolute group/h"
                      style={{ top: `${hs.y}%`, left: `${hs.x}%` }}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center animate-ping absolute inset-0 ${idx % 2 === 0 ? 'bg-brand-purple' : 'bg-brand-cyan'}`}></div>
                      <div 
                        onClick={() => showTooltip(hs)} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center relative cursor-pointer font-black text-[10px] border-2 border-white/20 ${idx % 2 === 0 ? 'bg-brand-purple' : 'bg-brand-cyan text-black'}`}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                    </div>
                  ))}

                  {activeHotspot && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-10 left-10 bg-black/60 backdrop-blur-2xl p-6 rounded-3xl border border-brand-purple/20 max-w-xs z-20"
                    >
                      <h4 className="text-brand-purple font-black text-[10px] mb-1 uppercase tracking-widest">{activeHotspot.title}</h4>
                      <p className="text-white text-xs font-medium leading-relaxed">{activeHotspot.description}</p>
                    </motion.div>
                  )}
                </div>
              </div>
              <div className="lg:col-span-5 space-y-8">
                <div className="bg-gradient-to-br from-brand-purple/10 to-transparent p-10 rounded-[2rem] border border-white/5">
                  <h3 className="text-2xl font-black text-white mb-6 tracking-tight uppercase">Technical Architecture</h3>
                  <div className="space-y-6">
                    {(product.useCases || []).map((uc, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2.5 ${idx % 2 === 0 ? 'bg-brand-purple' : 'bg-brand-cyan'}`}></div>
                        <div>
                          <h4 className="text-white font-black text-[10px] uppercase tracking-wider mb-2">{uc.title}</h4>
                          <p className="text-gray-500 text-sm leading-relaxed">{uc.description}</p>
                        </div>
                      </div>
                    ))}
                    {(!product.useCases || product.useCases.length === 0) && (
                      <p className="text-gray-500 text-sm italic">Premium implementation with industry-standard protocols.</p>
                    )}
                  </div>
                </div>

                {/* Specs Accordion Placeholder */}
                <div className="space-y-4">
                  <div className="w-full bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 text-left">
                    <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-8 border-b border-white/5 pb-4">Specifications Registry</h4>
                    <div className="space-y-6">
                      {(product.technicalDetails || []).map((detail, idx) => (
                        <div key={idx} className="flex justify-between items-center group/spec">
                          <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] group-hover/spec:text-brand-purple transition-colors">{detail.title}</span>
                          <span className="text-white text-xs font-bold tracking-tight">{detail.description}</span>
                        </div>
                      ))}
                      {(!product.technicalDetails || product.technicalDetails.length === 0) && (
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest italic">Standard professional specifications apply.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Section */}
            <div className="bg-white/[0.01] rounded-[4rem] p-8 md:p-16 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-purple/50 to-transparent"></div>
              <h3 className="text-3xl font-display font-black text-white mb-16 text-center tracking-tighter uppercase">How it compares</h3>
              <div className="grid md:grid-cols-3 gap-8 md:gap-12 items-center">
                {/* Lite / Alternative 1 */}
                <div className="text-center p-8 bg-white/[0.02] rounded-3xl opacity-40 border border-white/5 transition-all hover:opacity-100">
                  <h4 className="text-gray-500 uppercase tracking-widest text-[10px] mb-4 font-black">
                    {product.variantGroups?.[0]?.options?.[0] ? `${product.variantGroups[0].options[0]} Edition` : 'Standard Edition'}
                  </h4>
                  <div className="text-2xl text-white font-black mb-6">
                    KSh {formatPrice(displayPrice * 0.8)}
                  </div>
                  <div className="space-y-3 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                    <p>Essential Features</p>
                    <p>Original Build</p>
                    <p>Standard Kit</p>
                  </div>
                </div>

                {/* Main / Master Selection */}
                <div className="text-center p-12 bg-brand-purple/10 rounded-[2.5rem] border border-brand-purple/40 ring-1 ring-brand-purple/30 relative scale-105 md:scale-110 shadow-2xl backdrop-blur-md">
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-purple text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">Master Selection</span>
                  <h4 className="text-brand-purple uppercase tracking-widest text-[10px] mb-4 font-black">{product.name}</h4>
                  <div className="text-4xl text-white font-black mb-8">KSh {formatPrice(displayPrice)}</div>
                  <div className="space-y-4 text-xs text-white font-bold uppercase tracking-widest leading-relaxed">
                    <p>Pro-Series Core</p>
                    <p>Ultra-Fast Performance</p>
                    <p>Advanced X-Cooling</p>
                    <p>Studio Grade Build</p>
                  </div>
                </div>

                {/* Elite / Alternative 2 */}
                <div className="text-center p-8 bg-white/[0.02] rounded-3xl opacity-40 border border-white/5 transition-all hover:opacity-100">
                  <h4 className="text-gray-500 uppercase tracking-widest text-[10px] mb-4 font-black">
                    {product.variantGroups?.[0]?.options?.length && product.variantGroups[0].options.length > 1 
                      ? `${product.variantGroups[0].options[product.variantGroups[0].options.length - 1]} Pro` 
                      : 'Elite Edition'}
                  </h4>
                  <div className="text-2xl text-white font-black mb-6">
                    KSh {formatPrice(displayPrice * 1.5)}
                  </div>
                  <div className="space-y-3 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                    <p>Elite Max Specs</p>
                    <p>Next-Gen Cooling</p>
                    <p>Bespoke Design</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ZONE 3: THE VALIDATION ZONE */}
          <div className="max-w-4xl mx-auto mb-32">
            <div className="flex justify-between items-end mb-16">
              <div>
                <h3 className="text-4xl font-display font-black text-white mb-2 tracking-tighter uppercase">User Stories</h3>
                <p className="text-gray-500 font-medium">Authentic feedback from the global community.</p>
              </div>
              <button
                onClick={() => setActiveTab('reviews')}
                className="px-6 py-3 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-brand-purple/20 hover:text-brand-purple border border-white/5"
              >
                Write Experience
              </button>
            </div>

            <div className="space-y-10">
              {reviewsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-purple"></div>
                </div>
              ) : reviews.filter(r => r.target_id === product.id || r.productId === product.id).length > 0 ? (
                reviews.filter(r => r.target_id === product.id || r.productId === product.id).map((review) => (
                  <div key={review.id} className="glass-panel p-8 md:p-12 rounded-[2.5rem] border border-white/5 hover:border-brand-purple/20 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <MessageCircle size={120} className="text-brand-purple" />
                    </div>
                    <div className="flex flex-col md:flex-row gap-8 relative z-10">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-purple/20 to-transparent border border-brand-purple/20 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                          {review.rating >= 4 ? '🎧' : '⚡'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                          <div>
                            <h4 className="text-white font-black text-2xl tracking-tight mb-2 uppercase">{review.userName || 'Verified Artist'}</h4>
                            <div className="flex items-center gap-4">
                              <div className="flex gap-1 text-yellow-400">
                                {[...Array(review.rating)].map((_, i) => <Star key={i} size={16} className="fill-current" />)}
                                {[...Array(5 - review.rating)].map((_, i) => <Star key={i} size={16} className="text-gray-700" />)}
                              </div>
                              <span className="text-brand-cyan text-[10px] font-black uppercase tracking-widest border border-brand-cyan/30 px-2 py-0.5 rounded-md">Verified Owner</span>
                            </div>
                          </div>
                          <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">{new Date(review.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <p className="text-gray-300 text-xl leading-relaxed font-light italic opacity-80 group-hover:opacity-100 transition-opacity">"{review.comment}"</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white/[0.01] rounded-[2.5rem] border border-white/5">
                  <p className="text-gray-600 font-black uppercase tracking-widest text-xs">No user stories registered for this item.</p>
                </div>
              )}
            </div>
          </div>

          {/* Frequently Bought Together */}
          <div className="pt-24 border-t border-white/5">
            <h3 className="text-3xl font-display font-black text-white mb-12 tracking-tighter uppercase">Frequently Bought Together</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map((related) => (
                <Link
                  key={related.id}
                  to={`/store/${related.slug || related.id}`}
                  className="glass-panel rounded-[2.5rem] p-6 border border-white/5 group transition-all hover:border-brand-purple/30 hover:bg-brand-purple/5"
                >
                  <div className="aspect-square rounded-3xl overflow-hidden mb-6 relative shadow-2xl">
                    <img
                      src={related.image || related.image_url || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products/placeholder.jpg'}
                      alt={related.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-brand-purple/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white text-black px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">View Details</span>
                    </div>
                  </div>
                  <h4 className="text-white text-sm font-black uppercase tracking-widest mb-3 line-clamp-1 group-hover:text-brand-purple transition-colors">{related.name}</h4>
                  <div className="flex justify-between items-center">
                    <p className="text-brand-purple font-black text-lg">KSh {formatPrice(related.price)}</p>
                    <Plus className="w-5 h-5 text-gray-500 group-hover:text-brand-purple group-hover:rotate-90 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
