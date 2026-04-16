
import React, { useState, useEffect } from 'react';
import { 
  Plus, LayoutGrid, DollarSign, Send, ShoppingBag, 
  Settings, CheckCircle, Clock, AlertCircle, FileText,
  Upload, Image as ImageIcon, Music, Trash2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

export default function VendorDashboard() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  
  // Application Form State
  const [vendorSlug, setVendorSlug] = useState('');
  
  // Listing Form State
  const [showListingModal, setShowListingModal] = useState(false);
  const [newListing, setNewListing] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Loops',
    isDigital: true,
    fileUrl: '',
    imageUrl: '',
    previewUrl: ''
  });

  useEffect(() => {
    if (user?.vendorStatus === 'approved') {
      fetchListings();
    }
  }, [user]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_STORAGE_WORKER_URL}/api/marketplace/my-listings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setListings(res.data);
    } catch (e) {
      console.error("Failed to fetch listings", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsApplying(true);
    try {
      await axios.post(`${import.meta.env.VITE_STORAGE_WORKER_URL}/api/marketplace/setup`, { vendorSlug }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Application submitted for admin review!");
      await refreshUser();
    } catch (e) {
      toast.error("Application failed. Ensure slug is unique.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_STORAGE_WORKER_URL}/api/marketplace`, newListing, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Listing submitted for approval!");
      setShowListingModal(false);
      fetchListings();
    } catch (e) {
      toast.error("Failed to create listing.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="text-brand-purple" size={32} />
          </div>
          <h2 className="text-xl font-black text-white">Please log in to access the vendor portal</h2>
        </div>
      </div>
    );
  }

  // 1. APPLICATION VIEW
  if (user.vendorStatus === 'none') {
    return (
      <div className="min-h-screen bg-[#050507] pt-32 pb-20 px-4">
        <div className="max-w-xl mx-auto glass-card rounded-[3rem] p-10 border border-white/5 text-center">
          <div className="w-20 h-20 bg-brand-purple/20 rounded-3xl flex items-center justify-center mx-auto mb-8 transform -rotate-6">
            <ShoppingBag className="text-brand-purple" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">JOIN THE AURA VENDORS</h1>
          <p className="text-gray-400 mb-10">Start selling your premium sounds, presets and services on the #1 DJ marketplace in East Africa.</p>
          
          <form className="space-y-6 text-left" onSubmit={handleApply}>
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Display Name / Slug</label>
              <input 
                type="text" 
                placeholder="e.g. flow-loops-ke"
                required
                value={vendorSlug}
                onChange={(e) => setVendorSlug(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-1 focus:ring-brand-purple/50 transition-all font-bold"
              />
            </div>
            <button 
              type="submit"
              disabled={isApplying}
              className="w-full py-5 bg-brand-purple text-white font-black rounded-2xl hover:bg-white hover:text-black transition shadow-2xl disabled:opacity-50"
            >
              {isApplying ? 'SUBMITTING...' : 'APPLY AS VENDOR'}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="text-center">
              <span className="block text-xl font-black text-white">20%</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Commission</span>
            </div>
            <div className="text-center">
              <span className="block text-xl font-black text-white">Instant</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Payouts</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PENDING VIEW
  if (user.vendorStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#050507] pt-32 pb-20 px-4">
        <div className="max-w-xl mx-auto glass-card rounded-[3rem] p-12 border border-brand-purple/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 blur-[60px]"></div>
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse text-brand-purple">
            <Clock size={40} />
          </div>
          <h1 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">APPLICATION UNDER REVIEW</h1>
          <p className="text-gray-400 mb-0">Hang tight! The DJ FLOWERZ team is vetting your profile. You'll receive an email as soon as you're approved to list items.</p>
        </div>
      </div>
    );
  }

  // 3. DASHBOARD VIEW (Approved)
  return (
    <div className="min-h-screen bg-[#050507] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dash Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-brand-cyan mb-2">
              <CheckCircle size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Verified Vendor</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">DASHBOARD</h1>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={() => setShowListingModal(true)}
               className="px-6 py-4 bg-white text-black font-black rounded-2xl hover:bg-brand-cyan transition flex items-center gap-2 shadow-xl"
             >
               <Plus size={20} /> CREATE LISTING
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Earnings', value: `KES ${user.vendorBalance?.toLocaleString() || '0'}`, icon: <DollarSign />, color: 'text-brand-cyan' },
            { label: 'Active Listings', value: listings.filter(l => l.status === 'active').length, icon: <LayoutGrid />, color: 'text-brand-purple' },
            { label: 'Pending Payout', value: 'KES 0', icon: <Send />, color: 'text-amber-500' }
          ].map((stat, i) => (
            <div key={i} className="glass-card p-8 rounded-3xl border border-white/5 group">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-6 ${stat.color} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-white font-outfit">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mb-8 border-b border-white/5 pb-4 overflow-x-auto scrollbar-hide">
          {['overview', 'listings', 'sales', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-brand-purple border-b-2 border-brand-purple pb-4 -mb-[18px]' : 'text-gray-500 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Listing Management */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            {listings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {listings.map(item => (
                  <div key={item.id} className="glass-card p-6 rounded-3xl border border-white/5 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden flex-shrink-0">
                      <img loading="lazy" src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-black uppercase text-sm mb-1">{item.name}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{item.category} • KES {item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                        item.status === 'active' ? 'bg-green-500/10 text-green-500' : 
                        item.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {item.status}
                      </div>
                      <button className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white transition">
                        <Settings size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <p className="text-gray-500 font-bold uppercase text-xs">No listings found</p>
                <button 
                  onClick={() => setShowListingModal(true)}
                  className="mt-6 px-8 py-3 bg-brand-purple text-white font-black rounded-xl hover:bg-white hover:text-black transition flex items-center gap-2 mx-auto"
                >
                  <Plus size={18} /> CREATE FIRST LISTING
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab (Withdrawals) */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <div className="glass-card p-8 rounded-[2.5rem] border border-brand-purple/20 relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-black text-white uppercase mb-1">Request Withdrawal</h4>
                        <p className="text-gray-400 text-xs">Funds are sent via M-Pesa to your primary account number.</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">Available</span>
                        <span className="text-2xl font-black text-brand-purple">KES {user.vendorBalance?.toLocaleString() || '0'}</span>
                    </div>
                </div>
                <button className="w-full mt-8 py-4 bg-brand-purple text-white font-black rounded-xl hover:shadow-[0_0_30px_rgba(157,78,221,0.4)] transition">
                    PROCESS WITHDRAWAL
                </button>
            </div>
          </div>
        )}

      </div>

      {/* CREATE LISTING MODAL */}
      {showListingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-[#0B0B0F] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between flex-shrink-0">
               <h2 className="text-xl font-black text-white uppercase tracking-tighter">CREATE NEW LISTING</h2>
               <button onClick={() => setShowListingModal(false)} className="text-gray-500 hover:text-white transition">
                  <Trash2 size={24} />
               </button>
            </div>
            
            <form className="p-8 overflow-y-auto space-y-6" onSubmit={handleCreateListing}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Item Name</label>
                    <input 
                      type="text" required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold focus:ring-1 focus:ring-brand-purple/50"
                      value={newListing.name}
                      onChange={e => setNewListing({...newListing, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Price (KES)</label>
                    <input 
                      type="number" required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-bold focus:ring-1 focus:ring-brand-purple/50"
                      value={newListing.price}
                      onChange={e => setNewListing({...newListing, price: e.target.value})}
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Description</label>
                  <textarea 
                    rows={3} required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-xs font-medium focus:ring-1 focus:ring-brand-purple/50"
                    value={newListing.description}
                    onChange={e => setNewListing({...newListing, description: e.target.value})}
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14}/> Image URL</label>
                     <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white" value={newListing.imageUrl} onChange={e => setNewListing({...newListing, imageUrl: e.target.value})} />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Music size={14}/> Audio Preview URL</label>
                     <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white" value={newListing.previewUrl} onChange={e => setNewListing({...newListing, previewUrl: e.target.value})} />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"><Upload size={14}/> Download File URL</label>
                     <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white" value={newListing.fileUrl} onChange={e => setNewListing({...newListing, fileUrl: e.target.value})} />
                  </div>
               </div>

               <div className="pt-8">
                  <button type="submit" className="w-full py-5 bg-brand-purple text-white font-bold rounded-2xl hover:bg-white hover:text-black transition shadow-2xl">
                    SUBMIT FOR ADMIN VETTING
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
