import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Product, NavTab } from '../types';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import africanBoyLogo from '@/assets/african-boy-logo.png';
import heroBg from '@/assets/hero-bg.png';
import spotlight1 from '@/assets/spotlight-1.png';
import spotlight2 from '@/assets/spotlight-2.png';
import spotlight3 from '@/assets/spotlight-3.png';
import spotlight4 from '@/assets/spotlight-4.png';
import spotlight5 from '@/assets/spotlight-5.png';
import spotlight6 from '@/assets/spotlight-6.png';
import spotlight7 from '@/assets/spotlight-7.png';
import spotlight8 from '@/assets/spotlight-8.png';
import spotlight9 from '@/assets/spotlight-9.png';
import spotlight10 from '@/assets/spotlight-10.png';

const updatesImages = [spotlight1, spotlight2, spotlight3, spotlight4, spotlight5];
const lifestyleImages = [spotlight7, spotlight8, spotlight9, spotlight10, spotlight6];

interface HomeProps {
  onNavigate: (tab: NavTab) => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const [, setFeaturedProducts] = useState<Product[]>([]);
  const [updatesIndex, setUpdatesIndex] = useState(0);
  const [lifestyleIndex, setLifestyleIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setUpdatesIndex(i => (i + 1) % updatesImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLifestyleIndex(i => (i + 1) % lifestyleImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (data) {
        setFeaturedProducts(
          data.map((p: any) => ({
            ...p,
            price: Number(p.price),
            colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
          }))
        );
      }
    };
    fetchFeatured();
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || shouldReduceMotion) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;
    setMousePos({ x, y });
  };

  return (
    <div className="pb-24 pt-16">
      {/* Hero Section */}
      <section
        onMouseMove={handleHeroMouseMove}
        className="relative min-h-[90vh] md:min-h-screen w-full overflow-hidden bg-black flex items-center justify-center select-none"
      >
        {/* Background Image with Ken Burns & Parallax */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div
            className="w-full h-full"
            style={{
              x: isMobile || shouldReduceMotion ? 0 : mousePos.x * 8,
              y: isMobile || shouldReduceMotion ? 0 : mousePos.y * 6,
            }}
            transition={{ type: 'spring', stiffness: 100, damping: 30 }}
          >
            <motion.img
              src={heroBg}
              alt="African Boy Collection"
              className="w-full h-full object-cover opacity-80 pointer-events-none"
              initial={shouldReduceMotion ? { opacity: 0.8 } : { scale: 1, opacity: 0 }}
              animate={
                shouldReduceMotion
                  ? { opacity: 0.8 }
                  : {
                      scale: [1, 1.06, 1],
                      x: ['0%', '-1%', '1%', '0%'],
                      y: ['0%', '-1%', '0%'],
                      opacity: 0.8,
                    }
              }
              transition={{
                duration: 24,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
              }}
            />
          </motion.div>

          {/* Cinematic Dark Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-background/90 z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_50%,_black_90%)] z-10 pointer-events-none opacity-60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 flex flex-col items-center text-center px-4 sm:px-6 max-w-4xl mx-auto pt-8">
          {/* Brand Backdrop Title & Logo */}
          <div className="relative mb-6 sm:mb-8 flex flex-col items-center">
            <motion.div
              className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 w-[280px] sm:w-[360px] h-[90px] flex items-center justify-center z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ delay: 0.2, duration: 1 }}
            >
              <span className="text-foreground text-3xl sm:text-5xl font-black tracking-[0.4em] uppercase pointer-events-none italic whitespace-nowrap">
                AFRICAN BOY
              </span>
            </motion.div>

