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
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { DataProvider } from './context/DataContext';
import { FloatingChatWidget } from './components/ui/floating-chat-widget-shadcnui';
import LiveEventStreamer from './components/LiveEventStreamer';
import { PushBanner } from './src/components/PushBanner';

import AccessDenied from './components/AccessDenied';
import { Activity } from 'lucide-react';

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
const Store = lazyWithRetry(() => import('./pages/Store'));
const ProductDetails = lazyWithRetry(() => import('./pages/ProductDetails'));
const Cart = lazyWithRetry(() => import('./pages/Cart'));
const Checkout = lazyWithRetry(() => import('./pages/Checkout'));
const Success = lazyWithRetry(() => import('./pages/Success'));


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
const Community = lazyWithRetry(() => import('./pages/Community'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const SetupProfile = lazy(() => import('./pages/SetupProfile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PulseDetail = lazy(() => import('./pages/PulseDetail'));
const MarketplaceDashboard = lazy(() => import('./pages/MarketplaceDashboard'));
const AdminGovernance = lazyWithRetry(() => import('./src/admin/pages/Governance'));
const AdminCommandCentre = lazyWithRetry(() => import('./src/admin/pages/CommandCentre'));

const Mixtapes = lazyWithRetry(() => import('./pages/Mixtapes'));
const MixtapeDetails = lazyWithRetry(() => import('./pages/MixtapeDetails'));
const MusicPool = lazyWithRetry(() => import('./pages/MusicPool'));
const DJLab = lazyWithRetry(() => import('./pages/DJLab'));
const Account = lazyWithRetry(() => import('./pages/Account'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Signup = lazyWithRetry(() => import('./pages/Signup'));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail'));
// const Sessions = lazyWithRetry(() => import('./pages/Sessions'));
const Bookings = lazyWithRetry(() => import('./pages/Bookings'));
const TipJar = lazyWithRetry(() => import('./pages/TipJar'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const Terms = lazyWithRetry(() => import('./pages/Terms'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));
const Refund = lazyWithRetry(() => import('./pages/Refund'));

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

const AppContent = () => {
  const { user, isAuthenticated, loading, needsSetup } = useAuth();
  const location = useLocation();

  // Redirect if profile setup is required
  if (isAuthenticated && !loading && needsSetup && location.pathname !== '/setup-identity') {
    return <Navigate to="/setup-identity" replace />;
  }
  
  return (
    <Layout>
      <PushBanner />
      <ErrorBoundary>
        <Suspense key={location.pathname} fallback={<LoadingSpinner />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/mixtapes" element={<Mixtapes />} />
            <Route path="/mixtapes/:id" element={<MixtapeDetails />} />
            <Route path="/music-pool" element={<ProtectedRoute subscriberOnly><MusicPool /></ProtectedRoute>} />
            <Route path="/community" element={<Community />} />
            <Route path="/pulse/:id" element={<Suspense fallback={<LoadingSpinner />}><PulseDetail /></Suspense>} />
            <Route path="/op/:handle" element={<PublicProfile />} />
            <Route path="/dj-lab" element={<Suspense fallback={<LoadingSpinner />}><DJLab /></Suspense>} />

            <Route path="/store" element={<Store />} />
            <Route path="/store/:slug" element={<ProductDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/setup-identity" element={<ProtectedRoute><SetupProfile /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><MarketplaceDashboard /></ProtectedRoute>} />

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
            <Route path="/admin/profiles" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminProfiles /></ProtectedRoute></ErrorBoundary>} />
            <Route path="/admin/governance" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminGovernance /></ProtectedRoute></ErrorBoundary>} />
            <Route path="/admin/command-centre" element={<ErrorBoundary><ProtectedRoute adminOnly><AdminCommandCentre /></ProtectedRoute></ErrorBoundary>} />

{/* Sessions removed */}
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/tip-jar" element={<TipJar />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
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

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  return (
    <AuthProvider>
      <DataProvider>
        <CartProvider>
          <PlayerProvider>
              <Router>
                <ScrollToTop />
                {showInstallBanner && (
                  <div className="fixed bottom-24 left-4 right-4 z-[9999] bg-brand-purple p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/20">
                    <div className="flex items-center gap-3">
                        <Activity className="text-white" size={24} />
                        <div>
                          <p className="text-sm font-black text-white">SIGNAL APP</p>
                          <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest leading-none">Marketplace & Hub</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInstallBanner(false)} className="px-3 py-2 text-white/50 text-[10px] font-black uppercase">Later</button>
                        <button onClick={handleInstall} className="px-5 py-2 bg-white text-brand-purple rounded-full text-[10px] font-black uppercase shadow-xl">Install</button>
                    </div>
                  </div>
                )}
                <Toaster position="top-right" richColors closeButton theme="dark" />
                <FloatingChatWidget />
                <LiveEventStreamer />
                <AppContent />
              </Router>
            </PlayerProvider>
          </CartProvider>
        </DataProvider>
      </AuthProvider>
    );
  };

export default App;
