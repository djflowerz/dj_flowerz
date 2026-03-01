
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Settings, LogOut, CreditCard, Download, Shield, Clock, Edit2, X, Save, AlertOctagon, Mail, Trash2, Users, Copy, Gift, Share2, DollarSign, TrendingUp, UserPlus, CheckCircle } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { supabase } from '../utils/supabase';
import { isUserSubscriber, getSubscriptionTimeLeft } from '../utils/authHelpers';
import { downloadFileSecurely } from '../utils/downloadHelper';
import MFAEnrollment from '../components/MFAEnrollment';
import ReauthModal from '../components/ReauthModal';

const Account: React.FC = () => {
  const { user, loading, logout, updateUserProfile, updateUserPassword, updateUserEmail, deleteAccount } = useAuth();
  const { orders, ordersLoading: contextOrdersLoading, referralLogs, referralStats: allReferralStats } = useData();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'downloads' | 'subscription' | 'referrals'>('profile');

  // Sensitive Actions State
  const [showReauth, setShowReauth] = useState(false);
  const [pendingAction, setPendingAction] = useState<'email' | 'delete' | 'password' | null>(null);
  const [newEmail, setNewEmail] = useState('');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

      // Get Downloads (Orders) from context
      if (orders.length > 0) {
        const downloads = orders
          .filter(o => o.customerEmail === user.email)
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

        const stats = allReferralStats.find(s => s.user_id === user.id || s.userId === user.id);
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

  useEffect(() => {
    if (!user?.isSubscriber || !user?.subscriptionExpiry) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      if (!user.subscriptionExpiry) return;
      const now = new Date().getTime();
      const expiry = new Date(user.subscriptionExpiry).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [user]);

  const handleSaveProfile = async () => {
    setEditLoading(true);
    try {
      await updateUserProfile({ name: editName, phoneNumber: editPhone, avatarUrl: editAvatar });
      alert("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      alert("Failed to update profile: " + error.message);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
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
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Phone Number</label>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="+254..."
                          className="w-full bg-[#0B0B0F] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-purple"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-gray-400 text-xs uppercase font-bold mb-1 block">Profile Picture URL (Optional)</label>
                        <input
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
                      </h1>
                      <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 text-sm md:text-base">
                        {user.email}
                        {user.phoneNumber && <span className="w-1 h-1 bg-gray-600 rounded-full" />}
                        {user.phoneNumber}
                      </p>
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
                  { id: 'downloads', icon: Download, label: 'My Downloads' },
                  { id: 'subscription', icon: CreditCard, label: 'Subscription' },
                  { id: 'referrals', icon: Gift, label: 'Referrals' },
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
                          <div>
                            <p className="text-brand-cyan font-bold text-2xl capitalize flex items-center gap-2 mb-1">
                              {user.subscriptionPlan} Plan
                            </p>
                            <p className="text-gray-500 text-sm flex items-center gap-2">
                              <Clock size={12} /> Expires on <span className="text-white">{new Date(user.subscriptionExpiry!).toLocaleDateString()}</span>
                              {timeLeft && <span className="text-xs bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded border border-brand-purple/30">{timeLeft} left</span>}
                            </p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => alert("Billing management is handled via Paystack. Your plan is active.")}
                              className="flex-1 sm:flex-none text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg font-bold transition"
                            >
                              Manage
                            </button>
                            <Link to="/music-pool" className="flex-1 sm:flex-none text-sm bg-brand-purple hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg shadow-brand-purple/20 text-center">Extend</Link>
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