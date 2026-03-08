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
    <div className="group relative bg-brand-card border border-white/5 rounded-xl flex flex-col overflow-hidden hover:border-brand-purple/50 hover:shadow-[0_0_30px_rgba(123,92,255,0.2)] transition-all duration-300 h-full">
      <Link to={`/store/${product.slug || product.id}`} className="block relative aspect-w-1 aspect-h-1 bg-gray-900 overflow-hidden sm:aspect-none sm:h-64 h-64">
        <img
          src={product.image || product.image_url || 'https://via.placeholder.com/300'}
          alt={product.name}
          className="w-full h-full object-center object-cover transform transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <p className="text-white bg-brand-purple px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">View Details</p>
        </div>
      </Link>
      <div className="flex-1 p-5 space-y-3 flex flex-col">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-display font-semibold text-white truncate pr-2 hover:text-brand-purple transition">
            <Link to={`/store/${product.slug || product.id}`}>
              {product.name}
            </Link>
          </h3>
          <p className="text-lg font-black text-brand-cyan whitespace-nowrap">KES {product.price.toLocaleString()}</p>
        </div>
        <p className="text-sm text-gray-400 line-clamp-2 flex-1">{product.description}</p>
        <div className="pt-2">
          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-black rounded-lg text-white bg-white/5 hover:bg-brand-purple transition-all duration-300 uppercase tracking-widest"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
