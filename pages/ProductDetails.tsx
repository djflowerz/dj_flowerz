import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
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
      if (foundProduct.variantGroups?.length) {
        const initialVariants: Record<string, string> = {};
        foundProduct.variantGroups.forEach(group => {
          if (group.variants.length) {
            initialVariants[group.name] = group.variants[0].name;
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

  // Discount is now handled via product.discountPrice or compareAtPrice
  const originalPrice = product.compareAtPrice || (product.discountPrice ? product.price : null);
  const displayPrice = product.discountPrice || product.price;
  const hasDiscount = !!(product.discountPrice || product.compareAtPrice);

  const galleryImages = (product.images && product.images.length > 0)
    ? product.images
    : [product.image || product.image_url || 'https://via.placeholder.com/300'].filter(Boolean);

  return (
    <div className="bg-[#0B0B0F] min-h-screen text-white pb-20 pt-24">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex text-sm text-gray-500 font-medium">
          <Link to="/" className="hover:text-brand-purple transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link to="/store" className="hover:text-brand-purple transition-colors">Store</Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-white/60 truncate">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16 items-start">
          {/* Product Gallery */}
          <div className="product-gallery sticky top-28">
            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#15151A] relative group shadow-2xl">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                src={selectedImage || 'https://via.placeholder.com/300'}
                alt={product.name}
                className="h-full w-full object-cover object-center transform transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-6 right-6">
                <button className="p-4 bg-black/40 backdrop-blur-md rounded-[1.5rem] text-white hover:bg-brand-purple transition-all duration-300 border border-white/10 group/btn shadow-lg">
                  <Heart className="h-6 w-6 group-hover/btn:fill-current group-hover/btn:scale-110" />
                </button>
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-xs font-bold tracking-widest uppercase text-white/70">
                Premium Hardware
              </div>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-4">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative aspect-w-1 aspect-h-1 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${selectedImage === img ? 'border-brand-purple ring-4 ring-brand-purple/20' : 'border-white/5 hover:border-white/20'}`}
                >
                  <img src={img} alt={`View ${idx}`} className="h-full w-full object-cover object-center" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-black uppercase tracking-[0.2em] rounded-full">New Arrival</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-700'}`} />
                  ))}
                  <span className="text-xs text-gray-500 font-bold ml-1">(4.8/5)</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">{product.name}</h1>
                <p className="text-gray-500 font-medium">Professional Grade Equipment</p>
              </div>

              {/* Share Module */}
              <div className="flex items-center gap-2 p-1 bg-[#15151A] rounded-[1.5rem] border border-white/5 w-fit">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="p-3 text-gray-500 hover:text-white hover:bg-[#25D366] rounded-2xl transition-all duration-300"
                  title="Share on WhatsApp"
                >
                  <MessageCircle size={20} />
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-3 text-gray-500 hover:text-white hover:bg-[#1877F2] rounded-2xl transition-all duration-300"
                  title="Share on Facebook"
                >
                  <Facebook size={20} />
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="p-3 text-gray-500 hover:text-white hover:bg-white rounded-2xl transition-all duration-300"
                  title="Share on X"
                >
                  <Twitter size={20} />
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className={`p-3 rounded-2xl transition-all duration-300 ${copied ? 'bg-green-500 text-white' : 'text-gray-500 hover:text-white hover:bg-brand-purple'}`}
                  title="Copy Link"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="p-8 bg-[#15151A] rounded-[2.5rem] border border-white/5 space-y-6">
              <div className="flex items-baseline gap-4">
                <p className="text-5xl font-black text-white tracking-tighter">
                  KES {displayPrice.toLocaleString()}
                </p>
                {originalPrice && originalPrice > displayPrice && (
                  <p className="text-xl text-gray-600 line-through font-bold">KES {originalPrice.toLocaleString()}</p>
                )}
                {hasDiscount && (
                  <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Sale
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Status</span>
                  {product.stock > 10 ? (
                    <span className="flex items-center text-green-400 text-sm font-bold">
                      <Check className="h-4 w-4 mr-1.5" /> Ready to Ship
                    </span>
                  ) : (
                    <span className="flex items-center text-orange-400 text-sm font-bold">
                      <AlertTriangle className="h-4 w-4 mr-1.5" /> Only {product.stock} Left!
                    </span>
                  )}
                </div>
                <div className="w-px h-10 bg-white/5" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">Delivery</span>
                  <span className="text-white text-sm font-bold">Within 24-48 Hours</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {product.variantGroups && product.variantGroups.length > 0 ? (
                <div className="space-y-6">
                  {product.variantGroups.map((group) => (
                    <div key={group.name} className="space-y-3">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">{group.name}</h3>
                      <div className="flex flex-wrap items-center gap-3">
                        {group.variants.map((variant) => {
                          const isSelected = selectedVariantOptions[group.name] === variant.name;
                          return (
                            <button
                              key={variant.id}
                              onClick={() => setSelectedVariantOptions(prev => ({ ...prev, [group.name]: variant.name }))}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-brand-purple border-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-[#15151A] border-white/5 text-gray-500 hover:text-white'}`}
                            >
                              {variant.name}
                              {variant.price > 0 && ` (+KES ${variant.price})`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {/* Quantity selector — hidden for free digital products */}
                {!(product?.isFree && product?.type === 'digital') && (
                  <div className="flex items-center bg-[#15151A] rounded-2xl border border-white/5 p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-12 text-center font-black text-lg">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                )}

                {/* CTA Button — adapts to product type */}
                {product?.isFree && product?.type === 'digital' && product?.digitalFileUrl ? (
                  <a
                    href={product.digitalFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-brand-cyan hover:brightness-110 text-black rounded-2xl py-4 flex items-center justify-center text-lg font-black shadow-xl shadow-brand-cyan/20 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Free Download
                  </a>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-brand-purple hover:bg-purple-600 text-white rounded-2xl py-4 flex items-center justify-center text-lg font-black shadow-xl shadow-brand-purple/20 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                  >
                    {product?.type === 'digital' ? 'Buy & Download' : 'Secure Order'}
                  </button>
                )}
              </div>

              {/* Digital product info badge */}
              {product?.type === 'digital' && (
                <div className="flex items-center gap-3 p-4 bg-brand-cyan/5 rounded-2xl border border-brand-cyan/10 mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-cyan flex-shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  <div>
                    <p className="text-[10px] font-black text-brand-cyan uppercase tracking-widest">Digital Download</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {product.isFree ? 'Free — download instantly' : 'Download link delivered instantly after payment'}
                      {product.downloadPassword ? ' · Password protected' : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                <div className="flex flex-col items-center sm:items-start gap-2 group cursor-help">
                  <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">100% Secure</span>
                </div>
                {product?.type !== 'digital' && (
                  <div className="flex flex-col items-center sm:items-start gap-2 group cursor-help">
                    <div className="w-10 h-10 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan group-hover:bg-brand-cyan group-hover:text-brand-dark transition-all">
                      <Truck size={20} />
                    </div>
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Express Shipping</span>
                  </div>
                )}
                {product?.type === 'digital' && (
                  <div className="flex flex-col items-center sm:items-start gap-2 group cursor-help">
                    <div className="w-10 h-10 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan group-hover:bg-brand-cyan group-hover:text-brand-dark transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </div>
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Instant Access</span>
                  </div>
                )}
                <div className="flex flex-col items-center sm:items-start gap-2 group cursor-help">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <RefreshCw size={20} />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Easy Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tabs */}
        <div className="mt-24">
          <div className="flex items-center gap-12 border-b border-white/5 pb-1 mb-12 overflow-x-auto scrollbar-hide">
            {['description', 'video', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-[10px] font-black uppercase tracking-[0.3em] pb-6 relative transition-all whitespace-nowrap ${activeTab === tab ? 'text-brand-purple' : 'text-gray-600 hover:text-white/60'}`}
              >
                {tab}
                {activeTab === tab && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-purple rounded-full" />}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'description' && (
              <div className="max-w-4xl space-y-8">
                <h3 className="text-3xl font-black tracking-tighter">Engineered for Excellence</h3>
                <p className="text-gray-400 text-xl leading-relaxed font-medium">
                  Experience the ultimate in performance and style with the {product.name}. Designed for professionals and enthusiasts alike, this product combines cutting-edge technology with premium materials to deliver an unparalleled experience.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                  <div className="p-8 bg-[#15151A] rounded-[2.5rem] border border-white/5 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                      <ChevronRight size={24} />
                    </div>
                    <h4 className="text-white font-bold text-lg">Pro Build Quality</h4>
                    <p className="text-gray-500 text-sm font-medium">Built to withstand the most demanding environments with aerospace-grade components.</p>
                  </div>
                  <div className="p-8 bg-[#15151A] rounded-[2.5rem] border border-white/5 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                      <ChevronRight size={24} />
                    </div>
                    <h4 className="text-white font-bold text-lg">Modern Workflow</h4>
                    <p className="text-gray-500 text-sm font-medium">Seamlessly integrates with your existing setup for maximum efficiency and creativity.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <div className="aspect-video bg-[#15151A] rounded-[3rem] overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl group cursor-pointer relative">
                <img src={product.image || product.image_url} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm brightness-50" alt="" />
                <div className="text-center relative z-10">
                  <div className="w-24 h-24 bg-brand-purple/20 rounded-full flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-500 border border-brand-purple/30 backdrop-blur-md">
                    <PlayCircle className="h-12 w-12 text-brand-purple" />
                  </div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Watch Product Overview</p>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-12">
                {/* Review Form */}
                <div className="bg-[#15151A] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
                  <div className="max-w-2xl">
                    <h3 className="text-3xl font-black tracking-tighter mb-2">Write a Review</h3>
                    <p className="text-gray-500 mb-8 font-medium">Share your experience with this product.</p>

                    <form onSubmit={handleReviewSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                          <input
                            type="text"
                            required
                            value={reviewForm.userName}
                            onChange={(e) => setReviewForm({ ...reviewForm, userName: e.target.value })}
                            placeholder="John Doe"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rating</label>
                          <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 h-[52px]">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                className="transition-transform active:scale-125"
                              >
                                <Star
                                  size={20}
                                  className={star <= reviewForm.rating ? "text-yellow-400 fill-current" : "text-gray-600"}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Your Feedback</label>
                        <textarea
                          required
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          placeholder="What did you like or dislike?"
                          rows={4}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-purple/50 resize-none"
                        ></textarea>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="bg-brand-purple hover:bg-purple-600 text-white rounded-2xl py-4 px-10 font-black tracking-widest uppercase transition-all shadow-xl shadow-brand-purple/20 disabled:opacity-50"
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviewsLoading ? (
                    <div className="col-span-full flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-purple"></div>
                    </div>
                  ) : (reviews || []).filter((r: any) => r.productId === product.id || r.product_id === product.id).length > 0 ? (
                    (reviews || []).filter((r: any) => r.productId === product.id || r.product_id === product.id).map((review: any) => (
                      <div key={review.id} className="bg-[#15151A] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-brand-purple/20 flex items-center justify-center text-brand-purple font-black text-lg border border-brand-purple/20 shadow-lg">
                              {(review.userName || review.user_name || review.user || 'U').charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-white font-bold">{review.userName || review.user_name || review.user}</h4>
                              <div className="flex items-center text-yellow-400 gap-0.5 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-current' : 'text-gray-800'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString() : (review.date || 'Recently')}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed italic">"{review.comment || review.text}"</p>
                        {review.image && (
                          <img src={review.image} alt="Ref" className="h-24 w-full object-cover rounded-2xl border border-white/5" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      No reviews yet. Be the first to review this product!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        <div className="mt-40 border-t border-white/5 pt-24">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white tracking-tighter">You Might Also Like</h2>
              <p className="text-gray-500 font-medium">Curated recommendations for your professional setup</p>
            </div>
            <Link to="/store" className="text-xs font-black uppercase tracking-widest text-brand-purple hover:text-white transition-colors">Explore All Products →</Link>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((related) => (
              <Link key={related.id} to={`/store/${related.slug || related.id}`} className="group space-y-4">
                <div className="w-full aspect-square bg-[#15151A] rounded-[2rem] overflow-hidden border border-white/5 relative shadow-xl">
                  <img
                    src={related.image || related.image_url || 'https://via.placeholder.com/300'}
                    alt={related.name}
                    className="w-full h-full object-center object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 text-center text-xs font-bold text-white uppercase tracking-widest border border-white/10">
                      View details
                    </div>
                  </div>
                </div>
                <div className="px-2 space-y-1">
                  <h3 className="text-white font-bold text-lg tracking-tight group-hover:text-brand-purple transition-colors truncate">{related.name}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-brand-cyan font-black">KES {related.price.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-600 font-bold uppercase">
                      <Check className="w-3 h-3" /> In Stock
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
