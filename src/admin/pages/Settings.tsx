import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { 
    Settings as SettingsIcon, 
    Shield, 
    Database, 
    Bell, 
    Save, 
    Truck, 
    Plus, 
    Trash2, 
    AlertCircle,
    Layout,
    Globe
} from 'lucide-react';
import { useAdminApi } from '../hooks/useAdminApi';
import { toast } from 'sonner';

const Settings: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [activeSection, setActiveSection] = useState<'general' | 'shipping' | 'system'>('general');
    const [settings, setSettings] = useState<any>({
        heroLabel: '',
        heroTitle: '',
        promoCode: '',
        promoCodeEnabled: true,
        shippingMethods: []
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await request('/api/store/settings', { method: 'GET' });
            setSettings(data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    const handleSave = async () => {
        try {
            await request('/api/admin/store/settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            toast.success('Matrix configurations recalibrated');
        } catch (err) {
            toast.error('Failed to update configurations');
        }
    };

    const addShippingMethod = () => {
        setSettings({
            ...settings,
            shippingMethods: [
                ...settings.shippingMethods,
                { id: crypto.randomUUID(), name: '', cost: 0, estimatedDays: '3-5 days', active: true }
            ]
        });
    };

    const removeShippingMethod = (id: string) => {
        setSettings({
            ...settings,
            shippingMethods: settings.shippingMethods.filter((m: any) => m.id !== id)
        });
    };

    const updateShippingMethod = (id: string, field: string, value: any) => {
        setSettings({
            ...settings,
            shippingMethods: settings.shippingMethods.map((m: any) => 
                m.id === id ? { ...m, [field]: value } : m
            )
        });
    };

    return (
        <AdminLayout title="System Configurations">
            <div className="flex flex-col gap-8 pb-20">
                {/* Section Navigation */}
                <div className="flex gap-4 p-2 bg-black/40 border border-white/5 rounded-3xl w-fit">
                    {[
                        { id: 'general', label: 'Storefront', icon: Layout },
                        { id: 'shipping', label: 'Logistics', icon: Truck },
                        { id: 'system', label: 'System', icon: Database }
                    ].map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id as any)}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all ${
                                activeSection === section.id 
                                ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' 
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <section.icon size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{section.label}</span>
                        </button>
                    ))}
                </div>

                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-purple/5 blur-[120px] -z-10 rounded-full" />
                    
                    {activeSection === 'general' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Storefront Aesthetics</h3>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Update hero banners and promotional data</p>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Hero Tagline</label>
                                    <input
                                        type="text"
                                        value={settings.heroLabel}
                                        onChange={e => setSettings({...settings, heroLabel: e.target.value})}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                        placeholder="Limited Time Launch Offer"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Hero Title</label>
                                    <input
                                        type="text"
                                        value={settings.heroTitle}
                                        onChange={e => setSettings({...settings, heroTitle: e.target.value})}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                        placeholder="Super Discount for early birds"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Featured Promo Code</label>
                                    <div className="flex gap-4">
                                        <input
                                            type="text"
                                            value={settings.promoCode}
                                            onChange={e => setSettings({...settings, promoCode: e.target.value.toUpperCase()})}
                                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl py-5 px-8 text-white focus:outline-none focus:border-brand-purple/50 transition-all font-mono font-black tracking-widest"
                                            placeholder="FREE256MAC"
                                        />
                                        <button
                                            onClick={() => setSettings({...settings, promoCodeEnabled: !settings.promoCodeEnabled})}
                                            className={`px-8 rounded-2xl border transition-all ${
                                                settings.promoCodeEnabled 
                                                ? 'bg-brand-purple/10 border-brand-purple/50 text-brand-purple' 
                                                : 'bg-white/5 border-white/10 text-gray-500'
                                            }`}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {settings.promoCodeEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'shipping' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Logistics Protocols</h3>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Manage shipping providers and delivery costs</p>
                                </div>
                                <button
                                    onClick={addShippingMethod}
                                    className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-brand-purple hover:border-brand-purple transition-all group"
                                >
                                    <Plus size={18} className="text-gray-400 group-hover:text-white" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white">Add Protocol</span>
                                </button>
                            </div>

                            <div className="grid gap-6">
                                {settings.shippingMethods?.map((method: any) => (
                                    <div key={method.id} className="grid grid-cols-12 gap-6 items-end bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] group hover:border-brand-purple/30 transition-all">
                                        <div className="col-span-4 space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-4">Provider / Method Name</label>
                                            <input
                                                type="text"
                                                value={method.name}
                                                onChange={e => updateShippingMethod(method.id, 'name', e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 px-6 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                                placeholder="e.g., G4S Standard Delivery"
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-4">Base Cost (KES)</label>
                                            <input
                                                type="number"
                                                value={method.cost}
                                                onChange={e => updateShippingMethod(method.id, 'cost', parseFloat(e.target.value))}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 px-6 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 ml-4">Estimated Time</label>
                                            <input
                                                type="text"
                                                value={method.estimatedDays}
                                                onChange={e => updateShippingMethod(method.id, 'estimatedDays', e.target.value)}
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 px-6 text-sm text-white focus:outline-none focus:border-brand-purple/50 transition-all font-bold"
                                                placeholder="3-5 business days"
                                            />
                                        </div>
                                        <div className="col-span-2 flex justify-end pb-1">
                                            <button
                                                onClick={() => removeShippingMethod(method.id)}
                                                className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {(!settings.shippingMethods || settings.shippingMethods.length === 0) && (
                                    <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Truck size={32} className="text-gray-600" />
                                        </div>
                                        <h4 className="text-white font-black uppercase tracking-widest mb-2">No Logistics Configured</h4>
                                        <p className="text-gray-500 text-xs font-medium">Add shipping protocols to enable physical distribution.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSection === 'system' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Core Architectures</h3>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Manage security, database, and notifications</p>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-4 opacity-50 cursor-not-allowed">
                                    <Shield className="text-brand-purple" size={32} />
                                    <div>
                                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Security Node</h4>
                                        <p className="text-[10px] text-gray-500 font-medium">SSL, OAuth & API Keys</p>
                                    </div>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-4 opacity-50 cursor-not-allowed">
                                    <Database className="text-brand-cyan" size={32} />
                                    <div>
                                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">D1 Database</h4>
                                        <p className="text-[10px] text-gray-500 font-medium">Replication & Backups</p>
                                    </div>
                                </div>
                                <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-4 opacity-50 cursor-not-allowed">
                                    <Bell className="text-brand-yellow" size={32} />
                                    <div>
                                        <h4 className="text-white font-black uppercase text-xs tracking-widest mb-1">Signal Hub</h4>
                                        <p className="text-[10px] text-gray-500 font-medium">User & System Alerts</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-[2rem] p-8 flex items-start gap-6">
                                <AlertCircle className="text-brand-purple shrink-0" size={24} />
                                <div>
                                    <h5 className="text-xs font-black text-white uppercase tracking-widest mb-2">Administrative Lock</h5>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Advanced system configurations are currently locked for stability testing. 
                                        Only storefront and logistics protocols can be modified at this time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Action Bar */}
                <div className="fixed bottom-12 right-12 z-50">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-brand-purple text-white px-10 py-6 rounded-full flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(139,92,246,0.5)] group disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save size={24} className="group-hover:translate-y-[-2px] transition-all" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Save Sync</span>
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Settings;
