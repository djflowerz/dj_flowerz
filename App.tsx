import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Toaster } from 'sonner';
import AudioPlayer from './components/AudioPlayer';
import Home from './pages/Home';
import Mixtapes from './pages/Mixtapes';
import MixtapeDetails from './pages/MixtapeDetails';
import MusicPool from './pages/MusicPool';
import Store from './pages/Store';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import Bookings from './pages/Bookings';
import RecordingSessions from './pages/RecordingSessions';
import Sessions from './pages/Sessions';
import TipJar from './pages/TipJar';
import Account from './pages/Account';
import Contact from './pages/Contact';
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import AdminDashboard from './pages/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import UserProfile from './pages/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { DataProvider } from './context/DataContext';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Layout wrapper to conditionally hide footer/player on Admin or Music Pool
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isMusicPool = location.pathname === '/music-pool';
  const isProductDetails = location.pathname.startsWith('/store/') && location.pathname !== '/store' && location.pathname !== '/store/';
  const hideChrome = isAdmin;

  return (
    <>
      <Navbar />
      <main
        className="flex-grow bg-[#0B0B0F] text-white min-h-screen pt-20 pb-24"
      >
        {children}
      </main>
      {!hideChrome && <AudioPlayer />}
      {!hideChrome && <Footer />}
    </>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Disable F12
      if (e.key === 'F12') e.preventDefault();

      // 2. Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
      }

      // 3. Disable Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
      }

      // 4. Disable Ctrl+S (Save Page)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }

      // 5. Disable Ctrl+C (Copy) - Users should not steal track metadata easily
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <AuthProvider>
      <DataProvider>
        <CartProvider>
          <PlayerProvider>
            <Router>
              <ScrollToTop />
              <Toaster position="top-right" richColors closeButton theme="dark" />
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/mixtapes" element={<Mixtapes />} />
                  <Route path="/mixtapes/:id" element={<MixtapeDetails />} />
                  <Route path="/music-pool" element={<MusicPool />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/store/:slug" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/success/:id" element={<Success />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/recording-sessions" element={<RecordingSessions />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/tip-jar" element={<TipJar />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                  {/* Admin — single page with tabs */}
                  <Route path="/admin/*" element={
                    <ErrorBoundary>
                      <ProtectedRoute adminOnly>
                        <AdminDashboard />
                      </ProtectedRoute>
                    </ErrorBoundary>
                  } />
                </Routes>
              </Layout>
            </Router>
          </PlayerProvider>
        </CartProvider>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
