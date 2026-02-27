import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, LogIn, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, isAuthenticated, loading } = useAuth();
  const { hasQuotaExceeded, siteConfig } = useData();
  const location = useLocation();

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

  const showNotice = false;
  const noticeTitle = hasQuotaExceeded ? "Service Interruption" : siteConfig.notice?.title;
  const noticeMessage = hasQuotaExceeded
    ? "Our database is currently experiencing high traffic and has hit its daily usage quota. Some products may not be visible. Please try again later or contact us if you need help!"
    : siteConfig.notice?.message;
  const noticeType = hasQuotaExceeded ? 'error' : siteConfig.notice?.type;

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
      <nav className="fixed top-0 w-full z-50 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-white/5 shadow-lg">
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
              <Link to="/music-pool" className="text-xs font-bold text-brand-cyan border border-brand-cyan/30 px-3 py-1.5 rounded-full hover:bg-brand-cyan/10 transition">
                JOIN POOL
              </Link>

              <Link to="/cart" className="relative text-gray-300 hover:text-white transition group">
                <ShoppingCart size={22} className="group-hover:text-brand-purple transition" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-purple text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-white/10 animate-pulse bg-white/5"></div>
                </div>
              ) : isAuthenticated ? (
                <Link to="/account" className="flex items-center gap-2 text-gray-300 hover:text-white transition group">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="User" className="w-9 h-9 rounded-full border-2 border-brand-purple object-cover shadow-lg shadow-brand-purple/30 group-hover:border-brand-cyan transition" />
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-brand-purple bg-brand-purple/20 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-purple/30 group-hover:border-brand-cyan transition">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || <User size={16} />}
                    </div>
                  )}
                </Link>
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
            {loading ? (
              <div className="w-full bg-white/5 animate-pulse py-4 rounded-xl flex justify-center border border-white/5">
                <div className="h-6 w-24 bg-white/10 rounded"></div>
              </div>
            ) : isAuthenticated ? (
              <Link
                to="/account"
                className="flex items-center justify-center gap-3 w-full bg-brand-purple/20 border border-brand-purple/40 text-white py-4 rounded-xl font-bold hover:bg-brand-purple/30 transition"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User" className="w-7 h-7 rounded-full border border-brand-purple object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full border border-brand-purple bg-brand-purple/40 flex items-center justify-center text-white font-bold text-xs">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                My Account
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