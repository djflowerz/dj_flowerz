import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Users, DollarSign, TrendingUp, Search, Plus, X, RefreshCw, Copy, ShuffleIcon } from 'lucide-react';
import { toast } from 'sonner';

function generateCode(name: string) {
    const base = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}${suffix}`;
}

const Affiliates: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        referral_code: '',
        commission_percent: 10,
        notes: ''
    });

    useEffect(() => {
        loadAffiliates();
    }, []);

    const loadAffiliates = async () => {
        try {
            const data = await request('/api/admin/referrals/stats');
            setAffiliates(Array.isArray(data) ? data : (data?.stats || []));
        } catch { /* fallback */ }
    };

    const autoGenerateCode = () => {
        const code = generateCode(form.full_name || 'PARTNER');
        setForm(p => ({ ...p, referral_code: code }));
    };

    const handleEnroll = async () => {
        if (!form.full_name.trim() || !form.email.trim()) {
            toast.error('Name and email are required'); return;
        }
        if (!form.referral_code.trim()) {
            toast.error('Referral code is required'); return;
        }
        setSaving(true);
        try {
            await request('/api/admin/referrals', {
                method: 'POST',
                body: JSON.stringify(form)
            });
            toast.success(`${form.full_name} enrolled as affiliate partner`);
            setShowModal(false);
            setForm({ full_name: '', email: '', phone_number: '', referral_code: '', commission_percent: 10, notes: '' });
            await loadAffiliates();
        } catch {
            toast.error('Failed to enroll affiliate.');
        } finally {
            setSaving(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code).then(() => toast.success('Code copied!'));
    };

    const filtered = affiliates.filter(a =>
        (a.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.referral_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalEarnings = affiliates.reduce((s, a) => s + (parseFloat(a.total_earned) || 0), 0);
    const totalConversions = affiliates.reduce((s, a) => s + (parseInt(a.total_referrals) || 0), 0);

    return (
        <AdminLayout title="Affiliate Protocol">
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="px-10 py-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Enroll Partner</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">New Affiliate Registration</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-10 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Full Name *</label>
                                    <input type="text" placeholder="e.g., Jane Kamau" value={form.full_name}
                                        onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Email Address *</label>
                                    <input type="email" placeholder="partner@example.com" value={form.email}
                                        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Phone (optional)</label>
                                    <input type="tel" placeholder="+254 700 000 000" value={form.phone_number}
                                        onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Commission %</label>
                                    <input type="number" min={1} max={100} value={form.commission_percent}
                                        onChange={e => setForm(p => ({ ...p, commission_percent: parseInt(e.target.value) }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Referral Code *</label>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="e.g., JANE1234" value={form.referral_code}
                                        onChange={e => setForm(p => ({ ...p, referral_code: e.target.value.toUpperCase() }))}
                                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white font-mono uppercase focus:outline-none focus:border-brand-purple/50 transition-all" />
                                    <button type="button" onClick={autoGenerateCode}
                                        className="px-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-brand-purple/10 hover:border-brand-purple/30 text-brand-purple transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                        <ShuffleIcon size={14} /> Auto
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Internal Notes (optional)</label>
                                <textarea rows={2} placeholder="Partnership terms, context..." value={form.notes}
                                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all resize-none" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Cancel</button>
                                <button onClick={handleEnroll} disabled={saving}
                                    className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Users size={14} />}
                                    {saving ? 'Enrolling...' : 'Enroll Partner'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple"><Users size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Partners</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{affiliates.length}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center text-brand-yellow"><TrendingUp size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Conversions</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{totalConversions}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan"><DollarSign size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Commissions Owed</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">Ksh {totalEarnings.toLocaleString()}</h4>
                    </div>
                </div>
            </div>

            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Partner Registry</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Satellite User Protocol</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                            <input type="text" placeholder="SEARCH PARTNERS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all" />
                        </div>
                        <button onClick={() => setShowModal(true)}
                            className="px-6 py-3.5 bg-brand-purple text-white text-[10px] font-black rounded-full hover:bg-brand-purple/80 transition-all uppercase tracking-widest shadow-lg shadow-brand-purple/20 flex items-center gap-2 whitespace-nowrap">
                            <Plus size={14} /> Enroll Partner
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Partner Details</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Affiliate Code</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Commission %</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Conversions</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Earnings</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && (
                                <tr><td colSpan={6} className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Fetching Intel...</p>
                                    </div>
                                </td></tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={6} className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-30">
                                        <Users size={48} className="text-gray-500" />
                                        <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No affiliates found. Enroll your first partner above.</p>
                                    </div>
                                </td></tr>
                            )}
                            {filtered.map(a => (
                                <tr key={a.id || a.referral_code} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-white group-hover:text-brand-purple transition-colors">{a.full_name || 'Unknown'}</div>
                                        <div className="text-[11px] text-gray-500">{a.email}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-brand-yellow/10 border border-brand-yellow/20 rounded-lg text-[10px] font-black text-brand-yellow font-mono">{a.referral_code || 'N/A'}</span>
                                            {a.referral_code && (
                                                <button onClick={() => copyCode(a.referral_code)} className="text-gray-600 hover:text-white transition-colors"><Copy size={12} /></button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6"><span className="text-[11px] font-black text-white">{a.percentage || a.commission_percent || 10}%</span></td>
                                    <td className="px-8 py-6"><span className="text-[11px] font-black text-white">{a.total_referrals || 0}</span></td>
                                    <td className="px-8 py-6">
                                        <div className="text-[11px] font-black text-white">Ksh {parseFloat(a.total_earned || 0).toLocaleString()}</div>
                                        <div className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Lifetime</div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button className="px-4 py-2 bg-white/5 hover:bg-brand-purple hover:text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-500 transition-all">Details</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Affiliates;
