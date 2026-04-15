import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, LogIn, LogOut, ChevronRight, Bell, MessageCircle, ShieldCheck, Loader, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import SubscriptionTimer from './SubscriptionTimer';
import GlobalClock from './GlobalClock';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const { siteConfig, notifications, markNotificationAsRead } = useData();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userStatus, setUserStatus] = useState({ unreadMessages: 0, unreadNotifications: 0 });
  const [communityNotifications, setCommunityNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);


  const isAdminPage = location.pathname.startsWith('/admin');

  // Filter navLinks based on subscription status for Absolute Stealth Mode
  const filteredNavLinks = [
    { name: 'Home', path: '/' },
    { name: 'Mixtapes', path: '/mixtapes' },
    { name: 'Store', path: '/store' },
    { name: 'Community', path: '/community' },
    { name: 'DJ Vision Lab', path: '/dj-lab' },
    { name: 'Sessions', path: '/sessions' },
    { name: 'Bookings', path: '/bookings' },
    { name: 'Tip Jar', path: '/tip-jar' },
    { name: 'Contact', path: '/contact' },
  ];

  // Close mobile menu and dropdowns when route changes
  useEffect(() => {
    setIsOpen(false);
    setShowNotifications(false);
    setShowMessages(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Status Polling (Messages & Notifications)
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const sessionId = localStorage.getItem('dj_flowerz_chat_session');
        const userId = user?.id;
        if (!sessionId && !userId) return;

        const url = `${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/user/status?${sessionId ? `sessionId=${sessionId}` : ''}${userId ? `&userId=${userId}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setUserStatus({
            unreadMessages: data.unreadMessages || 0,
            unreadNotifications: data.unreadNotifications || 0
          });
        }
      } catch (e) {
        console.warn("[Navbar] Status fetch failed", e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s for better user experience
    return () => clearInterval(interval);
  }, [user]);

  if (isAdminPage) return null;

  const showNotice = siteConfig.notice?.enabled;
  const noticeTitle = siteConfig.notice?.title;
  const noticeMessage = siteConfig.notice?.message;
  const noticeType = siteConfig.notice?.type;

  const getBannerBg = () => {
    switch (noticeType) {
      case 'error': return 'bg-red-600';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-brand-purple';
    }
  };

  return (
    <>
      {showNotice && (
        <div className={`${getBannerBg()} text-white text-center py-3 px-4 text-sm font-bold animate-pulse z-[60] relative`}>
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="text-lg">{noticeType === 'error' ? '⚠️' : '🔔'}</span>
            <p>
              <strong>{noticeTitle}:</strong> {noticeMessage}
            </p>
          </div>
        </div>
      )}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-2 z-50">
              <Link to="/" className="text-2xl font-display font-bold tracking-wider" onClick={() => setIsOpen(false)}>
                <span className="text-white">DJ</span>
                <span className="text-brand-purple ml-1">FLOWERZ</span>
              </Link>
            </div>

            {/* Desktop Menu - Visible on md and up */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-6">
                {filteredNavLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`text-sm font-medium transition-colors hover:text-brand-purple ${location.pathname === link.path ? 'text-brand-purple' : 'text-gray-300'
                      }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Icons */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="hidden"><GlobalClock /></div>

              {user?.isSubscriber && user?.subscriptionExpiry && (
                <div className="hidden lg:block">
                  <SubscriptionTimer expiryDate={user.subscriptionExpiry} />
                </div>
              )}

              {/* JOIN POOL button removed per request */}

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={async () => { 
                    const next = !showNotifications;
                    setShowNotifications(next); 
                    setShowMessages(false); 
                    setShowUserMenu(false); 
                    if (next && user) {
                        setLoadingNotifs(true);
                        try {
                            const res = await fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/user/notifications`);
                            const data = await res.json();
                            setCommunityNotifications(data);
                        } finally {
                            setLoadingNotifs(false);
                        }
                    }
                  }}
                  className="text-gray-300 hover:text-white transition group relative p-1"
                >

                  <Bell size={22} className="group-hover:text-brand-purple transition" />
                  {(userStatus.unreadNotifications > 0 || (notifications?.filter(n => n.userId === user?.id && !n.read).length > 0)) && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand-purple rounded-full border-2 border-[#0B0B0F] animate-pulse"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-6 w-80 glass-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Notifications</h3>
                      <button className="text-[10px] text-brand-purple font-bold hover:underline">Mark all read</button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {loadingNotifs ? (
                        <div className="p-8 text-center"><Loader className="animate-spin mx-auto text-brand-purple" size={20} /></div>
                      ) : communityNotifications.length > 0 ? (
                        communityNotifications.map(n => (
                          <div
                            key={n.id}
                            onClick={async () => { 
                                if (!n.is_read) {
                                    await fetch(`${import.meta.env.VITE_STORAGE_WORKER_URL || 'https://djflowerz.co.ke'}/api/user/notifications/read`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: n.id })
                                    });
                                }
                                if (n.type === 'follow') window.location.href = `/@${n.actor_id}`;
                                else if (n.target_id) window.location.href = `/community?post=${n.target_id}`;
                            }}
                            className={`p-4 border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition ${!n.is_read ? 'bg-brand-purple/5 border-l-2 border-l-brand-purple' : ''}`}
                          >
                            <div className="flex gap-3">
                                <img src={n.actor_avatar || ''} className="w-8 h-8 rounded-full bg-white/10" alt="" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white leading-snug">
                                        <span className="font-bold">{n.actor_name}</span> {n.message}
                                    </p>
                                    <span className="text-[10px] text-gray-500">{new Date(n.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${n.type === 'like' ? 'bg-red-500' : n.type === 'follow' ? 'bg-blue-500' : 'bg-brand-purple'}`}></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell size={32} className="mx-auto mb-3 opacity-10 text-white" />
                          <p className="text-xs text-gray-500">No notifications yet</p>
                        </div>
                      )}
                    </div>

                    <Link to="/notifications" className="block text-center p-3 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition">
                      View All Notifications
                    </Link>
                  </div>
                )}
              </div>

              {/* Messages Dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowMessages(!showMessages); setShowNotifications(false); setShowUserMenu(false); }}
                  className="text-gray-300 hover:text-white transition group relative p-1"
                >
                  <MessageCircle size={22} className="group-hover:text-brand-purple transition" />
                  {userStatus.unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-purple text-white text-[9px] font-black rounded-full border-2 border-[#0B0B0F] flex items-center justify-center animate-bounce">
                      {userStatus.unreadMessages > 9 ? '9+' : userStatus.unreadMessages}
                    </span>
                  )}
                </button>

                {showMessages && (
                  <div className="absolute right-0 mt-6 w-80 glass-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Messages</h3>
                      <button className="text-[10px] text-brand-purple font-bold hover:underline">New Message</button>
                    </div>
                    <div className="p-8 text-center text-gray-500">
                      <MessageCircle size={32} className="mx-auto mb-3 opacity-10" />
                      <p className="text-xs">Your inbox is empty</p>
                    </div>
                    <Link to="/messages" className="block text-center p-3 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition">
                      Go to Messenger
                    </Link>
                  </div>
                )}
              </div>

              <Link to="/cart" className="relative text-gray-300 hover:text-white transition group">
                <ShoppingCart size={22} className="group-hover:text-brand-purple transition" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-purple text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowMessages(false); }}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition"
                  >
                    <img
                      src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || user?.name || 'U')}&background=random&color=fff`}
                      alt="User"
                      className="w-8 h-8 rounded-full border border-brand-purple object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || user?.name || 'U')}&background=7C3AED&color=fff`; }}
                    />
                    {user?.username && <span className="hidden lg:block text-xs font-bold text-gray-300">@{user.username}</span>}
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-6 w-56 glass-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 py-3">
                      <Link to="/account" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                        <User size={16} /> My Profile
                      </Link>
                      <Link to="/order-tracking" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                        <Package size={16} /> Track Order
                      </Link>
                      <Link to="/escrow-mngt" className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-500 hover:bg-white/5 transition">
                        <ShieldCheck size={16} /> Escrow Dashboard
                      </Link>
                      <Link to="/notifications" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                        <Bell size={16} /> All Notifications
                      </Link>
                      {user?.role === 'admin' && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-purple hover:bg-brand-purple/10 transition">
                          <LogIn size={16} /> Admin Panel
                        </Link>
                      )}
                      <hr className="my-2 border-white/5" />
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition">
                    Login
                  </Link>
                  <Link to="/signup" className="text-sm font-medium text-white bg-brand-purple px-4 py-2 rounded-lg hover:bg-brand-purple/80 transition flex items-center gap-2">
                    <User size={16} /> Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Toggle & Cart */}
            <div className="md:hidden flex items-center gap-4 z-50">
              <Link to="/notifications" className="text-gray-300">
                <Bell size={24} />
              </Link>
              <Link to="/messages" className="text-gray-300">
                <MessageCircle size={24} />
              </Link>
              <Link to="/cart" className="relative text-gray-300" onClick={() => setIsOpen(false)}>
                <ShoppingCart size={24} />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-cyan text-black text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-300 hover:text-white focus:outline-none"
              >
                {isOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer (Not a dropdown) */}
      <div
        className={`fixed inset-0 z-40 bg-[#0B0B0F] transition-transform duration-300 ease-in-out md:hidden flex flex-col pt-24 pb-10 px-6 ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
            <div className="hidden"><GlobalClock /></div>
        <div className="flex flex-col space-y-4 flex-1 overflow-y-auto">
          {filteredNavLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-2xl font-display font-bold text-gray-300 hover:text-brand-purple border-b border-white/5 py-4 flex items-center justify-between group flex-shrink-0"
            >
              {link.name}
              <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-purple" />
            </Link>
          ))}

          <div className="pt-8 space-y-4 pb-8">
            {isAuthenticated ? (
              <>
                <Link
                  to="/account"
                  className="flex items-center gap-3 w-full bg-white/5 text-white py-4 px-4 rounded-xl font-bold border border-white/5"
                >
                  <img
                    src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=random&color=fff`}
                    alt="User"
                    className="w-6 h-6 rounded-full"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=7C3AED&color=fff`; }}
                  /> My Account
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="flex items-center justify-center gap-3 w-full bg-brand-purple/10 text-brand-purple py-4 rounded-xl font-bold border border-brand-purple/20"
                  >
                    <LogIn size={20} /> Admin Dashboard
                  </Link>
                )}
                <Link
                  to="/order-tracking"
                  className="flex items-center justify-center gap-3 w-full bg-white/5 text-gray-300 py-4 rounded-xl font-bold border border-white/5"
                >
                  <Package size={20} /> Track Order
                </Link>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/login"
                  className="bg-white/5 text-white text-center py-4 rounded-xl font-bold border border-white/5"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-brand-purple text-white text-center py-4 rounded-xl font-bold"
                >
                  Sign Up
                </Link>
              </div>
            )}
            {/* Join Music Pool mobile removed per request */}
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm mt-4 flex-shrink-0">
          &copy; DJ FLOWERZ
        </div>
      </div>
    </>
  );
};

export default Navbar;