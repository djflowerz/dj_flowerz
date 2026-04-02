import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Package, Truck, Layers, Settings, X, Plus, Trash2, List, Save, Info, CheckCircle2 } from 'lucide-react';
import { ImageUpload, MultiImageUpload, FileUpload } from './UploadComponents';

interface AddProductFormProps {
  onSave: (product: Product) => Promise<void>;
  initialData?: Product | null;
  onCancel: () => void;
  isSaving?: boolean;
}

type TabType = 'basic' | 'variants' | 'shipping' | 'advanced' | 'marketing';

const AddProductForm: React.FC<AddProductFormProps> = ({ onSave, initialData, onCancel, isSaving = false }) => {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState<Partial<Product>>({
    ...(initialData || {}),
    id: initialData?.id || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    category: initialData?.category || 'DJ Equipment',
    status: initialData?.status || (initialData?.isActive ? 'published' : 'draft'),
    price: initialData?.price || 0,
    compareAtPrice: initialData?.compareAtPrice || 0,
    sku: initialData?.sku || '',
    shippingPrice: initialData?.shippingPrice || 0,
    meta_title: initialData?.meta_title || '',
    slug: initialData?.slug || '',
    isFeatured: initialData?.isFeatured || false,
    isFree: initialData?.isFree || false,
    whatsappEnabled: initialData?.whatsappEnabled !== false,
    type: (initialData?.type || 'physical') as 'physical' | 'digital' | 'subscription',
    stock: initialData?.stock || initialData?.inventory || 0,
    releaseDate: initialData?.releaseDate || '',
    weight: initialData?.weight || '',
    dimensions: initialData?.dimensions || '',
    shippingSize: initialData?.shippingSize || 'medium',
    features: initialData?.features || [],
    image: initialData?.image || '',
    images: initialData?.images || [],
    variantGroups: initialData?.variantGroups || [],
    isHot: initialData?.isHot || false,
    isBestSeller: initialData?.isBestSeller || false,
    isTrending: initialData?.isTrending || false,
    isSpecialOffer: initialData?.isSpecialOffer || false,
    offerExpiry: initialData?.offerExpiry || '',
    os: initialData?.os || 'None',
    downloadPassword: initialData?.downloadPassword || '',
    brand: initialData?.brand || '',
  });

  const [featuresInput, setFeaturesInput] = useState<string>(
    Array.isArray(initialData?.features) ? initialData.features.join('\n') : ''
  );

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      features: featuresInput.split('\n').map(f => f.trim()).filter(f => f !== '')
    }));
  }, [featuresInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
    }));
  };

  const updateField = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData as Product);
  };

  const tabClasses = (tab: TabType) => `
    flex items-center gap-3 px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative
    ${activeTab === tab
      ? 'text-brand-purple bg-brand-purple/5'
      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}
  `;

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'variants', label: 'Variants', icon: Layers },
    ...(formData.type === 'physical' ? [{ id: 'shipping', label: 'Shipping', icon: Truck }] : []),
    { id: 'marketing', label: 'Marketing', icon: Settings },
    { id: 'advanced', label: 'Advanced', icon: Settings },
  ];

  const CATEGORIES = [
    'DJ Equipment', 'Audio Equipment', 'Headphones', 'Microphones', 
    'Computers & Devices', 'Studio & Production', 'Accessories', 
    'Lighting & Effects', 'DJ Software', 'Merch', 'Samples', 'Presets', 'Tickets', 'Course', 'Other'
  ];

  return (
    <div className="flex flex-col h-full bg-[#0B0B0F] text-white">
        {/* Header (Already in Modal, but we can keep some info) */}
        <div className="flex border-b border-white/5 bg-white/[0.01]">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setActiveTab(tabItem.id as TabType)}
              className={tabClasses(tabItem.id as TabType)}
            >
              <tabItem.icon size={14} /> {tabItem.label}
              {activeTab === tabItem.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-purple shadow-[0_0_10px_#A855F7]" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Product Name</label>
                  <input
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Premium Sample Pack Vol. 1"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your product details..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Brand Name</label>
                  <input
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    placeholder="e.g., Pioneer DJ"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Product Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full bg-[#111116] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                    >
                      <option value="physical">Physical Product</option>
                      <option value="digital">Digital Product</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full bg-[#111116] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {formData.type === 'digital' && (
                  <div className="p-6 bg-brand-purple/5 border border-brand-purple/10 rounded-[2rem] space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <Layers size={16} className="text-brand-purple" />
                       <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Digital Fulfillment</h4>
                    </div>
                    <FileUpload 
                       label="Digital Asset (Matrix File)" 
                       value={formData.digitalFileUrl || ''} 
                       onChange={v => updateField('digitalFileUrl', v)} 
                       required 
                    />
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">Enter URL or upload a file (MP3, ZIP, PDF, etc.)</p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">OS Compatibility</label>
                        <select
                          name="os"
                          value={formData.os}
                          onChange={handleInputChange}
                          className="w-full bg-[#111116] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                        >
                          <option value="None">None / Universal</option>
                          <option value="macOS">macOS</option>
                          <option value="Windows">Windows</option>
                          <option value="Android">Android</option>
                          <option value="iOS">iOS</option>
                          <option value="Linux">Linux</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">File Password</label>
                        <input
                          name="downloadPassword"
                          value={formData.downloadPassword}
                          onChange={handleInputChange}
                          placeholder="Leave blank for none"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full bg-[#111116] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Stock Quantity</label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Release Date</label>
                   <input
                     type="date"
                     name="releaseDate"
                     value={formData.releaseDate}
                     onChange={handleInputChange}
                     className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                   />
                </div>
              </div>

              <div className="space-y-6">
                <ImageUpload 
                  label="Product Media (Cover)" 
                  value={formData.image || ''} 
                  onChange={v => updateField('image', v)} 
                  required 
                />
                
                <MultiImageUpload 
                  label="Product Gallery" 
                  values={formData.images || []} 
                  onChange={v => updateField('images', v)} 
                />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Price (KES)</label>
                    <input
                      type="number"
                      name="price"
                      required
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Compare Price</label>
                    <input
                      type="number"
                      name="compareAtPrice"
                      value={formData.compareAtPrice}
                      onChange={handleInputChange}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium placeholder:text-gray-700"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Features (One per line)</label>
                  <textarea
                    rows={4}
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    placeholder="e.g. Premium Sound Quality&#10;Waterproof IPX7..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Product Variants</h3>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Manage sizes, colors, or versions</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                     const next = [...(formData.variantGroups || [])];
                     next.push({ name: 'New Group', variants: [] });
                     updateField('variantGroups', next);
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-purple text-white text-[11px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-95"
                >
                  <Plus size={14} /> Add Variant Group
                </button>
              </div>

              <div className="space-y-6">
                {(formData.variantGroups || []).map((group, gIdx) => (
                  <div key={gIdx} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 relative group">
                    <button 
                      type="button"
                      onClick={() => {
                        const next = [...(formData.variantGroups || [])];
                        next.splice(gIdx, 1);
                        updateField('variantGroups', next);
                      }}
                      className="absolute top-6 right-6 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="max-w-xs">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Group Name</label>
                      <input
                        value={group.name}
                        onChange={e => {
                          const next = [...(formData.variantGroups || [])];
                          next[gIdx].name = e.target.value;
                          updateField('variantGroups', next);
                        }}
                        placeholder="e.g. Size, Color"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-3">
                      {group.variants.map((variant: any, vIdx: number) => (
                        <div key={variant.id || vIdx} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                          <input
                            placeholder="Option Name"
                            value={variant.name}
                            onChange={e => {
                              const next = [...(formData.variantGroups || [])];
                              next[gIdx].variants[vIdx].name = e.target.value;
                              updateField('variantGroups', next);
                            }}
                            className="bg-transparent border-none text-white text-sm font-medium focus:ring-0 w-32"
                          />
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-600 uppercase">Price</span>
                              <input
                                type="number"
                                value={variant.price}
                                onChange={e => {
                                  const next = [...(formData.variantGroups || [])];
                                  next[gIdx].variants[vIdx].price = Number(e.target.value);
                                  updateField('variantGroups', next);
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-xs"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-brand-purple/60 uppercase">Disc</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={variant.discountPrice || ''}
                                onChange={e => {
                                  const next = [...(formData.variantGroups || [])];
                                  next[gIdx].variants[vIdx].discountPrice = e.target.value ? Number(e.target.value) : undefined;
                                  updateField('variantGroups', next);
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-xs focus:border-brand-purple/50"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-600 uppercase">Stock</span>
                              <input
                                type="number"
                                placeholder="Stock"
                                value={variant.stock}
                                onChange={e => {
                                  const next = [...(formData.variantGroups || [])];
                                  next[gIdx].variants[vIdx].stock = Number(e.target.value);
                                  updateField('variantGroups', next);
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2 text-xs"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(formData.variantGroups || [])];
                              next[gIdx].variants.splice(vIdx, 1);
                              updateField('variantGroups', next);
                            }}
                            className="text-gray-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(formData.variantGroups || [])];
                          if (!next[gIdx].variants) next[gIdx].variants = [];
                          next[gIdx].variants.push({ 
                            id: Math.random().toString(36).substr(2, 9), 
                            name: '', 
                            price: formData.price, 
                            discountPrice: 0,
                            stock: formData.stock 
                          });
                          updateField('variantGroups', next);
                        }}
                        className="text-[10px] font-black text-brand-purple uppercase tracking-widest hover:text-white transition-colors pl-1"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Truck className="text-brand-purple" size={20} />
                  <h3 className="text-lg font-black text-white tracking-tight">Shipping Settings</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Package Size</label>
                    <select
                      name="shippingSize"
                      value={formData.shippingSize}
                      onChange={handleInputChange}
                      className="w-full bg-[#111116] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                    >
                      <option value="small">Small (e.g., cables, needles)</option>
                      <option value="medium">Medium (e.g., headphones, small mixers)</option>
                      <option value="large">Large (e.g., controllers, studio monitors)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Weight (kg)</label>
                    <input
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      placeholder="e.g. 0.5"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Dimensions</label>
                    <input
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      placeholder="e.g. 20x15x10 cm"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">SKU / Model #</label>
                    <input
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      placeholder="e.g. DJ-FLX10-BLK"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-gray-500 mb-4">
                  <Package size={28} />
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Fulfillment Mode</h4>
                <p className="text-xs text-gray-500 font-medium px-4">This product will be fulfilled manually from your central inventory.</p>
              </div>
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-6">
                     <h3 className="text-lg font-black text-white tracking-tight">Badges & Flags</h3>
                     <div className="space-y-4">
                        <label className="flex items-center gap-3 p-4 bg-[#050507] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                           <input type="checkbox" name="isHot" checked={formData.isHot} onChange={handleInputChange} className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-purple" />
                           <span className="text-[11px] font-black uppercase tracking-widest">Hot & New</span>
                        </label>
                        <label className="flex items-center gap-3 p-4 bg-[#050507] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                           <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleInputChange} className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-purple" />
                           <span className="text-[11px] font-black uppercase tracking-widest">Featured Matrix</span>
                        </label>
                        <label className="flex items-center gap-3 p-4 bg-[#050507] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                           <input type="checkbox" name="isBestSeller" checked={formData.isBestSeller} onChange={handleInputChange} className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-purple" />
                           <span className="text-[11px] font-black uppercase tracking-widest">Best Seller</span>
                        </label>
                        <label className="flex items-center gap-3 p-4 bg-[#050507] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                           <input type="checkbox" name="isTrending" checked={formData.isTrending} onChange={handleInputChange} className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-purple" />
                           <span className="text-[11px] font-black uppercase tracking-widest">Trending Now</span>
                        </label>
                     </div>
                  </div>

                  <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-6">
                     <h3 className="text-lg font-black text-white tracking-tight">Special Offers</h3>
                     <label className="flex items-center gap-3 p-4 bg-[#050507] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                        <input type="checkbox" name="isSpecialOffer" checked={formData.isSpecialOffer} onChange={handleInputChange} className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-purple" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Active Special Offer</span>
                     </label>
                     <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Offer Expiry</label>
                        <input
                           type="date"
                           name="offerExpiry"
                           value={formData.offerExpiry}
                           onChange={handleInputChange}
                           className="w-full bg-[#050507] border border-white/10 rounded-2xl px-6 py-4 text-white"
                        />
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">SEO Title</label>
                  <input
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={handleInputChange}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">SEO Slug</label>
                  <input
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 font-medium"
                  />
                </div>
              </div>

              <div className="p-8 bg-brand-purple/5 border border-brand-purple/10 rounded-[2.5rem] flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 flex items-center justify-center text-brand-purple flex-shrink-0">
                  <Settings size={22} />
                </div>
                <div>
                  <h4 className="text-base font-black text-white tracking-tight mb-1">Advanced Automation</h4>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Enable automatic stock deduction and email notifications for this specific product collection.</p>
                  
                  <div className="mt-6 flex flex-wrap gap-4">
                     <label className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 cursor-pointer">
                        <input type="checkbox" name="whatsappEnabled" checked={formData.whatsappEnabled} onChange={handleInputChange} className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-purple" />
                        <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp Checkout</span>
                     </label>
                     <label className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/5 cursor-pointer">
                        <input type="checkbox" name="isFree" checked={formData.isFree} onChange={handleInputChange} className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-purple" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Mark as Free Sample</span>
                     </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest max-w-sm">
            Review all matrix data before synchronization.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 rounded-2xl border border-white/5 text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-brand-purple text-white text-[11px] font-black uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Synchronizing...' : (
                <>
                  <Save size={16} />
                  {initialData?.id ? 'Update Component' : 'Deploy Product'}
                </>
              )}
            </button>
          </div>
        </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

export default AddProductForm;
