import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MessageCircle, ChevronRight, ChevronLeft, Minus, Plus, Share2, Star, Package, Tag, Calendar, ShieldCheck, Truck, RefreshCw, Layers, HardDrive, Info, MessageSquare, User, Send, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const ProductDetails: React.FC = () => {
   const { user, isAuthenticated } = useAuth();
   const { id } = useParams<{ id: string }>();
   const { addToCart } = useCart();
   const { products, siteConfig, reviews, addReview } = useData();

   const [quantity, setQuantity] = useState(1);
   const [selectedVariant, setSelectedVariant] = useState<string>('');
   const [activeImageIndex, setActiveImageIndex] = useState(0);
   const [reviewRating, setReviewRating] = useState(5);
   const [reviewComment, setReviewComment] = useState('');
   const [isSubmittingReview, setIsSubmittingReview] = useState(false);
   const [activeTab, setActiveTab] = useState('description');

   const product = useMemo(() => products.find(p => p.id === id), [products, id]);

   // Allow Admin to see draft/hidden products for preview
   const isVisible = product && (user?.isAdmin || (product.status !== 'hidden' && product.status !== 'draft'));

   // Set default variant if exists and not selected
   React.useEffect(() => {
      if (product && !selectedVariant) {
         if (product.variantGroups && product.variantGroups.length > 0 && product.variantGroups[0].variants.length > 0) {
            setSelectedVariant(product.variantGroups[0].variants[0].name);
         } else if (product.variants && product.variants.length > 0) {
            setSelectedVariant(product.variants[0]);
         }
      }
   }, [product, selectedVariant]);

   if (!product || !isVisible) {
      return (
         <div className="pt-32 pb-20 min-h-screen bg-[#0B0B0F] text-center">
            <h1 className="text-3xl font-bold text-white mb-4 italic font-display">Product Not Found</h1>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">The transmission for this item has been lost or is currently unavailable in our network.</p>
            <Link to="/store" className="px-8 py-4 bg-brand-purple text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition shadow-lg shadow-brand-purple/20">Return to Nexus</Link>
         </div>
      );
   }

   const allImages = Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean)));

   const navigate = useNavigate();
   const handleAddToCart = () => {
      addToCart(product, quantity, selectedVariant);
      navigate('/cart');
   };

   const productReviews = reviews.filter(r => r.productId === product.id);
   const averageRating = productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
      : product.rating || 5;

   const relatedProducts = useMemo(() => {
      return products
         .filter(p => p.category === product.category && p.id !== product.id && p.status === 'published')
         .slice(0, 4);
   }, [products, product.category, product.id]);

   const handleReviewSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isAuthenticated) return;
      if (!reviewComment.trim()) return;

      setIsSubmittingReview(true);
      try {
         await addReview(product.id, reviewRating, reviewComment);
         setReviewComment('');
         setReviewRating(5);
      } catch (error) {
         console.error('Error submitting review:', error);
      } finally {
         setIsSubmittingReview(false);
      }
   };

   const whatsappMessage = `Hi DJ Flowerz, I'm interested in viewing: ${product.name} (${selectedVariant || 'Standard'}).\n\nIs this available in stock?`;
   const whatsappNumber = (siteConfig.contact.whatsapp || '').replace(/\D/g, '');
   const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

   // Specs Helper
   const productSpecs = [
      { label: 'Brand', value: product.brand || 'Premium Quality' },
      { label: 'Category', value: product.category },
      { label: 'Status', value: product.stock > 0 ? 'In Stock' : 'Out of Stock' },
      { label: 'SKU', value: product.sku || `PROD-${product.id.substring(0, 8).toUpperCase()}` },
      { label: 'Rating', value: `${averageRating.toFixed(1)} / 5.0` },
      { label: 'Release Date', value: product.releaseDate ? new Date(product.releaseDate).toLocaleDateString() : new Date(product.createdAt || Date.now()).toLocaleDateString() },
   ];

   return (
      <div className="pt-24 pb-20 bg-[#0B0B0F] min-h-screen selection:bg-brand-purple/30">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Breadcrumb & Navigation */}
            <div className="flex justify-between items-center mb-10">
               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <Link to="/store" className="hover:text-white transition-colors">Store</Link>
                  <ChevronRight size={10} className="text-brand-purple" />
                  <span className="text-brand-purple/80 cursor-default">{product.category}</span>
                  <ChevronRight size={10} className="text-white/20" />
                  <span className="text-white truncate max-w-[150px]">{product.name}</span>
               </div>

               <div className="flex gap-2">
                  <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                     <ChevronLeft size={20} />
                  </button>
                  <button
                     onClick={() => {
                        if (navigator.share) {
                           navigator.share({ title: product.name, text: `Explore ${product.name} on DJ Flowerz!`, url: window.location.href });
                        } else {
                           navigator.clipboard.writeText(window.location.href);
                           alert('Signal Encrypted & Copied to Clipboard');
                        }
                     }}
                     className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                     <Share2 size={18} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-20">
               {/* Left: Image Gallery */}
               <div className="space-y-6">
                  <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-white border border-white/5 shadow-2xl group">
                     <img
                        src={allImages[activeImageIndex]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

                     {/* Image Navigation Arrows */}
                     {allImages.length > 1 && (
                        <>
                           <button
                              onClick={() => setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1))}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand-purple"
                           >
                              <ChevronLeft size={24} />
                           </button>
                           <button
                              onClick={() => setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0))}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand-purple"
                           >
                              <ChevronRight size={24} />
                           </button>
                        </>
                     )}
                  </div>

                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                     <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {allImages.map((img, idx) => (
                           <button
                              key={idx}
                              onClick={() => setActiveImageIndex(idx)}
                              className={`relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${activeImageIndex === idx ? 'border-brand-purple scale-105 shadow-lg shadow-brand-purple/20' : 'border-white/5 hover:border-white/20'}`}
                           >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                              {activeImageIndex !== idx && <div className="absolute inset-0 bg-black/40" />}
                           </button>
                        ))}
                     </div>
                  )}
               </div>

               {/* Right: Product Info */}
               <div className="flex flex-col">
                  <div className="mb-8">
                     <div className="flex items-center gap-4 mb-4">
                        <span className="px-4 py-1.5 rounded-full bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-[10px] font-black uppercase tracking-widest">
                           {product.category}
                        </span>
                        {product.isHot && (
                           <span className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              <Star size={10} className="fill-current" /> Trending
                           </span>
                        )}
                     </div>

                     <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight leading-tight">
                        {product.name}
                     </h1>

                     <div className="flex items-center gap-3 mb-8">
                        <div className="flex text-[#E8C053]">
                           {[...Array(5)].map((_, i) => (
                              <Star key={i} size={16} className={i < Math.round(averageRating) ? "fill-current" : "opacity-30"} />
                           ))}
                        </div>
                        <span className="text-gray-500 text-sm font-bold">({productReviews.length} Reviews)</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                        <span className={`text-sm font-bold ${product.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {product.stock > 0 ? `${product.stock} Units In Stock` : 'Out of Stock'}
                        </span>
                     </div>

                     <div className="flex items-baseline gap-4 mb-10 bg-white/5 p-6 rounded-[2rem] border border-white/10 w-fit">
                        <span className="text-4xl md:text-5xl font-display font-black text-brand-cyan">
                           KES {product.discountPrice && product.discountPrice > 0 ? product.discountPrice.toLocaleString() : product.price.toLocaleString()}
                        </span>
                        {product.discountPrice && product.discountPrice > 0 && (
                           <span className="text-xl text-gray-500 line-through opacity-50 font-bold italic">
                              KES {product.price.toLocaleString()}
                           </span>
                        )}
                     </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                     {productSpecs.map((spec, idx) => (
                        <div key={idx} className="bg-[#15151A] p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                           <span className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1.5">{spec.label}</span>
                           <span className="text-white font-bold text-sm tracking-tight">{spec.value}</span>
                        </div>
                     ))}
                  </div>

                  {/* Variant Selection */}
                  {(product.variantGroups && product.variantGroups.length > 0) ? (
                     <div className="mb-10 space-y-6">
                        {product.variantGroups.map((group, gIdx) => (
                           <div key={gIdx}>
                              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Select {group.name}</label>
                              <div className="flex flex-wrap gap-3">
                                 {group.variants.map((variant, vIdx) => (
                                    <button
                                       key={vIdx}
                                       onClick={() => setSelectedVariant(variant.name)}
                                       className={`px-6 py-3 rounded-2xl border-2 text-xs font-bold uppercase tracking-widest transition-all ${selectedVariant === variant.name ? 'border-brand-purple bg-brand-purple/10 text-white' : 'border-white/5 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}
                                    >
                                       {variant.name}
                                       {variant.price && variant.price > 0 && <span className="ml-2 opacity-50">+ KES {variant.price.toLocaleString()}</span>}
                                    </button>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : (product.variants && product.variants.length > 0) && (
                     <div className="mb-10">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">Select Option</label>
                        <div className="flex flex-wrap gap-3">
                           {product.variants.map((variant, idx) => (
                              <button
                                 key={idx}
                                 onClick={() => setSelectedVariant(variant)}
                                 className={`px-6 py-3 rounded-2xl border-2 text-xs font-bold uppercase tracking-widest transition-all ${selectedVariant === variant ? 'border-brand-purple bg-brand-purple/10 text-white' : 'border-white/5 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}
                              >
                                 {variant}
                              </button>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Quantity & Actions */}
                  <div className="flex items-center gap-6 mb-8">
                     <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
                        <button
                           onClick={() => setQuantity(Math.max(1, quantity - 1))}
                           className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                           <Minus size={18} />
                        </button>
                        <span className="w-12 text-center text-white font-black text-lg">{quantity}</span>
                        <button
                           onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                           className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                           <Plus size={18} />
                        </button>
                     </div>
                     <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sync Quantity</p>
                  </div>

                  <div className="space-y-4">
                     <div className="flex gap-4">
                        <button
                           onClick={handleAddToCart}
                           disabled={product.stock <= 0}
                           className="flex-1 h-16 bg-brand-purple text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-purple-600 transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale shadow-lg shadow-brand-purple/20"
                        >
                           <ShoppingCart size={20} />
                           {product.stock > 0 ? 'Deploy to Loadout' : 'Signal Lost'}
                        </button>
                        <a
                           href={whatsappLink}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors group"
                        >
                           <MessageCircle size={20} className="text-[#25D366] group-hover:scale-110 transition-transform" />
                        </a>
                     </div>
                  </div>
               </div>
            </div>

            {/* Content Tabs */}
            <div className="mt-32">
               <div className="flex gap-12 border-b border-white/10 mb-12">
                  <button
                     onClick={() => setActiveTab('description')}
                     className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'description' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                     Specs & Description
                     {activeTab === 'description' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-purple rounded-t-full shadow-[0_-4px_10px_rgba(168,85,247,0.4)]" />}
                  </button>
                  <button
                     onClick={() => setActiveTab('reviews')}
                     className={`pb-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'reviews' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                     Transmission Feed ({productReviews.length})
                     {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-purple rounded-t-full shadow-[0_-4px_10px_rgba(168,85,247,0.4)]" />}
                  </button>
               </div>

               <div className="min-h-[400px]">
                  {activeTab === 'description' ? (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
                        <div className="lg:col-span-2 space-y-8">
                           <div className="prose prose-invert max-w-none">
                              <h3 className="text-2xl font-display font-bold text-white mb-6">Technical Overview</h3>
                              <div
                                 className="text-gray-400 leading-relaxed text-lg ql-viewer"
                                 dangerouslySetInnerHTML={{ __html: product.description || "High quality transmission asset from the DJ Flowerz collection. Built for performance and longevity." }}
                              />
                           </div>

                           {product.tags && product.tags.length > 0 && (
                              <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 {product.tags.map(tag => (
                                    <div key={tag} className="flex items-center gap-3 p-4 bg-[#15151A] rounded-2xl border border-white/5">
                                       <div className="w-2 h-2 rounded-full bg-brand-purple shadow-sm shadow-brand-purple" />
                                       <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{tag}</span>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>

                        <div className="lg:col-span-1">
                           <div className="bg-[#15151A]/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                              <div className="flex items-center gap-3">
                                 <Info size={18} className="text-brand-purple" />
                                 <h4 className="font-bold text-white">Security & Guarantee</h4>
                              </div>
                              <ul className="space-y-4 text-xs font-medium text-gray-500">
                                 <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1 h-1 rounded-full bg-emerald-500" />
                                    <span>24-month manufacturer warranty on all physical units.</span>
                                 </li>
                                 <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1 h-1 rounded-full bg-emerald-500" />
                                    <span>Instant digital delivery for all nexus-connected assets.</span>
                                 </li>
                                 <li className="flex items-start gap-3">
                                    <div className="mt-1 w-1 h-1 rounded-full bg-emerald-500" />
                                    <span>Verified original hardware sourced through global network.</span>
                                 </li>
                              </ul>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
                        <div className="lg:col-span-1 space-y-8 lg:sticky lg:top-24 h-fit">
                           <div className="bg-[#15151A] p-10 rounded-[2.5rem] border border-white/5 text-center">
                              <h3 className="text-4xl font-black text-white mb-2 leading-none">{averageRating.toFixed(1)}</h3>
                              <div className="flex justify-center text-yellow-500 mb-4">
                                 {[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} className={s <= Math.round(averageRating) ? 'fill-current' : 'text-gray-700'} />)}
                              </div>
                              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Base Rating from {productReviews.length} Clients</p>

                              <div className="mt-10 space-y-3">
                                 {[5, 4, 3, 2, 1].map(stars => {
                                    const count = productReviews.filter(r => r.rating === stars).length;
                                    const perc = productReviews.length > 0 ? (count / productReviews.length) * 100 : 0;
                                    return (
                                       <div key={stars} className="flex items-center gap-4 group">
                                          <span className="text-[10px] font-bold text-gray-500 w-3">{stars}</span>
                                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                             <div className="h-full bg-brand-purple shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all duration-1000" style={{ width: `${perc}%` }} />
                                          </div>
                                          <span className="text-[10px] font-bold text-gray-600 w-8">{Math.round(perc)}%</span>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>

                           {isAuthenticated ? (
                              <div className="bg-[#15151A] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                                 <h4 className="font-bold text-white flex items-center gap-2 pt-2">
                                    <MessageSquare size={18} className="text-brand-purple" /> Initialize Report
                                 </h4>
                                 <div className="flex gap-2 mb-4">
                                    {[1, 2, 3, 4, 5].map(star => (
                                       <button key={star} onClick={() => setReviewRating(star)} className="focus:outline-none transition-transform hover:scale-125">
                                          <Star size={24} className={star <= reviewRating ? "text-yellow-500 fill-yellow-500" : "text-gray-700"} />
                                       </button>
                                    ))}
                                 </div>
                                 <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Input transmission feedback..."
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs font-bold placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-purple/50 min-h-[120px] resize-none"
                                 />
                                 <button
                                    onClick={handleReviewSubmit}
                                    disabled={isSubmittingReview || !reviewComment.trim()}
                                    className="w-full py-4 bg-brand-purple text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                 >
                                    {isSubmittingReview ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                                    {isSubmittingReview ? 'Processing...' : 'Deploy Report'}
                                 </button>
                              </div>
                           ) : (
                              <div className="bg-[#15151A] p-10 rounded-[2.5rem] border border-white/5 text-center">
                                 <User size={32} className="mx-auto text-gray-800 mb-4" />
                                 <p className="text-sm font-bold text-gray-600 mb-6">Unauthorized access to reporting system.</p>
                                 <Link to="/login" className="inline-block px-10 py-4 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition">Identify</Link>
                              </div>
                           )}
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                           <div className="flex items-center justify-between mb-8">
                              <h3 className="text-2xl font-display font-bold text-white">Global Feed</h3>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
                                 Sorted by <span className="text-brand-purple">Recency</span>
                              </div>
                           </div>

                           {productReviews.length > 0 ? (
                              productReviews.map((r, i) => (
                                 <div key={r.id || i} className="bg-[#15151A] rounded-[2.5rem] p-8 border border-white/5 relative group hover:border-brand-purple/20 transition-all duration-500">
                                    <div className="flex justify-between items-start mb-6">
                                       <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-black">
                                             {r.userName?.substring(0, 1).toUpperCase() || 'U'}
                                          </div>
                                          <div>
                                             <h4 className="text-white font-black text-sm uppercase tracking-tight">{r.userName}</h4>
                                             <div className="flex text-yellow-500 mt-1">
                                                {[1, 2, 3, 4, 5].map(star => <Star key={star} size={10} className={star <= r.rating ? "fill-current" : "text-gray-800"} />)}
                                             </div>
                                          </div>
                                       </div>
                                       <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{new Date(r.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed font-medium pl-2 border-l border-brand-purple/10">{r.comment}</p>
                                 </div>
                              ))
                           ) : (
                              <div className="bg-[#15151A] rounded-[2.5rem] p-24 border-2 border-dashed border-white/5 text-center">
                                 <MessageSquare size={48} className="mx-auto text-gray-800 mb-6" />
                                 <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">No active transmissions in the feed.</p>
                              </div>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* Recommendations */}
            <div className="mt-40">
               <div className="flex justify-between items-end mb-12">
                  <div>
                     <h2 className="text-3xl font-display font-bold text-white mb-2">Simulated Matches</h2>
                     <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Recommended additions to your current loadout</p>
                  </div>
                  <Link to="/store" className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple hover:text-white transition flex items-center gap-2">Explore Store <ChevronRight size={12} /></Link>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {relatedProducts.map(similar => (
                     <Link key={similar.id} to={`/store/${similar.id}`} className="group relative bg-[#15151A] rounded-[2rem] overflow-hidden border border-white/5 hover:border-brand-purple/40 transition-all duration-700">
                        <div className="aspect-[4/5] overflow-hidden relative p-4">
                           <div className="w-full h-full rounded-2xl overflow-hidden relative">
                              <img src={similar.image} alt={similar.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-transparent opacity-60 group-hover:opacity-40" />
                           </div>
                        </div>
                        <div className="p-8 pt-2">
                           <h3 className="text-white font-black text-sm uppercase tracking-tight truncate mb-2 group-hover:text-brand-purple transition-colors">{similar.name}</h3>
                           <div className="flex items-center justify-between">
                              <p className="text-brand-purple font-black text-lg font-display">
                                 {similar.discountPrice ? `KES ${similar.discountPrice.toLocaleString()}` : (similar.price === 0 ? 'Free' : `KES ${similar.price.toLocaleString()}`)}
                              </p>
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-brand-purple group-hover:text-white transition-all">
                                 <Plus size={16} />
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
};

export default ProductDetails;