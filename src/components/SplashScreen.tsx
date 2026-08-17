import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import africanBoyLogo from '@/assets/african-boy-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  show: boolean;
}

export default function SplashScreen({ onComplete, show }: SplashScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || shouldReduceMotion) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2; // -1 to 1
    const y = (clientY / innerHeight - 0.5) * 2; // -1 to 1
    setMousePos({ x, y });
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          onMouseMove={handleMouseMove}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black select-none pointer-events-auto"
          initial={{ opacity: 1, scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  scale: 1.04,
                  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                }
          }
        >
          {/* Ambient Center Gold Glow - Scene 1 */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, hsl(43 96% 49% / 0.12) 0%, transparent 60%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0.8], scale: [0.8, 1.2, 1] }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
          />

          {/* Vignette border framing */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_40%,_black_100%)] opacity-80" />

          {/* Central Composition (Logo + Light Sweep) */}
          <div className="relative flex flex-col items-center justify-center z-10 px-4">
            {/* Logo Container - Scene 2 */}
            <motion.div
              style={{
                rotateX: isMobile || shouldReduceMotion ? 0 : mousePos.y * -2,
                rotateY: isMobile || shouldReduceMotion ? 0 : mousePos.x * 2,
                x: isMobile || shouldReduceMotion ? 0 : mousePos.x * 3,
                y: isMobile || shouldReduceMotion ? 0 : mousePos.y * 3,
              }}
              className="relative transition-transform duration-200 ease-out"
            >
              <motion.div
                className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 rounded-full overflow-hidden bg-black shadow-[0_0_50px_hsl(43_96%_49%_/_0.25)] border border-primary/20"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.88, filter: 'blur(15px)' }
                }
                animate={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, filter: 'blur(0px)' }
                }
                transition={{
                  delay: 0.4,
                  duration: 1.0,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* Logo Image */}
                <img
                  src={africanBoyLogo}
                  alt="African Boy"
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Elegant Light Sweep - Scene 3 */}
                {!shouldReduceMotion && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(110deg, transparent 35%, hsl(43 96% 80% / 0.5) 50%, transparent 65%)',
                    }}
                    initial={{ x: '-120%' }}
                    animate={{ x: '160%' }}
                    transition={{
                      delay: 1.4,
                      duration: 0.8,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                )}
              </motion.div>
            </motion.div>

            {/* Typography Reveal - Scene 4 */}
            <div className="mt-8 flex flex-col items-center text-center">
              {/* Brand Name Mask Reveal */}
              <div className="overflow-hidden py-1">
                <motion.h1
                  className="text-primary font-black text-2xl sm:text-4xl md:text-5xl tracking-tighter italic"
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                  transition={{
                    delay: 1.8,
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  AFRICAN BOY
                </motion.h1>
              </div>

              {/* Gold Divider Line */}
              <motion.div
                className="h-[1px] bg-gradient-to-r from-transparent via-primary/80 to-transparent my-2"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 140, opacity: 1 }}
                transition={{ delay: 2.1, duration: 0.4, ease: 'easeOut' }}
              />

              {/* Subtitle Mask Reveal */}
              <div className="overflow-hidden py-0.5">
                <motion.p
                  className="text-muted-foreground text-[10px] sm:text-xs font-bold tracking-[0.4em] uppercase"
                  initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0 }}
                  animate={shouldReduceMotion ? { opacity: 1 } : { y: '0%', opacity: 1 }}
                  transition={{
                    delay: 2.2,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onAnimationComplete={() => {
                    // Trigger completion after the typography sequence completes naturally
                    setTimeout(onComplete, 200);
                  }}
                >
                  THE MOVEMENT
                </motion.p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

