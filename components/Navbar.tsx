import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, ShoppingCart, User, LogOut, ShieldCheck, Settings, 
  Home, Disc, MessageCircle, Bell, Search, Mail, ShoppingBag, LayoutDashboard, Heart, Monitor, Calendar, Download
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePWA } from '../context/PWAContext';
import { NeonButton } from './ui/NeonButton';
import { AnimatePresence, motion } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout, session } = useAuth();
  const { siteConfig } = useData();
  const { currency, setCurrency } = useCurrency();
  const { isInstallable, installApp, isSubscribed, isPushSupported, subscribeToPush, unsubscribeFromPush } = usePWA();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const isAdminPage = location.pathname.startsWith('/admin');

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Mixtapes', path: '/mixtapes', icon: Disc },
    { name: 'Community', path: '/community', icon: MessageCircle },
    { name: 'DJ Lab', path: '/dj-lab', icon: Monitor },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Tip Jar', path: '/tip-jar', icon: Heart },
    { name: 'Contact', path: '/contact', icon: MessageCircle },
  ];

  // Close mobile menu and dropdowns when route changes
  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (isAdminPage) return null;

  const showNotice = siteConfig?.notice?.enabled;
  const noticeTitle = siteConfig?.notice?.title;
  const noticeMessage = siteConfig?.notice?.message;
  const noticeType = siteConfig?.notice?.type;

  const getBannerBg = () => {
    switch (noticeType) {
      case 'error': return 'bg-red-600';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-[#A349F5]';
    }
  };

  // Mobile drawer rendered via portal so it's always on top of everything
  const mobileDrawer = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999998, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />

          {/* Slide-in drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '420px', zIndex: 999999 }}
            className="bg-[#050505] flex flex-col lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex flex-col -space-y-1">
                <span className="text-lg font-bold tracking-tighter text-white">DJ</span>
                <span className="text-lg font-black tracking-tighter text-[#A349F5] leading-none">FLOWERZ</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2">
              <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2 mb-3">Navigation</div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                      isActive
                        ? 'bg-[#A349F5]/10 border-[#A349F5]/30 text-white'
                        : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#A349F5]/20' : 'bg-black/40'}`}>
                      <Icon size={20} className={isActive ? 'text-[#00F5FF]' : 'text-[#A349F5]'} />
                    </div>
                    <span className="text-lg font-bold">{link.name}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00F5FF]" />
                    )}
                  </Link>
                );
              })}

              {/* Discovery section */}
              <div className="pt-4 space-y-2">
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2 mb-3">Discovery</div>
                <Link
                  to="/search"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center">
                    <Search size={20} className="text-brand-cyan" />
                  </div>
                  <span className="text-lg font-bold">Search</span>
                </Link>

                {isAuthenticated && (
                  <Link
                    to="/messages"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center">
                      <Mail size={20} className="text-[#A349F5]" />
                    </div>
                    <span className="text-lg font-bold">Messages</span>
                  </Link>
                )}
              </div>
              

              {/* Action Buttons */}
              <div className="pt-6 space-y-3">
                <Link to="/store" onClick={() => setIsOpen(false)}>
                  <button className="w-full bg-gradient-to-r from-[#A349F5] to-[#00F5FF] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(163,73,245,0.3)] uppercase tracking-tighter text-lg">
                    <ShoppingCart size={20} fill="black" /> ENTER STORE
                  </button>
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link to="/account" onClick={() => setIsOpen(false)}>
                      <button className="w-full bg-white/5 text-white font-bold py-4 rounded-2xl border border-white/10 uppercase tracking-widest text-sm hover:bg-white/10 transition-all">
                        ACCOUNT SETTINGS
                      </button>
                    </Link>
                    <button
                      onClick={() => { logout(); setIsOpen(false); }}
                      className="w-full bg-red-500/10 text-red-500 font-bold py-4 rounded-2xl border border-red-500/20 uppercase tracking-widest text-sm hover:bg-red-500/20 transition-all"
                    >
                      LOGOUT
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <button className="w-full bg-white/5 text-white font-bold py-4 rounded-2xl border border-white/10 uppercase tracking-widest text-sm hover:bg-white/10 transition-all">
                      SIGN IN
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-white/5 text-center">
              <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em]">&copy; DJ FLOWERZ HUB</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Render mobile drawer via portal — completely outside all stacking contexts */}
      {createPortal(mobileDrawer, document.body)}

      <div className="fixed top-0 w-full z-[9999]">
        {showNotice && (
          <div className={`${getBannerBg()} text-white text-center py-3 px-4 text-sm font-bold relative transition-all animate-in fade-in slide-in-from-top duration-500`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
              <span className="text-lg">{noticeType === 'error' ? '⚠️' : '🔔'}</span>
              <p className="tracking-tight"><strong>{noticeTitle}:</strong> {noticeMessage}</p>
            </div>
          </div>
        )}
        
        <nav className="w-full bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center justify-between">
              
              {/* Logo */}
              <Link to="/" className="flex items-center z-50 group">
                <div className="flex flex-col -space-y-1">
                  <span className="text-xl font-bold tracking-tighter text-white">DJ</span>
                  <span className="text-xl font-black tracking-tighter text-[#A349F5] leading-none group-hover:text-[#00F5FF] transition-colors duration-500">FLOWERZ</span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  
                  if (link.name === 'Tip Jar') {
                    return (
                      <Link 
                        key={link.name} 
                        to={link.path}
                        className="px-4 py-2 rounded-full text-sm font-bold text-[#F54996] hover:bg-[#F54996]/10 transition-all flex items-center gap-2 group"
                      >
                        <Icon size={16} className="group-hover:scale-125 transition-transform" />
                        {link.name}
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 group hover:text-white ${
                        isActive ? 'bg-white/5 text-white' : 'text-white/40 hover:bg-white/5'
                      }`}
                    >
                      <Icon size={16} className={`${isActive ? 'text-[#00F5FF]' : 'text-inherit group-hover:text-[#A349F5]'} transition-colors duration-300`} />
                      {link.name}
                    </Link>
                  );
                })}
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Store Button */}
                <Link to="/store" className="hidden sm:block">
                  <NeonButton size="sm" glowColor="#00F5FF" className="bg-[#00F5FF] text-black font-black uppercase text-[10px] tracking-widest px-6 shadow-[0_0_20px_rgba(0,245,255,0.2)] hover:shadow-[0_0_35px_rgba(0,245,255,0.4)] transition-all">
                    <ShoppingCart size={14} className="mr-2" /> STORE
                  </NeonButton>
                </Link>

                {isAuthenticated && (
                  <>
                    <Link to="/search" className="hidden lg:block relative p-2 text-white/40 hover:text-white transition-all duration-300 group" title="Search">
                      <Search size={20} className="group-hover:scale-110" />
                    </Link>
                    <Link to="/messages" className="hidden lg:block relative p-2 text-white/40 hover:text-white transition-all duration-300 group" title="Messages">
                      <Mail size={20} className="group-hover:scale-110" />
                    </Link>
                    <Link to="/notifications" className="hidden lg:block relative p-2 text-white/40 hover:text-white transition-all duration-300 group" title="Notifications">
                      <Bell size={22} className="group-hover:scale-110" />
                    </Link>
                  </>
                )}

                <button 
                  onClick={() => setCurrency(currency === 'KES' ? 'USD' : 'KES')}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-white hover:bg-white/10 transition-all group"
                  title="Switch Currency"
                >
                  <span className={currency === 'KES' ? 'text-[#00F5FF]' : 'text-white/20'}>KES</span>
                  <div className="w-7 h-4 bg-black/40 rounded-full relative p-0.5 border border-white/5">
                    <div className={`w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.5)] ${currency === 'USD' ? 'translate-x-3' : ''}`} />
                  </div>
                  <span className={currency === 'USD' ? 'text-[#00F5FF]' : 'text-white/20'}>USD</span>
                </button>

                <Link to="/cart" className="relative p-2 text-white/40 hover:text-white transition-all duration-300 group">
                  <ShoppingCart size={22} className="group-hover:scale-110" />
                  {itemCount > 0 && (
                    <span className="absolute top-0 right-0 bg-[#A349F5] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(163,73,245,0.5)]">
                      {itemCount}
                    </span>
                  )}
                </Link>

                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white/10 overflow-hidden hover:border-[#A349F5] transition-all duration-300 active:scale-95"
                    >
                      <img 
                        src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.handle || user?.name || 'U')}&background=random&color=fff`}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    </button>
                    
                    <AnimatePresence>
                      {showUserMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-4 w-64 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden py-3 z-50"
                          >
                            <div className="px-5 py-3 border-b border-white/5 mb-2">
                              <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">{user?.role === 'admin' ? 'System Administrator' : 'Authenticated User'}</p>
                              <p className="text-white font-bold truncate text-base">{user?.name || 'Anonymous'}</p>
                              <p className="text-white/40 text-xs">@{user?.handle?.replace('@', '') || user?.id?.substring(0, 8) || 'user'}</p>
                            </div>
                            
                            {user?.handle && (
                              <Link to={`/member/${user.handle.replace('@', '')}`} className="flex items-center gap-3 px-5 py-3.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-[#00F5FF]/10 flex items-center justify-center group-hover:bg-[#00F5FF]/20 transition-colors">
                                  <User size={16} className="text-[#00F5FF]" />
                                </div>
                                View My Profile
                              </Link>
                            )}

                            <Link to="/seller/dashboard" className="flex items-center gap-3 px-5 py-3.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all group">
                              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center group-hover:bg-brand-cyan/20 transition-colors">
                                <LayoutDashboard size={16} className="text-brand-cyan" />
                              </div>
                              Seller Dashboard
                            </Link>

                            <Link to="/wishlist" className="flex items-center gap-3 px-5 py-3.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all group">
                              <div className="w-8 h-8 rounded-lg bg-brand-pink/10 flex items-center justify-center group-hover:bg-brand-pink/20 transition-colors">
                                <Heart size={16} className="text-brand-pink" />
                              </div>
                              My Wishlist
                            </Link>
                            
                            <Link to="/account" className="flex items-center gap-3 px-5 py-3.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all group">
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <Settings size={16} />
                              </div>
                              Account Settings
                            </Link>
                            
                            {user?.role === 'admin' && (
                              <Link to="/admin" className="flex items-center gap-3 px-5 py-3.5 text-sm text-[#A349F5] hover:bg-[#A349F5]/10 transition-all font-bold group">
                                <div className="w-8 h-8 rounded-lg bg-[#A349F5]/10 flex items-center justify-center group-hover:bg-[#A349F5]/20 transition-colors">
                                  <ShieldCheck size={16} />
                                </div>
                                Admin Dashboard
                              </Link>
                            )}
                            
                            <button
                              onClick={logout}
                              className="flex items-center gap-3 w-full px-5 py-3.5 text-sm text-red-500 hover:bg-red-500/10 transition-all text-left mt-2 border-t border-white/5 group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                                <LogOut size={16} />
                              </div>
                              Disconnect
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link to="/login" className="hidden sm:block">
                    <button className="px-6 py-2 rounded-full text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all uppercase tracking-widest">
                      Login
                    </button>
                  </Link>
                )}

                {/* Mobile: Notification Bell Pop-up (authenticated) */}
                {isAuthenticated && (
                  <div className="relative lg:hidden">
                    <button
                      id="mobile-notif-btn"
                      onClick={() => setShowNotifPanel(p => !p)}
                      className="p-2 text-white/50 hover:text-amber-400 transition-all duration-300 relative"
                      aria-label="Notifications"
                    >
                      <Bell size={22} className={showNotifPanel ? 'text-amber-400' : ''} />
                    </button>

                    <AnimatePresence>
                      {showNotifPanel && (
                        <>
                          <div className="fixed inset-0 z-[99997]" onClick={() => setShowNotifPanel(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-3 w-72 bg-[#0A0A0A]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[99998]"
                          >
                            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                              <span className="text-xs font-black text-white/60 uppercase tracking-[0.2em]">Notifications</span>
                              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            </div>
                            <div className="p-4 flex flex-col items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center">
                                <Bell size={20} className="text-amber-400" />
                              </div>
                              <p className="text-white/40 text-xs text-center">You're all caught up!</p>
                              <Link
                                to="/notifications"
                                onClick={() => setShowNotifPanel(false)}
                                className="mt-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold hover:bg-white/10 hover:text-white transition-all w-full text-center"
                              >
                                View All Notifications
                              </Link>
                              {isPushSupported && (
                                <button
                                  onClick={() => { isSubscribed ? unsubscribeFromPush() : subscribeToPush(); }}
                                  className={`w-full px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    isSubscribed
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {isSubscribed ? '🔔 Push On — Tap to disable' : '🔕 Enable push notifications'}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Mobile Toggle */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="lg:hidden p-2 text-white/40 hover:text-white transition-all duration-300"
                  aria-label="Open navigation menu"
                >
                  {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Navbar;