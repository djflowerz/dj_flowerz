import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Package, Truck, Layers, Settings, X, Plus, Trash2, List } from 'lucide-react';

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

  const updateVariant = (id: string, field: string, value: any) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add variants as a JSON string to a hidden input or append to FormData
    formData.append('variants_json', JSON.stringify(variants));

    // Handle checkboxes explicitly as booleans if backend requires
    const checkboxes = ['is_active', 'is_featured', 'is_free', 'whatsapp_enabled', 'is_digital'];
    checkboxes.forEach(cb => {
      const el = form.elements.namedItem(cb) as HTMLInputElement;
      if (el) {
        formData.set(cb, el.checked ? 'true' : 'false');
      }
    });

    try {
      await onSave(formData);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: { id: TabType, label: string, icon: any }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 border-b-2 transition ${activeTab === id
          ? 'border-brand-purple text-brand-purple font-bold'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
        }`}
    >
      <Icon size={16} />
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Edit Product' : 'Add New Product'}</h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
          <X size={20} />
        </button>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto no-scrollbar">
        <TabButton id="basic" label="Basic Details" icon={Package} />
        <TabButton id="variants" label="Variants & Stock" icon={Layers} />
        <TabButton id="shipping" label="Shipping" icon={Truck} />
        <TabButton id="advanced" label="Advanced" icon={Settings} />
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'basic' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name</label>
                <input name="name" type="text" defaultValue={initialData?.name} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="e.g. DJ Flowerz Custom Headphones" />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                <textarea name="description" defaultValue={initialData?.description} rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="Tell customers about your product..." />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                <select name="category" defaultValue={initialData?.category} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition">
                  <option value="Audio">Audio</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Merchandise">Merchandise</option>
                  <option value="Software">Software</option>
                  <option value="Hardware">Hardware</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price (KES)</label>
                <input name="price" type="number" step="0.01" defaultValue={initialData?.price} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="0.00" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discount Price (KES)</label>
                <input name="discount_price" type="number" step="0.01" defaultValue={initialData?.discountPrice} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="Optional" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">SKU</label>
                <input name="sku" type="text" defaultValue={initialData?.sku} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="DJF-PRD-001" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'variants' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 italic">Add different versions of your product like size, color, or model.</p>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1.5 text-xs font-bold bg-brand-purple/10 text-brand-purple hover:bg-brand-purple hover:text-white px-3 py-1.5 rounded-lg transition"
              >
                <Plus size={14} /> Add Variant
              </button>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-3">
                {variants.map((variant) => (
                  <div key={variant.id} className="grid grid-cols-12 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 items-end">
                    <div className="col-span-12 md:col-span-5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Variant Name (e.g. XL - Black)</label>
                      <input
                        value={variant.name}
                        onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-brand-purple outline-none"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Price</label>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-brand-purple outline-none"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stock</label>
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-brand-purple outline-none"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-1 flex justify-center pb-1">
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                <List className="text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-400">No variants added yet.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Base Stock (if no variants)</label>
              <input name="stock" type="number" defaultValue={initialData?.stock} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="0" />
            </div>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Weight (kg)</label>
                <input name="weight" type="number" step="0.01" defaultValue={initialData?.weight} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dimensions (LxWxH cm)</label>
                <input name="dimensions" type="text" defaultValue={initialData?.dimensions} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none transition" placeholder="e.g. 10x10x5" />
              </div>
            </div>

            <div className="bg-brand-purple/5 p-4 rounded-xl border border-brand-purple/10">
              <h4 className="text-sm font-bold text-brand-purple mb-2 flex items-center gap-2">
                <Truck size={14} /> Shipping Logic
              </h4>
              <p className="text-xs text-brand-purple/80 leading-relaxed">
                Weight and dimensions are used to calculate shipping rates at checkout. Ensure these are accurate for physical products.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Product Images</label>
              <div className="flex flex-wrap gap-3">
                {initialData?.image_url && (
                  <div className="relative group">
                    <img src={initialData.image_url} alt="Current" className="h-20 w-20 object-cover rounded-xl border-2 border-brand-purple/20" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white uppercase">Primary</span>
                    </div>
                  </div>
                )}
                <label className="h-20 w-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand-purple/40 hover:bg-brand-purple/5 transition grayscale hover:grayscale-0">
                  <Plus className="text-gray-400 group-hover:text-brand-purple" size={20} />
                  <span className="text-[10px] text-gray-400 mt-1 uppercase font-bold text-center px-1">Upload New</span>
                  <input name="image" type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-brand-purple/30 transition">
                  <input name="is_active" type="checkbox" defaultChecked={initialData?.is_active ?? true} className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple h-4 w-4" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-700">Active</span>
                  <span className="block text-[10px] text-gray-400 uppercase font-medium">Available to customers</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-brand-purple/30 transition">
                  <input name="is_featured" type="checkbox" defaultChecked={initialData?.is_featured} className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple h-4 w-4" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-700">Featured</span>
                  <span className="block text-[10px] text-gray-400 uppercase font-medium">Show in hero sections</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-brand-purple/30 transition">
                  <input name="is_free" type="checkbox" defaultChecked={initialData?.is_free} className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple h-4 w-4" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-700">Set Free</span>
                  <span className="block text-[10px] text-gray-400 uppercase font-medium">KES 0.00 checkout</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-brand-purple/30 transition">
                  <input name="whatsapp_enabled" type="checkbox" defaultChecked={initialData?.whatsapp_enabled} className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-700">WhatsApp Buy</span>
                  <span className="block text-[10px] text-gray-400 uppercase font-medium">Direct chat links</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100 group-hover:border-brand-purple/30 transition">
                  <input name="is_digital" type="checkbox" defaultChecked={initialData?.category === 'Software' || initialData?.category === 'Samples'} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-gray-700">Digital Item</span>
                  <span className="block text-[10px] text-gray-400 uppercase font-medium">No physical shipping</span>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <button type="button" onClick={onCancel} className="bg-gray-50 py-2.5 px-6 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition border border-gray-200">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="bg-brand-purple shadow-[0_4px_12px_rgba(168,85,247,0.3)] text-white font-bold py-2.5 px-8 rounded-xl hover:bg-brand-purple/90 transition disabled:opacity-50">
          {loading ? 'Saving Change...' : (initialData ? 'Update Product' : 'Create Product')}
        </button>
      </div>
    </form>
  );
};

export default AddProductForm;
