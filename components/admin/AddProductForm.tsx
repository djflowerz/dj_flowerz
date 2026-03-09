import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Package, Truck, Layers, Settings, X, Plus, Trash2, List, Save, Upload, Info, CheckCircle2 } from 'lucide-react';

interface AddProductFormProps {
  onSave: (formData: FormData) => Promise<void>;
  initialData?: Product | null;
  onCancel: () => void;
}

type TabType = 'basic' | 'variants' | 'shipping' | 'advanced';

const AddProductForm: React.FC<AddProductFormProps> = ({ onSave, initialData, onCancel }) => {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<any[]>(initialData?.variants || []);

  const addVariant = () => {
    setVariants([...variants, { id: crypto.randomUUID(), name: '', price: initialData?.price || 0, stock: 10 }]);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.append('variants', JSON.stringify(variants));
      await onSave(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tabClasses = (tab: TabType) => `
    flex items-center gap-3 px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative
    ${activeTab === tab
      ? 'text-brand-purple bg-brand-purple/5'
      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}
  `;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onCancel} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-5xl bg-[#0B0B0F] rounded-[3rem] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
                <Package size={18} />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {initialData ? 'Edit Product' : 'Create New Product'}
              </h2>
            </div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest ml-11">Configure your store inventory</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-white/[0.01]">
          <button type="button" onClick={() => setActiveTab('basic')} className={tabClasses('basic')}>
            <Info size={14} /> Basic Info
            {activeTab === 'basic' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-purple shadow-[0_0_10px_#A855F7]" />}
          </button>
          <button type="button" onClick={() => setActiveTab('variants')} className={tabClasses('variants')}>
            <Layers size={14} /> Variants
            {activeTab === 'variants' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-purple shadow-[0_0_10px_#A855F7]" />}
          </button>
          <button type="button" onClick={() => setActiveTab('shipping')} className={tabClasses('shipping')}>
            <Truck size={14} /> Shipping
            {activeTab === 'shipping' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-purple shadow-[0_0_10px_#A855F7]" />}
          </button>
          <button type="button" onClick={() => setActiveTab('advanced')} className={tabClasses('advanced')}>
            <Settings size={14} /> Advanced
            {activeTab === 'advanced' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-purple shadow-[0_0_10px_#A855F7]" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-white">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Product Name</label>
                  <input
                    name="name"
                    required
                    defaultValue={initialData?.name}
                    placeholder="e.g., Premium Sample Pack Vol. 1"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={initialData?.description}
                    placeholder="Describe your product details..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-purple/50 transition-all font-medium resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Category</label>
                    <select
                      name="category"
                      defaultValue={initialData?.category || 'Merch'}
                      className="w-full bg-[#111116] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                    >
                      <option value="Merch">Merch</option>
                      <option value="Samples">Samples</option>
                      <option value="Presets">Presets</option>
                      <option value="Tickets">Tickets</option>
                      <option value="Course">Course</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Status</label>
                    <select
                      name="status"
                      defaultValue={initialData ? (initialData.is_active || initialData.isActive ? 'active' : 'draft') : 'active'}
                      className="w-full bg-[#111116] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium appearance-none"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Product Images</label>
                  <div className="aspect-video bg-white/[0.02] border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center group hover:border-brand-purple/30 transition-all cursor-pointer relative overflow-hidden">
                    <input type="file" name="image" className="absolute inset-0 opacity-0 cursor-pointer" />
                    {initialData?.image_url ? (
                      <img src={initialData.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-brand-purple group-hover:bg-brand-purple/10 transition-all mb-4">
                          <Upload size={28} />
                        </div>
                        <p className="text-sm font-black text-gray-400 tracking-tight">Upload Product Media</p>
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">Supports JPG, PNG, WEBP (Max 5MB)</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Price (KES)</label>
                    <input
                      type="number"
                      name="price"
                      required
                      defaultValue={initialData?.price}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Compare Price</label>
                    <input
                      type="number"
                      name="compare_at_price"
                      defaultValue={initialData?.compare_at_price}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium placeholder:text-gray-700"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Product Variants</h3>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Manage sizes, colors, or file versions</p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-purple text-white text-[11px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-95"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {variants.length === 0 ? (
                  <div className="py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center opacity-50">
                    <Layers size={40} className="text-gray-600 mb-4" />
                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest">No variants configured</p>
                  </div>
                ) : (
                  variants.map((variant, idx) => (
                    <div key={variant.id} className="grid grid-cols-12 gap-4 items-center bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.03] transition-all group">
                      <div className="col-span-1">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 text-xs font-black">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="col-span-4">
                        <input
                          placeholder="Variant Name"
                          value={variant.name}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[idx].name = e.target.value;
                            setVariants(newVariants);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 text-sm font-medium"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600 uppercase">KES</span>
                          <input
                            type="number"
                            placeholder="Price"
                            value={variant.price}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[idx].price = Number(e.target.value);
                              setVariants(newVariants);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 text-sm font-medium"
                          />
                        </div>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Stock"
                          value={variant.stock}
                          onChange={(e) => {
                            const newVariants = [...variants];
                            newVariants[idx].stock = Number(e.target.value);
                            setVariants(newVariants);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-purple/50 text-sm font-medium"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeVariant(variant.id)}
                          className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Truck className="text-brand-purple" size={20} />
                  <h3 className="text-lg font-black text-white tracking-tight">Logistics Settings</h3>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Shipping Price (KES)</label>
                  <input
                    type="number"
                    name="shipping_price"
                    defaultValue={initialData?.shippingPrice || 0}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-medium"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <p className="text-[11px] font-black text-emerald-500/80 uppercase tracking-widest">Free shipping threshold applies</p>
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

          {activeTab === 'advanced' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">SEO Title</label>
                  <input
                    name="meta_title"
                    defaultValue={initialData?.name}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-brand-purple/50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">SEO Slug</label>
                  <input
                    name="slug"
                    defaultValue={initialData?.slug}
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
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">Enable automatic stock deduction and email notifications for this specific product collection. Changes here affect global store behavior.</p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-all group">
                      <input
                        type="checkbox"
                        name="is_featured"
                        defaultChecked={initialData?.isFeatured}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-purple focus:ring-offset-0 focus:ring-brand-purple"
                      />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Featured Product</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-all group">
                      <input
                        type="checkbox"
                        name="is_free"
                        defaultChecked={initialData?.isFree}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-purple focus:ring-offset-0 focus:ring-brand-purple"
                      />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Free Product</span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-all group">
                      <input
                        type="checkbox"
                        name="whatsapp_enabled"
                        defaultChecked={initialData?.whatsappEnabled !== false}
                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-purple focus:ring-offset-0 focus:ring-brand-purple"
                      />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">WhatsApp Order Enabled</span>
                    </label>
                  </div>

                  <button type="button" className="mt-6 text-[11px] font-black text-brand-purple uppercase tracking-[0.2em] hover:text-white transition-colors">Configure Webhooks →</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest max-w-sm">
            All changes are permanent once published. Ensure all product data is accurate before saving.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 rounded-2xl border border-white/5 text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-brand-purple text-white text-[11px] font-black uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (
                <>
                  <Save size={16} />
                  {initialData ? 'Update Product' : 'Publish Product'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

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
