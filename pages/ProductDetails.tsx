import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, ChevronRight, ChevronLeft, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const ProductDetails: React.FC = () => {
   const { user } = useAuth();
   const { id } = useParams<{ id: string }>();
   const { addToCart } = useCart();
   const { products, siteConfig } = useData();
   const [quantity, setQuantity] = useState(1);
   const [selectedVariant, setSelectedVariant] = useState<string>('');

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
   if (product.variants && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0]);
   }

   const [activeImage, setActiveImage] = useState(product.image || (product.images?.[0] || ''));
   const allImages = Array.from(new Set([product.image, ...(product.images || [])].filter(Boolean)));

   const nextImage = () => {
      const currentIndex = allImages.indexOf(activeImage);
      const nextIndex = (currentIndex + 1) % allImages.length;
      setActiveImage(allImages[nextIndex]);
   };

   const prevImage = () => {
      const currentIndex = allImages.indexOf(activeImage);
      const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
      setActiveImage(allImages[prevIndex]);
   };

   const handleAddToCart = () => {
      addToCart(product, quantity, selectedVariant);
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
               <div className="space-y-4">
                  <div className="relative aspect-square bg-gray-800 rounded-2xl overflow-hidden border border-white/5 group">
                     <img src={activeImage} alt={product.name} className="w-full h-full object-cover transition duration-500" />

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
                              onClick={() => setActiveImage(img)}
                              className={`aspect-square rounded-lg overflow-hidden border transition ${activeImage === img ? 'border-brand-purple ring-1 ring-brand-purple' : 'border-white/10 hover:border-white/30'}`}
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
                     <span className="text-2xl font-bold text-brand-purple">{product.price === 0 ? 'Free' : `KES ${product.price.toLocaleString()}`}</span>
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
                  {product.variants && (
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

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                     <button
                        onClick={handleAddToCart}
                        className="flex-1 py-4 bg-brand-purple text-white font-bold rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2"
                     >
                        <ShoppingCart size={20} /> {product.price === 0 ? 'Get Now' : 'Add to Cart'}
                     </button>
                     <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-4 bg-[#25D366] text-white font-bold rounded-lg hover:bg-[#20bd5a] transition flex items-center justify-center gap-2"
                     >
                        <MessageCircle size={20} /> WhatsApp
                     </a>
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
               <h2 className="text-2xl font-bold text-white mb-8">Customer Reviews</h2>
               <div className="bg-[#15151A] rounded-xl p-6 border border-white/5 text-center py-12">
                  <div className="text-yellow-500 mb-2 flex justify-center gap-1">
                     {[1, 2, 3, 4, 5].map(star => (
                        <svg key={star} className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                     ))}
                  </div>
                  <p className="text-gray-400 mb-6">No reviews yet. Be the first to review this product!</p>
                  <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold transition">Write a Review</button>
               </div>
            </div>

            {/* Similar Products */}
            <div className="mt-20 border-t border-white/5 pt-12">
               <h2 className="text-2xl font-bold text-white mb-8">Similar Products</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4).map(similar => (
                     <Link key={similar.id} to={`/store/${similar.id}`} className="block bg-[#15151A] rounded-xl overflow-hidden border border-white/5 hover:border-brand-purple/50 transition group">
                        <div className="aspect-square bg-gray-800 overflow-hidden relative">
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
                           <p className="text-brand-purple font-bold text-sm">KES {similar.price.toLocaleString()}</p>
                        </div>
                     </Link>
                  ))}
                  {products.filter(p => p.category === product.category && p.id !== product.id).length === 0 && (
                     <p className="text-gray-500 col-span-full text-center py-8">No similar products found.</p>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default ProductDetails;