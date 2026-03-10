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
  
  const filteredItems = NAV_ITEMS.filter(item => {
    if (item.id === 'admin') {
      return user?.role === 'admin';
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav z-50 pb-6 pt-2">
      <div className="max-w-md mx-auto flex justify-around items-center px-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative flex flex-col items-center p-2 group"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.2 : 1,
                  color: isActive ? 'hsl(43, 96%, 49%)' : '#8E9299'
                }}
                className="mb-1"
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              <span className={`text-[10px] uppercase tracking-wider font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 w-1 h-1 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
