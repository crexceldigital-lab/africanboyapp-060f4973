import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Home, ShoppingBag, Grid3X3, Sparkles, TrendingUp,
  ShoppingCart, Heart, Truck, Ruler, Package, RotateCcw,
  Mail, Info, Image, ChevronDown, ChevronRight, User,
  LogIn, Globe, DollarSign, Instagram, Twitter, Facebook, Youtube
} from 'lucide-react';
import { NavTab } from '../types';
import { useCart } from '../context/CartContext';
import { useCountry } from '../context/CountryContext';
import { MOCK_COUNTRIES } from '../data/mockData';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

const CATEGORIES = [
  'T-Shirts', 'Jeans', 'Caps', 'Hoods', 'Footwear', 'Accessories', 'Tracksuits'
];

export default function SidebarMenu({ isOpen, onClose, activeTab, setActiveTab }: SidebarMenuProps) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { cartCount } = useCart();
  const { user, selectedCountry, updateUserCountry } = useCountry();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const navigate = (tab: NavTab) => {
    setActiveTab(tab);
    onClose();
  };

  const MenuItem = ({ icon: Icon, label, onClick, isActive, badge }: {
    icon: any; label: string; onClick: () => void; isActive?: boolean; badge?: number;
  }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all text-sm font-medium
        ${isActive ? 'bg-primary/15 text-primary' : 'text-foreground/80 hover:bg-foreground/5 hover:text-foreground'}`}
    >
      <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  const SectionLabel = ({ label }: { label: string }) => (
    <p className="px-5 pt-6 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-[70] w-[85%] max-w-[360px] bg-background border-r border-foreground/5 shadow-2xl flex flex-col"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-foreground/10 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Profile section */}
            <div className="px-5 pt-6 pb-4 border-b border-foreground/5">
              <button
                onClick={() => navigate(user ? 'profile' : 'profile')}
                className="flex items-center gap-3 w-full"
              >
                <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <User size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  {user ? (
                    <>
                      <p className="text-sm font-bold text-foreground">{user.full_name || 'My Account'}</p>
                      <p className="text-[11px] text-muted-foreground">{user.email}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-foreground">My Account</p>
                      <p className="text-[11px] text-primary font-semibold">Login / Sign Up</p>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
              {/* Main navigation */}
              <SectionLabel label="Navigate" />
              <div className="px-2 space-y-0.5">
                <MenuItem icon={Home} label="Home" onClick={() => navigate('home')} isActive={activeTab === 'home'} />
                <MenuItem icon={ShoppingBag} label="Shop" onClick={() => navigate('shop')} isActive={activeTab === 'shop'} />

                {/* Categories dropdown */}
                <button
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all text-sm font-medium
                    text-foreground/80 hover:bg-foreground/5 hover:text-foreground`}
                >
                  <Grid3X3 size={20} strokeWidth={1.8} />
                  <span className="flex-1 text-left">Categories</span>
                  <motion.div animate={{ rotate: categoriesOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {categoriesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-12 pr-3 space-y-0.5 pb-1">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              navigate('shop');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
                          >
                            <ChevronRight size={14} className="text-muted-foreground" />
                            <span>{cat}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <MenuItem icon={Sparkles} label="New Arrivals" onClick={() => navigate('shop')} />
                <MenuItem icon={TrendingUp} label="Best Sellers" onClick={() => navigate('shop')} />
              </div>

              {/* Shopping */}
              <SectionLabel label="Shopping" />
              <div className="px-2 space-y-0.5">
                <MenuItem icon={ShoppingCart} label="Cart" onClick={() => navigate('shop')} badge={cartCount} />
                <MenuItem icon={Heart} label="Wishlist" onClick={() => navigate('shop')} />
                <MenuItem icon={Truck} label="Track Order" onClick={() => navigate('profile')} />
              </div>

              {/* Utility */}
              <SectionLabel label="Help" />
              <div className="px-2 space-y-0.5">
                <MenuItem icon={Ruler} label="Size Guide" onClick={() => navigate('fitme')} isActive={activeTab === 'fitme'} />
                <MenuItem icon={Package} label="Shipping Info" onClick={() => {}} />
                <MenuItem icon={RotateCcw} label="Returns & Exchanges" onClick={() => {}} />
                <MenuItem icon={Mail} label="Contact Us" onClick={() => {}} />
              </div>

              {/* Brand */}
              <SectionLabel label="Brand" />
              <div className="px-2 space-y-0.5">
                <MenuItem icon={Info} label="About African Boy" onClick={() => {}} />
                <MenuItem icon={Image} label="Gallery / Lookbook" onClick={() => navigate('video')} isActive={activeTab === 'video'} />
              </div>
            </div>

            {/* Bottom section */}
            <div className="border-t border-foreground/5 px-5 py-4 space-y-4">
              {/* Language & Currency */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLangPicker(!showLangPicker)}
                  className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-card rounded-xl border border-foreground/5 text-sm hover:border-primary/30 transition-colors"
                >
                  <Globe size={16} className="text-muted-foreground" />
                  <span className="text-foreground/80">EN</span>
                </button>
                <div className="flex-1 relative">
                  <button
                    onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-card rounded-xl border border-foreground/5 text-sm hover:border-primary/30 transition-colors"
                  >
                    <DollarSign size={16} className="text-muted-foreground" />
                    <span className="text-foreground/80">{selectedCountry?.currency_code || 'TZS'}</span>
                  </button>
                  <AnimatePresence>
                    {showCurrencyPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-foreground/10 rounded-xl overflow-hidden shadow-xl max-h-40 overflow-y-auto no-scrollbar"
                      >
                        {MOCK_COUNTRIES.filter(c => c.is_active).map(country => (
                          <button
                            key={country.id}
                            onClick={() => {
                              updateUserCountry(country.id);
                              setShowCurrencyPicker(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/5 transition-colors
                              ${selectedCountry?.id === country.id ? 'text-primary font-semibold' : 'text-foreground/70'}`}
                          >
                            <span>{country.flag_emoji}</span>
                            <span>{country.currency_code}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Social icons */}
              <div className="flex items-center justify-center gap-4">
                {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
