
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Settings, LogOut, CreditCard, Download, Shield, Clock, Edit2, X, Save, AlertOctagon, Mail, Trash2, Users, Copy, Gift, Share2, DollarSign, TrendingUp, UserPlus, CheckCircle } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { downloadFileSecurely } from '../utils/downloadHelper';
import MFAEnrollment from '../components/MFAEnrollment';
import ReauthModal from '../components/ReauthModal';

const Account: React.FC = () => {
  const { user, loading, logout, updateUserProfile, updateUserPassword, updateUserEmail, deleteAccount } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');

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
  const [referralStats, setReferralStats] = useState<any>(null);

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

      // Fetch Downloads (Orders) from Supabase
      const fetchDownloads = async () => {
        if (!user?.email) return;

        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_email', user.email)
            .order('created_at', { ascending: false })
            .limit(10);

          if (error) throw error;

          const downloads = (data || []).map((order: any) => {
            const digitalItems = (order.items || []).filter((item: any) => item.type === 'digital');

            if (digitalItems.length === 0) return null;

            return {
              id: order.id,
              date: order.created_at,
              items: digitalItems
            };
          }).filter(Boolean);

          setMyDownloads(downloads);
        } catch (error) {
          console.error('Error fetching downloads:', error);
        } finally {
          setDownloadsLoading(false);
        }
      };

      fetchDownloads();

      // Fetch Referrals
      const fetchReferrals = async () => {
        if (!user?.id) return;

        try {
          // Get Logs (who did I refer?)
          const { data: logs, error: logsError } = await supabase
            .from('referral_logs')
            .select('*')
            .eq('referrer_id', user.id)
            .order('created_at', { ascending: false });

          if (logsError) throw logsError;
          setMyReferrals(logs || []);

          // Get Stats
          const { data: stats, error: statsError } = await supabase
            .from('referral_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (statsError && statsError.code !== 'PGRST116') {
            console.error('Error fetching referral stats:', statsError);
          }

          if (stats) {
            setReferralStats(stats);
          } else if (logs) {
            // Fallback: Calculate stats from logs
            const calculatedStats = {
              total_referrals: logs.length,
              total_earned: logs.reduce((acc: number, log: any) => acc + (Number(log.reward_amount) || 0), 0)
            };
            setReferralStats(calculatedStats);
          }
        } catch (error) {
          console.error('Error fetching referrals:', error);
        }
      };

      fetchReferrals();
    }
  }, [user]);

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
                  { icon: Settings, label: 'Profile Settings', active: true },
                  { icon: Download, label: 'My Downloads', active: false },
                  { icon: CreditCard, label: 'Subscription', active: false },
                  { icon: Shield, label: 'Admin Panel', active: false, show: user.email === 'ianmuriithiflowerz@gmail.com', link: '/admin' },
                ].filter(item => item.show !== false).map((item, i) => (
                  item.link ? (
                    <Link to={item.link} key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/5 transition border border-transparent hover:border-white/5">
                      <item.icon size={18} className="text-gray-400" /> <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  ) : (
                    <button key={i} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition border border-transparent ${item.active ? 'bg-white/10 text-white font-bold border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                      <item.icon size={18} className={item.active ? 'text-brand-purple' : 'text-gray-500'} /> <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  )
                ))}
              </div>

              {/* Right Column */}
              <div className="md:col-span-2 space-y-6">

                {/* Subscription Box */}
                <div className="bg-black/20 p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                  <div className="flex items-center justify-between mb-4 relative">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2"><CreditCard size={18} className="text-brand-cyan" /> Current Plan</h3>
                    {user.isSubscriber && <span className="bg-green-500/10 text-green-500 text-xs font-bold px-2 py-1 rounded border border-green-500/20">ACTIVE</span>}
                  </div>

                  {user.isSubscriber ? (
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
                        <button className="flex-1 sm:flex-none text-sm text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg font-bold transition">Manage</button>
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

                {/* Multi-Factor Authentication */}
                <MFAEnrollment />

                {/* Email & Account Security */}
                <div className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden p-6 mt-6">
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

                {/* Stats / Activity */}
                <div className="mt-8">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Download size={18} className="text-brand-purple" /> Recent Activity</h3>
                  <div className="space-y-3">
                    {downloadsLoading ? (
                      <p className="text-gray-500 text-sm">Loading downloads...</p>
                    ) : myDownloads.length === 0 ? (
                      <p className="text-gray-500 text-sm">No downloads yet. Your purchased digital items and free downloads will appear here.</p>
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
            </div>
          </div>
        </div>
        {/* Referral Program Section (Moved to Bottom) */}
        <div className="mt-8 bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden shadow-xl" id="referrals">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-purple to-brand-cyan rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Gift size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Referral Program</h2>
                  <p className="text-gray-400 text-sm">Earn rewards for every friend you invite</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Stats & Actions */}
              <div className="space-y-6">

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Users size={14} />
                      <span className="text-xs font-bold uppercase">Referrals</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{referralStats?.total_referrals || 0}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <DollarSign size={14} />
                      <span className="text-xs font-bold uppercase">Earned</span>
                    </div>
                    <p className="text-2xl font-bold text-brand-purple">KES {referralStats?.total_earned || 0}</p>
                  </div>
                </div>

                {/* Main Call to Action */}
                <div className="bg-gradient-to-br from-brand-purple/20 to-brand-cyan/10 rounded-xl p-5 border border-white/10">
                  <h3 className="font-bold text-white mb-2">How it works</h3>
                  <ul className="space-y-3 mb-4">
                    <li className="flex gap-3 text-sm text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0 text-brand-purple text-xs font-bold">1</div>
                      Share your unique referral link
                    </li>
                    <li className="flex gap-3 text-sm text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0 text-brand-purple text-xs font-bold">2</div>
                      Friend subscribes with 10% OFF
                    </li>
                    <li className="flex gap-3 text-sm text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0 text-brand-purple text-xs font-bold">3</div>
                      You earn KES 100 instantly!
                    </li>
                  </ul>

                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/signup?ref=${user.referralCode}`;
                      navigator.clipboard.writeText(link);
                      alert('Referral link copied!');
                    }}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2"
                  >
                    <Share2 size={18} /> Copy Invite Link
                  </button>
                </div>

              </div>

              {/* Right: Referral History */}
              <div className="lg:col-span-2">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-brand-cyan" /> Referral History
                </h3>

                <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden min-h-[300px]">
                  {myReferrals.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-xs text-gray-400 uppercase">
                            <th className="p-4 font-bold">User</th>
                            <th className="p-4 font-bold">Date</th>
                            <th className="p-4 font-bold">Status</th>
                            <th className="p-4 font-bold text-right">Reward</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {myReferrals.map((log) => (
                            <tr key={log.id} className="hover:bg-white/5 transition">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-white">
                                    {log.referee_name?.[0] || 'U'}
                                  </div>
                                  <div>
                                    <p className="text-white text-sm font-bold">{log.referee_name || 'Anonymous'}</p>
                                    <p className="text-gray-500 text-xs">New Subscriber</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-gray-400 text-sm">
                                {new Date(log.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${log.status === 'completed'
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                  : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                  }`}>
                                  {log.status === 'completed' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                  {log.status === 'completed' ? 'Rewarded' : 'Pending'}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-white font-bold">+ {log.reward_amount || 0}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <UserPlus size={32} className="text-gray-600" />
                      </div>
                      <p className="text-gray-300 font-bold mb-1">No referrals yet</p>
                      <p className="text-gray-500 text-sm max-w-xs">
                        Share your code with friends. When they subscribe, they'll appear here!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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