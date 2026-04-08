import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { Clock, Search, Hash, RefreshCw, Plus, X, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CHIP: Record<string, string> = {
    active:    'bg-green-500/10 border-green-500/20 text-green-500',
    overdue:   'bg-red-500/10 border-red-500/20 text-red-400',
    completed: 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan',
    cancelled: 'bg-white/5 border-white/10 text-gray-500',
};

const Installments: React.FC = () => {
    const { request, loading } = useAdminApi();
    const [installments, setInstallments] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        user_id: '',
        product_id: '',
        product_name: '',
        total_amount: '',
        deposit_amount: '',
        installments_count: 3,
        payment_interval: 'monthly',
        reminder_channel: 'email',
    });

    useEffect(() => { loadInstallments(); }, []);

    const loadInstallments = async () => {
        try {
            const data = await request('/api/admin/installments');
            setInstallments(Array.isArray(data) ? data : (data?.installments || []));
        } catch { /* fallback */ }
    };

    const handleCreate = async () => {
        if (!form.user_id.trim() || !form.total_amount) {
            toast.error('User ID and total amount are required'); return;
        }
        setSaving(true);
        try {
            await request('/api/admin/installments', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    total_amount: parseFloat(form.total_amount),
                    deposit_amount: parseFloat(form.deposit_amount || '0'),
                })
            });
            toast.success('Installment plan created');
            setShowModal(false);
            setForm({ user_id: '', product_id: '', product_name: '', total_amount: '', deposit_amount: '', installments_count: 3, payment_interval: 'monthly', reminder_channel: 'email' });
            await loadInstallments();
        } catch {
            toast.error('Failed to create plan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this installment plan?')) return;
        try {
            await request(`/api/admin/installments/${id}`, { method: 'DELETE' });
            toast.success('Plan deleted');
            await loadInstallments();
        } catch { toast.error('Delete failed'); }
    };

    const filtered = installments.filter(item =>
        (item.full_name || item.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.order_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalBalance = installments.reduce((s, i) => s + (parseFloat(i.balance) || 0), 0);
    const overdue = installments.filter(i => i.status === 'overdue').length;
    const active = installments.filter(i => i.status === 'active').length;

    return (
        <AdminLayout title="Lipa Pole Pole Protocol">
            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0B0B0F] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="px-10 py-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight uppercase">Create Plan</h2>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Manual Installment Configuration</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-10 space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">User ID *</label>
                                    <input type="text" placeholder="User UUID or ID" value={form.user_id}
                                        onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white font-mono text-sm focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Product Name</label>
                                    <input type="text" placeholder="e.g., DJ Setup Package" value={form.product_name}
                                        onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Total Amount (Ksh) *</label>
                                    <input type="number" min={0} placeholder="e.g., 25000" value={form.total_amount}
                                        onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Initial Deposit (Ksh)</label>
                                    <input type="number" min={0} placeholder="e.g., 5000" value={form.deposit_amount}
                                        onChange={e => setForm(p => ({ ...p, deposit_amount: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Installments</label>
                                    <select value={form.installments_count} onChange={e => setForm(p => ({ ...p, installments_count: parseInt(e.target.value) }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all">
                                        {[2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} payments</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Interval</label>
                                    <select value={form.payment_interval} onChange={e => setForm(p => ({ ...p, payment_interval: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all">
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Bi-weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Reminder Via</label>
                                    <select value={form.reminder_channel} onChange={e => setForm(p => ({ ...p, reminder_channel: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:border-brand-purple/50 transition-all">
                                        <option value="email">Email</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="sms">SMS</option>
                                    </select>
                                </div>
                            </div>
                            {form.total_amount && form.installments_count && (
                                <div className="bg-brand-purple/5 border border-brand-purple/10 rounded-2xl px-6 py-4">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Preview</p>
                                    <p className="text-sm font-black text-white">
                                        Ksh {(Math.ceil((parseFloat(form.total_amount || '0') - parseFloat(form.deposit_amount || '0')) / form.installments_count)).toLocaleString()}
                                        <span className="text-gray-500 text-[11px] font-normal"> per {form.payment_interval} installment</span>
                                    </p>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowModal(false)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Cancel</button>
                                <button onClick={handleCreate} disabled={saving}
                                    className="px-8 py-3 bg-brand-purple text-white text-[11px] font-black rounded-2xl hover:bg-brand-purple/80 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
                                    {saving ? 'Creating...' : 'Create Plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple"><Clock size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Active Plans</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{active}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400"><AlertTriangle size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Overdue</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{overdue}</h4>
                    </div>
                </div>
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan"><CheckCircle2 size={28} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-2">Total Outstanding</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">Ksh {totalBalance.toLocaleString()}</h4>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Active Payment Plans</h3>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Track installments, pending balances, and default risks</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                            <input type="text" placeholder="SEARCH ORDERS OR USERS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all" />
                        </div>
                        <button onClick={() => setShowModal(true)}
                            className="px-6 py-3.5 bg-brand-purple text-white text-[10px] font-black rounded-full hover:bg-brand-purple/80 transition-all uppercase tracking-widest shadow-lg shadow-brand-purple/20 flex items-center gap-2 whitespace-nowrap">
                            <Plus size={14} /> Create Plan
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Order ID</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Client Info</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Product</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Progress</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Balance</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading && (
                                <tr><td colSpan={7} className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <RefreshCw size={40} className="text-brand-purple animate-spin" />
                                        <p className="text-[10px] font-black text-brand-purple tracking-widest uppercase">Analyzing Transmission...</p>
                                    </div>
                                </td></tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={7} className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-6 opacity-30">
                                        <Hash size={48} className="text-gray-500" />
                                        <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">No installments currently indexed.</p>
                                    </div>
                                </td></tr>
                            )}
                            {filtered.map(item => {
                                const paid = parseFloat(item.paid_amount || item.paid || 0);
                                const total = parseFloat(item.total_amount || item.total || 1);
                                const pct = Math.min(100, Math.round((paid / total) * 100));
                                return (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6 font-mono text-[11px] text-brand-purple font-bold">#{item.order_id}</td>
                                        <td className="px-8 py-6">
                                            <div className="font-black text-white group-hover:text-brand-purple transition-colors">{item.full_name || item.user_name || 'Unknown'}</div>
                                            <div className="text-[11px] text-gray-500">{item.email}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-[11px] text-white font-bold">{item.product_name || '—'}</div>
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest">{item.payment_interval}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[80px]">
                                                    <div className="h-full bg-brand-purple transition-all duration-1000" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-[10px] font-black text-white">{pct}%</span>
                                            </div>
                                            <div className="text-[9px] text-gray-600 mt-0.5">Ksh {paid.toLocaleString()} paid</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-xs font-black text-white">Ksh {parseFloat(item.balance || (total - paid)).toLocaleString()}</div>
                                            <div className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Remaining</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_CHIP[item.status] || STATUS_CHIP.active}`}>
                                                {item.status || 'active'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right flex items-center justify-end gap-2">
                                            <button className="px-4 py-2 bg-white/5 hover:bg-brand-purple hover:text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-500 transition-all">Protocol</button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                                                <X size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Installments;
