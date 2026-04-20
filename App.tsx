import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Toaster } from 'sonner';
import AudioPlayer from './components/AudioPlayer';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { DataProvider } from './context/DataContext';
import { FloatingChatWidget } from './components/ui/floating-chat-widget-shadcnui';
import LiveEventStreamer from './components/LiveEventStreamer';
import { PushBanner } from './src/components/PushBanner';

import AccessDenied from './components/AccessDenied';

/**
 * Helper to handle "Failed to fetch dynamically imported module" errors 
 * caused by deployments (stale JS chunks in the user's browser).
 * It attempts a hard reload to get the latest version.
 */
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed = sessionStorage.getItem('page-has-been-force-refreshed');

    try {
      const component = await componentImport();
      sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error: any) {
      if (!pageHasBeenForceRefreshed || pageHasBeenForceRefreshed === 'false') {
        sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a dummy component while reloading
        return { default: () => null };
      }
      throw error;
    }
  });

// Lazy load pages to reduce initial bundle size
const Home = lazyWithRetry(() => import('./pages/Home'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const EscrowManager = lazyWithRetry(() => import('./pages/EscrowManager'));
const Mixtapes = lazyWithRetry(() => import('./pages/Mixtapes'));
const MixtapeDetails = lazyWithRetry(() => import('./pages/MixtapeDetails'));
const MusicPool = lazyWithRetry(() => import('./pages/MusicPool'));
const DJLab = lazyWithRetry(() => import('./pages/DJLab'));
const Community = lazyWithRetry(() => import('./pages/Community'));
const Store = lazyWithRetry(() => import('./pages/Store'));
const Marketplace = lazyWithRetry(() => import('./pages/Marketplace'));
const VendorDashboard = lazyWithRetry(() => import('./pages/VendorDashboard'));
const ProductDetails = lazyWithRetry(() => import('./pages/ProductDetails'));
const Cart = lazyWithRetry(() => import('./pages/Cart'));
const Checkout = lazyWithRetry(() => import('./pages/Checkout'));
const Success = lazyWithRetry(() => import('./pages/Success'));
const Bookings = lazyWithRetry(() => import('./pages/Bookings'));
const RecordingSessions = lazyWithRetry(() => import('./pages/RecordingSessions'));
const Sessions = lazyWithRetry(() => import('./pages/Sessions'));
const TipJar = lazyWithRetry(() => import('./pages/TipJar'));
const Account = lazyWithRetry(() => import('./pages/Account'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const About = lazyWithRetry(() => import('./pages/About'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Signup = lazyWithRetry(() => import('./pages/Signup'));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail'));
const UserProfile = lazyWithRetry(() => import('./pages/UserProfile'));
const OrderTracking = lazyWithRetry(() => import('./pages/OrderTracking'));
const PublicProfile = lazyWithRetry(() => import('./pages/PublicProfile'));


// Modular Admin Pages
const AdminHome = lazyWithRetry(() => import('./src/admin/pages/Dashboard'));
const AdminProducts = lazyWithRetry(() => import('./src/admin/pages/Products'));
const AdminOrders = lazyWithRetry(() => import('./src/admin/pages/Orders'));
const AdminMixtapes = lazyWithRetry(() => import('./src/admin/pages/Mixtapes'));
const AdminCustomers = lazyWithRetry(() => import('./src/admin/pages/Customers'));
const AdminPayments = lazyWithRetry(() => import('./src/admin/pages/Payments'));
const AdminSubscriptions = lazyWithRetry(() => import('./src/admin/pages/Subscriptions'));
const AdminMessages = lazyWithRetry(() => import('./src/admin/pages/Messages'));
const AdminPool = lazyWithRetry(() => import('./src/admin/pages/MusicPool'));
const AdminSettings = lazyWithRetry(() => import('./src/admin/pages/Settings'));
const AdminNewsletter = lazyWithRetry(() => import('./src/admin/pages/Newsletter'));
const AdminAffiliates = lazyWithRetry(() => import('./src/admin/pages/Affiliates'));
const AdminInstallments = lazyWithRetry(() => import('./src/admin/pages/Installments'));
const AdminMarketing = lazyWithRetry(() => import('./src/admin/pages/Marketing'));
const AdminShipping = lazyWithRetry(() => import('./src/admin/pages/Shipping'));
const AdminCommandCentre = lazyWithRetry(() => import('./src/admin/pages/CommandCentre'));
const VideoSession = lazyWithRetry(() => import('./pages/VideoSession'));

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
  const isVideo = location.pathname.startsWith('/sessions/video');
  const hideChrome = isAdmin || isVideo;

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
    
    // Global Presence Heartbeat
    let heartbeatInterval: any;
    const sendHeartbeat = async () => {
        try {
            await fetch('/api/presence', { method: 'POST' });
        } catch (e) {
            // Silently ignore heartbeat errors
        }
    };

    // Initial heartbeat
    sendHeartbeat();
    
    // Frequent heartbeat while tab is active
    heartbeatInterval = setInterval(sendHeartbeat, 60000); // 1 minute

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
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
              <FloatingChatWidget />
              <LiveEventStreamer />

              <Layout>
                <PushBanner />
                <ErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/pool" element={<Navigate to="/" replace />} />
                      <Route path="/track/:id" element={<Navigate to="/" replace />} />
                      <Route path="/mixtapes" element={<Mixtapes />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/escrow-mngt" element={<EscrowManager />} />
                      <Route path="/mixtapes/:id" element={<MixtapeDetails />} />
                      <Route path="/music-pool" element={<ProtectedRoute subscriberOnly><MusicPool /></ProtectedRoute>} />
                      <Route path="/dj-lab" element={<Suspense fallback={<LoadingSpinner />}><DJLab /></Suspense>} />
                      <Route path="/aura-vision" element={<Navigate to="/dj-lab" replace />} />
                      <Route path="/dj-tools/bpm-tapper" element={<Navigate to="/dj-lab" replace />} />
                      <Route path="/community/:username" element={<PublicProfile />} />
                      <Route path="/:username" element={<Navigate to="/community/:username" replace />} />

                      <Route path="/community" element={<Community />} />

                      <Route path="/store" element={<Store />} />
                      <Route path="/marketplace" element={<Marketplace />} />
                      <Route path="/vendor-dashboard" element={<VendorDashboard />} />
                      <Route path="/store/:slug" element={<ProductDetails />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/success" element={<Success />} />
                      <Route path="/success/:id" element={<Success />} />
                      <Route path="/order-tracking" element={<OrderTracking />} />
                      <Route path="/bookings" element={<Bookings />} />
                      <Route path="/recording-sessions" element={<RecordingSessions />} />
                      <Route path="/sessions" element={<Sessions />} />
                      <Route path="/sessions/video/:sessionId" element={<ProtectedRoute><VideoSession /></ProtectedRoute>} />
                      <Route path="/tip-jar" element={<TipJar />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/premium" element={<ProtectedRoute subscriberOnly><AccessDenied /></ProtectedRoute>} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                      {/* Admin Modular Pages */}
                      <Route path="/admin" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminHome /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/products" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminProducts /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/orders" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/mixtapes" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminMixtapes /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/customers" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminCustomers /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/payments" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/subscriptions" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminSubscriptions /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/messages" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminMessages /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/pool" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminPool /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/settings" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/newsletter" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminNewsletter /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/affiliates" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminAffiliates /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/installments" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminInstallments /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/marketing" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminMarketing /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/shipping" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminShipping /></ProtectedRoute></ErrorBoundary>} />
                      <Route path="/admin/command-centre" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminCommandCentre /></ProtectedRoute></ErrorBoundary>} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Layout>
            </Router>
          </PlayerProvider>
        </CartProvider>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
