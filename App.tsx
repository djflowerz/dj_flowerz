
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { DataProvider } from './context/DataContext';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Layout wrapper to conditionally hide footer/player on Admin
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <Navbar />
      <main className="flex-grow bg-[#0B0B0F] text-white min-h-screen">
        {children}
      </main>
      {!isAdmin && <AudioPlayer />}
      {!isAdmin && <Footer />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <CartProvider>
          <PlayerProvider>
            <Router>
              <ScrollToTop />
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/mixtapes" element={<Mixtapes />} />
                  <Route path="/mixtapes/:id" element={<MixtapeDetails />} />
                  <Route path="/music-pool" element={<MusicPool />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/store/:id" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/recording-sessions" element={<RecordingSessions />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/tip-jar" element={<TipJar />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/admin" element={<AdminDashboard />} />
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
