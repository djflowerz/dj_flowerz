import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, ChevronRight, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { products, siteConfig } = useData();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  const product = products.find(p => p.id === id) || products[0];
  
  // Set default variant if exists and not selected
  if (product.variants && product.variants.length > 0 && !selectedVariant) {
    setSelectedVariant(product.variants[0]);
  }

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant);
  };

  const whatsappMessage = `Hi, I'm interested in ${product.name} (${selectedVariant || 'Standard'}). Is it available?`;
  const whatsappLink = `https://wa.me/${siteConfig.contact.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(whatsappMessage)}`;

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
                <div className="aspect-square bg-gray-800 rounded-2xl overflow-hidden border border-white/5">
                   <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                {product.images && (
                   <div className="grid grid-cols-4 gap-4">
                      {product.images.map((img, i) => (
                         <div key={i} className="aspect-square rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-brand-purple transition">
                            <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                         </div>
                      ))}
                   </div>
                )}
             </div>

             {/* Info */}
             <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{product.name}</h1>
                <div className="text-2xl font-bold text-brand-purple mb-6">{product.price === 0 ? 'Free' : `KES ${product.price.toLocaleString()}`}</div>
                
                <p className="text-gray-300 leading-relaxed mb-8">
                   {product.description || "High quality product from the DJ Flowerz collection."}
                </p>

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
       </div>
    </div>
  );
};

export default ProductDetails;