import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Home, ShoppingBag, Grid3X3, Sparkles, TrendingUp,
  ShoppingCart, Heart, Truck, Ruler, Package, RotateCcw,
  Mail, Info, Image, ChevronDown, ChevronRight, User,
  Sun, Moon, Phone, MessageCircle
} from 'lucide-react';
import { NavTab } from '../types';
import { useCart } from '../context/CartContext';
import { useCountry } from '../context/CountryContext';
import { useTheme } from '../context/ThemeContext';
import { MOCK_COUNTRIES } from '../data/mockData';
import { Switch } from './ui/switch';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

const CATEGORIES = [
  'T-Shirts', 'Jeans', 'Caps', 'Hoods', 'Footwear', 'Accessories', 'Tracksuits'
];

// WhatsApp icon component
const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Facebook icon component  
const FacebookIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Instagram icon component
const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

export default function SidebarMenu({ isOpen, onClose, activeTab, setActiveTab }: SidebarMenuProps) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const { cartCount } = useCart();
  const { user, countries, selectedCountry, updateUserCountry } = useCountry();
  const { theme, toggleTheme } = useTheme();
  const [showCountryPicker, setShowCountryPicker] = useState(false);

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-[70] w-[85%] max-w-[360px] bg-background border-r border-border shadow-2xl flex flex-col"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-foreground/10 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Profile section */}
            <div className="px-5 pt-6 pb-4 border-b border-border">
              <button
                onClick={() => navigate('profile')}
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
              <SectionLabel label="Navigate" />
              <div className="px-2 space-y-0.5">
                <MenuItem icon={Home} label="Home" onClick={() => navigate('home')} isActive={activeTab === 'home'} />
                <MenuItem icon={ShoppingBag} label="Shop" onClick={() => navigate('shop')} isActive={activeTab === 'shop'} />

                {/* Categories dropdown */}
                <button
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
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
                            onClick={() => navigate('shop')}
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

                {/* Contact Us expandable */}
                <button
                  onClick={() => setContactOpen(!contactOpen)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all text-sm font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
                >
                  <Mail size={20} strokeWidth={1.8} />
                  <span className="flex-1 text-left">Contact Us</span>
                  <motion.div animate={{ rotate: contactOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {contactOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-12 pr-3 space-y-1 pb-2">
                        <a
                          href="https://wa.me/255627997928"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('social_click', { platform: 'whatsapp' })}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-green-500 hover:bg-green-500/10 transition-colors"
                        >
                          <WhatsAppIcon size={16} />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href="https://www.facebook.com/africanboyJUX"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('social_click', { platform: 'facebook' })}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                        >
                          <FacebookIcon size={16} />
                          <span>Facebook</span>
                        </a>
                        <a
                          href="https://www.instagram.com/africanboy_brand/"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('social_click', { platform: 'instagram' })}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-pink-500 hover:bg-pink-500/10 transition-colors"
                        >
                          <InstagramIcon size={16} />
                          <span>Instagram</span>
                        </a>
                        <a
                          href="tel:+255627997928"
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Phone size={16} />
                          <span>Call Us</span>
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Brand */}
              <SectionLabel label="Brand" />
              <div className="px-2 space-y-0.5">
                <MenuItem icon={Info} label="About African Boy" onClick={() => {}} />
                <MenuItem icon={Image} label="Gallery / Lookbook" onClick={() => navigate('video')} isActive={activeTab === 'video'} />
              </div>
            </div>

            {/* Bottom section */}
            <div className="border-t border-border px-5 py-4 space-y-4">
              {/* Theme toggle */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <Switch checked={theme === 'light'} onCheckedChange={toggleTheme} />
              </div>

              {/* Country / Language + Currency unified picker */}
              <div className="relative">
                <button
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-card rounded-xl border border-border text-sm hover:border-primary/30 transition-colors"
                >
                  <span className="text-lg">{selectedCountry?.flag_emoji || '🇹🇿'}</span>
                  <span className="flex-1 text-left text-foreground/80">
                    {selectedCountry?.name || 'Tanzania'} · {selectedCountry?.currency_code || 'TZS'}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {showCountryPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-full mb-2 left-0 right-0 bg-card border border-border rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto no-scrollbar"
                    >
                      {countries.filter(c => c.is_active).map(country => (
                        <button
                          key={country.id}
                          onClick={() => {
                            updateUserCountry(country.id);
                            setShowCountryPicker(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-foreground/5 transition-colors
                            ${selectedCountry?.id === country.id ? 'text-primary font-semibold bg-primary/5' : 'text-foreground/70'}`}
                        >
                          <span className="text-lg">{country.flag_emoji}</span>
                          <span className="flex-1 text-left">{country.name}</span>
                          <span className="text-muted-foreground text-xs">{country.currency_code}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Social icons */}
              <div className="flex items-center justify-center gap-4">
                {[
                  { Icon: InstagramIcon, platform: 'instagram', href: 'https://www.instagram.com/africanboy_brand/' },
                  { Icon: FacebookIcon, platform: 'facebook', href: 'https://www.facebook.com/africanboyJUX' },
                  { Icon: WhatsAppIcon, platform: 'whatsapp', href: 'https://wa.me/255627997928' },
                ].map(({ Icon, href, platform }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('social_click', { platform })}
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
