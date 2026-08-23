import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import africanBoyLogo from '@/assets/african-boy-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  show: boolean;
}

const BRAND = 'AFRICAN BOY';
const TAGLINE = 'THE MOVEMENT';

export default function SplashScreen({ onComplete, show }: SplashScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [typed, setTyped] = useState(0);
  const [taglineTyped, setTaglineTyped] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typewriter brand reveal, then tagline, then complete
  useEffect(() => {
    if (!show) return;
    if (shouldReduceMotion) {
      setTyped(BRAND.length);
      setTaglineTyped(TAGLINE.length);
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }

    const timers: number[] = [];
    const brandStart = 1500;
    const brandStep = 55;

    BRAND.split('').forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setTyped(i + 1), brandStart + i * brandStep)
      );
    });

    const taglineStart = brandStart + BRAND.length * brandStep + 220;
    const taglineStep = 45;
    TAGLINE.split('').forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setTaglineTyped(i + 1), taglineStart + i * taglineStep)
      );
    });

    timers.push(
      window.setTimeout(onComplete, taglineStart + TAGLINE.length * taglineStep + 450)
    );

    return () => timers.forEach(clearTimeout);
  }, [show, shouldReduceMotion, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          onMouseMove={(e) => {
            if (isMobile || shouldReduceMotion) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;
            setMousePos({ x, y });
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black select-none pointer-events-auto"
          initial={{ opacity: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  scale: 1.08,
                  filter: 'blur(6px)',
                  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                }
          }
        >
          {/* Atmospheric fog layers */}
          {!shouldReduceMotion && (
            <>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 50% at 30% 60%, hsl(43 96% 49% / 0.10) 0%, transparent 70%)',
                }}
                initial={{ opacity: 0, x: '-8%' }}
                animate={{ opacity: [0, 0.9, 0.6], x: ['-8%', '6%'] }}
                transition={{ duration: 4, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 55% 45% at 70% 40%, hsl(0 0% 100% / 0.05) 0%, transparent 70%)',
                }}
                initial={{ opacity: 0, x: '6%' }}
                animate={{ opacity: [0, 0.8, 0.5], x: ['6%', '-6%'] }}
                transition={{ duration: 4.4, ease: 'easeInOut' }}
              />
            </>
          )}

          {/* Volumetric light rays */}
          {!shouldReduceMotion && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[-28, -14, 0, 14, 28].map((angle, i) => (
                <motion.div
                  key={angle}
                  className="absolute top-[-40%] left-1/2 h-[180%] w-[8vw] origin-top"
                  style={{
                    rotate: angle,
                    x: '-50%',
                    background:
                      'linear-gradient(to bottom, hsl(43 96% 60% / 0.22) 0%, transparent 80%)',
                    filter: 'blur(14px)',
                  }}
                  initial={{ opacity: 0, scaleY: 0.6 }}
                  animate={{ opacity: [0, 0.9, 0.35], scaleY: [0.6, 1, 1] }}
                  transition={{ delay: 0.15 + i * 0.09, duration: 2.4, ease: 'easeOut' }}
                />
              ))}
            </div>
          )}

          {/* Ambient center glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at center, hsl(43 96% 49% / 0.16) 0%, transparent 62%)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0.85], scale: [0.8, 1.25, 1] }}
            transition={{ duration: 2.8, ease: 'easeOut' }}
          />

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_38%,_black_100%)] opacity-90" />

          {/* Letterbox framing bars */}
          <motion.div
            className="absolute top-0 left-0 right-0 bg-black z-30 pointer-events-none"
            initial={{ height: '18vh' }}
            animate={{ height: shouldReduceMotion ? '8vh' : ['18vh', '8vh'] }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-black z-30 pointer-events-none"
            initial={{ height: '18vh' }}
            animate={{ height: shouldReduceMotion ? '8vh' : ['18vh', '8vh'] }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Central composition */}
          <div className="relative flex flex-col items-center justify-center z-20 px-4">
            <motion.div
              style={{
                rotateX: isMobile || shouldReduceMotion ? 0 : mousePos.y * -4,
                rotateY: isMobile || shouldReduceMotion ? 0 : mousePos.x * 4,
                x: isMobile || shouldReduceMotion ? 0 : mousePos.x * 5,
                y: isMobile || shouldReduceMotion ? 0 : mousePos.y * 5,
              }}
              className="relative transition-transform duration-200 ease-out"
            >
              {/* Shockwave rings on slam impact */}
              {!shouldReduceMotion && (
                <>
                  {[0, 0.14].map((d, i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border border-primary/60 pointer-events-none"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: [0, 0.85, 0], scale: [0.9, 2.2] }}
                      transition={{ delay: 1.05 + d, duration: 1.1, ease: 'easeOut' }}
                    />
                  ))}
                </>
              )}

              {/* Zoom-slam logo with focal shift */}
              <motion.div
                className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 rounded-full overflow-hidden bg-black shadow-[0_0_60px_hsl(43_96%_49%_/_0.35),0_0_140px_hsl(43_96%_49%_/_0.15)] border border-primary/25"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 2.6, filter: 'blur(28px)' }
                }
                animate={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : {
                        opacity: 1,
                        scale: [2.6, 0.94, 1.02, 1],
                        filter: ['blur(28px)', 'blur(4px)', 'blur(0px)'],
                      }
                }
                transition={{
                  delay: 0.35,
                  duration: 1.05,
                  times: [0, 0.68, 0.86, 1],
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <img
                  src={africanBoyLogo}
                  alt="African Boy"
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Anamorphic lens flare sweep */}
                {!shouldReduceMotion && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(110deg, transparent 32%, hsl(43 96% 88% / 0.75) 50%, transparent 68%)',
                    }}
                    initial={{ x: '-130%' }}
                    animate={{ x: '170%' }}
                    transition={{ delay: 1.25, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </motion.div>

              {/* Horizontal anamorphic streak across the logo */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute top-1/2 left-1/2 h-[2px] w-[180%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to right, transparent, hsl(43 96% 80% / 0.9), transparent)',
                    filter: 'blur(2px)',
                  }}
                  initial={{ opacity: 0, scaleX: 0.2 }}
                  animate={{ opacity: [0, 1, 0], scaleX: [0.2, 1.1, 1.3] }}
                  transition={{ delay: 1.1, duration: 0.8, ease: 'easeOut' }}
                />
              )}
            </motion.div>

            {/* Typewriter typography */}
            <div className="mt-8 flex flex-col items-center text-center">
              <h1 className="text-primary font-black text-2xl sm:text-4xl md:text-5xl tracking-tighter italic min-h-[1.2em]">
                {BRAND.slice(0, typed)}
                {typed > 0 && typed < BRAND.length && (
                  <span className="ml-0.5 inline-block w-[2px] h-[0.9em] align-middle bg-primary animate-pulse" />
                )}
              </h1>

              <motion.div
                className="h-[1px] bg-gradient-to-r from-transparent via-primary/80 to-transparent my-3"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: typed >= BRAND.length ? 160 : 0, opacity: typed >= BRAND.length ? 1 : 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              />

              <p className="text-muted-foreground text-[10px] sm:text-xs font-bold tracking-[0.4em] uppercase min-h-[1.2em]">
                {TAGLINE.slice(0, taglineTyped)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
