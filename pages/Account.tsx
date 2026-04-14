
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Settings, LogOut, CreditCard, Download, Shield, Clock, Edit2, X, Save, AlertOctagon, Mail, Trash2, Users, Copy, Gift, Share2, DollarSign, TrendingUp, UserPlus, CheckCircle, Package, ShieldCheck, Zap, Star, FileText, Heart } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Link, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { isUserSubscriber, getSubscriptionTimeLeft } from '../utils/authHelpers';
import { downloadFileSecurely } from '../utils/downloadHelper';
import MFAEnrollment from '../components/MFAEnrollment';
import ReauthModal from '../components/ReauthModal';
import SubscriptionTimer from '../components/SubscriptionTimer';
import UserInstallments from '../components/user/UserInstallments';
import { toast } from 'sonner';

const generateOrderPDF = (order: any) => {
  const doc = new jsPDF();
  const themeColor: [number, number, number] = [147, 51, 234]; // Brand Purple (RGB for #9333ea)

  // Header - Brand
  doc.setFontSize(24);
  doc.setTextColor(themeColor[0], themeColor[1], themeColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("DJ FLOWERZ", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Official Invoice / Order Summary", 14, 28);

  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Order ID: #${order.id.toUpperCase()}`, 14, 45);
  doc.text(`Date: ${new Date(order.date || order.createdAt).toLocaleDateString()}`, 14, 50);
  doc.text(`Status: ${order.status.toUpperCase()}`, 14, 55);
  doc.text(`Payment: ${order.paymentStatus.toUpperCase()}`, 14, 60);

  // Customer Info
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 120, 45);
  doc.setFont("helvetica", "normal");
  doc.text(order.customerName || "Customer", 120, 50);
  doc.text(order.customerEmail, 120, 55);
  if (order.customerPhone) doc.text(order.customerPhone, 120, 60);
  if (order.address) {
    const splitAddress = doc.splitTextToSize(order.address, 70);
    doc.text(splitAddress, 120, 65);
  }

  // Items Table
  const tableData = order.items.map((item: any) => [
    item.productName,
    item.variant || 'Standard',
    item.quantity.toString(),
    `KES ${item.price.toLocaleString()}`,
    `KES ${(item.price * item.quantity).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 85,
    head: [['Product', 'Variant', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    headStyles: { fillColor: themeColor, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: 14, right: 14 }
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "normal");
  
  const summaryX = 140;
  doc.text("Subtotal:", summaryX, finalY);
  doc.text(`KES ${(order.subtotal || order.total - (order.shippingCost || 0) + (order.discountAmount || 0)).toLocaleString()}`, 190, finalY, { align: 'right' });

  if (order.discountAmount > 0) {
    doc.text("Discount:", summaryX, finalY + 5);
    doc.text(`- KES ${order.discountAmount.toLocaleString()}`, 190, finalY + 5, { align: 'right' });
  }

  if (order.shippingCost > 0) {
    doc.text("Shipping:", summaryX, finalY + 10);
    doc.text(`KES ${order.shippingCost.toLocaleString()}`, 190, finalY + 10, { align: 'right' });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total:", summaryX, finalY + 18);
  doc.text(`KES ${order.total.toLocaleString()}`, 190, finalY + 18, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150);
  doc.text("Thank you for shopping with DJ FLOWERZ!", 105, 280, { align: 'center' });
  doc.text("www.djflowerz.co.ke", 105, 285, { align: 'center' });

  doc.save(`Order_${order.id.slice(-8).toUpperCase()}.pdf`);
  toast.success("Order PDF downloaded successfully");
};

const Account: React.FC = () => {
  const { user, loading, logout, updateUserProfile, updateUserPassword, updateUserEmail, deleteAccount } = useAuth();
  const { orders, ordersLoading: contextOrdersLoading, referralLogs, referralStats: allReferralStats, wishlist, products, mixtapes, poolTracks, toggleWishlist, wishlistLoading } = useData();
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  // Set active tab based on query param
  const [activeTab, setActiveTab] = useState<'profile' | 'aura-rewards' | 'orders' | 'downloads' | 'subscription' | 'referrals' | 'wishlist' | 'installments'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as any;
    const allowed = ['profile', 'aura-rewards', 'orders', 'downloads', 'subscription', 'referrals', 'wishlist', 'installments'];
    return allowed.includes(tab) ? tab : 'profile';
  });

  // Update tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as any;
    const allowed = ['profile', 'aura-rewards', 'orders', 'downloads', 'subscription', 'referrals', 'wishlist', 'installments'];
    if (tab && allowed.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [window.location.search]);

  // Sensitive Actions State
  const [showReauth, setShowReauth] = useState(false);
  const [pendingAction, setPendingAction] = useState<'email' | 'delete' | 'password' | null>(null);
  const [newEmail, setNewEmail] = useState('');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  const handleRedeem = async (rewardId: string) => {
    if (!user?.id) return;
    
    setIsRedeeming(rewardId);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, rewardId })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message, {
          description: data.code ? `Your coupon code: ${data.code}` : "Your access has been extended.",
          duration: 10000,
        });
        // Wait a bit then refresh to sync points
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const error = await response.text();
        toast.error(error || "Redemption failed");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsRedeeming(null);
    }
  };

  // Downloads State
  const [myDownloads, setMyDownloads] = useState<any[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(true);

  // Referral State
  const [myReferrals, setMyReferrals] = useState<any[]>([]);
  const [userReferralStats, setUserReferralStats] = useState<any>(null);

  const handleActionClick = (action: 'email' | 'delete' | 'password') => {
    if (action === 'email' && !newEmail) {
      alert("Please enter a new email address first.");
      return;
    }
    setPendingAction(action);
    setShowReauth(true);
  };

  const handleReauthSuccess = async () => {
    setShowReauth(false);
    try {
      if (pendingAction === 'email') {
        await updateUserEmail(newEmail);
        alert("Email update initiated. Please check your new email for a confirmation link.");
        setNewEmail('');
      } else if (pendingAction === 'delete') {
        await deleteAccount();
        // Redirect will happen automatically via Navigate in Account.tsx if user is null
      }
    } catch (error: any) {
      alert("Action failed: " + error.message);
    }
    setPendingAction(null);
  };

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phoneNumber || '');
      setEditAvatar(user.avatarUrl || '');
      setEditUsername(user.username || '');
      setEditBio(user.bio || '');
      setEditLocation(user.location || '');

      // Get Downloads (Orders) from context
      if (orders.length > 0) {
        const downloads = orders
          .filter(o => o.customerEmail === user.email)
          .filter(o => o.status === 'completed' || o.paymentStatus === 'paid')
          .map((order: any) => {
            const digitalItems = (order.items || []).filter((item: any) => item.type === 'digital');
            if (digitalItems.length === 0) return null;
            return {
              id: order.id,
              date: order.createdAt,
              items: digitalItems
            };
          })
          .filter(Boolean);
        setMyDownloads(downloads);
        setDownloadsLoading(false);
      } else if (!contextOrdersLoading) {
        setDownloadsLoading(false);
      }

      // Get Referrals
      if ((referralLogs || []).length > 0) {
        const logs = (referralLogs || []).filter(l => l.referrer_id === user.id || l.referrerId === user.id);
        setMyReferrals(logs);

        const stats = (allReferralStats || []).find(s => s.user_id === user.id || s.userId === user.id);
        if (stats) {
          setUserReferralStats(stats);
        } else if (logs.length > 0) {
          setUserReferralStats({
            total_referrals: logs.length,
            total_earned: logs.reduce((acc: number, log: any) => acc + (Number(log.reward_amount || log.rewardAmount) || 0), 0)
          });
        }
      }
    }
  }, [user, orders, contextOrdersLoading, referralLogs, allReferralStats]);

  const handleSaveProfile = async () => {
    setEditLoading(true);
    try {
      await updateUserProfile({ 
        name: editName, 
        phoneNumber: editPhone, 
        avatarUrl: editAvatar,
        username: editUsername,
        bio: editBio,
        location: editLocation
      });
      alert("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      alert("Failed to update profile: " + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const fetchLoyaltyHistory = async () => {
    if (!user?.id) return;
    setLoadingLoyalty(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/loyalty/history?userId=${user.id}`);
      if (resp.ok) {
        const data = await resp.json();
        setLoyaltyHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch loyalty history:", err);
    } finally {
      setLoadingLoyalty(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'aura-rewards') {
      fetchLoyaltyHistory();
    }
  }, [activeTab]);

  if (!user && !loading) {
    return (
      <div className="pt-32 pb-20 min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">Loading Account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#0B0B0F]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">


        {/* Profile Card */}
        <div className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden mb-8 shadow-xl">
          <div className="h-32 bg-gradient-to-r from-brand-purple/20 to-brand-cyan/20 relative">
            <button
              onClick={logout}
              className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 hover:bg-red-500/20 text-white hover:text-red-400 px-3 py-1.5 rounded-lg text-sm font-bold transition backdrop-blur-md"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>

          <div className="px-6 pb-6 md:px-8 md:pb-8 relative">
            <div className="-mt-12 mb-6 flex flex-col md:flex-row items-end gap-6">
              <div className="relative group">
                <img
                  src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                  alt="Profile"
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#15151A] shadow-lg object-cover bg-[#15151A]"
                />
                <div className="absolute bottom-2 right-2 bg-brand-cyan text-black p-1.5 rounded-full shadow-lg border-2 border-[#15151A]">
                  <UserIcon size={14} />
                </div>
              </div>

              <div className="flex-1 w-full md:w-auto text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Display Name</label>
                        <input
                          id="editName"
                          name="editName"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Phone Number</label>
                        <input
                          id="editPhone"
                          name="editPhone"
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="+254..."
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Community Handle</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-purple font-bold">@</span>
                          <input
                            id="editUsername"
                            name="editUsername"
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            placeholder="username"
                            className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-none focus:border-brand-purple transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Location</label>
                        <input
                          id="editLocation"
                          name="editLocation"
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          placeholder="e.g. Nairobi, Kenya"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-purple transition-all"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Bio / Artist Description</label>
                        <textarea
                          id="editBio"
                          name="editBio"
                          rows={3}
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          placeholder="Tell the community about your sound..."
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-purple transition-all resize-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Profile Picture URL (Optional)</label>
                        <input
                          id="editAvatar"
                          name="editAvatar"
                          type="url"
                          value={editAvatar}
                          onChange={(e) => setEditAvatar(e.target.value)}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter a URL to your profile picture</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      {editLoading ? (
                        <span className="text-gray-400 text-sm animate-pulse">Saving...</span>
                      ) : (
                        <>
                          <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold flex items-center gap-2">
                            <X size={14} /> Cancel
                          </button>
                          <button onClick={handleSaveProfile} className="px-6 py-2 bg-brand-purple hover:bg-purple-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-purple/20">
                            <Save size={14} /> Save Changes
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center justify-center md:justify-start gap-2">
                        {user.name}
                        {user.isAdmin && <Shield size={18} className="text-brand-purple" fill="currentColor" />}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-purple/20 border border-brand-purple/30 rounded-full">
                          <Zap size={10} className="text-brand-purple fill-current" />
                          <span className="text-[10px] font-black uppercase text-brand-purple tracking-widest">
                            Aura: {user.auraPoints || 0}
                          </span>
                        </div>
                      </h1>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-1">
                        <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 text-sm md:text-base">
                          {user.email}
                          {user.phoneNumber && <span className="w-1 h-1 bg-gray-600 rounded-full" />}
                          {user.phoneNumber}
                        </p>
                        <div className="w-1 h-1 rounded-full bg-white/10 hidden md:block" />
                        <div className="flex items-center gap-1.5 text-xs text-brand-cyan font-bold uppercase tracking-wider">
                          <Star size={12} className="fill-current" /> Level {Math.floor((user.auraPoints || 0) / 100) + 1}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
                      >
                        <Edit2 size={14} /> Edit Profile
                      </button>
                      <Link
                        to="/forgot-password"
                        className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
                      >
                        <Shield size={14} /> Reset Password
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* Menu */}
              <div className="space-y-2">
                {[
                  { id: 'profile', icon: Settings, label: 'Profile Settings' },
                  { id: 'aura-rewards', icon: Zap, label: 'Aura Rewards' },
                  { id: 'orders', icon: Clock, label: 'Order History' },
                  { id: 'downloads', icon: Download, label: 'Direct Downloads' },
                  { id: 'subscription', icon: CreditCard, label: 'Subscription', show: user.isSubscriber || user.isAdmin },
                  { id: 'referrals', icon: Gift, label: 'Referrals' },
                  { id: 'wishlist', icon: Heart, label: 'My Wishlist' },
                  { id: 'installments', icon: CreditCard, label: 'Lipa Pole Pole' },
                  { id: 'admin', icon: Shield, label: 'Admin Panel', show: user.email === 'ianmuriithiflowerz@gmail.com', link: '/admin' },
                ].filter(item => item.show !== false).map((item, i) => (
                  item.link ? (
                    <Link to={item.link} key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/5 transition border border-transparent hover:border-white/5">
                      <item.icon size={18} className="text-gray-400" /> <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition border border-transparent ${activeTab === item.id ? 'bg-white/10 text-white font-bold border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <item.icon size={18} className={activeTab === item.id ? 'text-brand-purple' : 'text-gray-500'} /> <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  )
                ))}
              </div>

              {/* Right Column */}
              <div className="md:col-span-2 space-y-6">

                {/* Tab Content */}
                {activeTab === 'profile' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <MFAEnrollment />

                    <div className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden p-6">
                      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Mail size={18} className="text-brand-cyan" /> Email & Security
                      </h3>

                      <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                          <div className="flex-1">
                            <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Change Email Address</label>
                            <input
                              id="newEmail"
                              name="newEmail"
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              placeholder="new-email@example.com"
                              className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-brand-purple"
                            />
                          </div>
                          <button
                            onClick={() => handleActionClick('email')}
                            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
                          >
                            Update Email
                          </button>
                        </div>

                        <div className="pt-6 border-t border-white/5">
                          <h4 className="text-red-500 font-bold text-sm mb-2 flex items-center gap-2">
                            <AlertOctagon size={16} /> Danger Zone
                          </h4>
                          <p className="text-gray-500 text-xs mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                          <button
                            onClick={() => handleActionClick('delete')}
                            className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-bold transition flex items-center gap-2"
                          >
                            <Trash2 size={16} /> Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'aura-rewards' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-gradient-to-br from-brand-purple/20 to-brand-cyan/10 rounded-2xl border border-white/10 p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                        <div className="w-24 h-24 bg-gradient-to-br from-brand-purple to-brand-cyan rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-purple/40 ring-4 ring-white/10 rotate-3 transition-transform">
                          <Zap size={48} className="text-white fill-current" />
                        </div>

                        <div className="flex-1">
                          <h2 className="text-3xl font-display font-black text-white mb-2 tracking-tight">Your Aura Balance</h2>
                          <div className="flex items-center justify-center md:justify-start gap-4">
                            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-cyan">
                              {(user.auraPoints || user.loyaltyPoints || 0).toLocaleString()}
                            </span>
                            <div className="h-10 w-px bg-white/10" />
                            <div>
                              <p className="text-white font-bold text-lg flex items-center gap-2">
                                {(user.auraPoints || 0) >= 2000 ? (
                                  <><Zap size={18} className="text-brand-cyan fill-current" /> Legend</>
                                ) : (user.auraPoints || 0) >= 500 ? (
                                  <><Star size={18} className="text-brand-purple fill-current" /> Elite</>
                                ) : (
                                  <><Star size={18} className="text-gray-400 fill-current" /> Pioneer</>
                                )}
                              </p>
                              <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
                                {(user.auraPoints || 0) >= 2000 ? 'Highest Tier' : (user.auraPoints || 0) >= 500 ? 'Advanced Tier' : 'Aura Member'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-8 relative z-10">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                          {user.auraPoints! < 2000 ? (
                            <>
                              <span className="text-gray-500">Progress to {user.auraPoints! >= 500 ? 'Legend' : 'Elite'}</span>
                              <span className="text-brand-cyan">{user.auraPoints! % (user.auraPoints! >= 500 ? 2000 : 500)} / {user.auraPoints! >= 500 ? 2000 : 500} XP</span>
                            </>
                          ) : (
                            <span className="text-brand-cyan">Max Level Achieved</span>
                          )}
                        </div>
                        <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                            style={{ width: `${Math.min(100, (user.auraPoints! / (user.auraPoints! >= 500 ? 2000 : 500)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* How to Earn */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#15151A] p-5 rounded-xl border border-white/5 hover:border-brand-purple/30 transition group">
                        <div className="w-10 h-10 bg-brand-purple/10 rounded-lg flex items-center justify-center mb-4 text-brand-purple group-hover:scale-110 transition">
                          <Package size={20} />
                        </div>
                        <h4 className="text-white font-bold mb-1">Shopping</h4>
                        <p className="text-gray-500 text-xs">Earn 1 Aura Point for every KES 100 spent on digital or physical items.</p>
                      </div>

                      <div className="bg-[#15151A] p-5 rounded-xl border border-white/5 hover:border-brand-cyan/30 transition group">
                        <div className="w-10 h-10 bg-brand-cyan/10 rounded-lg flex items-center justify-center mb-4 text-brand-cyan group-hover:scale-110 transition">
                          <Mail size={20} />
                        </div>
                        <h4 className="text-white font-bold mb-1">Engagement</h4>
                        <p className="text-gray-500 text-xs">Post reviews and comments to earn 5 Aura Points per action.</p>
                      </div>

                      <div className="bg-[#15151A] p-5 rounded-xl border border-white/5 hover:border-yellow-500/30 transition group">
                        <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center mb-4 text-yellow-500 group-hover:scale-110 transition">
                          <Share2 size={20} />
                        </div>
                        <h4 className="text-white font-bold mb-1">Referrals</h4>
                        <p className="text-gray-500 text-xs">Invite friends and earn bonus points when they make their first purchase.</p>
                      </div>
                    </div>

                    {/* Rewards Activity */}
                    <div className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2">
                          <Clock size={18} className="text-brand-cyan" /> Rewards Activity
                        </h3>
                        <button 
                          onClick={fetchLoyaltyHistory}
                          className="text-xs text-gray-500 hover:text-white transition"
                        >
                          Refresh
                        </button>
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {loadingLoyalty ? (
                          <div className="p-12 text-center text-gray-500">Loading activity...</div>
                        ) : loyaltyHistory.length > 0 ? (
                          <div className="divide-y divide-white/5">
                            {loyaltyHistory.map((entry) => (
                              <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    entry.points > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {entry.type === 'purchase' && <Package size={18} />}
                                    {entry.type === 'comment' && <Mail size={18} />}
                                    {entry.type === 'review' && <Star size={18} />}
                                    {entry.type === 'adjustment' && <Shield size={18} />}
                                  </div>
                                  <div>
                                    <p className="text-white text-sm font-medium">{entry.description}</p>
                                    <p className="text-gray-500 text-xs">{new Date(entry.created_at).toLocaleDateString()} • {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`font-bold ${entry.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {entry.points > 0 ? '+' : ''}{entry.points}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center">
                            <Gift size={40} className="text-white/10 mx-auto mb-4" />
                            <p className="text-gray-500">No activity yet. Start earning Aura Points today!</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Redemption Logic */}
                    <div className="space-y-4">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Gift size={18} className="text-brand-purple" /> Available Rewards
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { id: 'REWARD_10_PERCENT', label: '10% OFF Store', cost: 500, desc: 'Single-use coupon' },
                          { id: 'REWARD_25_PERCENT', label: '25% OFF Store', cost: 1000, desc: 'Single-use coupon' },
                          { id: 'REWARD_1_MONTH_SUB', label: '1 Month Access', cost: 2000, desc: 'Premium VIP Access Month' },
                        ].map((reward) => {
                          const currentPoints = user.auraPoints || user.loyaltyPoints || 0;
                          const canAfford = currentPoints >= reward.cost;
                          
                          return (
                            <div key={reward.id} className={`p-5 rounded-2xl border transition-all ${
                              canAfford 
                                ? 'bg-white/[0.03] border-white/10 hover:border-brand-purple/50' 
                                : 'bg-white/[0.01] border-white/5 opacity-60'
                            }`}>
                              <h4 className="text-white font-bold mb-1">{reward.label}</h4>
                              <p className="text-gray-500 text-xs mb-4">{reward.desc}</p>
                              <div className="flex items-center justify-between mt-auto">
                                <span className={`text-sm font-black ${canAfford ? 'text-brand-cyan' : 'text-gray-600'}`}>
                                  {reward.cost} XP
                                </span>
                                <button
                                  onClick={() => handleRedeem(reward.id)}
                                  disabled={!canAfford || isRedeeming !== null}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                                    canAfford 
                                      ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 hover:scale-105 active:scale-95' 
                                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  {isRedeeming === reward.id ? 'Wait...' : 'Claim'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="bg-brand-purple/5 border border-white/5 p-4 rounded-xl">
                        <p className="text-[10px] text-gray-500 italic text-center uppercase tracking-widest">
                          Rewards are generated instantly. Coupons expire in 30 days.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Subscription Box */}
                    <div className="bg-black/20 p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                      <div className="flex items-center justify-between mb-4 relative">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2"><CreditCard size={18} className="text-brand-cyan" /> Current Plan</h3>
                        {isUserSubscriber(user) && <span className="bg-green-500/10 text-green-500 text-xs font-bold px-2 py-1 rounded border border-green-500/20">ACTIVE</span>}
                      </div>

                      {isUserSubscriber(user) ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                          <div className="flex-1 w-full sm:w-auto">
                            <p className="text-brand-cyan font-bold text-2xl capitalize mb-3">
                              {user.subscriptionPlan} Plan
                            </p>
                            <SubscriptionTimer
                              expiryDate={user.subscriptionExpiry}
                              onExpired={() => {
                                // Potentially refresh user profile or show toast
                              }}
                            />
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => alert("Billing management is handled via Paystack. Your plan is active.")}
                              className="flex-1 sm:flex-none text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg font-bold transition"
                            >
                              Manage
                            </button>
                            <Link to="/music-pool" className="flex-1 sm:flex-none text-sm bg-brand-purple hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg shadow-brand-purple/20 text-center flex items-center justify-center">Extend</Link>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CreditCard size={20} className="text-gray-500" />
                          </div>
                          <p className="text-gray-300 font-bold mb-1">Free Tier</p>
                          <p className="text-gray-500 text-sm mb-4">Upgrade to access exclusive tracks and music pool.</p>
                          <Link to="/music-pool" className="px-6 py-2 bg-gradient-to-r from-brand-purple to-brand-cyan text-white rounded-lg font-bold hover:shadow-lg hover:shadow-brand-purple/20 transition inline-block">Upgrade to Pro</Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-brand-purple" /> Purchase History
                    </h3>

                    {contextOrdersLoading ? (
                      <div className="bg-black/20 rounded-xl border border-white/5 p-12 text-center">
                        <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Retrieving your orders...</p>
                      </div>
                    ) : (orders || []).filter(o => o.customerEmail === user.email).length === 0 ? (
                      <div className="bg-black/20 rounded-xl border border-white/5 p-12 text-center">
                        <Package size={48} className="mx-auto text-gray-800 mb-4" />
                        <p className="text-gray-500">You haven't placed any orders yet.</p>
                        <Link to="/store" className="mt-4 inline-block text-brand-purple hover:text-white font-bold transition">Start Shopping</Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(orders || [])
                          .filter(o => o.customerEmail === user.email)
                          .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
                          .map((order) => (
                            <div key={order.id} className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden group hover:border-white/10 transition-all duration-300">
                              <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02]">
                                <div>
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Order ID</p>
                                  <p className="text-white font-mono text-xs">#{order.id.slice(-8).toUpperCase()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Date</p>
                                  <p className="text-white text-xs font-bold">{new Date(order.date || order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total</p>
                                  <p className="text-brand-purple font-black text-xs">KES {order.total.toLocaleString()}</p>
                                </div>
                                <div>
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${order.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    order.status === 'processing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                      order.status === 'shipped' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' :
                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    }`}>
                                    {order.status}
                                  </span>
                                </div>
                                <div>
                                  <button 
                                    onClick={() => generateOrderPDF(order)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-white text-[10px] font-bold transition-all group"
                                  >
                                    <FileText size={14} className="text-brand-purple group-hover:scale-110 transition-transform" />
                                    Download PDF
                                  </button>
                                </div>
                              </div>

                              <div className="p-4 sm:p-6 border-t border-white/5 space-y-4">
                                <div className="space-y-3">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/[0.03]">
                                      <div>
                                        <p className="text-white text-xs font-bold">{item.productName}</p>
                                        <p className="text-gray-500 text-[10px]">{item.quantity}x — {item.variant || 'Standard'}</p>
                                      </div>
                                      {item.type === 'digital' && (
                                        <button
                                          disabled={order.status !== 'completed' && order.paymentStatus !== 'paid'}
                                          onClick={() => {
                                            if (order.status === 'completed' || order.paymentStatus === 'paid') {
                                              downloadFileSecurely(item.digitalFileUrl || '', { fileName: item.productName, type: 'digital_product', orderId: order.id });
                                            } else {
                                              toast.error('Payment required before download');
                                            }
                                          }}
                                          className={`p-2 rounded-lg transition ${
                                            (order.status === 'completed' || order.paymentStatus === 'paid') 
                                              ? 'bg-brand-purple/10 text-brand-purple hover:bg-brand-purple hover:text-white' 
                                              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                          }`}
                                          title={order.status === 'completed' || order.paymentStatus === 'paid' ? "Download Digital Asset" : "Awaiting Payment"}
                                        >
                                          <Download size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {order.trackingNumber && (
                                  <div className="bg-brand-cyan/5 border border-brand-cyan/10 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                      <p className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mb-1">Tracking Info</p>
                                      <p className="text-white text-xs font-bold">{order.courierName}: {order.trackingNumber}</p>
                                    </div>
                                    <ShieldCheck size={18} className="text-brand-cyan" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'downloads' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Download size={18} className="text-brand-purple" /> My Downloads</h3>
                      <div className="space-y-3">
                        {downloadsLoading ? (
                          <div className="bg-black/20 rounded-xl border border-white/5 p-8 text-center">
                            <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Loading downloads...</p>
                          </div>
                        ) : myDownloads.length === 0 ? (
                          <div className="bg-black/20 rounded-xl border border-white/5 p-8 text-center">
                            <p className="text-gray-500 text-sm">No downloads yet. Your purchased digital items and free downloads will appear here.</p>
                            <Link to="/store" className="mt-4 inline-block text-brand-purple font-bold hover:text-brand-cyan transition">Visit Store</Link>
                          </div>
                        ) : (
                          myDownloads.map((order) => (
                            <div key={order.id} className="bg-black/20 hover:bg-black/30 transition rounded-xl border border-white/5 p-4">
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between mb-2 last:mb-0">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Download size={16} className="text-gray-400" />
                                    </div>
                                    <div>
                                      <p className="text-white text-sm font-bold line-clamp-1">{item.name}</p>
                                      <p className="text-gray-500 text-xs">
                                        {new Date(order.date).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => downloadFileSecurely(item.downloadUrl || item.digitalFileUrl, {
                                      fileName: item.name,
                                      type: 'digital_product',
                                      orderId: order.id
                                    })}
                                    className="text-xs font-bold text-brand-purple hover:text-brand-cyan px-3 py-1 bg-white/5 rounded-lg transition"
                                  >
                                    Download
                                  </button>
                                </div>
                              ))}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'referrals' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-xl p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-cyan rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Gift size={20} />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Referral Program</h2>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-black/30 p-1.5 rounded-lg border border-white/10">
                          <div className="px-3 py-1.5 rounded-md bg-white/5">
                            <span className="text-xs text-gray-400 uppercase font-bold mr-2">Your Code:</span>
                            <span className="text-brand-cyan font-mono font-bold tracking-wider">{user.referralCode || '...'}</span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(user.referralCode || '');
                              alert('Code copied!');
                            }}
                            className="p-1.5 text-gray-400 hover:text-white transition"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                          <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Users size={14} />
                            <span className="text-xs font-bold uppercase">Referrals</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{userReferralStats?.total_referrals || userReferralStats?.totalReferrals || 0}</p>
                        </div>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                          <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <DollarSign size={14} />
                            <span className="text-xs font-bold uppercase">Earned</span>
                          </div>
                          <p className="text-2xl font-bold text-brand-purple">KES {userReferralStats?.total_earned || userReferralStats?.totalEarned || 0}</p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-brand-purple/20 to-brand-cyan/10 rounded-xl p-5 border border-white/10 mb-6">
                        <h3 className="font-bold text-white mb-2 text-sm">How it works</h3>
                        <ul className="space-y-2 mb-4">
                          <li className="flex gap-3 text-xs text-gray-300">
                            <div className="w-4 h-4 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0 text-brand-purple text-[10px] font-bold">1</div>
                            Share your link: subscribe with 10% OFF
                          </li>
                          <li className="flex gap-3 text-xs text-gray-300">
                            <div className="w-4 h-4 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0 text-brand-purple text-[10px] font-bold">2</div>
                            You earn KES 100 instantly!
                          </li>
                        </ul>

                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/signup?ref=${user.referralCode}`;
                            navigator.clipboard.writeText(link);
                            alert('Referral link copied!');
                          }}
                          className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition text-sm flex items-center justify-center gap-2"
                        >
                          <Share2 size={16} /> Copy Invite Link
                        </button>
                      </div>

                      <h3 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
                        <TrendingUp size={16} className="text-brand-cyan" /> History
                      </h3>

                      <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                        {myReferrals.length > 0 ? (
                          <div className="max-h-[200px] overflow-y-auto">
                            {myReferrals.map((log) => (
                              <div key={log.id} className="p-3 border-b border-white/5 last:border-0 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] text-white">
                                    {(log.referee_name || log.refereeName)?.[0] || 'U'}
                                  </div>
                                  <span className="text-xs text-white line-clamp-1">{log.referee_name || log.refereeName || 'Anonymous'}</span>
                                </div>
                                <span className="text-[10px] text-green-500 font-bold">+ {log.reward_amount || log.rewardAmount}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-gray-500 text-xs italic">No referral history yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'wishlist' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-white flex items-center gap-2">
                          <Heart size={18} className="text-brand-purple fill-brand-purple" /> 
                          My Wishlist
                        </h3>
                        <Link to="/store" className="text-xs text-brand-purple hover:text-brand-cyan transition font-bold">
                          Discover More
                        </Link>
                      </div>

                      {wishlistLoading ? (
                        <div className="bg-black/20 rounded-xl border border-white/5 p-12 text-center">
                          <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-gray-500 text-sm">Loading your favorites...</p>
                        </div>
                      ) : (wishlist?.filter(item => item.customerEmail === user?.email) || []).length === 0 ? (
                        <div className="bg-black/20 rounded-2xl border border-white/5 p-12 text-center">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart size={32} className="text-gray-600" />
                          </div>
                          <h4 className="text-white font-bold mb-2">Your wishlist is empty</h4>
                          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                            Save products, mixtapes, and tracks to your wishlist to keep track of what you love.
                          </p>
                          <Link 
                            to="/store" 
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-purple text-white rounded-xl font-bold hover:bg-brand-purple/80 transition-all shadow-lg shadow-brand-purple/20"
                          >
                            Explore Store
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(wishlist?.filter(item => item && item.customerEmail === user?.email) || []).map((item) => {
                            if (!item) return null;
                            let details: any = null;
                            if (item.targetType === 'product') details = products.find(p => (p.id === item.targetId || p.slug === item.targetId));
                            if (item.targetType === 'mixtape') details = mixtapes.find(m => (m.id === item.targetId || m.slug === item.targetId));
                            if (item.targetType === 'track') details = poolTracks.find(t => t.id === item.targetId);

                            if (!details) return null;

                            return (
                              <div key={item.id || item.targetId} className="group relative bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all">
                                <Link 
                                  to={item.targetType === 'product' ? `/store/product/${details.slug}` : item.targetType === 'mixtape' ? `/mixtapes/${details.slug}` : '/music-pool'}
                                  className="block aspect-square overflow-hidden bg-black/40"
                                >
                                  <img 
                                    src={details.image || details.artwork || '/placeholder.jpg'} 
                                    alt={details.name || details.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                </Link>
                                
                                <div className="p-4">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-purple">
                                      {item.targetType}
                                    </span>
                                    <button 
                                      onClick={() => toggleWishlist(item.targetId, item.targetType)}
                                      className="p-1.5 bg-white/5 rounded-lg text-brand-purple hover:bg-white/10 transition-all"
                                      title="Remove from wishlist"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                  <Link 
                                    to={item.targetType === 'product' ? `/store/product/${details.slug}` : item.targetType === 'mixtape' ? `/mixtapes/${details.slug}` : '/music-pool'}
                                    className="block font-bold text-white text-sm line-clamp-1 hover:text-brand-purple transition-colors"
                                  >
                                    {details.name || details.title}
                                  </Link>
                                  {details.price && (
                                    <p className="text-brand-cyan text-xs font-bold mt-1">KES {details.price.toLocaleString()}</p>
                                  )}
                                  {details.artist && (
                                    <p className="text-gray-500 text-xs mt-1">{details.artist}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'installments' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <UserInstallments />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Removed Referral Section at bottom as it is now in a tab */}
      </div>

      {showReauth && (
        <ReauthModal
          onSuccess={handleReauthSuccess}
          onCancel={() => setShowReauth(false)}
          title={pendingAction === 'delete' ? "Confirm Deletion" : "Authentication Required"}
          description={pendingAction === 'delete' ? "Deleting your account is permanent. Please authenticate to confirm." : "Please authenticate to continue with this sensitive change."}
          actionLabel={pendingAction === 'delete' ? "Delete Forever" : "Confirm"}
        />
      )}
    </div>
  );
};

export default Account;