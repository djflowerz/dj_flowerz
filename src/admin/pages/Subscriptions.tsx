import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useAdminApi } from '../hooks/useAdminApi';
import { useAuth } from '@/context/AuthContext';
import {
    Crown, Search, XCircle, CheckCircle, Clock, Plus,
    RefreshCw, Shield, UserCheck, UserX, Zap, Edit, Trash2, X
} from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
    id: string;
    name: string;
    price: number;
    period: string;
    description?: string;
    features: string[];
    active: boolean;
    slug: string;
}

const Subscriptions: React.FC = () => {
    const { request, loading } = useAdminApi();
    const { session } = useAuth();
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [grantEmail, setGrantEmail] = useState('');
    const [grantPlan, setGrantPlan] = useState('');
    const [working, setWorking] = useState(false);
    const [tab, setTab] = useState<'active' | 'plans'>('active');
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

    useEffect(() => {
        if (session) {
            loadSubscribers();
            loadPlans();
        }
    }, [session]);

    const loadSubscribers = async () => {
        try {
            const data = await request('/api/admin/active-subscribers');
            setSubscribers(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load subscribers');
        }
    };

    const loadPlans = async () => {
        try {
            const data = await request('/api/admin/plans');
            const planList = Array.isArray(data) ? data : [];
            setPlans(planList);
            if (planList.length > 0 && !grantPlan) {
                setGrantPlan(planList[0].id);
            }
        } catch {
            // non-critical
        }
    };

    const handlePlanSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setWorking(true);
        try {
            const method = editingPlan?.id ? 'PUT' : 'POST';
            const endpoint = '/api/admin/subscriptions/manage';
            
            const res = await request(endpoint, {
                method,
                body: JSON.stringify({
                    action: editingPlan?.id ? 'update_plan' : 'create_plan',
                    plan: editingPlan
                }),
            });

            if (res.success) {
                toast.success(editingPlan?.id ? 'Plan updated' : 'Plan created');
                setIsPlanModalOpen(false);
                setEditingPlan(null);
                loadPlans();
            }
        } catch (e: any) {
            toast.error('Operation failed: ' + e.message);
        } finally {
            setWorking(false);
        }
    };

    const handlePlanDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to DELETE this plan? This may affect users.')) return;
        try {
            const res = await request('/api/admin/subscriptions/manage', {
                method: 'DELETE',
                body: JSON.stringify({ action: 'delete_plan', id }),
            });
            if (res.success) {
                toast.success('Plan deleted');
                loadPlans();
            }
        } catch (e: any) {
            toast.error('Delete failed: ' + e.message);
        }
    };

    const handleGrant = async () => {
        if (!grantEmail.trim()) return toast.error('Enter a valid email');
        setWorking(true);
        try {
            const res = await request('/api/admin/subscriptions/manage', {
                method: 'POST',
                body: JSON.stringify({ email: grantEmail.trim(), plan: grantPlan, action: 'grant' }),
            });
            if (res.success) {
                toast.success(`Access granted (${grantPlan}) → ${grantEmail}`);
                setGrantEmail('');
                loadSubscribers();
            }
        } catch {
            toast.error('Grant failed');
        } finally {
            setWorking(false);
        }
    };

    const handleRevoke = async (email: string, name: string) => {
        if (!window.confirm(`REVOKE ACCESS for ${name || email}?`)) return;
        try {
            const res = await request('/api/admin/revoke-access', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            if (res.success) {
                toast.success('Access revoked');
                loadSubscribers();
            }
        } catch {
            toast.error('Revoke failed');
        }
    };

    const daysLeft = (expiry: string) => {
        const diff = new Date(expiry).getTime() - Date.now();
        const d = Math.ceil(diff / 86400000);
        if (d <= 0) return { label: 'Expires Today', color: 'text-red-500' };
        if (d <= 3) return { label: `${d}d left`, color: 'text-orange-400' };
        return { label: `${d}d left`, color: 'text-emerald-400' };
    };

    const filtered = subscribers.filter(u =>
        (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout title="Subscription Matrix">
            {/* Grant Access Panel */}
            <div className="bg-[#0B0B0F] border border-brand-purple/20 rounded-[3rem] p-10 mb-10 shadow-xl shadow-brand-purple/5">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center text-brand-purple">
                        <Zap size={22} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Grant Access</h3>
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Manually activate a subscription</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="email"
                        placeholder="USER EMAIL ADDRESS..."
                        value={grantEmail}
                        onChange={e => setGrantEmail(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-full py-4 px-8 text-[11px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all placeholder:text-gray-700"
                    />
                    <select
                        value={grantPlan}
                        onChange={e => setGrantPlan(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-full py-4 px-8 text-[11px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all appearance-none cursor-pointer min-w-[150px]"
                    >
                        {plans.map(p => (
                            <option key={p.id} value={p.id} className="bg-[#0B0B0F]">
                                {p.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleGrant}
                        disabled={working}
                        className="bg-brand-purple text-white px-10 py-4 rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-purple/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                        <Plus size={16} />
                        {working ? 'Processing...' : 'Grant Access'}
                    </button>
                </div>
            </div>

            {/* Tab bar + search */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div className="flex gap-4">
                    <button
                        onClick={() => setTab('active')}
                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'active' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        Active Subscribers
                    </button>
                    <button
                        onClick={() => setTab('plans')}
                        className={`px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'plans' ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        Plans
                    </button>
                    {tab === 'plans' && (
                        <button
                            onClick={() => {
                                setEditingPlan({ id: '', name: '', price: 0, period: 'monthly', features: [], active: true, slug: '' });
                                setIsPlanModalOpen(true);
                            }}
                            className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-all"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{subscribers.length} Active</p>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-brand-purple transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="SEARCH..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-[#0B0B0F] border border-white/5 rounded-full py-4 pl-12 pr-6 text-[10px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 w-64"
                        />
                    </div>
                    <button
                        onClick={loadSubscribers}
                        className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-gray-500 hover:text-brand-purple hover:border-brand-purple/30 transition-all"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {tab === 'active' && (
                <div className="bg-[#0B0B0F] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Subscriber</th>
                                <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Plan</th>
                                <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Expiry</th>
                                <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                                <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple animate-pulse">Loading Subscribers...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-40">
                                            <Crown size={48} className="text-gray-600" />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">No active subscribers found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map(user => {
                                const dl = daysLeft(user.subscription_expiry);
                                return (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                                                    <UserCheck size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white tracking-tighter group-hover:text-brand-purple transition-colors">{user.full_name || 'Unknown'}</p>
                                                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                                                {user.subscription_plan || 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-8">
                                            <p className="text-[11px] font-black text-white uppercase tracking-widest">
                                                {new Date(user.subscription_expiry).toLocaleDateString()}
                                            </p>
                                            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${dl.color}`}>
                                                <Clock size={10} className="inline mr-1" />{dl.label}
                                            </p>
                                        </td>
                                        <td className="px-8 py-8">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                                <CheckCircle size={14} /> Active
                                            </p>
                                        </td>
                                        <td className="px-8 py-8">
                                            <button
                                                onClick={() => handleRevoke(user.email, user.full_name)}
                                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 transition-colors px-4 py-2 rounded-xl hover:bg-red-500/5"
                                            >
                                                <UserX size={14} />
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {plans.length === 0 ? (
                        <div className="col-span-full py-24 flex flex-col items-center gap-4 opacity-40">
                            <Shield size={48} className="text-gray-600" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">No plans configured</span>
                        </div>
                    ) : plans.map(plan => (
                        <div key={plan.id} className="bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] p-10 hover:border-brand-purple/30 transition-all group relative">
                            <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={() => {
                                        setEditingPlan(plan);
                                        setIsPlanModalOpen(true);
                                    }}
                                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 transition-all"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handlePlanDelete(plan.id)}
                                    className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-white tracking-tighter group-hover:text-brand-purple transition-colors">{plan.name}</h3>
                                <span className={`w-3 h-3 rounded-full ${plan.active ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                            </div>
                            <p className="text-3xl font-black text-brand-purple tracking-tighter mb-2">
                                KES {Number(plan.price).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">{plan.period}</p>
                            <div className="space-y-2">
                                {(plan.features || []).map((f: string, i: number) => (
                                    <p key={i} className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                                        <CheckCircle size={12} className="text-brand-purple" /> {f}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Plan Modal */}
            {isPlanModalOpen && editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsPlanModalOpen(false)} />
                    <div className="relative bg-[#0B0B0F] border border-white/10 rounded-[3rem] w-full max-w-lg p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setIsPlanModalOpen(false)} className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors">
                            <X size={24} />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{editingPlan.id ? 'Edit Plan' : 'New Plan'}</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Configure subscription details</p>
                        </div>

                        <form onSubmit={handlePlanSave} className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Plan Name</label>
                                <input
                                    required
                                    value={editingPlan.name}
                                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[12px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all"
                                    placeholder="e.g. Monthly Standard"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Price (KES)</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingPlan.price}
                                        onChange={e => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[12px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Period</label>
                                    <select
                                        value={editingPlan.period}
                                        onChange={e => setEditingPlan({ ...editingPlan, period: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[12px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all appearance-none"
                                    >
                                        <option value="weekly" className="bg-[#0B0B0F]">Weekly</option>
                                        <option value="monthly" className="bg-[#0B0B0F]">Monthly</option>
                                        <option value="annual" className="bg-[#0B0B0F]">Annual</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Slug (Unique ID)</label>
                                <input
                                    required
                                    value={editingPlan.slug}
                                    onChange={e => setEditingPlan({ ...editingPlan, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[12px] font-black tracking-widest text-white outline-none focus:border-brand-purple/50 transition-all"
                                    placeholder="e.g. monthly-pro"
                                    disabled={!!editingPlan.id}
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Features (One per line)</label>
                                <textarea
                                    rows={4}
                                    value={editingPlan.features.join('\n')}
                                    onChange={e => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(l => l.trim()) })}
                                    className="w-full bg-white/5 border border-white/10 rounded-3xl py-4 px-6 text-[12px] font-medium tracking-wide text-white outline-none focus:border-brand-purple/50 transition-all resize-none"
                                    placeholder="Access to all mixtapes&#10;Hi-Fi Audio Download&#10;Ad-free experience"
                                />
                            </div>

                            <div className="flex items-center gap-4 px-4 py-6 bg-white/5 rounded-3xl border border-white/10">
                                <input
                                    type="checkbox"
                                    checked={editingPlan.active}
                                    onChange={e => setEditingPlan({ ...editingPlan, active: e.target.checked })}
                                    className="w-5 h-5 accent-brand-purple"
                                />
                                <span className="text-[11px] font-black uppercase tracking-widest text-white">Active & Published</span>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={working}
                                    className="w-full bg-brand-purple text-white py-6 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {working ? 'Saving...' : 'Save Plan Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Subscriptions;
