import { Search, ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState, useEffect } from 'react';
import CartDrawer from './CartDrawer';
import { useCountry } from '../context/CountryContext';
import SidebarMenu from './SidebarMenu';
import { NavTab } from '../types';

interface HeaderProps {
  activeTab?: NavTab;
  setActiveTab?: (tab: NavTab) => void;
}

export default function Header({ activeTab, setActiveTab = () => {} }: HeaderProps) {
  const { cartCount } = useCart();
  const { selectedCountry } = useCountry();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/85 backdrop-blur-xl border-b border-foreground/10 shadow-2xl py-0.5'
            : 'bg-background/40 backdrop-blur-md border-b border-transparent py-1'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-foreground/10 rounded-full transition-colors active:scale-95"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            {selectedCountry && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-card/80 rounded-full border border-foreground/10 shadow-sm">
                <span className="text-sm">{selectedCountry.flag_emoji}</span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {selectedCountry.code}
                </span>
              </div>
            )}
          </div>

          <div
            onClick={() => setActiveTab('home')}
            className="flex flex-col items-center cursor-pointer group"
          >
            <span className="text-primary font-black text-xl md:text-2xl tracking-tighter italic group-hover:scale-105 transition-transform">
              AFRICAN BOY
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('shop')}
              className="p-2 hover:bg-foreground/10 rounded-full transition-colors active:scale-95"
              aria-label="Search"
            >
              <Search size={22} />
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="p-2 hover:bg-foreground/10 rounded-full transition-colors relative active:scale-95 group"
              aria-label="Cart"
            >
              <ShoppingCart size={22} className="group-hover:text-primary transition-colors" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center rounded-full shadow-md animate-in zoom-in-50">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <SidebarMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

