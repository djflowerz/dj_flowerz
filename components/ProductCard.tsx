import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Play } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  return (
    <div className="glass-card group relative border border-white/5 rounded-[24px] flex flex-col overflow-hidden hover:border-brand-cyan/30 hover:shadow-[0_8px_30px_rgba(40,230,220,0.1)] transition-all duration-300 h-full">
      <Link to={`/store/${product.slug || product.id}`} className="block relative aspect-w-1 aspect-h-1 bg-black/40 overflow-hidden sm:aspect-none sm:h-64 h-64 border-b border-white/5">
        <img
          src={product.image || product.image_url || 'https://via.placeholder.com/300'}
          alt={product.name}
          className="w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-110 drop-shadow-2xl z-10 relative pl-4 pr-4 pt-4 pb-4"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-end justify-center pb-6">
          <p className="text-white bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest border border-white/10 shadow-xl">View Details</p>
        </div>
      </Link>
      <div className="flex-1 p-5 space-y-3 flex flex-col bg-gradient-to-b from-transparent to-black/20 z-10">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-display font-black text-white truncate pr-2 group-hover:text-brand-cyan transition-colors uppercase tracking-tight">
            <Link to={`/store/${product.slug || product.id}`}>
              {product.name}
            </Link>
          </h3>
          <p className="text-lg font-black text-brand-cyan whitespace-nowrap shadow-sm">KES {product.price.toLocaleString()}</p>
        </div>
        <p className="text-[10px] md:text-xs text-gray-400 font-mono tracking-wider line-clamp-2 flex-1">{product.description}</p>
        <div className="pt-4 mt-auto border-t border-white/10 border-dashed">
          <button
            onClick={handleAddToCart}
            className="btn-premium w-full flex items-center justify-center gap-2 py-3 text-xs md:text-sm"
          >
            <ShoppingBag size={16} /> ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
