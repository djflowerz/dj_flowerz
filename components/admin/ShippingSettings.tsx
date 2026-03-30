import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, MapPin, DollarSign, Plus, X, Save, 
  RotateCcw, Info, CheckCircle2, AlertCircle, Zap, Clock, ShieldCheck
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ShippingConfig } from '../../types';

export default function ShippingSettings() {
  const { storeSettings, updateStoreSettings, storeSettingsLoading } = useData();
  const [localShipping, setLocalShipping] = useState<ShippingConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newTown, setNewTown] = useState('');

  useEffect(() => {
    if (storeSettings?.shipping) {
      setLocalShipping({ ...storeSettings.shipping });
    }
  }, [storeSettings]);

  const handleInputChange = (field: keyof ShippingConfig, value: any) => {
    if (!localShipping) return;
    setLocalShipping({
      ...localShipping,
      [field]: value
    });
  };

  const handlePremiumPriceChange = (service: keyof ShippingConfig['premium_prices'], value: number) => {
    if (!localShipping) return;
    setLocalShipping({
      ...localShipping,
      premium_prices: {
        ...localShipping.premium_prices,
        [service]: value
      }
    });
  };

  const addTown = () => {
    if (!newTown || !localShipping) return;
    if (localShipping.hardship_towns.includes(newTown)) {
      setNewTown('');
      return;
    }
    setLocalShipping({
      ...localShipping,
      hardship_towns: [...localShipping.hardship_towns, newTown]
    });
    setNewTown('');
  };

  const removeTown = (town: string) => {
    if (!localShipping) return;
    setLocalShipping({
      ...localShipping,
      hardship_towns: localShipping.hardship_towns.filter(t => t !== town)
    });
  };

  const handleSave = async () => {
    if (!localShipping) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await updateStoreSettings({ shipping: localShipping });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (storeSettings?.shipping) {
      setLocalShipping({ ...storeSettings.shipping });
    }
  };

  if (storeSettingsLoading || !localShipping) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Truck className="text-brand-purple" size={24} />
            Shipping Configuration
          </h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">
            Manage weight-based pricing, regional surcharges, and service tiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${
              saveStatus === 'success' 
                ? 'bg-green-500 text-white shadow-green-500/20' 
                : saveStatus === 'error'
                ? 'bg-red-500 text-white shadow-red-500/20'
                : 'bg-brand-purple text-white shadow-brand-purple/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isSaving ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle2 size={14} />
            ) : saveStatus === 'error' ? (
              <AlertCircle size={14} />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Pricing Strategy */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0B0B0F] rounded-[2rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
              <Plus size={120} />
            </div>
            
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <DollarSign size={14} /> Basic Pricing Strategy
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Base Price (KES)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-xs">KES</span>
                  <input
                    type="number"
                    value={localShipping.base_price}
                    onChange={(e) => handleInputChange('base_price', Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-white focus:border-brand-purple/50 outline-none transition-all"
                  />
                </div>
                <p className="text-[9px] text-gray-600 font-bold ml-1">The starting shipping cost for any order.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Base Weight (KG)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={localShipping.base_weight}
                    onChange={(e) => handleInputChange('base_weight', Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-4 text-sm font-black text-white focus:border-brand-purple/50 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-[10px] uppercase">KG</span>
                </div>
                <p className="text-[9px] text-gray-600 font-bold ml-1">Maximum weight covered by the base price.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Increment Price (KES/KG)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-xs">KES</span>
                  <input
                    type="number"
                    value={localShipping.increment_price}
                    onChange={(e) => handleInputChange('increment_price', Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-white focus:border-brand-purple/50 outline-none transition-all"
                  />
                </div>
                <p className="text-[9px] text-gray-600 font-bold ml-1">Cost added for every KG above base weight.</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-brand-purple/5 border border-brand-purple/10 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-brand-purple/20 rounded-xl text-brand-purple">
                <Info size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Formula Applied</h4>
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                  Shipping = Base Price + (max(0, Total Weight - Base Weight) × Increment Price)
                </p>
              </div>
            </div>
          </div>

          {/* Service Tiers */}
          <div className="bg-[#0B0B0F] rounded-[2rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <Zap size={14} /> Service Tiers (Surcharges)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { id: 'overnight', label: 'Overnight Courier', icon: <Clock size={16} /> },
                { id: 'same_day', label: 'Same Day Delivery', icon: <Zap size={16} /> },
                { id: 'one_hour', label: '1-Hour Express', icon: <Zap size={16} className="text-yellow-500" /> },
              ].map(tier => (
                <div key={tier.id} className="p-6 bg-black/40 border border-white/5 rounded-[1.5rem] space-y-4 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/5 rounded-xl">{tier.icon}</div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{tier.label}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Added Cost</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-xs">KES</span>
                      <input
                        type="number"
                        value={localShipping.premium_prices[tier.id as keyof ShippingConfig['premium_prices']]}
                        onChange={(e) => handlePremiumPriceChange(tier.id as keyof ShippingConfig['premium_prices'], Number(e.target.value))}
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs font-black text-white focus:border-brand-purple/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hardship Areas */}
        <div className="space-y-6">
          <div className="bg-[#0B0B0F] rounded-[2rem] border border-white/5 p-8 shadow-2xl flex flex-col h-full overflow-hidden relative group">
            <div className="absolute -bottom-10 -right-10 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
              <MapPin size={180} />
            </div>

            <h3 className="text-xs font-black text-gray-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <MapPin size={14} /> Hardship Areas
            </h3>

            <div className="space-y-6 flex-1">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Regional Surcharge (KES)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-xs">KES</span>
                  <input
                    type="number"
                    value={localShipping.hardship_surcharge}
                    onChange={(e) => handleInputChange('hardship_surcharge', Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-white focus:border-brand-purple/50 outline-none transition-all"
                  />
                </div>
                <p className="text-[9px] text-gray-600 font-bold ml-1 leading-relaxed">
                  Flat amount added to the base price for deliveries to defined hardship towns.
                </p>
              </div>

              {/* Tag Input for Towns */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Defined Towns</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Lodwar"
                    value={newTown}
                    onChange={(e) => setNewTown(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTown()}
                    className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-brand-purple/50 outline-none transition-all placeholder:text-gray-700"
                  />
                  <button
                    onClick={addTown}
                    className="p-3 rounded-xl bg-brand-purple/20 text-brand-purple hover:bg-brand-purple hover:text-white transition-all shadow-lg shadow-brand-purple/10"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {localShipping.hardship_towns.map((town) => (
                    <span 
                      key={town} 
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white flex items-center gap-2 group/town"
                    >
                      {town}
                      <button 
                        onClick={() => removeTown(town)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {localShipping.hardship_towns.length === 0 && (
                    <p className="text-[10px] text-gray-700 font-bold italic py-4">No towns defined. Add some above.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.03]">
              <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                <ShieldCheck className="text-yellow-500 flex-shrink-0" size={16} />
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                  Hardship surcharges protect your margin in remote regions with high fuel or logistics costs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
