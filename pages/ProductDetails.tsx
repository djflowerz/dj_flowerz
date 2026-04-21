import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import {
  Star, Heart, ShieldCheck, Truck, RefreshCw, ChevronRight,
  Minus, Plus, PlayCircle, Check, AlertTriangle, Share2,
  Facebook, Twitter, Instagram, MessageCircle, Copy, Info, Layout, Package, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import ProductReviews from '../components/ProductReviews';

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { products, productsLoading, reviews, reviewsLoading, addReview, toggleWishlist, isInWishlist } = useData();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'description' | 'additional' | 'reviews'>('description');
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [copied, setCopied] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', userName: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'local' | 'air' | 'sea'>('local');

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

    if (product?.variants?.length) {
      const selectedValues = Object.values(selectedVariantOptions);
      if (selectedValues.length === 0) {
        matched = product.variants[0] || null;
      } else {
        matched = product.variants.find(v => {
          if (!v || !v.name) return false;
          const selectionString = selectedValues.join(', ');
          if (v.name === selectionString) return true;
          return selectedValues.every((val: any) => v.name?.toLowerCase().includes(String(val).toLowerCase()));
        }) || null;
      }
    }

    if (!matched && product?.variantGroups) {
      for (const group of product.variantGroups) {
        const selectedOption = selectedVariantOptions[group.name];
        if (selectedOption && group.variants) {
          const v = group.variants.find(v => v.name === selectedOption);
          if (v) {
            matched = {
              ...v,
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

      addToCart({
        ...product,
        shippingTier: selectedTier,
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
      toast.success("Review submitted successfully!");
      setReviewForm({ rating: 5, comment: '', userName: '' });
    } catch (err: any) {
      toast.error("Failed to submit review: " + err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleShare = (platform: string) => {
    if (!product) return;
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/store/${product.slug || product.id}`;
    const text = `Check out ${product.name} on DJ Flowerz!`;
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    const platformUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`,
    };

    if (platformUrls[platform]) {
      window.open(platformUrls[platform], '_blank');
    }
  };

  // Memoized values (MOVE TO TOP of function body if possible, or keep together here)
  const productReviews = useMemo(() => {
    if (!product || !reviews) return [];
    return reviews.filter(r => r.target_id === product.id || r.productId === product.id);
  }, [reviews, product?.id]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const mainImage = product.image || product.image_url;
    let rawImages: string[] = [];
    if (Array.isArray(product.images)) {
        rawImages = product.images;
    } else if (typeof product.images === 'string') {
        try { rawImages = JSON.parse(product.images); } catch (e) { rawImages = []; }
    }
    return [mainImage, ...rawImages].filter(Boolean);
  }, [product]);

  const productFeatures = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.features)) return product.features;
    if (typeof product.features === 'string') {
      try { return JSON.parse(product.features); } catch (e) { return []; }
    }
    return [];
  }, [product]);

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
  const tierPriceMap = {
    local: product.price_local || product.price,
    air: product.price_air || (product.price_local ? product.price_local * 0.9 : product.price),
    sea: product.price_sea || (product.price_local ? product.price_local * 0.8 : product.price)
  };
  const baseOrVariantPrice = activePriceVar.discountPrice || activePriceVar.price || product.price;
  const displayPrice = (selectedTier === 'local' ? baseOrVariantPrice : tierPriceMap[selectedTier]) || 0;
  const originalPrice = activePriceVar.compareAtPrice || (activePriceVar.discountPrice ? activePriceVar.price : product.compareAtPrice);

  const formatPrice = (p: any) => p ? Number(p).toLocaleString() : '0';


  return (
    <div className="bg-[#050507] text-white min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-8 overflow-x-auto no-scrollbar">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <ChevronRight size={10} />
          <Link to="/store" className="hover:text-white transition">Store</Link>
          <ChevronRight size={10} />
          <Link to={`/store?category=${product.category}`} className="hover:text-white transition">{product.category}</Link>
          <ChevronRight size={10} />
          <span className="text-gray-300 whitespace-nowrap">{product.name}</span>
        </nav>

        {/* Product Sections */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 mb-20 items-start">
          
          {/* Gallery Sidebar */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-24">
            <div className="bg-white p-8 rounded-[40px] shadow-2xl overflow-hidden relative group border border-white/5 mb-6">
                <img 
                    src={selectedImage} 
                    alt={product.name} 
                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105"
                />
                {product.isHot && (
                    <div className="absolute top-8 left-8 bg-red-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg z-20">HOT</div>
                )}
            </div>
            
            <div className="grid grid-cols-4 gap-4">
                {galleryImages.map((img, idx) => (
                    <button 
                        key={idx}
                        onClick={() => setSelectedImage(img)}
                        className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-brand-purple bg-brand-purple/5 shadow-[0_0_20px_rgba(157,78,221,0.2)]' : 'border-white/5 hover:border-white/20'}`}
                    >
                        <img src={img} className="w-full h-full object-contain p-2" />
                    </button>
                ))}
            </div>
          </div>

          {/* Product Data */}
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="bg-brand-cyan/20 text-brand-cyan px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {product.brand || 'Premium Edition'}
                    </span>
                    <div className="flex items-center gap-1.5 text-yellow-500">
                        <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" className={i < 4 ? 'text-yellow-400' : 'text-gray-600'} />)}
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">({productReviews.length || 12} Verified Reviews)</span>
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-[1.1]">{product.name}</h1>
                
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                    <span className="text-3xl font-black text-brand-cyan">KES {formatPrice(displayPrice)}</span>
                    {originalPrice && originalPrice > displayPrice && (
                        <span className="text-xl text-gray-600 line-through font-bold">KES {formatPrice(originalPrice)}</span>
                    )}
                </div>
            </div>

            {productFeatures.length > 0 ? (
                <div className="space-y-3 max-w-xl">
                    <h4 className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em]">Key Features</h4>
                    <div className="grid grid-cols-1 gap-2">
                        {productFeatures.map((feature: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 group">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all group-hover:scale-125" />
                                <p className="text-gray-300 text-sm font-medium leading-tight tracking-wide">{feature}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-gray-400 text-sm leading-relaxed max-w-xl">
                    {product.shortDescription || product.description}
                </div>
            )}

            {/* Inventory Note */}
            <div className="p-4 rounded-2xl bg-green-400/5 border border-green-400/20 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">In Stock - Ready to Dispatch</p>
            </div>

            {/* Shipping Tier Selector */}
            <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Import & Logistics Tier</h4>
                    <button className="text-[9px] font-black text-brand-purple uppercase hover:underline flex items-center gap-1">
                        <Info size={10} /> PATIENCE DISCOUNT
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { id: 'local', label: 'Local Stock', sub: 'Immediate', icon: <Package size={14} />, color: 'brand-purple', points: 0 },
                        { id: 'air', label: 'Air Import', sub: '7-14 Days', icon: <Zap size={14} />, color: 'blue-500', points: 50 },
                        { id: 'sea', label: 'Sea Import', sub: '30-45 Days', icon: <RefreshCw size={14} />, color: 'emerald-500', points: 150 }
                    ].map((tier) => (
                        <button
                            key={tier.id}
                            onClick={() => setSelectedTier(tier.id as any)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                                selectedTier === tier.id 
                                    ? `bg-${tier.color}/10 border-${tier.color}/50 shadow-lg shadow-${tier.color}/5` 
                                    : 'bg-white/5 border-white/5 hover:border-white/20'
                            }`}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-widest ${selectedTier === tier.id ? `text-${tier.color}` : 'text-gray-400'}`}>{tier.label}</span>
                            <span className="text-[9px] font-bold text-gray-500 mt-1">{tier.sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Variant Selectors */}
            {product.variantGroups?.map((group) => (
                <div key={group.name} className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{group.name}</h4>
                    <div className="flex flex-wrap gap-2">
                        {(group.options || (group.variants || []).map(v => v.name)).map((option) => {
                            const isSelected = selectedVariantOptions[group.name] === option;
                            return (
                                <button
                                    key={option}
                                    onClick={() => setSelectedVariantOptions(prev => ({ ...prev, [group.name]: option }))}
                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-brand-purple border-brand-purple text-white shadow-xl shadow-brand-purple/20' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Quantity & Add to Cart */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <div className="flex items-center bg-[#15151A] rounded-2xl border border-white/5 p-1 w-full sm:w-auto">
                    <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-3 text-gray-400 hover:text-white transition"
                    >
                        <Minus size={20} />
                    </button>
                    <span className="w-12 text-center text-sm font-black text-white">{quantity}</span>
                    <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-3 text-gray-400 hover:text-white transition"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <button
                    onClick={handleAddToCart}
                    className="btn-premium w-full sm:flex-1 py-4 flex items-center justify-center gap-3 text-sm"
                >
                    <Package size={20} /> ADD TO CATALOGUE
                </button>
                <button 
                    onClick={() => product && toggleWishlist(product.id, 'product')}
                    className={`p-4 rounded-2xl border transition group ${isInWishlist(product.id) ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-[#15151A] border-white/10 text-gray-400 hover:text-red-500'}`}
                >
                    <Heart size={20} className={isInWishlist(product.id) ? 'fill-current' : 'group-hover:fill-current'} />
                </button>
            </div>

            {/* Meta Info (SKU, Category, Tags) */}
            <div className="pt-8 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap shrink-0">SKU:</span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate">{product.sku || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap shrink-0">Categories:</span>
                    <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest truncate underline cursor-pointer">{product.category}</span>
                </div>
                {product.tags && product.tags.length > 0 && (
                    <div className="flex items-start gap-2 overflow-hidden">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap shrink-0 mt-0.5">Tags:</span>
                        <div className="flex flex-wrap gap-2">
                            {product.tags.map(tag => (
                                <span key={tag} className="text-[10px] font-bold text-gray-400 hover:text-white transition cursor-pointer">#{tag}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Share Info */}
            <div className="flex items-center gap-6 pt-4">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Share On:</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => handleShare('facebook')} className="text-gray-500 hover:text-blue-500 transition"><Facebook size={18} /></button>
                    <button onClick={() => handleShare('twitter')} className="text-gray-500 hover:text-sky-400 transition"><Twitter size={18} /></button>
                    <button onClick={() => handleShare('whatsapp')} className="text-gray-500 hover:text-green-500 transition"><MessageCircle size={18} /></button>
                    <button onClick={() => handleShare('copy')} className="text-gray-500 hover:text-white transition"><Copy size={18} /></button>
                </div>
            </div>
          </div>
        </div>

        {/* Tab System */}
        <div className="mb-24">
            <div className="flex items-center justify-center gap-8 md:gap-16 border-b border-white/5 mb-12">
                {[
                    { id: 'description', label: 'Description', icon: <Layout size={16} /> },
                    { id: 'additional', label: 'Additional Information', icon: <Info size={16} /> },
                    { id: 'reviews', label: `Reviews (${productReviews.length})`, icon: <Star size={16} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 relative ${activeTab === tab.id ? 'text-brand-purple' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {tab.icon} {tab.label}
                        {activeTab === tab.id && <motion.div layoutId="tab-active" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-brand-purple" />}
                    </button>
                ))}
            </div>

            <div className="max-w-4xl mx-auto min-h-[400px]">
                {activeTab === 'description' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <h3 className="text-3xl font-display font-black text-white uppercase tracking-tight">Experience The Craftsmanship</h3>
                        {product.description && product.description.includes('\n') ? (
                            <ul className="space-y-4">
                                {product.description.split('\n').filter(l => l.trim().length > 0).map((line, idx) => (
                                    <li key={idx} className="flex items-start gap-4">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)] shrink-0" />
                                        <span className="text-gray-300 text-base leading-relaxed">{line.replace(/^[-\*\•]\s*/, '')}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div 
                                className="text-gray-400 text-lg leading-relaxed font-light whitespace-pre-line product-description-html prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: product.description || '' }}
                            />
                        )}
                        <div className="grid md:grid-cols-2 gap-8 pt-8">
                            <div className="bg-[#15151A] p-8 rounded-[32px] border border-white/5">
                                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Core Benefits</h4>
                                <ul className="space-y-4">
                                    {['Professional Build Quality', 'Optimized Performance', 'Seamless Integration', 'Artist Grade Design'].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-xs font-medium text-gray-400">
                                            <Check size={14} className="text-brand-cyan" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-[#15151A] p-8 rounded-[32px] border border-white/5">
                                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-4">Technical Edge</h4>
                                <ul className="space-y-4">
                                    {['Lower Latency Response', 'Industrial Durability', 'Smart Thermal Control', 'Precision Engineering'].map(item => (
                                        <li key={item} className="flex items-center gap-3 text-xs font-medium text-gray-400">
                                            <Check size={14} className="text-brand-purple" /> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'additional' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h3 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-12">Technical Specifications</h3>
                        <div className="bg-[#15151A] rounded-[32px] border border-white/5 overflow-hidden">
                            {[
                                { label: 'SKU', value: product.sku || 'N/A' },
                                { label: 'Weight', value: product.weight || 'N/A' },
                                { label: 'Dimensions', value: product.dimensions || 'N/A' },
                                { label: 'Release Date', value: product.releaseDate || product.release_date || 'N/A' },
                                { label: 'Shipping Class', value: product.shippingClass || 'Standard Premium' },
                                { label: 'Category', value: product.category },
                                { label: 'Brand', value: product.brand || 'DJ Flowerz Exclusive' },
                                { label: 'Tags', value: (product.tags || []).join(', ') || 'N/A' }
                            ].map((row, idx) => (
                                <div key={row.label} className={`flex flex-col sm:flex-row p-6 ${idx !== 0 ? 'border-t border-white/5' : ''}`}>
                                    <span className="w-full sm:w-1/3 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 sm:mb-0">{row.label}</span>
                                    <span className="flex-1 text-xs font-bold text-white uppercase tracking-widest">{row.value}</span>
                                </div>
                            ))}
                        </div>

                        {product.technical_details && Array.isArray(product.technical_details) && product.technical_details.length > 0 && (
                            <div className="mt-12">
                                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-8">Technical Deep Dive</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {product.technical_details.map((spec: string, idx: number) => {
                                        const [label, value] = spec.includes(':') ? spec.split(':').map(s => s.trim()) : [null, spec];
                                        return (
                                            <div key={idx} className="bg-[#0B0B0F] p-5 rounded-2xl border border-white/5 flex flex-col gap-1">
                                                {label && <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>}
                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-tight leading-tight">{value}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {product.use_cases && Array.isArray(product.use_cases) && product.use_cases.length > 0 && (
                            <div className="mt-12">
                                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-8">Recommended Use Cases</h3>
                                <div className="flex flex-wrap gap-3">
                                    {product.use_cases.map((useCase: string, idx: number) => (
                                        <div key={idx} className="px-5 py-3 rounded-xl bg-brand-cyan/5 border border-brand-cyan/10 text-brand-cyan text-[10px] font-black uppercase tracking-widest">
                                            {useCase}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'reviews' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <ProductReviews
                            targetId={product.id}
                            isVerifiedPurchase={false}
                        />
                    </motion.div>
                )}
            </div>
        </div>

        {/* Related Products */}
        <div className="pt-24 border-t border-white/5">
            <h3 className="text-3xl font-display font-black text-white mb-12 uppercase tracking-tight">Frequently Bought Together</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {relatedProducts.map((related) => (
                    <Link
                        key={related.id}
                        to={`/store/${related.slug || related.id}`}
                        className="group bg-[#15151A] rounded-[32px] p-6 border border-white/5 transition-all hover:border-brand-purple/30 hover:-translate-y-2"
                    >
                        <div className="aspect-square rounded-2xl overflow-hidden mb-6 bg-white p-4">
                            <img src={related.image || related.image_url} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 line-clamp-1">{related.name}</h4>
                        <p className="text-brand-cyan font-black">KES {formatPrice(related.price)}</p>
                    </Link>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
