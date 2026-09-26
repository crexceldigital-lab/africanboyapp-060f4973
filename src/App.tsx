import { useState, useEffect } from 'react';
import { NavTab } from './types';
import Navbar from './components/Navbar';
import Header from './components/Header';
import Home from './pages/Home';
import Shop from './pages/Shop';

import Media from './pages/Media';
import VIP from './pages/VIP';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import RequireAdmin from './components/admin/RequireAdmin';
import Login from './pages/Login';
import FitMe from './pages/FitMe';
import { motion, AnimatePresence } from 'framer-motion';
import { CartProvider } from './context/CartContext';
import { useCountry } from './context/CountryContext';
import SplashScreen from './components/SplashScreen';


import TrackOrder from './pages/TrackOrder';
import InternationalOrder from './pages/InternationalOrder';

function AppContent() {
  const { loading } = useCountry();
  const initialTab: NavTab = window.location.pathname === '/shop' ? 'shop' : 'home';
  const [activeTab, setActiveTab] = useState<NavTab>(initialTab);
  const [showSplash, setShowSplash] = useState(false);
  const [splashMounted, setSplashMounted] = useState(false);

  if (window.location.pathname.startsWith('/international-order/')) {
    return <InternationalOrder />;
  }

  if (window.location.pathname === '/track-order') {
    return (
      <CartProvider>
        <TrackOrder />
      </CartProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-primary font-bold text-[10px] tracking-widest uppercase">Initializing Movement...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <Home onNavigate={setActiveTab} />;
      case 'shop': return <Shop />;
      case 'video': return <Media />;
      case 'vip': return <VIP />;
      case 'fitme': return <FitMe />;
      case 'profile': return <Profile />;
      case 'admin':
        return (
          <RequireAdmin onNavigate={setActiveTab}>
            <Admin />
          </RequireAdmin>
        );
      default: return <Home onNavigate={setActiveTab} />;
    }
  };

  return (
    <CartProvider>
      {splashMounted && (
        <SplashScreen
          show={showSplash}
          onComplete={() => {
            setShowSplash(false);
            // Allow exit animation to complete before unmounting splash component
            setTimeout(() => setSplashMounted(false), 600);
          }}
        />
      )}
      <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.985, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.985, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </CartProvider>
  );
}

export default function App() {
  return <AppContent />;
}
