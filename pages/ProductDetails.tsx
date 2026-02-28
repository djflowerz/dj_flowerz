import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MessageCircle, ChevronRight, ChevronLeft, Minus, Plus, Share2, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const ProductDetails: React.FC = () => {
   const { user } = useAuth();
   const { id } = useParams<{ id: string }>();
   const { addToCart } = useCart();
   const { products, siteConfig, reviews, addReview } = useData();
   const [quantity, setQuantity] = useState(1);
   const [selectedVariant, setSelectedVariant] = useState<string>('');
   const [activeImageIndex, setActiveImageIndex] = useState(0);
   const [reviewRating, setReviewRating] = useState(5);
   const [reviewComment, setReviewComment] = useState('');
   const [isSubmittingReview, setIsSubmittingReview] = useState(false);

   const product = products.find(p => p.id === id);

   // Allow Admin to see draft/hidden products for preview
   const isVisible = product && (user?.isAdmin || (product.status !== 'hidden' && product.status !== 'draft'));

   if (!product || !isVisible) {
      return (
         <div className="pt-32 pb-20 min-h-screen bg-[#0B0B0F] text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Product Not Found</h1>
            <p className="text-gray-400 mb-8">The product you are looking for does not exist or is unavailable.</p>
            <Link to="/store" className="px-6 py-3 bg-brand-purple text-white rounded-lg font-bold">Back to Store</Link>
         </div>
      );
   }

   // Set default variant if exists and not selected
   if (!selectedVariant) {
      if (product.variantGroups && product.variantGroups.length > 0 && product.variantGroups[0].variants.length > 0) {
         setSelectedVariant(product.variantGroups[0].variants[0].name);
      } else if (product.variants && product.variants.length > 0) {
         setSelectedVariant(product.variants[0]);
      }
   }

   const allImages = Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean)));

   const nextImage = () => {
      setActiveImageIndex((prevIndex) => (prevIndex + 1) % allImages.length);
   };

   const prevImage = () => {
      setActiveImageIndex((prevIndex) => (prevIndex - 1 + allImages.length) % allImages.length);
   };

   const navigate = useNavigate();
   const handleAddToCart = () => {
      addToCart(product, quantity, selectedVariant);
      navigate('/cart');
   };

   const productReviews = reviews.filter(r => r.productId === product.id);
   const averageRating = productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
      : 0;

   const handleReviewSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) {
         alert('You must be logged in to submit a review.');
         return;
      }
      if (!reviewComment.trim()) {
         alert('Please enter a comment for your review.');
         return;
      }

      setIsSubmittingReview(true);
      try {
         await addReview({
            id: Date.now().toString(), // Temporary ID
            productId: product.id,
            userId: user.uid,
            userName: user.displayName || user.email || 'Anonymous',
            rating: reviewRating,
            comment: reviewComment,
            createdAt: new Date().toISOString(),
         });
         setReviewComment('');
         setReviewRating(5);
         alert('Review submitted successfully!');
      } catch (error) {
         console.error('Error submitting review:', error);
         alert('Failed to submit review. Please try again.');
      } finally {
         setIsSubmittingReview(false);
      }
   };

   const whatsappMessage = `Hi, I'm interested in ${product.name} (${selectedVariant || 'Standard'}). Is it available?`;
   const whatsappLink = `https://wa.me/${siteConfig.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

   return (
      <div className="pt-24 pb-20 bg-[#0B0B0F] min-h-screen">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
               <Link to="/store" className="hover:text-white">Store</Link>
               <ChevronRight size={14} />
               <span className="capitalize">{product.category}</span>
               <ChevronRight size={14} />
               <span className="text-gray-300">{product.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Gallery */}
               <div className="aspect-square rounded-2xl overflow-hidden bg-[#15151A] border border-white/5 relative group">
                  <img
                     src={allImages[activeImageIndex]}
                     alt={product.name}
                     className="w-full h-full object-cover transition duration-1000 group-hover:scale-110"
                  />

                  {allImages.length > 1 && (
                     <>
                        <button
                           onClick={prevImage}
                           className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand-purple"
                        >
                           <ChevronLeft size={20} />
                        </button>
                        <button
                           onClick={nextImage}
                           className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:bg-brand-purple"
                        >
                           <ChevronRight size={20} />
                        </button>
                     </>
                  )}
               </div>
               {allImages.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                     {allImages.map((img, i) => (
                        <button
                           key={i}
                           onClick={() => setActiveImageIndex(i)}
                           className={`aspect-square rounded-lg overflow-hidden border transition ${activeImageIndex === i ? 'border-brand-purple ring-1 ring-brand-purple' : 'border-white/10 hover:border-white/30'}`}
                        >
                           <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                        </button>
                     ))}
                  </div>
               )}
            </div>

            {/* Info */}
            <div>
               <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{product.name}</h1>
               <div className="flex items-center gap-4 mb-6">
                  {(() => {
                     let displayPrice = product.price;
                     let originalPrice = product.compareAtPrice;

                     // If variant is selected, use variant price
                     if (selectedVariant && product.variantGroups) {
                        for (const group of product.variantGroups) {
                           const v = group.variants.find(varnt => varnt.name === selectedVariant);
                           if (v) {
                              displayPrice = v.price;
                              break;
                           }
                        }
                     } else if (product.discountPrice && product.discountPrice > 0) {
                        displayPrice = product.discountPrice;
                        originalPrice = product.price;
                     }

                     return (
                        <>
                           <span className="text-2xl font-bold text-brand-purple">
                              {displayPrice === 0 ? 'Free' : `KES ${displayPrice.toLocaleString()}`}
                           </span>
                           {originalPrice && originalPrice > displayPrice && (
                              <span className="text-gray-500 line-through text-lg">
                                 KES {originalPrice.toLocaleString()}
                              </span>
                           )}
                        </>
                     );
                  })()}
                  {product.condition && (
                     <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${product.condition === 'new' ? 'bg-green-500/20 text-green-500 border border-green-500/20' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'}`}>
                        {product.condition}
                     </span>
                  )}
               </div>

               <div
                  className="text-gray-300 leading-relaxed mb-8 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description || "High quality product from the DJ Flowerz collection." }}
               />

               {/* Variants */}
               {product.variantGroups && product.variantGroups.length > 0 && (
                  <div className="space-y-6 mb-8">
                     {product.variantGroups.map(group => (
                        <div key={group.name}>
                           <label className="block text-sm font-bold text-gray-400 mb-3">Select {group.name}:</label>
                           <div className="flex flex-wrap gap-3">
                              {group.variants.map(v => (
                                 <button
                                    key={v.id}
                                    onClick={() => setSelectedVariant(v.name)}
                                    className={`px-4 py-2 rounded-lg border text-sm font-bold transition ${selectedVariant === v.name ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/50'}`}
                                 >
                                    <div className="flex flex-col items-center">
                                       <span>{v.name}</span>
                                       <span className="text-[10px] opacity-70">KES {v.price.toLocaleString()}</span>
                                    </div>
                                 </button>
                              ))}
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               {(!product.variantGroups || product.variantGroups.length === 0) && product.variants && product.variants.length > 0 && (
                  <div className="mb-8">
                     <label className="block text-sm font-bold text-gray-400 mb-3">Select Option:</label>
                     <div className="flex flex-wrap gap-3">
                        {product.variants.map(v => (
                           <button
                              key={v}
                              onClick={() => setSelectedVariant(v)}
                              className={`px-4 py-2 rounded-lg border text-sm font-bold transition ${selectedVariant === v ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/50'}`}
                           >
                              {v}
                           </button>
                        ))}
                     </div>
                  </div>
               )}

               {/* Quantity */}
               <div className="mb-8">
                  <label className="block text-sm font-bold text-gray-400 mb-3">Quantity:</label>
                  <div className="flex items-center gap-4">
                     <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-[#15151A] border border-white/10 flex items-center justify-center hover:bg-white/5"><Minus size={16} /></button>
                     <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                     <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-[#15151A] border border-white/10 flex items-center justify-center hover:bg-white/5"><Plus size={16} /></button>
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 mb-8">
                  <button
                     onClick={() => addToCart(product, quantity, selectedVariant)}
                     className="flex-1 py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2"
                  >
                     <ShoppingCart size={20} /> {product.price === 0 ? 'Get Now' : 'Add to Cart'}
                  </button>
                  <div className="flex-1 flex gap-2">
                     <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-[3] py-4 bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#20bd5a] transition flex items-center justify-center gap-2"
                     >
                        <MessageCircle size={20} /> WhatsApp
                     </a>
                     <button
                        onClick={() => {
                           if (navigator.share) {
                              navigator.share({
                                 title: product.name,
                                 text: `Check out ${product.name} on DJ Flowerz!`,
                                 url: window.location.href
                              }).catch(console.error);
                           } else {
                              navigator.clipboard.writeText(window.location.href);
                              alert('Link copied to clipboard!');
                           }
                        }}
                        className="flex-1 py-4 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20 transition flex items-center justify-center"
                     >
                        <Share2 size={20} />
                     </button>
                  </div>
               </div>

               <div className="bg-[#15151A] rounded-xl p-6 border border-white/5 text-sm text-gray-400 space-y-2">
                  <div className="flex justify-between">
                     <span>Category:</span>
                     <span className="text-white capitalize">{product.category}</span>
                  </div>
                  {product.os && (
                     <div className="flex justify-between">
                        <span>OS:</span>
                        <span className="text-white capitalize">{product.os}</span>
                     </div>
                  )}
                  <div className="flex justify-between">
                     <span>Delivery:</span>
                     <span className="text-white">{product.type === 'digital' ? 'Instant Download' : 'Usually ships in 2-3 days'}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Reviews Section */}
         <div className="mt-20 border-t border-white/5 pt-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
               <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Customer Reviews</h2>
                  <div className="flex items-center gap-2">
                     <div className="flex text-yellow-500">
                        {[1, 2, 3, 4, 5].map(star => (
                           <Star key={star} size={16} className={star <= Math.round(product.rating || 4.5) ? "fill-current" : "text-gray-600"} />
                        ))}
                     </div>
                     <span className="text-gray-400 text-sm">{product.reviewCount || 0} reviews</span>
                  </div>
               </div>
               {!user && (
                  <Link to="/login" className="text-brand-purple text-sm font-bold hover:underline">Login to write a review</Link>
               )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Review Form */}
               <div className="lg:col-span-1">
                  {user ? (
                     <div className="bg-[#15151A] rounded-2xl p-6 border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-4">Write a Review</h3>
                        <div className="space-y-4">
                           <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rating</label>
                              <div className="flex gap-2">
                                 {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                       key={star}
                                       onClick={() => setReviewRating(star)}
                                       className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                       <Star size={24} className={star <= reviewRating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"} />
                                    </button>
                                 ))}
                              </div>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Comment</label>
                              <textarea
                                 value={reviewComment}
                                 onChange={(e) => setReviewComment(e.target.value)}
                                 placeholder="Share your thoughts about this product..."
                                 className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-purple min-h-[100px]"
                              />
                           </div>
                           <button
                              onClick={handleReviewSubmit}
                              disabled={isSubmittingReview}
                              className="w-full py-3 bg-brand-purple text-white font-bold rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
                           >
                              {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                           </button>
                        </div>
                     </div>
                  ) : (
                     <div className="bg-[#15151A] rounded-2xl p-6 border border-white/5 text-center">
                        <p className="text-gray-400 text-sm mb-4">You must be logged in to write a review.</p>
                        <Link to="/login" className="inline-block px-6 py-2 bg-white/10 text-white rounded-lg font-bold">Login</Link>
                     </div>
                  )}
               </div>

               {/* Reviews List */}
               <div className="lg:col-span-2 space-y-4">
                  {reviews.filter(r => r.productId === product.id).length > 0 ? (
                     reviews.filter(r => r.productId === product.id).map((r, i) => (
                        <div key={i} className="bg-[#15151A] rounded-2xl p-6 border border-white/5">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <img src={r.userAvatar || `https://ui-avatars.com/api/?name=${r.userName}`} alt={r.userName} className="w-10 h-10 rounded-full border border-white/10" />
                                 <div>
                                    <h4 className="text-white font-bold text-sm">{r.userName}</h4>
                                    <div className="flex text-yellow-500">
                                       {[1, 2, 3, 4, 5].map(star => (
                                          <Star key={star} size={12} className={star <= r.rating ? "fill-current" : "text-gray-600"} />
                                       ))}
                                    </div>
                                 </div>
                              </div>
                              <span className="text-[10px] text-gray-500">{new Date(r.date || r.createdAt).toLocaleDateString()}</span>
                           </div>
                           <p className="text-gray-300 text-sm leading-relaxed">{r.comment}</p>
                        </div>
                     ))
                  ) : (
                     <div className="bg-[#15151A] rounded-2xl p-12 border border-white/5 text-center">
                        <p className="text-gray-500 italic">No reviews yet for this product. Be the first to share your experience!</p>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Similar Products */}
         <div className="mt-20 border-t border-white/5 pt-12">
            <h2 className="text-2xl font-bold text-white mb-8">Similar Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4).map(similar => (
                  <Link key={similar.id} to={`/store/${similar.id}`} className="block bg-[#15151A] rounded-xl overflow-hidden border border-white/5 hover:border-brand-purple/50 transition group">
                     <div className="aspect-square bg-white overflow-hidden relative">
                        <img src={similar.image} alt={similar.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                        {similar.condition && (
                           <div className="absolute top-2 right-2">
                              <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${similar.condition === 'new' ? 'bg-green-500/90 text-white' : 'bg-yellow-500/90 text-white'}`}>
                                 {similar.condition}
                              </span>
                           </div>
                        )}
                     </div>
                     <div className="p-4">
                        <h3 className="text-white font-bold truncate mb-1">{similar.name}</h3>
                        <div className="flex items-center gap-2">
                           <p className="text-brand-purple font-bold text-sm">
                              {similar.discountPrice && similar.discountPrice > 0
                                 ? `KES ${similar.discountPrice.toLocaleString()}`
                                 : (similar.price === 0 ? 'Free' : `KES ${similar.price.toLocaleString()}`)}
                           </p>
                           {similar.discountPrice && similar.discountPrice > 0 && (
                              <p className="text-gray-500 line-through text-[10px]">
                                 KES {similar.price.toLocaleString()}
                              </p>
                           )}
                        </div>
                     </div>
                  </Link>
               ))}
               {products.filter(p => p.category === product.category && p.id !== product.id).length === 0 && (
                  <p className="text-gray-500 col-span-full text-center py-8">No similar products found.</p>
               )}
            </div>
         </div>
      </div>
   );
};

export default ProductDetails;