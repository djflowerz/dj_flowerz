import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Megaphone, Search, Tag, BarChart3, Plus, X, RefreshCw, Trash2, Percent, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-500/10 border-green-500/20 text-green-500',
    draft: 'bg-brand-yellow/10 border-brand-yellow/20 text-brand-yellow',
    sent: 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan',
    paused: 'bg-white/5 border-white/10 text-gray-400',
};

const Marketing: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [subTab, setSubTab] = useState<'campaigns' | 'coupons'>('campaigns');
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [campaign, setCampaign] = useState({ subject: '', content: '', target_audience: 'all', status: 'draft' });
    const [coupon, setCoupon] = useState({
        code: '', discount_type: 'percentage', discount_value: 10,
        min_spend: 0, expiry_date: '', usage_limit: '', is_one_time_per_user: false,
        scope: 'all', is_active: true
    });

    useEffect(() => {
        loadCampaigns();
        loadCoupons();
    }, []);

    const loadCampaigns = async () => {
        try {
            const data = await request('/api/admin/newsletter_campaigns');
            setCampaigns(Array.isArray(data) ? data : (data?.campaigns || []));
        } catch { /* fallback */ }
    };

    const loadCoupons = async () => {
        try {
            const data = await request('/api/admin/coupons');
            setCoupons(Array.isArray(data) ? data : (data?.coupons || []));
        } catch { /* fallback */ }
    };

    const handleSaveCampaign = async () => {
        if (!campaign.subject.trim() || !campaign.content.trim()) {
            toast.error('Subject and content are required'); return;
        }
        setSaving(true);
        try {
            await request('/api/admin/newsletter_campaigns', {
                method: 'POST',
                body: JSON.stringify(campaign)
            });
            toast.success('Campaign saved successfully');
            setShowCampaignModal(false);
            setCampaign({ subject: '', content: '', target_audience: 'all', status: 'draft' });
            await loadCampaigns();
        } catch { toast.error('Failed to save campaign'); }
        finally { setSaving(false); }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm('Delete this campaign?')) return;
        try {
            await request(`/api/admin/newsletter_campaigns/${id}`, { method: 'DELETE' });
            toast.success('Deleted'); await loadCampaigns();
        } catch { toast.error('Delete failed'); }
    };

    const handleSaveCoupon = async () => {
        if (!coupon.code.trim()) { toast.error('Coupon code is required'); return; }
        setSaving(true);
        try {
            await request('/api/admin/coupons', {
                method: 'POST',
                body: JSON.stringify({ ...coupon, code: coupon.code.toUpperCase() })
            });
            toast.success('Coupon created');
            setShowCouponModal(false);
            setCoupon({ code: '', discount_type: 'percentage', discount_value: 10, min_spend: 0, expiry_date: '', usage_limit: '', is_one_time_per_user: false, scope: 'all', is_active: true });
            await loadCoupons();
        } catch { toast.error('Failed to create coupon'); }
        finally { setSaving(false); }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!confirm('Delete this coupon?')) return;
        try {
            await request(`/api/admin/coupons/${id}`, { method: 'DELETE' });
            toast.success('Coupon deleted'); await loadCoupons();
        } catch { toast.error('Delete failed'); }
    };

    const filteredCampaigns = campaigns.filter(c =>
        (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredCoupons = coupons.filter(c =>
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Growth Protocols">
            {/* Campaign Modal */}
            {showCampaignModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="px-10 py-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">New Campaign</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Marketing Vector Configuration</p>
                            </div>
                            <button onClick={() => setShowCampaignModal(false)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"><X size={18} /></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Subject</label>
                                    <input type="text" placeholder="Campaign subject..." value={campaign.subject} onChange={e => setCampaign(p => ({ ...p, subject: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Target Audience</label>
                                    <select value={campaign.target_audience} onChange={e => setCampaign(p => ({ ...p, target_audience: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all">
                                        <option value="all">All Subscribers</option>
                                        <option value="music_pool">Music Pool Members</option>
                                        <option value="store">Store Customers</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Content</label>
                                <textarea rows={7} placeholder="Campaign message or HTML content..." value={campaign.content} onChange={e => setCampaign(p => ({ ...p, content: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-3xl py-5 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Save As</label>
                                <div className="flex gap-3">
                                    {(['draft', 'active'] as const).map(s => (
                                        <button key={s} type="button" onClick={() => setCampaign(p => ({ ...p, status: s }))}
                                            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${campaign.status === s ? 'bg-brand-purple/10 border-brand-purple/40 text-brand-purple' : 'bg-white/[0.02] border-white/10 text-gray-500 hover:text-white'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowCampaignModal(false)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Cancel</button>
                                <button onClick={handleSaveCampaign} disabled={saving} className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Megaphone size={14} />}
                                    {saving ? 'Saving...' : 'Save Campaign'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Coupon Modal */}
            {showCouponModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="px-10 py-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Generate Coupon</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Promotional Discount Code</p>
                            </div>
                            <button onClick={() => setShowCouponModal(false)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"><X size={18} /></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Coupon Code</label>
                                    <input type="text" placeholder="e.g., FLOWERZ20" value={coupon.code}
                                        onChange={e => setCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white font-mono uppercase focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Scope</label>
                                    <select value={coupon.scope} onChange={e => setCoupon(p => ({ ...p, scope: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all">
                                        <option value="all">All Products</option>
                                        <option value="store">Store Only</option>
                                        <option value="subscription">Subscriptions Only</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Discount Type</label>
                                    <select value={coupon.discount_type} onChange={e => setCoupon(p => ({ ...p, discount_type: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all">
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (Ksh)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Value</label>
                                    <input type="number" min={0} value={coupon.discount_value}
                                        onChange={e => setCoupon(p => ({ ...p, discount_value: parseFloat(e.target.value) }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Min Spend (Ksh)</label>
                                    <input type="number" min={0} value={coupon.min_spend}
                                        onChange={e => setCoupon(p => ({ ...p, min_spend: parseFloat(e.target.value) }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Expiry Date</label>
                                    <input type="date" value={coupon.expiry_date} onChange={e => setCoupon(p => ({ ...p, expiry_date: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Usage Limit (blank = unlimited)</label>
                                    <input type="number" min={1} placeholder="e.g., 100" value={coupon.usage_limit}
                                        onChange={e => setCoupon(p => ({ ...p, usage_limit: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div onClick={() => setCoupon(p => ({ ...p, is_one_time_per_user: !p.is_one_time_per_user }))}
                                    className={`w-12 h-6 rounded-full border transition-all flex items-center ${coupon.is_one_time_per_user ? 'bg-brand-purple border-brand-purple' : 'bg-white/5 border-white/10'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-all ${coupon.is_one_time_per_user ? 'translate-x-6' : ''}`} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">One-time use per user</span>
                            </label>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowCouponModal(false)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Cancel</button>
                                <button onClick={handleSaveCoupon} disabled={saving} className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Tag size={14} />}
                                    {saving ? 'Creating...' : 'Create Coupon'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Market <span className="text-brand-purple">Intelligence</span></h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Campaign Orchestration & Reach Analysis</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowCouponModal(true)}
                        className="px-6 py-3 bg-white/5 border border-white/10 text-white text-[11px] font-black rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest flex items-center gap-2">
                        <Tag size={14} /> New Coupon
                    </button>
                    <button onClick={() => setShowCampaignModal(true)}
                        className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest shadow-xl shadow-brand-purple/20 flex items-center gap-2">
                        <Plus size={14} /> New Campaign
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple"><Megaphone size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Campaigns</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{campaigns.length}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow"><Tag size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Active Coupons</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{coupons.filter(c => c.is_active).length}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan"><BarChart3 size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Redemptions</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{coupons.reduce((a, c) => a + (c.times_used || 0), 0)}</h4>
                    </div>
                </div>
            </div>

            {/* Sub-tab Nav */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                    {(['campaigns', 'coupons'] as const).map(tab => (
                        <button key={tab} onClick={() => { setSubTab(tab); setSearchTerm(''); }}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === tab ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={14} />
                    <input type="text" placeholder={`SEARCH ${subTab.toUpperCase()}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="bg-[#0B0B0F] border border-white/5 rounded-full py-3 pl-11 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 w-64" />
                </div>
            </div>

            {/* Campaigns Table */}
            {subTab === 'campaigns' && (
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Campaign</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Audience</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && <tr><td colSpan={5} className="px-8 py-32 text-center"><div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>}
                            {!loading && filteredCampaigns.length === 0 && (
                                <tr><td colSpan={5} className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-30">
                                        <Megaphone size={48} className="text-gray-500" />
                                        <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No campaigns yet. Create your first one.</p>
                                    </div>
                                </td></tr>
                            )}
                            {filteredCampaigns.map(c => (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-white group-hover:text-brand-purple transition-colors">{c.subject}</div>
                                        <div className="text-[10px] text-gray-600 mt-0.5 truncate max-w-[260px]">{c.content?.slice(0, 55)}...</div>
                                    </td>
                                    <td className="px-8 py-6"><span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 capitalize">{c.target_audience || 'all'}</span></td>
                                    <td className="px-8 py-6 text-[11px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>{c.status || 'draft'}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Coupons Table */}
            {subTab === 'coupons' && (
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Code</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Discount</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Scope</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Expiry</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Uses</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {!loading && filteredCoupons.length === 0 && (
                                <tr><td colSpan={6} className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-30">
                                        <Tag size={48} className="text-gray-500" />
                                        <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No coupons yet. Generate your first promo code.</p>
                                    </div>
                                </td></tr>
                            )}
                            {filteredCoupons.map(c => (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-mono font-black text-brand-yellow tracking-widest text-sm">{c.code}</div>
                                        {c.is_one_time_per_user && <div className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5">1× per user</div>}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            {c.discount_type === 'percentage' ? <Percent size={13} className="text-brand-purple" /> : <span className="text-xs text-brand-purple font-black">Ksh</span>}
                                            <span className="font-black text-white">{c.discount_value}{c.discount_type === 'percentage' ? '%' : ''} off</span>
                                        </div>
                                        {c.min_spend > 0 && <div className="text-[9px] text-gray-600 mt-0.5">Min Ksh {c.min_spend}</div>}
                                    </td>
                                    <td className="px-8 py-6"><span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 capitalize">{c.scope || 'all'}</span></td>
                                    <td className="px-8 py-6">
                                        {c.expiry_date
                                            ? <div className="flex items-center gap-1.5 text-[11px] text-gray-400"><Calendar size={12} />{new Date(c.expiry_date).toLocaleDateString()}</div>
                                            : <span className="text-[10px] text-gray-600">No expiry</span>}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[11px] font-black text-white">{c.times_used || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</div>
                                    </td>
                                    <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                                        {c.is_active ? <CheckCircle2 size={14} className="text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full bg-gray-700" />}
                                        <button onClick={() => handleDeleteCoupon(c.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AdminLayout>
    );
};

export default Marketing;
