import { motion, AnimatePresence } from 'framer-motion';
import africanBoyLogo from '@/assets/african-boy-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
  show: boolean;
}

export default function SplashScreen({ onComplete, show }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{ background: '#000' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Cinematic letterbox bars */}
          <motion.div
            className="absolute top-0 left-0 right-0 bg-black z-50"
            initial={{ height: '50%' }}
            animate={{ height: ['50%', '12%'] }}
            transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-black z-50"
            initial={{ height: '50%' }}
            animate={{ height: ['50%', '12%'] }}
            transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Volumetric light rays */}
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * 360;
            return (
              <motion.div
                key={`ray-${i}`}
                className="absolute origin-center"
                style={{
                  width: '2px',
                  height: '600px',
                  background: `linear-gradient(to top, hsl(43 96% 49% / 0.15), transparent)`,
                  transform: `rotate(${angle}deg)`,
                  top: '50%',
                  left: '50%',
                  marginLeft: '-1px',
                  marginTop: '-300px',
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{
                  scaleY: [0, 1.5, 0.8],
                  opacity: [0, 0.6, 0.15],
                }}
                transition={{ delay: 0.8, duration: 2, ease: 'easeOut' }}
              />
            );
          })}

          {/* Deep atmospheric fog */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, hsl(43 96% 49% / 0.08) 0%, transparent 60%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 4], opacity: [0, 1] }}
            transition={{ delay: 0.5, duration: 2.5, ease: 'easeOut' }}
          />

          {/* Flash impact */}
          <motion.div
            className="absolute inset-0 bg-primary z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.7, 0] }}
            transition={{ duration: 1.5, times: [0, 0.45, 0.5, 0.7], ease: 'easeOut' }}
          />

          {/* Shockwave rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`shock-${i}`}
              className="absolute rounded-full border border-primary/20"
              initial={{ width: 0, height: 0, opacity: 0 }}
              animate={{
                width: [0, 600 + i * 300],
                height: [0, 600 + i * 300],
                opacity: [0.6, 0],
              }}
              transition={{ delay: 0.8 + i * 0.15, duration: 1.5, ease: 'easeOut' }}
            />
          ))}

          {/* Ember particles */}
          {[...Array(20)].map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 150 + Math.random() * 250;
            const size = 1 + Math.random() * 3;
            return (
              <motion.div
                key={`ember-${i}`}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: `hsl(${40 + Math.random() * 10} 96% ${50 + Math.random() * 30}%)`,
                  boxShadow: `0 0 ${size * 3}px hsl(43 96% 49% / 0.6)`,
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: [0, Math.cos(angle) * dist * 0.4, Math.cos(angle) * dist],
                  y: [0, Math.sin(angle) * dist * 0.4 - 30, Math.sin(angle) * dist - 80],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  delay: 0.7 + Math.random() * 0.3,
                  duration: 1.5 + Math.random() * 0.5,
                  ease: 'easeOut',
                }}
              />
            );
          })}

          {/* Logo — cinematic zoom-slam from deep */}
          <motion.div
            className="relative z-30"
            initial={{ scale: 5, opacity: 0, filter: 'blur(30px)' }}
            animate={{
              scale: [5, 1.2, 0.9, 1.05, 1],
              opacity: [0, 1, 1, 1, 1],
              filter: ['blur(30px)', 'blur(2px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
            }}
            transition={{
              duration: 2,
              times: [0, 0.35, 0.55, 0.8, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={onComplete}
          >
            <motion.div
              className="w-52 h-52 md:w-72 md:h-72 rounded-full overflow-hidden bg-black"
              animate={{
                boxShadow: [
                  '0 0 0px hsl(43 96% 49% / 0), 0 0 0px hsl(43 96% 49% / 0)',
                  '0 0 100px hsl(43 96% 49% / 0.6), 0 0 200px hsl(43 96% 49% / 0.3)',
                  '0 0 60px hsl(43 96% 49% / 0.4), 0 0 120px hsl(43 96% 49% / 0.15)',
                ],
              }}
              transition={{ duration: 2.5, times: [0, 0.4, 1], ease: 'easeOut' }}
            >
              <img
                src={africanBoyLogo}
                alt="African Boy"
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Anamorphic lens flare sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, hsl(43 96% 85% / 0.5) 48%, hsl(43 96% 95% / 0.3) 52%, transparent 70%)',
                }}
                initial={{ x: '-150%' }}
                animate={{ x: ['−150%', '250%'] }}
                transition={{ delay: 1.8, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
          </motion.div>

          {/* Brand text — typewriter reveal */}
          <motion.div
            className="absolute bottom-[18%] flex flex-col items-center gap-3 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
          >
            <div className="overflow-hidden">
              <motion.span
                className="block text-primary font-black text-3xl md:text-5xl tracking-tighter italic"
                initial={{ y: '120%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 1.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                AFRICAN BOY
              </motion.span>
            </div>

            <motion.div
              className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.4, ease: 'easeOut' }}
            />

            <div className="overflow-hidden">
              <motion.span
                className="block text-muted-foreground text-[10px] font-bold tracking-[0.5em] uppercase"
                initial={{ y: '120%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 2.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                The Movement
              </motion.span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
