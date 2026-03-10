import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Package, Image as ImageIcon, Type, Hash, DollarSign, Layers, Info, Truck, Tag, Calendar } from 'lucide-react';
import { useAdminApi } from '../hooks/useAdminApi';
import { toast } from 'sonner';

interface ProductFormProps {
    product?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, onSuccess }) => {
    const { request, loading } = useAdminApi();
    const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'shipping' | 'media'>('basic');
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        brand: '',
        type: 'physical',
        description: '',
        category_id: '',
        is_active: true,
        release_date: new Date().toISOString().split('T')[0],
        image_url: '',
        variants: [
            { id: crypto.randomUUID(), name: 'Default', sku: '', price: 0, compare_at_price: 0, stock_quantity: 10, weight: 0 }
        ],
        metadata: {
            dimensions: '',
            model: '',
            material: ''
        }
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                slug: product.slug || '',
                brand: product.brand || '',
                type: product.type || 'physical',
                description: product.description || '',
                category_id: product.category_id || '',
                is_active: product.is_active === 1 || product.is_active === true,
                release_date: (product.release_date || '').split('T')[0] || new Date().toISOString().split('T')[0],
                image_url: product.image_url || product.variants?.[0]?.image_url || '',
                variants: product.variants?.length > 0 ? product.variants : [
                    { id: crypto.randomUUID(), name: 'Default', sku: '', price: 0, compare_at_price: 0, stock_quantity: 10, weight: 0 }
                ],
                metadata: {
                    dimensions: product.metadata?.dimensions || '',
                    model: product.metadata?.model || '',
                    material: product.metadata?.material || ''
                }
            });
        }
    }, [product]);

    const handleAddVariant = () => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, { id: crypto.randomUUID(), name: '', sku: '', price: 0, compare_at_price: 0, stock_quantity: 0, weight: 0 }]
        }));
    };

    const handleRemoveVariant = (id: string) => {
        if (formData.variants.length === 1) {
            toast.error("At least one variant is required.");
            return;
        }
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter(v => v.id !== id)
        }));
    };

    const handleVariantChange = (id: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map(v => v.id === id ? { ...v, [field]: value } : v)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = product ? 'PUT' : 'POST';
            const endpoint = product ? `/api/admin/products/${product.id}` : '/api/admin/products';

            // Ensure first variant gets the global image URL if not set
            const payload = {
                ...formData,
                variants: formData.variants.map((v, i) => ({
                    ...v,
                    image_url: v.image_url || (i === 0 ? formData.image_url : null)
                }))
            };

            await request(endpoint, {
                method,
                body: JSON.stringify(payload)
            });

            toast.success(product ? 'Matrix item recalibrated' : 'New matrix item forged');
            onSuccess();
            onClose();
        } catch (err) {
            // Error handled by hook
        }
    };

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: Info },
        { id: 'pricing', label: 'Pricing & Variants', icon: Tag },
        { id: 'shipping', label: 'Shipping & Dimensions', icon: Truck },
        { id: 'media', label: 'Media', icon: ImageIcon }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[3rem] shadow-[0_0_100px_rgba(139,92,246,0.15)] flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-12 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">
                            {product ? 'Edit Matrix Item' : 'Forge New Item'}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">
                            {product ? `Synchronizing ID: ${product.id}` : 'Initializing new data sequence'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-12 py-4 border-b border-white/5 flex gap-8 bg-black/40">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 border-b-2 transition-all ${activeTab === tab.id
                                    ? 'border-brand-purple text-brand-purple'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-12 py-10">
                    {activeTab === 'basic' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Item Designation</label>
                                    <div className="relative group">
                                        <Type className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all"
                                            placeholder="Product Name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Brand / Manufacturer</label>
                                    <div className="relative group">
                                        <Tag className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={formData.brand}
                                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all"
                                            placeholder="e.g., oraimo"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Data Slug</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="product-slug"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Release Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                        <input
                                            type="date"
                                            value={formData.release_date}
                                            onChange={e => setFormData({ ...formData, release_date: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Item Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                    >
                                        <option value="physical">Physical Product</option>
                                        <option value="digital">Digital Product</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Item Logic / Description</label>
                                <textarea
                                    rows={6}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-3xl py-6 px-8 text-white focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all"
                                    placeholder="Describe the matrix item..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4 text-brand-purple">
                                    <Layers size={20} />
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Variant Schema matrix</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddVariant}
                                    className="bg-white/5 border border-white/10 px-6 py-3 rounded-full flex items-center gap-2 hover:bg-brand-purple hover:border-brand-purple transition-all group"
                                >
                                    <Plus size={16} className="text-gray-400 group-hover:text-white" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Add Variant</span>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formData.variants.map((variant, index) => (
                                    <div key={variant.id} className="grid grid-cols-12 gap-4 items-end bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
                                        <div className="col-span-3 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Variation Name</label>
                                            <input
                                                type="text"
                                                value={variant.name}
                                                onChange={e => handleVariantChange(variant.id, 'name', e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                                placeholder="Default / Red"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Base Price</label>
                                            <div className="relative group">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
                                                <input
                                                    type="number"
                                                    value={variant.price}
                                                    onChange={e => handleVariantChange(variant.id, 'price', parseFloat(e.target.value))}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Old Price (Disc.)</label>
                                            <div className="relative group">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
                                                <input
                                                    type="number"
                                                    value={variant.compare_at_price}
                                                    onChange={e => handleVariantChange(variant.id, 'compare_at_price', parseFloat(e.target.value))}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Stock</label>
                                            <input
                                                type="number"
                                                value={variant.stock_quantity}
                                                onChange={e => handleVariantChange(variant.id, 'stock_quantity', parseInt(e.target.value))}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">SKU</label>
                                            <input
                                                type="text"
                                                value={variant.sku}
                                                onChange={e => handleVariantChange(variant.id, 'sku', e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-center pb-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveVariant(variant.id)}
                                                className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'shipping' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Dimensions (L*W*H)</label>
                                    <input
                                        type="text"
                                        value={formData.metadata.dimensions}
                                        onChange={e => setFormData({ ...formData, metadata: { ...formData.metadata, dimensions: e.target.value } })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="e.g., 129.5*32*11 mm"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.variants[0]?.weight}
                                        onChange={e => handleVariantChange(formData.variants[0].id, 'weight', parseFloat(e.target.value))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Model Number</label>
                                    <input
                                        type="text"
                                        value={formData.metadata.model}
                                        onChange={e => setFormData({ ...formData, metadata: { ...formData.metadata, model: e.target.value } })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="e.g., OUH-511"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Material</label>
                                    <input
                                        type="text"
                                        value={formData.metadata.material}
                                        onChange={e => setFormData({ ...formData, metadata: { ...formData.metadata, material: e.target.value } })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="e.g., Aluminum alloy"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Cover Image URL</label>
                                <div className="relative group">
                                    <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                    <input
                                        type="url"
                                        value={formData.image_url}
                                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all"
                                        placeholder="https://..."
                                    />
                                </div>

                                {formData.image_url && (
                                    <div className="mt-8 relative group w-64 h-64 mx-auto">
                                        <div className="absolute inset-0 bg-brand-purple/20 blur-3xl group-hover:bg-brand-purple/30 transition-all" />
                                        <img
                                            src={formData.image_url}
                                            alt="Preview"
                                            className="relative w-full h-full object-contain rounded-3xl border border-white/10 bg-black/40 p-4"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x600/0B0B0F/white?text=Invalid+Image+URL';
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="px-12 py-10 border-t border-white/5 bg-white/[0.01] flex justify-end gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-10 py-5 rounded-full border border-white/10 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        Abort Sequence
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-brand-purple text-white px-12 py-5 rounded-full flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-purple/30 group disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save size={20} className="group-hover:translate-y-[-2px] transition-transform" />
                        )}
                        <span className="text-[11px] font-black uppercase tracking-widest">
                            {product ? 'Recalibrate Item' : 'Forge Entry'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductForm;
