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
import Login from './pages/Login';
import FitMe from './pages/FitMe';
import { motion, AnimatePresence } from 'framer-motion';
import { CartProvider } from './context/CartContext';
import { useCountry } from './context/CountryContext';
import SplashScreen from './components/SplashScreen';


function AppContent() {
  const { loading } = useCountry();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [showSplash, setShowSplash] = useState(true);
  const [splashMounted, setSplashMounted] = useState(true);

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
      case 'admin': return <Admin />;
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
