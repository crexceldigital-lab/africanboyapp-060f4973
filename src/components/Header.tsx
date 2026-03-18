import { Search, ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import CartDrawer from './CartDrawer';
import { useCountry } from '../context/CountryContext';
import SidebarMenu from './SidebarMenu';
import { NavTab } from '../types';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const { cartCount } = useCart();
  const { selectedCountry } = useCountry();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-md border-b border-foreground/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-foreground/10 rounded-full transition-colors"
            >
              <Menu size={24} />
            </button>
            {selectedCountry && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-card rounded-full border border-foreground/5">
                <span className="text-sm">{selectedCountry.flag_emoji}</span>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{selectedCountry.code}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-primary font-black text-xl tracking-tighter italic">AFRICAN BOY</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
              <Search size={22} />
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2 hover:bg-foreground/10 rounded-full transition-colors relative"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center rounded-full">
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
