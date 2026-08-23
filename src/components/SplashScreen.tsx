import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import africanBoyLogo from '@/assets/african-boy-logo.png';
import { useSplashAudio } from '@/hooks/useSplashAudio';


interface SplashScreenProps {
  onComplete: () => void;
  show: boolean;
}

const BRAND = 'AFRICAN BOY';
const TAGLINE = 'THE MOVEMENT';

/* ---- Cinematic timeline (ms) ---- */
const T = {
  raysIn: 300,
  logoSlam: 1500,
  flare: 2350,
  brandStart: 2900,
  brandStep: 85,
  taglineGap: 340,
  taglineStep: 60,
  total: 8000,
};

export default function SplashScreen({ onComplete, show }: SplashScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [typed, setTyped] = useState(0);
  const [taglineTyped, setTaglineTyped] = useState(0);
  const [impact, setImpact] = useState(false);
  const [done, setDone] = useState(false);

  const { muted, toggleMuted, blocked, tick, unlock, stop: stopAudio } =
    useSplashAudio(show && !shouldReduceMotion, T.total);

  const finish = useCallback(() => {
    setDone((d) => {
      if (!d) {
        stopAudio();
        onComplete();
      }
      return true;
    });
  }, [onComplete, stopAudio]);

  // Typewriter tick SFX
  useEffect(() => {
    if (typed > 0) tick();
  }, [typed, tick]);
  useEffect(() => {
    if (taglineTyped > 0) tick();
  }, [taglineTyped, tick]);


  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /* Embers / dust motes — deterministic per mount */
  const embers = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        size: 1.5 + ((i * 13) % 5),
        delay: (i % 9) * 0.45,
        duration: 6 + ((i * 7) % 5),
        drift: ((i % 5) - 2) * 26,
        opacity: 0.25 + ((i % 4) * 0.18),
      })),
    []
  );

  /* Sequencer */
  useEffect(() => {
    if (!show) return;

    if (shouldReduceMotion) {
      setTyped(BRAND.length);
      setTaglineTyped(TAGLINE.length);
      const t = window.setTimeout(finish, 1200);
      return () => clearTimeout(t);
    }

    const timers: number[] = [];

    timers.push(window.setTimeout(() => setImpact(true), T.logoSlam + 620));

    BRAND.split('').forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setTyped(i + 1), T.brandStart + i * T.brandStep)
      );
    });

    const taglineStart =
      T.brandStart + BRAND.length * T.brandStep + T.taglineGap;
    TAGLINE.split('').forEach((_, i) => {
      timers.push(
        window.setTimeout(
          () => setTaglineTyped(i + 1),
          taglineStart + i * T.taglineStep
        )
      );
    });

    timers.push(window.setTimeout(finish, T.total));

    return () => timers.forEach(clearTimeout);
  }, [show, shouldReduceMotion, finish]);

  const brandDone = typed >= BRAND.length;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="presentation"
          onMouseMove={(e) => {
            if (isMobile || shouldReduceMotion) return;
            setMousePos({
              x: (e.clientX / window.innerWidth - 0.5) * 2,
              y: (e.clientY / window.innerHeight - 0.5) * 2,
            });
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black select-none pointer-events-auto cursor-pointer"
          onClick={finish}
          initial={{ opacity: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  scale: 1.14,
                  filter: 'blur(10px)',
                  transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
                }
          }
        >
          {/* Deep base wash — cold night into warm gold */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 90% 70% at 50% 55%, hsl(38 60% 18% / 0.55) 0%, hsl(0 0% 0%) 72%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 1] }}
            transition={{ duration: 3.2, ease: 'easeOut' }}
          />

          {!shouldReduceMotion && (
            <>
              {/* Drifting atmospheric fog */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 55% 45% at 28% 62%, hsl(43 96% 52% / 0.13) 0%, transparent 70%)',
                  filter: 'blur(30px)',
                }}
                initial={{ opacity: 0, x: '-10%' }}
                animate={{ opacity: [0, 0.95, 0.55, 0.8], x: ['-10%', '10%'] }}
                transition={{ duration: T.total / 1000, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 50% 40% at 74% 38%, hsl(0 0% 100% / 0.06) 0%, transparent 70%)',
                  filter: 'blur(36px)',
                }}
                initial={{ opacity: 0, x: '8%' }}
                animate={{ opacity: [0, 0.8, 0.45, 0.7], x: ['8%', '-9%'] }}
                transition={{ duration: T.total / 1000, ease: 'easeInOut' }}
              />

              {/* Volumetric god rays, slow sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                animate={{ rotate: [-4, 4] }}
                transition={{ duration: T.total / 1000, ease: 'easeInOut' }}
              >
                {[-34, -20, -7, 7, 20, 34].map((angle, i) => (
                  <motion.div
                    key={angle}
                    className="absolute top-[-45%] left-1/2 h-[190%] w-[7vw] origin-top"
                    style={{
                      rotate: angle,
                      x: '-50%',
                      background:
                        'linear-gradient(to bottom, hsl(43 96% 62% / 0.20) 0%, transparent 78%)',
                      filter: 'blur(16px)',
                    }}
                    initial={{ opacity: 0, scaleY: 0.5 }}
                    animate={{
                      opacity: [0, 0.85, 0.3, 0.5],
                      scaleY: [0.5, 1, 1, 1],
                    }}
                    transition={{
                      delay: T.raysIn / 1000 + i * 0.12,
                      duration: 5.4,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </motion.div>

              {/* Floating embers / dust */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {embers.map((e) => (
                  <motion.span
                    key={e.id}
                    className="absolute bottom-[-6%] rounded-full bg-primary"
                    style={{
                      left: `${e.left}%`,
                      width: e.size,
                      height: e.size,
                      filter: 'blur(0.6px)',
                      boxShadow: '0 0 8px hsl(43 96% 60% / 0.9)',
                    }}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{
                      opacity: [0, e.opacity, e.opacity, 0],
                      y: ['0vh', '-108vh'],
                      x: [0, e.drift],
                    }}
                    transition={{
                      delay: e.delay,
                      duration: e.duration,
                      ease: 'easeOut',
                      repeat: Infinity,
                    }}
                  />
                ))}
              </div>

              {/* Film grain */}
              <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.16]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
                }}
              />

              {/* Projector flicker */}
              <motion.div
                className="absolute inset-0 pointer-events-none bg-white/[0.03]"
                animate={{ opacity: [0.2, 0.55, 0.15, 0.4, 0.2] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
              />
            </>
          )}

          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_36%,_black_100%)] opacity-95" />

          {/* Letterbox bars */}
          <motion.div
            className="absolute top-0 left-0 right-0 bg-black z-30 pointer-events-none"
            initial={{ height: '50vh' }}
            animate={{ height: shouldReduceMotion ? '9vh' : ['50vh', '9vh'] }}
            transition={{ duration: 2.1, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-black z-30 pointer-events-none"
            initial={{ height: '50vh' }}
            animate={{ height: shouldReduceMotion ? '9vh' : ['50vh', '9vh'] }}
            transition={{ duration: 2.1, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Impact white flash */}
          {!shouldReduceMotion && (
            <motion.div
              className="absolute inset-0 z-40 pointer-events-none bg-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.55, 0] }}
              transition={{
                delay: (T.logoSlam + 560) / 1000,
                duration: 0.5,
                ease: 'easeOut',
              }}
            />
          )}

          {/* Central composition */}
          <motion.div
            className="relative flex flex-col items-center justify-center z-20 px-6"
            animate={
              shouldReduceMotion
                ? {}
                : { x: impact ? [0, -6, 5, -3, 0] : 0, y: impact ? [0, 4, -4, 2, 0] : 0 }
            }
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <motion.div
              style={{
                rotateX: isMobile || shouldReduceMotion ? 0 : mousePos.y * -7,
                rotateY: isMobile || shouldReduceMotion ? 0 : mousePos.x * 7,
                x: isMobile || shouldReduceMotion ? 0 : mousePos.x * 10,
                y: isMobile || shouldReduceMotion ? 0 : mousePos.y * 10,
              }}
              className="relative transition-transform duration-300 ease-out [transform-style:preserve-3d]"
            >
              {/* Shockwave rings */}
              {!shouldReduceMotion &&
                [0, 0.16, 0.34].map((d, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-primary/50 pointer-events-none"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: [0, 0.8, 0], scale: [0.92, 2.6] }}
                    transition={{
                      delay: (T.logoSlam + 540) / 1000 + d,
                      duration: 1.5,
                      ease: 'easeOut',
                    }}
                  />
                ))}

              {/* Slow orbiting halo */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute -inset-8 rounded-full pointer-events-none"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0%, hsl(43 96% 60% / 0.35) 18%, transparent 40%, transparent 100%)',
                    filter: 'blur(22px)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.9], rotate: 360 }}
                  transition={{
                    opacity: { delay: 1.9, duration: 1.2 },
                    rotate: { duration: 9, repeat: Infinity, ease: 'linear' },
                  }}
                />
              )}

              {/* Logo — zoom slam with focal shift + breathing */}
              <motion.div
                className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-[19rem] md:h-[19rem] rounded-full overflow-hidden bg-black border border-primary/25 shadow-[0_0_70px_hsl(43_96%_49%_/_0.4),0_0_180px_hsl(43_96%_49%_/_0.18)]"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 3.2, filter: 'blur(34px)' }
                }
                animate={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : {
                        opacity: 1,
                        scale: [3.2, 0.9, 1.04, 1, 1.015, 1],
                        filter: [
                          'blur(34px)',
                          'blur(6px)',
                          'blur(0px)',
                          'blur(0px)',
                          'blur(0px)',
                          'blur(0px)',
                        ],
                      }
                }
                transition={{
                  delay: T.logoSlam / 1000,
                  duration: 5.2,
                  times: [0, 0.11, 0.15, 0.2, 0.6, 1],
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <img
                  src={africanBoyLogo}
                  alt="African Boy"
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* Anamorphic flare sweeps */}
                {!shouldReduceMotion &&
                  [T.flare, T.flare + 2600].map((d, i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(112deg, transparent 34%, hsl(43 96% 90% / 0.7) 50%, transparent 66%)',
                      }}
                      initial={{ x: '-140%' }}
                      animate={{ x: '175%' }}
                      transition={{
                        delay: d / 1000,
                        duration: 0.95,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  ))}

                {/* Inner rim light */}
                <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_60px_hsl(43_96%_60%_/_0.25)]" />
              </motion.div>

              {/* Horizontal anamorphic streak */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute top-1/2 left-1/2 h-[2px] w-[210%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(to right, transparent, hsl(43 96% 85% / 0.95), transparent)',
                    filter: 'blur(2.5px)',
                  }}
                  initial={{ opacity: 0, scaleX: 0.15 }}
                  animate={{ opacity: [0, 1, 0], scaleX: [0.15, 1.15, 1.4] }}
                  transition={{
                    delay: (T.logoSlam + 560) / 1000,
                    duration: 1,
                    ease: 'easeOut',
                  }}
                />
              )}
            </motion.div>

            {/* Typography */}
            <div className="mt-9 flex flex-col items-center text-center">
              <h1 className="text-primary font-black text-3xl sm:text-4xl md:text-6xl tracking-tighter italic min-h-[1.2em] drop-shadow-[0_0_28px_hsl(43_96%_49%_/_0.55)]">
                {BRAND.slice(0, typed)}
                {typed > 0 && !brandDone && (
                  <span className="ml-1 inline-block w-[3px] h-[0.85em] align-middle bg-primary animate-pulse" />
                )}
              </h1>

              <motion.div
                className="h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent my-4"
                initial={{ width: 0, opacity: 0 }}
                animate={{
                  width: brandDone ? 210 : 0,
                  opacity: brandDone ? 1 : 0,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />

              <p className="text-foreground/70 text-[11px] sm:text-sm font-bold tracking-[0.5em] uppercase min-h-[1.2em]">
                {TAGLINE.slice(0, taglineTyped)}
              </p>
            </div>
          </motion.div>

          {/* Progress + skip */}
          {!shouldReduceMotion && (
            <div className="absolute bottom-[4vh] left-0 right-0 z-40 flex flex-col items-center gap-3 px-8">
              <motion.div
                className="h-[2px] w-40 sm:w-56 overflow-hidden rounded-full bg-foreground/15"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: T.total / 1000, ease: 'linear' }}
                />
              </motion.div>
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  finish();
                }}
                className="text-foreground/45 hover:text-primary transition-colors text-[9px] font-bold tracking-[0.35em] uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 0.8 }}
              >
                Tap to enter
              </motion.button>
            </div>
          )}

        </motion.div>
      )}
    </AnimatePresence>
  );
}
