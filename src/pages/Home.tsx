import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { Product, NavTab } from '../types';
import ProductCard from '../components/ProductCard';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import africanBoyLogo from '@/assets/african-boy-logo.png';
import heroBg from '@/assets/hero-bg.png';

interface HomeProps {
  onNavigate: (tab: NavTab) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [logoPos, setLogoPos] = useState({ x: 0, y: -15 }); // percentage offset
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (data) {
        setFeaturedProducts(data.map((p: any) => ({
          ...p,
          price: Number(p.price),
          colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
        })));
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="pb-24 pt-16">
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden bg-background flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-10" />
          <div className="absolute inset-0 bg-background/40 z-10" />
          <img 
            src={heroBg}
            alt="African Boy Collection"
            className="w-full h-full object-cover opacity-60"
          />
        </div>

        <div className="relative z-20 flex flex-col items-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mb-8"
          >
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[300px] h-[100px] flex items-center justify-center">
              <span className="text-foreground/20 text-4xl font-black tracking-[0.5em] uppercase pointer-events-none">
                AFRICAN BOY
              </span>
            </div>

            <div 
              ref={containerRef}
              className="relative w-72 h-72 md:w-96 md:h-96 rounded-full shadow-[0_0_60px_hsl(43,96%,49%,0.4),0_0_120px_hsl(43,96%,49%,0.15)] overflow-hidden cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onMouseMove={(e) => {
                if (!isDragging || !containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width - 0.5) * -30;
                const y = ((e.clientY - rect.top) / rect.height - 0.5) * -30;
                setLogoPos({ x, y });
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <img 
                src={africanBoyLogo}
                alt="African Boy Logo"
                className="absolute w-[130%] h-[130%] object-cover pointer-events-none transition-all duration-75"
                style={{
                  left: `${logoPos.x - 15}%`,
                  top: `${logoPos.y - 15}%`,
                }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-4 italic">
              THE <span className="text-primary">LEGACY</span> CONTINUES
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-8 font-medium tracking-wide uppercase">
              Official Merchandise • Exclusive Content • VIP Experience
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => onNavigate('shop')}
                className="w-full sm:w-auto px-10 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_hsl(43,96%,49%,0.4)]"
              >
                Shop Collection
              </button>
              <button 
                onClick={() => onNavigate('video')}
                className="w-full sm:w-auto px-10 py-4 bg-foreground/5 border border-foreground/10 text-foreground font-black uppercase tracking-widest text-sm rounded-full hover:bg-foreground/10 transition-colors"
              >
                Explore Media
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground"
        >
          <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent mx-auto" />
        </motion.div>
      </section>

      {/* Spotlight Section */}
      <section className="px-6 py-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-primary text-xs font-bold tracking-widest uppercase">Spotlight</span>
            <h2 className="text-3xl font-black tracking-tight">LATEST NEWS</h2>
          </div>
          <button 
            onClick={() => onNavigate('video')}
            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            SHOW ALL
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ y: -5 }}
            className="relative h-64 rounded-3xl overflow-hidden group border border-foreground/5 bg-card"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent p-6 flex flex-col justify-end">
              <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 rounded w-fit mb-2">UPDATES</span>
              <h3 className="text-xl font-bold leading-tight">Welcome to African Boy</h3>
              <p className="text-xs text-muted-foreground mt-2">Just now</p>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="relative h-64 rounded-3xl overflow-hidden group border border-foreground/5 bg-card"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent p-6 flex flex-col justify-end">
              <span className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 rounded w-fit mb-2">LIFESTYLE</span>
              <h3 className="text-xl font-bold leading-tight">New Collection Coming Soon</h3>
              <p className="text-xs text-muted-foreground mt-2">Recently</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Merch */}
      <section className="px-6 py-12 bg-popover">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-primary text-xs font-bold tracking-widest uppercase">Collection</span>
            <h2 className="text-3xl font-black tracking-tight">FOR MEN</h2>
          </div>
          <button 
            onClick={() => onNavigate('shop')}
            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            SHOW ALL <ArrowRight size={14} />
          </button>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Products coming soon...</p>
        )}
      </section>
    </div>
  );
}
