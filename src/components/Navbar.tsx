import { NAV_ITEMS } from '../constants';
import { NavTab } from '../types';
import { motion } from 'framer-motion';
import { useCountry } from '../context/CountryContext';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { user } = useCountry();

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'admin') {
      return user?.role === 'admin';
    }
    if (item.id === 'profile') {
      return !!user;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav z-50 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] border-t border-foreground/10 bg-background/85 backdrop-blur-xl">
      <div className="max-w-md mx-auto flex justify-around items-center px-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center p-1.5 group outline-none select-none"
            >
              {/* Active Glow Backdrop */}
              {isActive && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute inset-0 bg-primary/10 rounded-full blur-sm"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}

              {/* Icon Container */}
              <motion.div
                animate={{
                  scale: isActive ? 1.18 : 1,
                  y: isActive ? -2 : 0,
                  color: isActive ? 'hsl(43, 96%, 49%)' : '#8E9299',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative z-10 mb-0.5"
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </motion.div>

              {/* Label */}
              <span
                className={`relative z-10 text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/80'
                }`}
              >
                {item.label}
              </span>

              {/* Spring Indicator Line */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 w-5 h-1 bg-primary rounded-full shadow-[0_0_10px_hsl(43,96%,49%)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

