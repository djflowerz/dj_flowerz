import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  Shield, 
  AlertCircle, 
  Activity, 
  CreditCard, 
  CheckCircle2, 
  XCircle,
  PauseCircle,
  Trash2,
  DollarSign,
  User,
  Package,
  TrendingUp
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { InstallmentPlan } from '../../types';

export default function AdminInstallmentsTab() {
  const { 
    installmentPlans, 
    installmentsLoading, 
    users, 
    products,
    addInstallmentPlan,
    updateInstallmentPlan,
    deleteInstallmentPlan
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlan, setNewPlan] = useState({
    userId: '',
    productId: '',
    totalAmount: 0,
    depositAmount: 0,
    installmentsCount: 3,
    intervalDays: 30,
    nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const filteredPlans = installmentPlans.filter(plan => {
    const user = users.find(u => u.id === plan.userId);
    const product = products.find(p => p.id === plan.productId);
    const searchString = `${user?.displayName} ${user?.email} ${product?.name} ${plan.status}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.userId || !newPlan.productId) return;

    const success = await addInstallmentPlan({
      ...newPlan,
      status: 'active'
    });

    if (success) {
      setShowAddForm(false);
      setNewPlan({
        userId: '',
        productId: '',
        totalAmount: 0,
        depositAmount: 0,
        installmentsCount: 3,
        intervalDays: 30,
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (confirm(`INITIATE PROTOCOL: UPDATE PLAN STATUS TO ${status.toUpperCase()}?`)) {
      await updateInstallmentPlan(id, { status } as any);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm(`WARNING: DATA DELETION IS PERMANENT. PROCEED WITH DELETING INSTALLMENT PLAN ${id}?`)) {
      await deleteInstallmentPlan(id);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-green-500/5 text-green-500 border border-green-500/20 flex items-center w-fit gap-2">
            <Activity size={10} className="animate-pulse" />
            Locked On
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-500/5 text-blue-500 border border-blue-500/20 flex items-center w-fit gap-2">
            <CheckCircle2 size={10} />
            Transmission Finished
          </span>
        );
      case 'frozen':
        return (
          <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-500/5 text-yellow-500 border border-yellow-500/20 flex items-center w-fit gap-2">
            <PauseCircle size={10} />
            Signal Frozen
          </span>
        );
      case 'defaulted':
        return (
          <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/5 text-red-500 border border-red-500/20 flex items-center w-fit gap-2">
            <XCircle size={10} />
            Signal Lost
          </span>
        );
      default:
        return (
          <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/5 text-gray-500 border border-white/5">
            Unknown Origin
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Plan Console */}
        <div className="lg:col-span-1">
          <div className="bg-[#0B0B0F] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-brand-purple/10 transition-all duration-700" />
            
            <div className="relative z-10">
              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple">
                  <CreditCard size={20} />
                </div>
                Installment Engine
              </h2>

              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all mb-6 flex items-center justify-center gap-2"
              >
                {showAddForm ? <XCircle size={18} /> : <Plus size={18} />}
                {showAddForm ? 'Abort Sequence' : 'Initialize New Plan'}
              </button>

              {showAddForm && (
                <form onSubmit={handleAddPlan} className="space-y-6 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Target User</label>
                    <select
                      required
                      value={newPlan.userId}
                      onChange={(e) => {
                        const user = users.find(u => u.id === e.target.value);
                        setNewPlan({ ...newPlan, userId: e.target.value });
                      }}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Operator...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id} className="bg-[#0B0B0F]">
                          {user.displayName || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Acquisition Target</label>
                    <select
                      required
                      value={newPlan.productId}
                      onChange={(e) => {
                        const product = products.find(p => p.id === e.target.value);
                        setNewPlan({ 
                          ...newPlan, 
                          productId: e.target.value,
                          totalAmount: product?.price || 0,
                          depositAmount: Math.ceil((product?.price || 0) * 0.2) // Default 20% deposit
                        });
                      }}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 outline-none transition-all cursor-pointer"
                    >
                      <option value="">Select Asset...</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id} className="bg-[#0B0B0F]">
                          {product.name} (KES {product.price?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Total Value</label>
                      <input
                        type="number"
                        required
                        value={newPlan.totalAmount}
                        onChange={(e) => setNewPlan({ ...newPlan, totalAmount: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Initial Deposit</label>
                      <input
                        type="number"
                        required
                        value={newPlan.depositAmount}
                        onChange={(e) => setNewPlan({ ...newPlan, depositAmount: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Cycles</label>
                      <input
                        type="number"
                        required
                        value={newPlan.installmentsCount}
                        onChange={(e) => setNewPlan({ ...newPlan, installmentsCount: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Next Signal Date</label>
                      <input
                        type="date"
                        required
                        value={newPlan.nextPaymentDate}
                        onChange={(e) => setNewPlan({ ...newPlan, nextPaymentDate: e.target.value })}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white focus:border-brand-purple/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand-purple text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-purple-600 transition-all shadow-xl shadow-brand-purple/20 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Activity size={18} />
                    Commit Protocol
                  </button>
                </form>
              )}

              <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-3">
                <AlertCircle className="text-brand-purple shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                  Initializing a plan will notify the user and start the monitoring sequence. Deposit should be confirmed before activation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Installments Registry */}
        <div className="lg:col-span-2">
          <div className="bg-[#0B0B0F] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl h-full flex flex-col">
            <div className="p-8 border-b border-white/5 bg-white/[0.01]">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="SCANNING INSTALLMENT REGISTRY: SEARCH OPERATORS OR ASSETS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-xs font-black uppercase tracking-[0.1em] text-white focus:border-brand-purple/50 outline-none transition-all placeholder:text-gray-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-[#0B0B0F] text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-6">Operator & Asset</th>
                    <th className="px-8 py-6">Signal Status</th>
                    <th className="px-8 py-6">Progress Matrix</th>
                    <th className="px-8 py-6">Next Signal</th>
                    <th className="px-8 py-6 text-right">Commands</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-sm">
                  {filteredPlans.length > 0 ? (
                    filteredPlans.map((plan) => {
                      const user = users.find(u => u.id === plan.userId);
                      const product = products.find(p => p.id === plan.productId);
                      const progress = Math.round(((plan.paidAmount || 0) / plan.totalAmount) * 100);

                      return (
                        <tr key={plan.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-brand-purple group-hover:bg-brand-purple/10 group-hover:border-brand-purple/20 transition-all">
                                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="font-black text-white group-hover:text-brand-purple transition-colors flex items-center gap-2">
                                  {user?.displayName || 'ANONYMOUS_USER'}
                                  <span className="text-gray-600">/</span>
                                  {product?.name || 'UNKNOWN_ASSET'}
                                </div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                  KES {plan.totalAmount?.toLocaleString()} • {plan.installmentsCount} Cycles
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            {getStatusBadge(plan.status)}
                          </td>
                          <td className="px-8 py-6">
                            <div className="w-32 space-y-2">
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                                <span>{progress}%</span>
                                <span>KES {plan.paidAmount?.toLocaleString()}</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand-purple" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-xs font-black font-display text-white/70 flex items-center gap-2">
                                <Calendar size={14} className="text-gray-600" />
                                {formatDate(plan.nextPaymentDate)}
                              </span>
                              {new Date(plan.nextPaymentDate || '') < new Date() && plan.status === 'active' && (
                                <span className="text-[9px] text-red-500 font-black uppercase tracking-widest mt-1">Overdue Signal</span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              {plan.status === 'active' ? (
                                <button
                                  onClick={() => handleUpdateStatus(plan.id, 'frozen')}
                                  className="w-10 h-10 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all"
                                  title="Freeze Signal"
                                >
                                  <PauseCircle size={18} />
                                </button>
                              ) : plan.status === 'frozen' ? (
                                <button
                                  onClick={() => handleUpdateStatus(plan.id, 'active')}
                                  className="w-10 h-10 rounded-xl bg-green-500/5 border border-green-500/10 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all"
                                  title="Restore Signal"
                                >
                                  <Activity size={18} />
                                </button>
                              ) : null}
                              <button
                                onClick={() => handleDeletePlan(plan.id)}
                                className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                title="Purge Record"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-30">
                          <TrendingUp size={48} className="text-gray-500" />
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">No active installment transmissions found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
