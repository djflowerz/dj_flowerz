
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Settings, LogOut, CreditCard, Download, Shield, Clock, Edit2, X, Check, Save } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

const Account: React.FC = () => {
  const { user, loading, logout, updateUserProfile, updateUserPassword } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phoneNumber || '');
      setEditAvatar(user.avatarUrl || '');
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
                  { icon: Shield, label: 'Admin Panel', active: false, show: user.isAdmin, link: '/admin' },
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

                {/* Stats / Activity */}
                <div>
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Download size={18} className="text-brand-purple" /> Recent Activity</h3>
                  <div className="space-y-3">
                    {/* Mock Data - In real app, fetch user downloads */}
                    <div className="flex items-center justify-between p-4 bg-black/20 hover:bg-black/30 transition rounded-xl border border-white/5 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                          <Download size={16} className="text-gray-400 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold line-clamp-1 group-hover:text-brand-cyan transition">Nairobi Nights Vol. 4</p>
                          <p className="text-gray-500 text-xs">Downloaded 2 days ago</p>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-gray-500 hover:text-white px-3 py-1 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition">Re-download</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;