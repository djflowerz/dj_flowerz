import React, { useState, useEffect } from 'react';
import {
  Search, Calendar, Clock, Shield, AlertCircle, Activity,
  CreditCard, CheckCircle2, XCircle, PauseCircle, Trash2,
  Package, TrendingUp, User, ChevronDown, ChevronUp, Eye, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'https://api.djflowerz.co.ke';

interface InstallmentPlan {
  id: string;
  order_id: string;
  user_id: string;
  product_id?: string;
  product_name?: string;
  total_amount: number;
  deposit_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  installments_count: number;
  payment_interval?: string;
  next_payment_date?: string;
  created_at: string;
  // Joined
  full_name?: string;
  email?: string;
  phone?: string;
  order_items?: string;
  order_status?: string;
  order_payment_status?: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending_deposit: { label: 'Awaiting Deposit', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: <Clock size={10} /> },
    active:          { label: 'Active',           cls: 'bg-green-500/10 text-green-400 border-green-500/20',   icon: <Activity size={10} className="animate-pulse" /> },
    completed:       { label: 'Completed',        cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     icon: <CheckCircle2 size={10} /> },
    frozen:          { label: 'Frozen',           cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: <PauseCircle size={10} /> },
    defaulted:       { label: 'Defaulted',        cls: 'bg-red-500/10 text-red-500 border-red-500/20',        icon: <XCircle size={10} /> },
  };
  const cfg = map[status] || { label: status, cls: 'bg-white/5 text-gray-500 border-white/5', icon: null };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center w-fit gap-1.5 ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function fmt(d?: string) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminInstallmentsTab() {
  const { user: adminUser } = useAuth();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${WORKER_URL}/api/installments`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const updateStatus = async (planId: string, status: string) => {
    if (!confirm(`Update plan ${planId.substring(0, 12)} to "${status}"?`)) return;
    setActionLoading(planId);
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${WORKER_URL}/api/installments/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session!.access_token}` },
        body: JSON.stringify({ status })
      });
      await fetchPlans();
    } finally {
      setActionLoading(null);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm(`PERMANENTLY DELETE plan ${planId}? This cannot be undone.`)) return;
    setActionLoading(planId);
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${WORKER_URL}/api/installments/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session!.access_token}` }
      });
      setPlans(prev => prev.filter(p => p.id !== planId));
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = plans.filter(p => {
    const q = searchTerm.toLowerCase();
    const match =
      p.order_id?.toLowerCase().includes(q) ||
      p.customer_name?.toLowerCase().includes(q) ||
      p.customer_email?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q);
    const statusOk = statusFilter === 'all' || p.status === statusFilter;
    return match && statusOk;
  });

  // Summary stats
  const totalActive = plans.filter(p => p.status === 'active').length;
  const totalPendingDeposit = plans.filter(p => p.status === 'pending_deposit').length;
  const totalCompleted = plans.filter(p => p.status === 'completed').length;
  const totalRevenue = plans.reduce((s, p) => s + (p.paid_amount || 0), 0);
  const totalOutstanding = plans.reduce((s, p) => s + (p.balance || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Active Plans',      value: totalActive,           color: 'text-green-400',     icon: <Activity size={18} /> },
          { label: 'Pending Deposit',   value: totalPendingDeposit,   color: 'text-yellow-400',    icon: <Clock size={18} /> },
          { label: 'Completed',         value: totalCompleted,        color: 'text-blue-400',      icon: <CheckCircle2 size={18} /> },
          { label: 'Total Collected',   value: `KES ${totalRevenue.toLocaleString()}`, color: 'text-brand-purple', icon: <CreditCard size={18} /> },
          { label: 'Outstanding',       value: `KES ${totalOutstanding.toLocaleString()}`, color: 'text-brand-cyan', icon: <TrendingUp size={18} /> },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0B0B0F] rounded-2xl border border-white/5 p-5 flex flex-col gap-2">
            <div className={`${stat.color}`}>{stat.icon}</div>
            <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by order ID, name, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0B0B0F] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white focus:border-brand-purple/50 outline-none transition-all placeholder:text-gray-700"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending_deposit', 'active', 'completed', 'frozen', 'defaulted'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                statusFilter === s
                  ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button
          onClick={fetchPlans}
          className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Plans List */}
      <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-30">
            <TrendingUp size={48} className="text-gray-500" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">No plans found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map(plan => {
              const progress = plan.total_amount > 0
                ? Math.min(100, Math.round(((plan.paid_amount || 0) / plan.total_amount) * 100))
                : 0;
              const isExpanded = expandedId === plan.id;
              const isOverdue = plan.next_payment_date
                && new Date(plan.next_payment_date) < new Date()
                && plan.status === 'active';

              let items: any[] = [];
              try { items = JSON.parse(plan.order_items || '[]'); } catch {}

              return (
                <div key={plan.id} className="hover:bg-white/[0.015] transition-colors">
                  {/* Main Row */}
                  <div className="px-6 py-5 flex items-center gap-4 flex-wrap">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center font-black text-brand-purple text-sm flex-shrink-0">
                      {plan.customer_name?.charAt(0)?.toUpperCase() || <User size={18} />}
                    </div>

                    {/* Customer & Order */}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-white text-sm truncate">
                        {plan.full_name || 'Unknown Customer'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                        {plan.email} · Order: {plan.order_id}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge status={plan.status} />

                    {/* Progress Bar (compact) */}
                    <div className="w-28 hidden sm:block">
                      <div className="flex justify-between text-[9px] font-bold text-gray-600 mb-1">
                        <span>{progress}%</span>
                        <span>KES {(plan.paid_amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-purple transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Next due */}
                    <div className="text-xs text-white/50 hidden md:flex items-center gap-1.5 flex-shrink-0">
                      <Calendar size={12} className={isOverdue ? 'text-red-500' : 'text-gray-600'} />
                      <span className={isOverdue ? 'text-red-400 font-bold' : ''}>
                        {fmt(plan.next_payment_date)}
                      </span>
                      {isOverdue && <span className="text-[9px] text-red-500 font-black uppercase">Overdue</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {plan.status === 'active' && (
                        <button
                          onClick={() => updateStatus(plan.id, 'frozen')}
                          disabled={actionLoading === plan.id}
                          className="w-9 h-9 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all"
                          title="Freeze Plan"
                        >
                          <PauseCircle size={16} />
                        </button>
                      )}
                      {plan.status === 'frozen' && (
                        <button
                          onClick={() => updateStatus(plan.id, 'active')}
                          disabled={actionLoading === plan.id}
                          className="w-9 h-9 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all"
                          title="Unfreeze Plan"
                        >
                          <Activity size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deletePlan(plan.id)}
                        disabled={actionLoading === plan.id}
                        className="w-9 h-9 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Delete Plan"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 transition-all"
                        title="View Details"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-6 pb-6 border-t border-white/5 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.01]">
                      {/* Financial breakdown */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <CreditCard size={12} /> Financial Breakdown
                        </h4>
                        {[
                          { label: 'Total Value',    value: `KES ${(plan.total_amount || 0).toLocaleString()}` },
                          { label: 'Deposit (20%)',  value: `KES ${(plan.deposit_amount || 0).toLocaleString()}` },
                          { label: 'Amount Paid',    value: `KES ${(plan.paid_amount || 0).toLocaleString()}`,    cls: 'text-green-400' },
                          { label: 'Balance Owed',   value: `KES ${(plan.balance || 0).toLocaleString()}`,        cls: 'text-brand-cyan' },
                          { label: 'Installments',   value: `${plan.installments_count || 3} months` },
                        ].map(row => (
                          <div key={row.label} className="flex justify-between items-center text-xs px-3 py-2 bg-black/30 rounded-xl">
                            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{row.label}</span>
                            <span className={`font-black text-white ${row.cls || ''}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Order Items */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Package size={12} /> Order Items
                        </h4>
                        {items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-xs px-3 py-2 bg-black/30 rounded-xl">
                                <span className="text-gray-300 font-medium truncate max-w-[60%]">
                                  {item.product_name || item.name}
                                </span>
                                <span className="text-gray-500 font-bold">
                                  x{item.quantity} · KES {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">No item details</p>
                        )}
                        <div className="mt-2 flex justify-between text-[10px] font-bold text-gray-500 px-1">
                          <span>Plan ID: <span className="font-mono text-gray-400">{plan.id.substring(0, 16)}…</span></span>
                          <span>Created: {fmt(plan.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
