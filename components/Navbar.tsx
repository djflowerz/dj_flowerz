import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, LogIn, ChevronRight, Bell, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import SubscriptionTimer from './SubscriptionTimer';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { siteConfig, notifications, markNotificationAsRead } = useData();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdminPage = location.pathname.startsWith('/admin');

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Mixtapes', path: '/mixtapes' },
    { name: 'Store', path: '/store' },
    { name: 'Music Pool', path: '/music-pool' },
    { name: 'Sessions', path: '/sessions' },
    { name: 'Bookings', path: '/bookings' },
    { name: 'Tip Jar', path: '/tip-jar' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

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
                {navLinks.map((link) => (
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
              {user?.isSubscriber && user?.subscriptionExpiry && (
                <div className="hidden lg:block">
                  <SubscriptionTimer expiryDate={user.subscriptionExpiry} />
                </div>
              )}

              <Link to="/music-pool" className="btn-cyber-outline px-5 py-2 text-[10px] font-black">
                JOIN POOL
              </Link>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowMessages(false); setShowUserMenu(false); }}
                  className="text-gray-300 hover:text-white transition group relative p-1"
                >
                  <Bell size={22} className="group-hover:text-brand-purple transition" />
                  {notifications?.filter(n => n.userId === user?.id && !n.read).length > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0B0B0F]"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-6 w-80 glass-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Notifications</h3>
                      <button className="text-[10px] text-brand-purple font-bold hover:underline">Mark all read</button>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                      {notifications?.filter(n => n.userId === user?.id).length > 0 ? (
                        notifications.filter(n => n.userId === user?.id).slice(0, 5).map(n => (
                          <div
                            key={n.id}
                            onClick={() => { markNotificationAsRead(n.id); if (n.link) window.location.href = n.link; }}
                            className={`p-4 border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition ${!n.read ? 'bg-brand-purple/5' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${n.type === 'mixtape' ? 'bg-brand-purple/20 text-brand-purple' :
                                n.type === 'product' ? 'bg-brand-cyan/20 text-brand-cyan' :
                                  'bg-white/10 text-gray-400'
                                }`}>
                                {n.type}
                              </span>
                              <span className="text-[10px] text-gray-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1">{n.title}</h4>
                            <p className="text-xs text-gray-400 line-clamp-2">{n.message}</p>
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
                      src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=random&color=fff`}
                      alt="User"
                      className="w-8 h-8 rounded-full border border-brand-purple object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=7C3AED&color=fff`; }}
                    />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-6 w-56 glass-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 py-3">
                      <Link to="/account" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition">
                        <User size={16} /> My Profile
                      </Link>
                      {user?.role === 'admin' && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-purple hover:bg-brand-purple/10 transition">
                          <LogIn size={16} /> Admin Panel
                        </Link>
                      )}
                      <hr className="my-2 border-white/5" />
                      <button
                        onClick={() => { /* Logout logic */ }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition"
                      >
                        <X size={16} /> Logout
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
        <div className="flex flex-col space-y-4 flex-1 overflow-y-auto">
          {navLinks.map((link) => (
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
              <Link
                to="/account"
                className="flex items-center justify-center gap-3 w-full bg-white/10 text-white py-4 rounded-xl font-bold"
              >
                <img
                  src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=random&color=fff`}
                  alt="User"
                  className="w-6 h-6 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=7C3AED&color=fff`; }}
                /> My Account
              </Link>
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
            <Link
              to="/music-pool"
              className="block w-full bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-center py-4 rounded-xl font-bold shadow-lg shadow-brand-purple/20"
            >
              Join Music Pool
            </Link>
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