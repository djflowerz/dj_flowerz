import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Settings, LogOut, CreditCard, Download, Shield, Clock } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

const Account: React.FC = () => {
  const { user, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!user?.isSubscriber || !user?.subscriptionExpiry) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(user.subscriptionExpiry!).getTime();
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pt-24 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#15151A] rounded-2xl border border-white/5 overflow-hidden">
          {/* Header */}
          <div className="h-32 bg-gradient-to-r from-brand-purple/20 to-brand-cyan/20"></div>
          <div className="px-8 pb-8">
            <div className="relative -mt-12 mb-6 flex flex-col md:flex-row justify-between items-center md:items-end gap-4 text-center md:text-left">
               <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
                 <img src={user.avatarUrl || 'https://picsum.photos/200'} alt="Profile" className="w-24 h-24 rounded-full border-4 border-[#15151A]" />
                 <div className="mb-2">
                   <h1 className="text-2xl font-bold text-white">{user.name}</h1>
                   <p className="text-gray-400">{user.email}</p>
                 </div>
               </div>
               <button 
                onClick={logout}
                className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-bold mb-2"
               >
                 <LogOut size={16} /> Logout
               </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Left Menu */}
               <div className="space-y-2">
                 {[
                   { icon: Settings, label: 'Profile Settings', active: true },
                   { icon: Download, label: 'My Downloads', active: false },
                   { icon: CreditCard, label: 'Subscription', active: false },
                   { icon: Shield, label: 'Admin Panel', active: false, show: user.isAdmin, link: '/admin' },
                 ].filter(item => item.show !== false).map((item, i) => (
                   item.link ? (
                    <Link to={item.link} key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white/5 transition">
                        <item.icon size={18} className="text-gray-400" /> {item.label}
                    </Link>
                   ) : (
                    <button key={i} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${item.active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                      <item.icon size={18} /> {item.label}
                    </button>
                   )
                 ))}
               </div>

               {/* Right Details */}
               <div className="md:col-span-2 space-y-6">
                  {/* Subscription Status */}
                  <div className="bg-black/20 p-6 rounded-xl border border-white/5">
                     <h3 className="font-bold text-white mb-4">Current Plan</h3>
                     {user.isSubscriber ? (
                       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                          <div>
                            <p className="text-brand-cyan font-bold text-lg capitalize flex items-center justify-center sm:justify-start gap-2">
                               {user.subscriptionPlan} Plan 
                               {timeLeft && <span className="text-xs bg-brand-purple/20 text-brand-purple px-2 py-0.5 rounded border border-brand-purple/30 flex items-center gap-1"><Clock size={10}/> {timeLeft} left</span>}
                            </p>
                            <p className="text-gray-500 text-sm">Expires on {new Date(user.subscriptionExpiry!).toLocaleDateString()}</p>
                          </div>
                          <button className="text-sm text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-lg">Manage</button>
                       </div>
                     ) : (
                       <div className="text-center py-4">
                         <p className="text-gray-400 mb-4">You are on the free plan.</p>
                         <Link to="/music-pool" className="px-6 py-2 bg-brand-purple text-white rounded-lg hover:bg-purple-600 transition inline-block">Upgrade to Pro</Link>
                       </div>
                     )}
                  </div>
                  
                  {/* Recent Activity */}
                  <div>
                    <h3 className="font-bold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                       <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center flex-shrink-0"><Download size={16} className="text-gray-400" /></div>
                             <div>
                               <p className="text-white text-sm font-medium line-clamp-1">Nairobi Nights Vol. 4</p>
                               <p className="text-gray-500 text-xs">Downloaded 2 days ago</p>
                             </div>
                          </div>
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