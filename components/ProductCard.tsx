import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Star, Zap, Heart, RefreshCw, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'grid' }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  const productImage = product.image || product.image_url || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products/placeholder.jpg';
  const discountPercentage = product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;
  
  if (viewMode === 'list') {
    return (
      <div className="glass-card group relative border border-white/5 rounded-2xl flex flex-col md:flex-row overflow-hidden hover:border-brand-cyan/30 transition-all duration-300 shadow-xl">
        {/* Image Section */}
        <div className="relative w-full md:w-64 h-64 bg-white overflow-hidden border-b md:border-b-0 md:border-r border-white/5 flex-shrink-0 flex items-center justify-center group-hover:bg-gray-50 transition-colors">
          <Link 
            to={`/store/${product.slug || product.id}`} 
            className="w-full h-full flex items-center justify-center p-6"
          >
            <img
              src={productImage}
              alt={product.name}
              className="w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-105 mix-blend-multiply"
            />
          </Link>
          
          {/* Action Icons - revealed on hover */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300 z-30">
            <button className="w-9 h-9 flex items-center justify-center bg-white text-gray-800 rounded-full shadow-lg hover:bg-brand-purple hover:text-white transition-all">
              <Heart size={16} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center bg-white text-gray-800 rounded-full shadow-lg hover:bg-brand-purple hover:text-white transition-all">
              <RefreshCw size={16} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center bg-white text-gray-800 rounded-full shadow-lg hover:bg-brand-purple hover:text-white transition-all">
              <Eye size={16} />
            </button>
          </div>

          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-30">
            {discountPercentage > 0 && (
              <div className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tight">
                {discountPercentage}% OFF
              </div>
            )}
            {product.isHot && (
              <div className="bg-brand-purple text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tight">
                TOP PRODUCT
              </div>
            )}
            {product.sku && (
              <div className="bg-black/60 backdrop-blur-md text-brand-cyan text-[8px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tight border border-brand-cyan/20">
                SKU: {product.sku}
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <span>{product.category}</span>
              {product.brand && (
                <>
                  <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                  <span>{product.brand}</span>
                </>
              )}
            </div>

            <h3 className="text-xl font-display font-black text-white group-hover:text-brand-cyan transition-colors uppercase">
              <Link to={`/store/${product.slug || product.id}`}>
                {product.name}
              </Link>
            </h3>

            <div className="flex items-center gap-1 text-brand-yellow">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill="currentColor" className={i < 4 ? 'text-brand-cyan' : 'text-gray-600'} />
              ))}
              <span className="text-[10px] text-gray-500 ml-1">(12 reviews)</span>
            </div>

            <p className="text-sm text-gray-400 font-medium line-clamp-3 md:line-clamp-2">
              {product.shortDescription || product.description}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-brand-cyan">
                  KES {product.price.toLocaleString()}
                </span>
                {product.compareAtPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    KES {product.compareAtPrice.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-green-400 font-bold mt-1">
                <Zap size={10} fill="currentColor" /> IN STOCK
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="btn-premium flex items-center justify-center gap-2 px-8 py-3 text-xs font-black tracking-widest"
            >
              <ShoppingBag size={18} /> ADD TO CART
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid View (Default)
  return (
    <div className="glass-card group relative border border-white/5 rounded-[24px] flex flex-col overflow-hidden hover:border-brand-cyan/30 hover:shadow-[0_8px_30px_rgba(40,230,220,0.1)] transition-all duration-300 h-full">
      <div className="relative aspect-square bg-white overflow-hidden border-b border-white/5 flex items-center justify-center group-hover:bg-gray-50 transition-colors">
        <Link to={`/store/${product.slug || product.id}`} className="w-full h-full flex items-center justify-center p-8">
          <img
            src={productImage}
            alt={product.name}
            className="w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl z-10 relative mix-blend-multiply"
          />
        </Link>
        
        {/* Action Icons Overlay */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-30">
          <button className="w-10 h-10 flex items-center justify-center bg-white text-gray-800 rounded-full shadow-lg hover:bg-brand-purple hover:text-white transition-all transform hover:scale-110">
            <Heart size={18} />
          </button>
          <button className="w-10 h-10 flex items-center justify-center bg-white text-gray-800 rounded-full shadow-lg hover:bg-brand-purple hover:text-white transition-all transform hover:scale-110">
            <RefreshCw size={18} />
          </button>
          <button className="w-10 h-10 flex items-center justify-center bg-white text-gray-800 rounded-full shadow-lg hover:bg-brand-purple hover:text-white transition-all transform hover:scale-110">
            <Eye size={18} />
          </button>
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-30">
          {discountPercentage > 0 && (
            <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tight">
              {discountPercentage}% OFF
            </div>
          )}
          {product.isHot && (
            <div className="bg-brand-purple text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tight">
              TOP PRODUCT
            </div>
          )}
          {product.sku && (
            <div className="bg-black/60 backdrop-blur-md text-brand-cyan text-[8px] font-black px-2 py-0.5 rounded shadow-lg uppercase tracking-tight border border-brand-cyan/20">
              SKU: {product.sku}
            </div>
          )}
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-end justify-center pb-6">
          <Link to={`/store/${product.slug || product.id}`} className="text-white bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest border border-white/10 shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
            View Details
          </Link>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-3 flex flex-col bg-gradient-to-b from-transparent to-black/20 z-10">
        <div className="space-y-1">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-display font-black text-white truncate pr-2 group-hover:text-brand-cyan transition-colors uppercase tracking-tight">
              <Link to={`/store/${product.slug || product.id}`}>
                {product.name}
              </Link>
            </h3>
            <p className="text-lg font-black text-brand-cyan whitespace-nowrap">KES {product.price.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {product.sku && (
              <p className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">SKU: {product.sku}</p>
            )}
            <div className="flex gap-0.5 ml-auto">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={8} fill="currentColor" className={i < 4 ? "text-brand-cyan" : "text-gray-700"} />
              ))}
            </div>
          </div>
        </div>
        
        <p className="text-[10px] md:text-xs text-gray-400 font-mono tracking-wider line-clamp-2 flex-1">{product.description}</p>
        
        <div className="pt-4 mt-auto border-t border-white/10 border-dashed">
          <button
            onClick={handleAddToCart}
            className="btn-premium w-full flex items-center justify-center gap-2 py-3 text-xs md:text-sm shadow-[0_5px_15px_rgba(123,92,255,0.2)]"
          >
            <ShoppingBag size={16} /> ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
