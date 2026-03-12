import React from 'react';
import { Edit2, Trash2, ExternalLink, Package, Tag, Box, Info } from 'lucide-react';
import { Product } from '../../types';
import { Link } from 'react-router-dom';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (product: Product) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({ products, onEdit, onDelete, onToggleStatus }) => {
  // Helper to format currency specifically for KES
  const formatKES = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  return (
    <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Product Details</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">SKU / ID</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Stock Level</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Price</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600">
                      <Box size={32} />
                    </div>
                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest">No products found</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-white/[0.02] transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="relative group/img">
                        <div className="absolute -inset-2 bg-brand-purple/20 rounded-2xl blur-xl opacity-0 group-hover/img:opacity-100 transition-opacity" />
                        <img
                          src={product.image_url || product.image || 'https://pub-8ce7dd1a0bfc42fb9e3a130e1f5f5aae.r2.dev/products/placeholder.jpg'}
                          alt={product.name}
                          className="relative h-14 w-14 rounded-2xl object-cover bg-white/5 border border-white/10 ring-1 ring-white/5"
                        />
                      </div>
                      <div>
                        <div className="font-black text-white text-base tracking-tight group-hover:text-brand-purple transition-colors">{product.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                            {product.category || 'General'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <code className="text-[11px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded-lg border border-white/5 tracking-tighter">
                      {product.sku || product.id.slice(0, 8).toUpperCase()}
                    </code>
                  </td>
                  <td className="px-8 py-6 text-center text-[10px] text-gray-500 font-black tracking-widest">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${(product.stock ?? product.inventory ?? 0) < 5
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                      {product.stock ?? product.inventory ?? 0} Units
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-base font-black text-white">{formatKES(product.price)}</div>
                    {(product.compare_at_price || product.compareAtPrice) && (product.compare_at_price || product.compareAtPrice)! > product.price && (
                      <div className="text-[11px] text-gray-600 line-through mt-0.5">{formatKES(product.compare_at_price || product.compareAtPrice || 0)}</div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button
                      onClick={() => onToggleStatus(product)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 ${product.is_active || product.isActive || (product.is_active === undefined && product.isActive === undefined) ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-white/5 text-gray-600 border border-white/5 hover:bg-white/10'
                        }`}
                    >
                      {(product.is_active || product.isActive || (product.is_active === undefined && product.isActive === undefined)) ? 'Active' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(product)}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 hover:border-brand-purple/30 transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(product.id)}
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                      <Link
                        to={`/store/${product.slug || product.id}`}
                        target="_blank"
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all"
                      >
                        <ExternalLink size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductTable;