            {/* Logo Container - Phase 2 */}
            <motion.div
              className="relative z-10"
              style={{
                x: isMobile || shouldReduceMotion ? 0 : mousePos.x * 4,
                y: isMobile || shouldReduceMotion ? 0 : mousePos.y * 3,
              }}
              transition={{ type: 'spring', stiffness: 150, damping: 25 }}
            >
              <motion.div
                className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full overflow-hidden bg-black shadow-[0_0_50px_hsl(43,96%,49%,0.35),0_0_100px_hsl(43,96%,49%,0.15)] border border-primary/20"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.85, filter: 'blur(12px)' }
                }
                animate={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, filter: 'blur(0px)' }
                }
                transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <img
                  src={africanBoyLogo}
                  alt="African Boy Logo"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Text & CTAs - Phase 3, 4, 5 */}
          <motion.div
            className="w-full max-w-2xl flex flex-col items-center"
            style={{
              x: isMobile || shouldReduceMotion ? 0 : mousePos.x * -3,
              y: isMobile || shouldReduceMotion ? 0 : mousePos.y * -2,
            }}
            transition={{ type: 'spring', stiffness: 120, damping: 25 }}
          >
            {/* Headline Phase 3: Two Stage Mask Reveal */}
            <div className="mb-4 text-center">
              <div className="overflow-hidden py-1">
                <motion.h1
                  className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none italic"
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  THE <span className="text-primary">LEGACY</span>
                </motion.h1>
              </div>
              <div className="overflow-hidden py-1">
                <motion.h1
                  className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none italic"
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                  transition={{ delay: 0.85, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  CONTINUES
                </motion.h1>
              </div>
            </div>

            {/* Supporting Text - Phase 4 */}
            <motion.p
              className="text-muted-foreground text-xs sm:text-sm md:text-base mb-8 font-semibold tracking-[0.25em] uppercase"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6, ease: 'easeOut' }}
            >
              Official Merchandise • Exclusive Content • VIP Experience
            </motion.p>

            {/* CTA Buttons - Phase 5 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
              {/* Primary CTA */}
              <motion.button
                onClick={() => onNavigate('shop')}
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 20, scale: 0.96 }
                }
                animate={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ delay: 1.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs sm:text-sm rounded-full overflow-hidden shadow-[0_0_30px_hsl(43,96%,49%,0.4)] transition-all flex items-center justify-center gap-2"
              >
                {/* Animated light highlight streak */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 pointer-events-none" />
                <span>Shop Collection</span>
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </motion.button>

              {/* Secondary CTA */}
              <motion.button
                onClick={() => onNavigate('video')}
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 20, scale: 0.96 }
                }
                animate={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ delay: 1.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group w-full sm:w-auto px-8 py-4 bg-foreground/5 backdrop-blur-md border border-foreground/15 text-foreground font-black uppercase tracking-widest text-xs sm:text-sm rounded-full hover:bg-foreground/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2"
              >
                <span>Explore Media</span>
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hasScrolled ? 0 : 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground pointer-events-none z-20"
        >
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase opacity-70">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center"
          >
            <div className="w-[1px] h-6 bg-gradient-to-b from-primary to-transparent" />
            <ChevronDown size={14} className="text-primary -mt-1" />
          </motion.div>
        </motion.div>
      </section>

      {/* Transition Zone into Content */}
      <div className="h-12 w-full bg-gradient-to-b from-black via-background/80 to-background -mt-4 relative z-20 pointer-events-none" />

      {/* Spotlight Section */}
      <section className="px-4 sm:px-6 py-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex justify-between items-end mb-8"
        >
          <div>
            <span className="text-primary text-xs font-bold tracking-widest uppercase">
              Spotlight
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">LATEST NEWS</h2>
          </div>
          <button
            onClick={() => onNavigate('video')}
            className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider flex items-center gap-1 group"
          >
            <span>Show All</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Updates Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            className="relative h-80 sm:h-96 rounded-3xl overflow-hidden group border border-foreground/10 bg-card shadow-xl cursor-pointer"
            onClick={() => onNavigate('video')}
          >
            {updatesImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Updates ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                style={{ opacity: updatesIndex === i ? 1 : 0 }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6 sm:p-8 flex flex-col justify-end z-10">
              <span className="bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-full w-fit mb-3 tracking-widest uppercase shadow-md">
                UPDATES
              </span>
              <h3 className="text-2xl font-bold leading-tight text-white group-hover:text-primary transition-colors">
                Welcome to African Boy
              </h3>
              <p className="text-xs text-muted-foreground mt-2">Just now</p>
              <div className="flex gap-1.5 mt-4">
                {updatesImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setUpdatesIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      updatesIndex === i ? 'w-8 bg-primary' : 'w-2 bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Lifestyle Card */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            className="relative h-80 sm:h-96 rounded-3xl overflow-hidden group border border-foreground/10 bg-card shadow-xl cursor-pointer"
            onClick={() => onNavigate('video')}
          >
            {lifestyleImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Lifestyle ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                style={{ opacity: lifestyleIndex === i ? 1 : 0 }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6 sm:p-8 flex flex-col justify-end z-10">
              <span className="bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-full w-fit mb-3 tracking-widest uppercase shadow-md">
                LIFESTYLE
              </span>
              <h3 className="text-2xl font-bold leading-tight text-white group-hover:text-primary transition-colors">
                New Collection Coming Soon
              </h3>
              <p className="text-xs text-muted-foreground mt-2">Recently</p>
              <div className="flex gap-1.5 mt-4">
                {lifestyleImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLifestyleIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      lifestyleIndex === i ? 'w-8 bg-primary' : 'w-2 bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

