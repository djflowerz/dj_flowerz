import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Package, Image as ImageIcon, Type, Hash, DollarSign, Layers, Info, Truck, Tag, Calendar, Upload } from 'lucide-react';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ProductFormProps {
    product?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const generateSlug = (name: string) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose, onSuccess }) => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'shipping' | 'media' | 'specs' | 'interactive'>('basic');
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        brand: '',
        type: 'physical',
        description: '',
        category: '',
        is_active: true,
        release_date: new Date().toISOString().split('T')[0],
        image_url: '',
        images: [] as string[],
        technicalDetails: [] as { title: string; description: string }[],
        hotspots: [] as { x: number; y: number; title: string; description: string }[],
        useCases: [] as { title: string; description: string; icon?: string }[],
        variantGroups: [] as any[],
        variants: [
            { id: crypto.randomUUID(), name: 'Default', sku: '', price: 0, compare_at_price: 0, stock_quantity: 10, weight: 0 }
        ],
        dimensions: '',
        model: '',
        material: '',
        shippingSize: '',
        weight: 0,
        sku: '',
        // Digital fields
        digital_file_url: '',
        os: 'None',
        download_password: '',
        // Visibility & Marketing
        is_hot: false,
        is_featured: false,
        is_best_seller: false,
        is_special_offer: false,
        is_trending: false,
        offer_expiry: '',
        price_local: 0,
        price_air: 0,
        price_sea: 0
    });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                slug: product.slug || '',
                brand: product.brand || '',
                type: product.type || 'physical',
                description: product.description || '',
                category: product.category || product.category_id || 'Uncategorized',
                is_active: product.is_active === 1 || product.is_active === true,
                release_date: (product.release_date || '').split('T')[0] || new Date().toISOString().split('T')[0],
                image_url: product.image_url || product.variants?.[0]?.image_url || '',
                features: product.features ? (typeof product.features === 'string' ? JSON.parse(product.features) : product.features) : [],
                technicalDetails: product.technicalDetails || (product.technical_details ? (typeof product.technical_details === 'string' ? JSON.parse(product.technical_details) : product.technical_details) : []),
                hotspots: product.hotspots || [],
                useCases: product.useCases || (product.use_cases ? (typeof product.use_cases === 'string' ? JSON.parse(product.use_cases) : product.use_cases) : []),
                variantGroups: product.variantGroups || (product.variant_groups ? (typeof product.variant_groups === 'string' ? JSON.parse(product.variant_groups) : product.variant_groups) : []),
                variants: product.variants?.length > 0 ? product.variants : [
                    { id: crypto.randomUUID(), name: 'Default', sku: '', price: 0, compare_at_price: 0, stock_quantity: 10, weight: 0 }
                ],
                dimensions: product.dimensions || '',
                model: product.model || '',
                material: product.material || '',
                shippingSize: product.shipping_size || product.shippingSize || '',
                weight: product.weight || 0,
                sku: product.sku || '',
                images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
                digital_file_url: product.digital_file_url || '',
                os: product.os || 'None',
                download_password: product.download_password || '',
                is_hot: product.is_hot === 1 || product.is_hot === true,
                is_featured: product.is_featured === 1 || product.is_featured === true,
                is_best_seller: product.is_best_seller === 1 || product.is_best_seller === true,
                is_special_offer: product.is_special_offer === 1 || product.is_special_offer === true,
                is_trending: product.is_trending === 1 || product.is_trending === true,
                offer_expiry: product.offer_expiry || '',
                price_local: product.price_local || product.price || 0,
                price_air: product.price_air || 0,
                price_sea: product.price_sea || 0
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const response = await fetch('/api/admin/r2-upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'x-file-name': file.name,
                    'x-folder': 'products',
                    'content-type': file.type
                },
                body: file
            });

            const result = await response.json();
            if (result.success) {
                setFormData(prev => ({ ...prev, image_url: result.url }));
                toast.success('Product image uploaded!');
            } else {
                throw new Error(result.error);
            }
        } catch (e: any) {
            toast.error('Upload failed: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = product ? 'PUT' : 'POST';
            const endpoint = product ? `/api/admin/products/${product.id}` : '/api/admin/products';

            // Ensure first variant gets the global image URL if not set
            const payload = {
                ...formData,
                id: product ? product.id : (formData.slug || generateSlug(formData.name)),
                inventory: formData.variants.reduce((total, v) => total + (parseInt(v.stock_quantity as any) || 0), 0),
                price: formData.price_local, // Main price is local price
                price_local: formData.price_local,
                price_air: formData.price_air,
                price_sea: formData.price_sea,
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
        { id: 'specs', label: 'Specs & Details', icon: Layers },
        { id: 'interactive', label: 'Interactive', icon: ImageIcon },
        { id: 'pricing', label: 'Pricing & Variants', icon: Tag },
        ...(formData.type === 'physical' ? [{ id: 'shipping', label: 'Shipping & Dimensions', icon: Truck }] : []),
        { id: 'marketing', label: 'Marketing', icon: Tag },
        { id: 'media', label: 'Media Highlights', icon: ImageIcon }
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
                            <div className="grid grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Item Designation</label>
                                    <div className="relative group">
                                        <Type className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
                                        <input
                                            id="product-name"
                                            name="name"
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => {
                                                const name = e.target.value;
                                                const updates: any = { name };
                                                if (!product) {
                                                    updates.slug = generateSlug(name);
                                                }
                                                setFormData({ ...formData, ...updates });
                                            }}
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
                                            id="product-brand"
                                            name="brand"
                                            type="text"
                                            value={formData.brand}
                                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all"
                                            placeholder="e.g., oraimo"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Category</label>
                                    <div className="relative group">
                                        <Layers className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
                                        <input
                                            id="product-category"
                                            name="category"
                                            type="text"
                                            value={(formData as any).category || ''}
                                            onChange={e => setFormData({ ...formData, category: e.target.value } as any)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 pl-16 pr-8 text-white focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all"
                                            placeholder="e.g., DJ Equipment"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Data Slug</label>
                                    <input
                                        id="product-slug"
                                        name="slug"
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
                                            id="product-release-date"
                                            name="release_date"
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
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Status</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                        className={`w-full border rounded-2xl py-5 px-8 flex items-center justify-between transition-all ${formData.is_active
                                                ? 'bg-brand-purple/10 border-brand-purple/50 text-brand-purple'
                                                : 'bg-white/[0.03] border-white/10 text-gray-500'
                                            }`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {formData.is_active ? 'Active' : 'Hidden'}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-brand-purple animate-pulse' : 'bg-gray-600'}`} />
                                    </button>
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

                            {formData.type === 'digital' && (
                                <div className="p-8 bg-brand-purple/5 border border-brand-purple/10 rounded-[2.5rem] space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-3">
                                        <Layers className="text-brand-purple" size={20} />
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Digital Fulfillment Asset</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">OS Compatibility</label>
                                            <select
                                                value={formData.os}
                                                onChange={e => setFormData({ ...formData, os: e.target.value })}
                                                className="w-full bg-[#111116] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                                            >
                                                <option value="None">None / Universal</option>
                                                <option value="macOS">macOS</option>
                                                <option value="Windows">Windows</option>
                                                <option value="Android">Android</option>
                                                <option value="iOS">iOS</option>
                                                <option value="Linux">Linux</option>
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Download Password</label>
                                            <input
                                                type="text"
                                                value={formData.download_password}
                                                onChange={e => setFormData({ ...formData, download_password: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                                placeholder="Leave blank for none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Asset URL / Matrix File</label>
                                        <input
                                            type="text"
                                            value={formData.digital_file_url}
                                            onChange={e => setFormData({ ...formData, digital_file_url: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                            placeholder="https://... or Dropbox / GDrive Link"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6 mt-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple flex items-center gap-3">
                                        Key Features
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newFeatures = Array.isArray((formData as any).features) ? [...(formData as any).features, ''] : [''];
                                            setFormData({ ...formData, features: newFeatures } as any);
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center gap-2 transition-all"
                                    >
                                        <Plus size={14} /> Add Feature
                                    </button>
                                </div>
                                <div className="grid gap-3">
                                    {Array.isArray((formData as any).features) && (formData as any).features.map((feature: string, idx: number) => (
                                        <div key={idx} className="flex gap-4 items-center">
                                            <input
                                                type="text"
                                                value={feature}
                                                onChange={e => {
                                                    const newFeatures = [...(formData as any).features];
                                                    newFeatures[idx] = e.target.value;
                                                    setFormData({ ...formData, features: newFeatures } as any);
                                                }}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                                placeholder="e.g., Wireless connectivity"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newFeatures = (formData as any).features.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, features: newFeatures } as any);
                                                }}
                                                className="p-3 text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!(formData as any).features || (formData as any).features.length === 0) && (
                                        <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                            No key features added
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'specs' && (
                        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-300">
                            {/* Technical Details */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple flex items-center gap-3">
                                        <Layers size={18} />
                                        Technical Specifications
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            technicalDetails: [...prev.technicalDetails, { title: '', description: '' }]
                                        }))}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center gap-2 transition-all"
                                    >
                                        <Plus size={14} /> Add Spec
                                    </button>
                                </div>
                                <div className="grid gap-4">
                                    {formData.technicalDetails.map((spec, idx) => (
                                        <div key={idx} className="flex gap-4 items-start group">
                                            <input
                                                id={`spec-title-${idx}`}
                                                name={`spec_title_${idx}`}
                                                type="text"
                                                value={spec.title}
                                                onChange={e => {
                                                    const newSpecs = [...formData.technicalDetails];
                                                    newSpecs[idx].title = e.target.value;
                                                    setFormData({ ...formData, technicalDetails: newSpecs });
                                                }}
                                                placeholder="Title (e.g. Engine)"
                                                className="flex-[1] bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                            />
                                            <input
                                                id={`spec-desc-${idx}`}
                                                name={`spec_description_${idx}`}
                                                type="text"
                                                value={spec.description}
                                                onChange={e => {
                                                    const newSpecs = [...formData.technicalDetails];
                                                    newSpecs[idx].description = e.target.value;
                                                    setFormData({ ...formData, technicalDetails: newSpecs });
                                                }}
                                                placeholder="Description / Value"
                                                className="flex-[2] bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newSpecs = formData.technicalDetails.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, technicalDetails: newSpecs });
                                                }}
                                                className="p-3 text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.technicalDetails.length === 0 && (
                                        <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                            No technical specifications defined
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Use Cases */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple flex items-center gap-3">
                                        <Info size={18} />
                                        Primary Use Cases
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            useCases: [...prev.useCases, { title: '', description: '' }]
                                        }))}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center gap-2 transition-all"
                                    >
                                        <Plus size={14} /> Add Use Case
                                    </button>
                                </div>
                                <div className="grid gap-4">
                                    {formData.useCases.map((uc, idx) => (
                                        <div key={idx} className="flex gap-4 items-start group">
                                            <input
                                                id={`usecase-title-${idx}`}
                                                name={`usecase_title_${idx}`}
                                                type="text"
                                                value={uc.title}
                                                onChange={e => {
                                                    const newUC = [...formData.useCases];
                                                    newUC[idx].title = e.target.value;
                                                    setFormData({ ...formData, useCases: newUC });
                                                }}
                                                placeholder="Title (e.g. Studio)"
                                                className="flex-[1] bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                            />
                                            <textarea
                                                rows={2}
                                                value={uc.description}
                                                onChange={e => {
                                                    const newUC = [...formData.useCases];
                                                    newUC[idx].description = e.target.value;
                                                    setFormData({ ...formData, useCases: newUC });
                                                }}
                                                placeholder="Description of the use case..."
                                                className="flex-[2] bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newUC = formData.useCases.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, useCases: newUC });
                                                }}
                                                className="p-3 text-gray-600 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.useCases.length === 0 && (
                                        <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                                            No use cases defined
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'interactive' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple flex items-center gap-3">
                                        <ImageIcon size={18} />
                                        Interactive Hotspots
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            hotspots: [...prev.hotspots, { x: 50, y: 50, title: '', description: '' }]
                                        }))}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center gap-2 transition-all"
                                    >
                                        <Plus size={14} /> Add Hotspot
                                    </button>
                                </div>

                                <div className="grid gap-6">
                                    {formData.hotspots.map((hs, idx) => (
                                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hotspot #{idx + 1}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newHS = formData.hotspots.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, hotspots: newHS });
                                                    }}
                                                    className="p-1 text-gray-600 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">X Position (%)</label>
                                                    <input
                                                        id={`hotspot-x-${idx}`}
                                                        name={`hotspot_x_${idx}`}
                                                        type="number"
                                                        value={hs.x}
                                                        onChange={e => {
                                                            const newHS = [...formData.hotspots];
                                                            newHS[idx].x = Number(e.target.value);
                                                            setFormData({ ...formData, hotspots: newHS });
                                                        }}
                                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Y Position (%)</label>
                                                    <input
                                                        id={`hotspot-y-${idx}`}
                                                        name={`hotspot_y_${idx}`}
                                                        type="number"
                                                        value={hs.y}
                                                        onChange={e => {
                                                            const newHS = [...formData.hotspots];
                                                            newHS[idx].y = Number(e.target.value);
                                                            setFormData({ ...formData, hotspots: newHS });
                                                        }}
                                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Title</label>
                                                <input
                                                    id={`hotspot-title-${idx}`}
                                                    name={`hotspot_title_${idx}`}
                                                    type="text"
                                                    value={hs.title}
                                                    onChange={e => {
                                                        const newHS = [...formData.hotspots];
                                                        newHS[idx].title = e.target.value;
                                                        setFormData({ ...formData, hotspots: newHS });
                                                    }}
                                                    placeholder="e.g. Premium Leather"
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
                                                <textarea
                                                    rows={2}
                                                    value={hs.description}
                                                    onChange={e => {
                                                        const newHS = [...formData.hotspots];
                                                        newHS[idx].description = e.target.value;
                                                        setFormData({ ...formData, hotspots: newHS });
                                                    }}
                                                    placeholder="Detailed description of this feature..."
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {formData.hotspots.length === 0 && (
                                        <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                                            No hotspots defined.<br/>Use hotspots to highlight key features visually.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-300">
                            {/* Variant Groups Definition */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple flex items-center gap-3">
                                        <Layers size={18} />
                                        Configuration Groups
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            variantGroups: [...prev.variantGroups, { name: '', options: [] }]
                                        }))}
                                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center gap-2 transition-all"
                                    >
                                        <Plus size={14} /> Add Group
                                    </button>
                                </div>
                                <div className="grid gap-4">
                                    {formData.variantGroups.map((group, gIdx) => (
                                        <div key={gIdx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                                            <div className="flex gap-4 items-center">
                                                <input
                                                    id={`variant-group-name-${gIdx}`}
                                                    name={`variant_group_name_${gIdx}`}
                                                    type="text"
                                                    value={group.name}
                                                    onChange={e => {
                                                        const newGroups = [...formData.variantGroups];
                                                        newGroups[gIdx].name = e.target.value;
                                                        setFormData({ ...formData, variantGroups: newGroups });
                                                    }}
                                                    placeholder="Group Name (e.g. Color)"
                                                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newGroups = formData.variantGroups.filter((_, i) => i !== gIdx);
                                                        setFormData({ ...formData, variantGroups: newGroups });
                                                    }}
                                                    className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {group.options.map((opt: string, oIdx: number) => (
                                                    <div key={oIdx} className="bg-brand-purple/20 border border-brand-purple/30 px-3 py-1 rounded-full flex items-center gap-2 group/opt">
                                                        <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider">{opt}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newGroups = [...formData.variantGroups];
                                                                newGroups[gIdx].options = newGroups[gIdx].options.filter((_: any, i: number) => i !== oIdx);
                                                                setFormData({ ...formData, variantGroups: newGroups });
                                                            }}
                                                            className="text-brand-purple/50 hover:text-brand-purple transition-colors"
                                                        >
                                                            <Plus size={12} className="rotate-45" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <input
                                                    id={`variant-group-option-${gIdx}`}
                                                    name={`variant_group_option_${gIdx}`}
                                                    type="text"
                                                    placeholder="Add option..."
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = (e.target as HTMLInputElement).value.trim();
                                                            if (val) {
                                                                const newGroups = [...formData.variantGroups];
                                                                newGroups[gIdx].options = [...newGroups[gIdx].options, val];
                                                                setFormData({ ...formData, variantGroups: newGroups });
                                                                (e.target as HTMLInputElement).value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-gray-500 focus:outline-none placeholder:text-gray-700 w-24"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {formData.variantGroups.length === 0 && (
                                        <div className="text-center py-6 border border-dashed border-white/5 rounded-2xl text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                            No configuration groups (optional)
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Existing Variants List */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4 text-brand-purple">
                                        <Tag size={20} />
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em]">Product Variants</h3>
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
                                                    id={`variant-name-${index}`}
                                                    name={`variant_name_${index}`}
                                                    type="text"
                                                    value={variant.name}
                                                    onChange={e => handleVariantChange(variant.id, 'name', e.target.value)}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                                    placeholder="Default / Red"
                                                />
                                            </div>
                                             <div className="col-span-2 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-brand-purple ml-2">Local Price (KES)</label>
                                                <div className="relative group">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-purple" size={12} />
                                                    <input
                                                        type="number"
                                                        value={formData.price_local}
                                                        onChange={e => setFormData({ ...formData, price_local: parseFloat(e.target.value) })}
                                                        className="w-full bg-brand-purple/5 border border-brand-purple/20 rounded-xl py-3 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-black"
                                                        placeholder="Local Stock"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-400 ml-2">Air Price (KES)</label>
                                                <div className="relative group">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={12} />
                                                    <input
                                                        type="number"
                                                        value={formData.price_air}
                                                        onChange={e => setFormData({ ...formData, price_air: parseFloat(e.target.value) })}
                                                        className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl py-3 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-black"
                                                        placeholder="Air Import"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-400 ml-2">Sea Price (KES)</label>
                                                <div className="relative group">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={12} />
                                                    <input
                                                        type="number"
                                                        value={formData.price_sea}
                                                        onChange={e => setFormData({ ...formData, price_sea: parseFloat(e.target.value) })}
                                                        className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all font-black"
                                                        placeholder="Sea Import"
                                                    />
                                                </div>
                                            </div>

                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">Old Price (Disc.)</label>
                                                <div className="relative group">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={12} />
                                                    <input
                                                        id={`variant-compare-price-${index}`}
                                                        name={`variant_compare_at_price_${index}`}
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
                                                    id={`variant-stock-${index}`}
                                                    name={`variant_stock_quantity_${index}`}
                                                    type="number"
                                                    value={variant.stock_quantity}
                                                    onChange={e => handleVariantChange(variant.id, 'stock_quantity', parseInt(e.target.value))}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                                />
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-2">SKU</label>
                                                <input
                                                    id={`variant-sku-${index}`}
                                                    name={`variant_sku_${index}`}
                                                    type="text"
                                                    value={variant.sku}
                                                    onChange={e => handleVariantChange(variant.id, 'sku', e.target.value)}
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-mono"
                                                />
                                            </div>
                                            <div className="col-span-1 flex justify-center pb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveVariant(variant.id)}
                                                    className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shipping' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Dimensions (L*W*H)</label>
                                    <input
                                        id="product-dimensions"
                                        name="dimensions"
                                        type="text"
                                        value={formData.dimensions}
                                        onChange={e => setFormData({ ...formData, dimensions: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="e.g., 129.5*32*11 mm"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Weight (kg)</label>
                                    <input
                                        id="product-weight"
                                        name="weight"
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
                                        id="product-model"
                                        name="model"
                                        type="text"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="e.g., OUH-511"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Material</label>
                                    <input
                                        id="product-material"
                                        name="material"
                                        type="text"
                                        value={formData.material}
                                        onChange={e => setFormData({ ...formData, material: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                        placeholder="e.g., Aluminum alloy"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Shipping Size Category</label>
                                    <select
                                        value={formData.shippingSize}
                                        onChange={e => setFormData({ ...formData, shippingSize: e.target.value })}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                                    >
                                        <option value="">Select Category</option>
                                        <option value="small">Small (Accessory, Cable, etc.)</option>
                                        <option value="medium">Medium (Headphones, Compact Controller)</option>
                                        <option value="large">Large (Studio Monitors, Large Controller)</option>
                                        <option value="extra_large">Extra Large (Flight cases, Speakers)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-300">
                            {/* Hero Image */}
                            <div className="space-y-6">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Product Hero Image (Primary Cover)</label>
                                
                                <div className="flex gap-8">
                                    <div className="flex-1 space-y-4">
                                        <div className="relative group">
                                            <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                                            <input
                                                id="product-image-url"
                                                name="image_url"
                                                type="url"
                                                value={formData.image_url}
                                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2-xl py-5 pl-16 pr-8 text-white focus:outline-none focus:border-brand-purple/50 focus:bg-white/[0.05] transition-all"
                                                placeholder="https://... or upload below"
                                            />
                                        </div>

                                        <label className={`w-full h-40 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : 'hover:border-brand-purple/50 hover:bg-white/[0.02]'}`}>
                                            {uploading ? (
                                                <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload size={32} className="text-gray-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Click to upload product image</span>
                                                </>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                    </div>

                                    {formData.image_url && (
                                        <div className="w-56 h-56 relative group">
                                            <div className="absolute inset-0 bg-brand-purple/20 blur-3xl group-hover:bg-brand-purple/30 transition-all" />
                                            <img loading="lazy" src={formData.image_url}
                                                alt="Preview"
                                                className="relative w-full h-full object-contain rounded-3xl border border-white/10 bg-black/40 p-4"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x600/0B0B0F/white?text=Invalid+Image+URL';
                                                }}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Multi-Image Gallery */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Display Gallery Highlights</label>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const url = prompt("Enter image URL:");
                                            if (url) setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
                                        }}
                                        className="text-[10px] font-black uppercase tracking-widest text-brand-purple hover:text-white transition-colors"
                                    >
                                        + Add by URL
                                    </button>
                                </div>
                                <div className="grid grid-cols-5 gap-4">
                                    {formData.images.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square group">
                                            <img loading="lazy" src={img} 
                                                className="w-full h-full object-cover rounded-2xl border border-white/10" 
                                                alt={`Gallery ${idx}`} 
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-brand-purple/50 hover:bg-white/[0.02] cursor-pointer transition-all">
                                        <Plus size={20} className="text-gray-600" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Add Media</span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setUploading(true);
                                                try {
                                                    const response = await fetch('/api/admin/r2-upload', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Authorization': `Bearer ${session?.access_token}`,
                                                            'x-file-name': file.name,
                                                            'x-folder': 'products',
                                                            'content-type': file.type
                                                        },
                                                        body: file
                                                    });
                                                    const result = await response.json();
                                                    if (result.success) {
                                                        setFormData(prev => ({ ...prev, images: [...prev.images, result.url] }));
                                                        toast.success('Gallery image added');
                                                    }
                                                } finally {
                                                    setUploading(false);
                                                }
                                            }} 
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'marketing' && (
                        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple flex items-center gap-3">
                                        <Tag size={18} />
                                        Visibility & Highlights
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { id: 'is_hot', label: 'Hot & New', color: 'bg-orange-500' },
                                            { id: 'is_featured', label: 'Featured Matrix', color: 'bg-blue-500' },
                                            { id: 'is_best_seller', label: 'Best Seller', color: 'bg-amber-500' },
                                            { id: 'is_trending', label: 'Trending Now', color: 'bg-purple-500' },
                                            { id: 'is_special_offer', label: 'Special Offer', color: 'bg-red-500' }
                                        ].map(item => (
                                            <label 
                                                key={item.id}
                                                className={`flex items-center justify-between p-5 rounded-2xl border cursor-pointer transition-all ${
                                                    (formData as any)[item.id] 
                                                        ? 'bg-white/[0.05] border-brand-purple/50' 
                                                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-2 h-2 rounded-full ${item.color} ${ (formData as any)[item.id] ? 'animate-pulse' : 'opacity-20' }`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{item.label}</span>
                                                </div>
                                                <input 
                                                    type="checkbox"
                                                    checked={(formData as any)[item.id]}
                                                    onChange={e => setFormData({ ...formData, [item.id]: e.target.checked } as any)}
                                                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-purple focus:ring-brand-purple transition-all"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-purple flex items-center gap-3">
                                        <Calendar size={18} />
                                        Offer Termination
                                    </h3>
                                    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-4">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                            Set an expiry date for special offers. The product will revert to standard visibility after this pulse.
                                        </p>
                                        <div className="space-y-3 pt-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Offer Expire Date</label>
                                            <input
                                                type="date"
                                                value={formData.offer_expiry}
                                                onChange={e => setFormData({ ...formData, offer_expiry: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
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
