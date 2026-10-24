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
import BecomeAnAgent from './pages/BecomeAnAgent';
import WholesalePricingPage from './pages/WholesalePricingPage';
import AgentDashboard from './pages/AgentDashboard';

function AppContent() {
  const { loading } = useCountry();
  const getInitialTab = (): NavTab => {
    const path = window.location.pathname;
    if (path === '/become-an-agent') return 'become-an-agent';
    if (path === '/wholesale-pricing') return 'wholesale-pricing';
    if (path.startsWith('/agent')) return 'agent-dashboard';
    if (path === '/shop') return 'shop';
    if (path === '/media' || path === '/video') return 'video';
    if (path === '/vip') return 'vip';
    if (path === '/fitme') return 'fitme';
    if (path === '/profile') return 'profile';
    if (path === '/admin') return 'admin';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab);
  const [showSplash, setShowSplash] = useState(false);
  const [splashMounted, setSplashMounted] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'become-an-agent') {
      window.history.pushState({}, '', '/become-an-agent');
    } else if (tab === 'wholesale-pricing') {
      window.history.pushState({}, '', '/wholesale-pricing');
    } else if (tab === 'agent-dashboard') {
      window.history.pushState({}, '', '/agent/dashboard');
    } else if (tab === 'home') {
      window.history.pushState({}, '', '/');
    } else if (tab === 'shop') {
      window.history.pushState({}, '', '/shop');
    }
  };

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
      case 'home': return <Home onNavigate={handleNavigate} />;
      case 'shop': return <Shop />;
      case 'video': return <Media />;
      case 'vip': return <VIP />;
      case 'fitme': return <FitMe />;
      case 'profile': return <Profile />;
      case 'become-an-agent':
        return (
          <BecomeAnAgent
            onNavigateHome={() => handleNavigate('home')}
            onNavigateToPricing={(token) => {
              if (token) {
                window.history.pushState({}, '', `/wholesale-pricing?token=${encodeURIComponent(token)}`);
              }
              handleNavigate('wholesale-pricing');
            }}
          />
        );
      case 'wholesale-pricing':
        return (
          <WholesalePricingPage
            onNavigateHome={() => handleNavigate('home')}
            onApplyAsAgent={() => handleNavigate('become-an-agent')}
          />
        );
      case 'agent-dashboard': return <AgentDashboard />;
      case 'admin':
        return (
          <RequireAdmin onNavigate={handleNavigate}>
            <Admin />
          </RequireAdmin>
        );
      default: return <Home onNavigate={handleNavigate} />;
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
        <Header activeTab={activeTab} setActiveTab={handleNavigate} />
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
        <Navbar activeTab={activeTab} setActiveTab={handleNavigate} />
      </div>
    </CartProvider>
  );
}

export default function App() {
  return <AppContent />;
}
