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
          className="fixed inset-0 z-[9999] bg-background flex items-center justify-center overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Cinematic horizontal light streak */}
          <motion.div
            className="absolute h-[2px] top-1/2 -translate-y-1/2"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(43 96% 49%), transparent)' }}
            initial={{ width: 0, opacity: 0, left: '50%', x: '-50%' }}
            animate={{
              width: ['0%', '120%', '60%', '0%'],
              opacity: [0, 1, 0.6, 0],
            }}
            transition={{ duration: 1.2, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' }}
          />

          {/* Shockwave ring 1 */}
          <motion.div
            className="absolute rounded-full border border-primary/30"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: [0, 800],
              height: [0, 800],
              opacity: [0.8, 0],
            }}
            transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
          />

          {/* Shockwave ring 2 */}
          <motion.div
            className="absolute rounded-full border border-primary/20"
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={{
              width: [0, 1200],
              height: [0, 1200],
              opacity: [0.5, 0],
            }}
            transition={{ delay: 0.8, duration: 1.4, ease: 'easeOut' }}
          />

          {/* Deep radial glow explosion */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(43 96% 49% / 0.3) 0%, hsl(43 96% 49% / 0.05) 40%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 3, 1.5],
              opacity: [0, 1, 0.3],
            }}
            transition={{ delay: 0.5, duration: 2, ease: 'easeOut' }}
          />

          {/* Particle dots */}
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const distance = 200 + Math.random() * 100;
            return (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-primary"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{
                  x: [0, Math.cos(angle) * distance],
                  y: [0, Math.sin(angle) * distance],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{ delay: 0.7, duration: 1.2, ease: 'easeOut' }}
              />
            );
          })}

          {/* Logo container — drops from above, slams down, bounces */}
          <motion.div
            className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden bg-black"
            initial={{ scale: 0.3, y: -400, opacity: 0, rotate: -45 }}
            animate={{
              scale: [0.3, 1.4, 0.85, 1.1, 1],
              y: [-400, 20, -10, 5, 0],
              opacity: [0, 1, 1, 1, 1],
              rotate: [-45, 8, -4, 1, 0],
            }}
            transition={{
              duration: 2,
              times: [0, 0.35, 0.55, 0.75, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              boxShadow: '0 0 80px hsl(43 96% 49% / 0.5), 0 0 160px hsl(43 96% 49% / 0.2), inset 0 0 30px hsl(43 96% 49% / 0.1)',
            }}
            onAnimationComplete={onComplete}
          >
            <img
              src={africanBoyLogo}
              alt="African Boy"
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Shine sweep across logo */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, hsl(43 96% 80% / 0.4) 50%, transparent 60%)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ delay: 1.5, duration: 0.8, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Brand text — cinematic reveal */}
          <motion.div
            className="absolute bottom-[22%] flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{
              opacity: [0, 0, 1],
              y: [40, 40, 0],
              scale: [0.8, 0.8, 1],
            }}
            transition={{ duration: 2.5, times: [0, 0.55, 0.85], ease: 'easeOut' }}
          >
            <span className="text-primary font-black text-3xl md:text-4xl tracking-tighter italic">
              AFRICAN BOY
            </span>
            <motion.div
              className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 160, opacity: 1 }}
              transition={{ delay: 2, duration: 0.5, ease: 'easeOut' }}
            />
            <motion.span
              className="text-muted-foreground text-[10px] font-bold tracking-[0.4em] uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.5 }}
            >
              The Movement
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
