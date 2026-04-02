import React, { useState, useMemo } from 'react';
import { 
  X, Search, User as UserIcon, Package, Calendar, 
  CreditCard, AlertCircle, CheckCircle2, TrendingUp,
  Mail, Phone, Shield, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { User, Product, InstallmentPlan } from '../../types';

interface CreatePlanModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePlanModal({ onClose, onSuccess }: CreatePlanModalProps) {
  const { users, products, addInstallmentPlan } = useData();
  
  // Step State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(3);
  const [paymentInterval, setPaymentInterval] = useState<'weekly' | 'monthly'>('monthly');
  const [reminderChannel, setReminderChannel] = useState<'email' | 'whatsapp' | 'both'>('both');

  // Filtered Lists
  const filteredUsers = useMemo(() => {
    if (!userSearch) return [];
    return users.filter(u => 
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    ).slice(0, 5);
  }, [users, userSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name?.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 5);
  }, [products, productSearch]);

  // Handle Selection
  const selectUser = (u: User) => {
    setSelectedUser(u);
    setUserSearch('');
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setTotalAmount(p.price);
    setDepositAmount(Math.round(p.price * 0.2)); // Default 20%
    setProductSearch('');
  };

  const handleNext = () => {
    if (step === 1 && !selectedUser) return;
    if (step === 2 && !selectedProduct) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!selectedUser || !selectedProduct) return;
    setLoading(true);
    setError(null);

    const planData: Partial<InstallmentPlan> = {
      user_id: selectedUser.id,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      paid_amount: 0,
      balance: totalAmount - depositAmount,
      status: 'pending_deposit',
      payment_interval: paymentInterval,
      installments_count: installmentsCount,
      reminder_channel: reminderChannel,
      is_reminder_enabled: true,
      user_email: selectedUser.email,
      user_name: selectedUser.name
    };

    try {
      const success = await addInstallmentPlan(planData);
      if (success) {
        onSuccess();
      } else {
        setError('Failed to create plan. Please check your network or permissions.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const balance = totalAmount - depositAmount;
  const installmentAmount = installmentsCount > 0 ? Math.round(balance / installmentsCount) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-[#0B0B0F] border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
                <TrendingUp size={20} />
              </div>
              Create Installment Plan
            </h2>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
              Step {step} of 3: {step === 1 ? 'Customer' : step === 2 ? 'Product' : 'Terms'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {!selectedUser ? (
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Search Customer</label>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
                      <input 
                        type="text"
                        placeholder="Search by name or email..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white focus:border-brand-purple/50 outline-none transition-all"
                      />
                    </div>
                    
                    {filteredUsers.length > 0 && (
                      <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                        {filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => selectUser(u)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                              <UserIcon size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{u.name}</p>
                              <p className="text-[10px] text-gray-500">{u.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-brand-purple/5 border border-brand-purple/20 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple">
                        <UserIcon size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{selectedUser.name}</p>
                        <p className="text-[10px] font-bold text-brand-purple uppercase tracking-widest">{selectedUser.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="text-[10px] font-black text-brand-purple uppercase tracking-widest hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {!selectedProduct ? (
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Select Product</label>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-purple transition-colors" size={18} />
                      <input 
                        type="text"
                        placeholder="Search product name..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white focus:border-brand-purple/50 outline-none transition-all"
                      />
                    </div>
                    
                    {filteredProducts.length > 0 && (
                      <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                        {filteredProducts.map(p => (
                          <button
                            key={p.id}
                            onClick={() => selectProduct(p)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                              <Package size={14} />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-white">{p.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest">KES {p.price.toLocaleString()}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-brand-cyan/5 border border-brand-cyan/20 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
                        <Package size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{selectedProduct.name}</p>
                        <p className="text-[10px] font-bold text-brand-cyan uppercase tracking-widest">KES {selectedProduct.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="text-[10px] font-black text-brand-cyan uppercase tracking-widest hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Price (KES)</label>
                    <input 
                      type="number"
                      value={totalAmount}
                      onChange={e => setTotalAmount(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-purple/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Deposit (KES)</label>
                    <input 
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-purple/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Inst. Count</label>
                    <select 
                      value={installmentsCount}
                      onChange={e => setInstallmentsCount(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-brand-purple/50 appearance-none cursor-pointer"
                    >
                      {[2, 3, 4, 5, 6, 12].map(n => (
                        <option key={n} value={n} className="bg-[#0B0B0F]">{n} Installments</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Interval</label>
                    <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
                      <button 
                        onClick={() => setPaymentInterval('weekly')}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${paymentInterval === 'weekly' ? 'bg-brand-purple text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Weekly
                      </button>
                      <button 
                        onClick={() => setPaymentInterval('monthly')}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${paymentInterval === 'monthly' ? 'bg-brand-purple text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Balance</span>
                    <span className="text-sm font-black text-white">KES {balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Per Installment</span>
                    <span className="text-sm font-black text-brand-purple">KES {installmentAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <AlertCircle size={12} className="text-brand-purple" />
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Plan will start in 'Pending Deposit' status.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
              <AlertCircle size={18} />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-10 flex gap-4">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 px-6 py-4 rounded-2xl border border-white/10 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-white/5 transition-all"
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={(step === 1 && !selectedUser) || (step === 2 && !selectedProduct)}
                className="flex-[2] px-6 py-4 rounded-2xl bg-brand-purple text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-purple/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-purple/20"
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] px-6 py-4 rounded-2xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-green-500/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Create Plan
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
