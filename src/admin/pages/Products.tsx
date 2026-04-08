import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { Plus, Package, Edit2, Trash2, Eye, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import ProductForm from '../components/ProductForm';

const Products: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (session) loadProducts();
    }, [session]);

    const loadProducts = async () => {
        try {
            const data = await request(`/api/admin/products?t=${Date.now()}`);
            setProducts(data || []);
        } catch (e) {
            // Error handled by hook
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item from the matrix?')) return;
        try {
            await request(`/api/admin/products/${id}`, { method: 'DELETE' });
            toast.success('Matrix item decommissioned successfully');
            loadProducts();
        } catch (e) {
            // Error handled by hook
        }
    };

    const filteredProducts = products.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Inventory Matrix">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div className="flex gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:flex-none">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={18} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            type="text"
                            placeholder="SEARCH MATRIX ITEMS..."
                            className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-16 pr-8 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all w-full lg:w-80 shadow-inner"
                        />
                    </div>
                    <button className="bg-[#0B0B0F] border border-white/10 px-6 py-4 rounded-full flex items-center gap-3 hover:bg-white/5 transition-all group shrink-0">
                        <Filter size={18} className="text-gray-500 group-hover:text-brand-purple transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 hidden sm:inline">Filters</span>
                    </button>
                </div>

                <button
                    onClick={() => {
                        setEditingProduct(null);
                        setIsFormOpen(true);
                    }}
                    className="bg-brand-purple text-white px-10 py-5 rounded-[2.5rem] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-purple/30 group"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Forge New Product</span>
                </button>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Matrix Item</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Category</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Inventory</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                            <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-right text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {loading && products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Scanning Grid...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-40">
                                        <Package size={48} className="text-gray-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">No matching signals in repository</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden group-hover:scale-110 transition-transform">
                                            {product.image_url ? (
                                                <img src={product.image_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Package size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white tracking-tighter mb-1 group-hover:text-brand-purple transition-colors">{product.name}</p>
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{product.slug}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400">
                                        {product.category_name || 'Uncategorized'}
                                    </span>
                                </td>
                                <td className="px-8 py-8">
                                    <span className="text-[11px] font-black text-white">{product.variant_count || 0} Variants</span>
                                    <p className="text-[9px] font-bold text-gray-600 mt-1 uppercase tracking-widest">KSh {product.price?.toLocaleString() || 0}</p>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${product.is_active ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-red-400'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${product.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {product.is_active ? 'Active' : 'Offline'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex justify-end gap-3">
                                        <button 
                                            onClick={() => window.open(`/products/${product.slug || product.id}`, '_blank')}
                                            className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:border-brand-purple/30 transition-all hover:scale-110"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingProduct(product);
                                                setIsFormOpen(true);
                                            }}
                                            className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-brand-purple hover:border-brand-purple/30 transition-all hover:scale-110"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="w-12 h-12 rounded-xl border border-white/5 bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-500/30 transition-all hover:scale-110"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isFormOpen && (
                <ProductForm
                    product={editingProduct}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={loadProducts}
                />
            )}
        </AdminLayout>
    );
};

export default Products;
