import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, ShoppingCart, User, LogOut, ShieldCheck, Settings, 
  Home, Disc, Zap, Monitor, Radio, Calendar, Heart, MessageCircle 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { NeonButton } from './ui/NeonButton';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const { siteConfig } = useData();
  const location = useLocation();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdminPage = location.pathname.startsWith('/admin');

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Mixtapes', path: '/mixtapes', icon: Disc },
    { name: 'Community', path: '/community', icon: Zap },
    { name: 'DJ Lab', path: '/dj-lab', icon: Monitor },
    { name: 'Sessions', path: '/sessions', icon: Radio },
    { name: 'Bookings', path: '/bookings', icon: Calendar },
    { name: 'Tip Jar', path: '/tip-jar', icon: Heart },
    { name: 'Contact', path: '/contact', icon: MessageCircle },
  ];

  // Close mobile menu and dropdowns when route changes
  useEffect(() => {
    setIsOpen(false);
    setShowUserMenu(false);
  }, [location.pathname]);

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

  return (
    <>
      {showNotice && (
        <div className={`${getBannerBg()} text-white text-center py-3 px-4 text-sm font-bold z-[60] relative transition-all animate-in fade-in slide-in-from-top duration-500`}>
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="text-lg">{noticeType === 'error' ? '⚠️' : '🔔'}</span>
            <p className="tracking-tight"><strong>{noticeTitle}:</strong> {noticeMessage}</p>
          </div>
        </div>
      )}
      
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 z-50 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-[#A349F5] to-[#00F5FF] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(163,73,245,0.3)] group-hover:shadow-[0_0_25px_rgba(163,73,245,0.5)] transition-all duration-500">
                <Zap className="text-black w-6 h-6" fill="black" />
              </div>
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
            <div className="flex items-center space-x-4">
              {/* Store Button - THE COLORED STANDOUT */}
              <Link to="/store" className="hidden sm:block">
                <NeonButton size="sm" glowColor="#00F5FF" className="bg-[#00F5FF] text-black font-black uppercase text-[10px] tracking-widest px-6 shadow-[0_0_20px_rgba(0,245,255,0.2)] hover:shadow-[0_0_35px_rgba(0,245,255,0.4)] transition-all">
                  <ShoppingCart size={14} className="mr-2" /> STORE
                </NeonButton>
              </Link>

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
                    className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden hover:border-[#A349F5] transition-all duration-300 active:scale-95"
                  >
                    <img 
                      src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.handle || user?.name || 'U')}&background=random&color=fff`}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-4 w-64 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="px-5 py-3 border-b border-white/5 mb-2">
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Authenticated Operator</p>
                        <p className="text-white font-bold truncate text-base">@{user?.handle?.replace('@', '') || 'Anonymous'}</p>
                      </div>
                      
                      {user?.handle && (
                        <Link to={`/op/${user.handle.replace('@', '')}`} className="flex items-center gap-3 px-5 py-3.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-[#00F5FF]/10 flex items-center justify-center group-hover:bg-[#00F5FF]/20 transition-colors">
                            <User size={16} className="text-[#00F5FF]" />
                          </div>
                          View My Profile
                        </Link>
                      )}
                      
                      <Link to="/account" className="flex items-center gap-3 px-5 py-3.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <Settings size={16} />
                        </div>
                        Account Settings
                      </Link>
                      
                      {user?.isAdmin && (
                        <Link to="/admin" className="flex items-center gap-3 px-5 py-3.5 text-sm text-[#A349F5] hover:bg-[#A349F5]/10 transition-all font-bold group">
                          <div className="w-8 h-8 rounded-lg bg-[#A349F5]/10 flex items-center justify-center group-hover:bg-[#A349F5]/20 transition-colors">
                            <ShieldCheck size={16} />
                          </div>
                          Command Center
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
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="hidden sm:block">
                  <button className="px-6 py-2 rounded-full text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all uppercase tracking-widest">
                    Enter
                  </button>
                </Link>
              )}

              {/* Mobile Toggle */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 text-white/40 hover:text-white transition-all duration-300"
              >
                {isOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`fixed inset-0 top-20 bg-[#050505] z-40 lg:hidden transition-all duration-500 flex flex-col ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
          <div className="flex-1 overflow-y-auto px-6 py-10 space-y-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                   className={`flex items-center gap-5 p-5 rounded-2xl transition-all border ${
                    isActive ? 'bg-[#A349F5]/10 border-[#A349F5]/30 text-white' : 'bg-white/5 border-white/5 text-white/60'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#A349F5]/20' : 'bg-black'}`}>
                    <Icon size={24} className={isActive ? 'text-[#00F5FF]' : 'text-[#A349F5]'} />
                  </div>
                  <span className="text-xl font-bold">{link.name}</span>
                </Link>
              );
            })}
            
            <div className="pt-10 grid grid-cols-2 gap-4">
              <Link to="/store" className="col-span-2">
                <button className="w-full bg-gradient-to-r from-[#A349F5] to-[#00F5FF] text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(163,73,245,0.3)] uppercase tracking-tighter text-xl">
                  <ShoppingCart size={22} fill="black" /> ENTER STORE
                </button>
              </Link>
              {!isAuthenticated && (
                <Link to="/login" className="col-span-2">
                  <button className="w-full bg-white/5 text-white font-bold py-5 rounded-2xl border border-white/10 uppercase tracking-widest">
                    OPERATOR SIGN IN
                  </button>
                </Link>
              )}
            </div>
          </div>
          
          <div className="p-8 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em]">&copy; DJ FLOWERZ HUB</p>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;