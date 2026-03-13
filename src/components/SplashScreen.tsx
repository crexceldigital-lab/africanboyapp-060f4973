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
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Radial glow pulse behind logo */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(43 96% 49% / 0.15) 0%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2.5, 1.2],
              opacity: [0, 0.8, 0.4],
            }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
          />

          {/* Logo container */}
          <motion.div
            className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden bg-black"
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{
              scale: [0, 1.3, 0.9, 1.05, 1],
              rotate: [-180, 10, -5, 2, 0],
              opacity: [0, 1, 1, 1, 1],
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.4, 0.65, 0.85, 1],
              ease: 'easeOut',
            }}
            style={{
              boxShadow: '0 0 60px hsl(43 96% 49% / 0.4), 0 0 120px hsl(43 96% 49% / 0.15)',
            }}
            onAnimationComplete={onComplete}
          >
            <img
              src={africanBoyLogo}
              alt="African Boy"
              className="w-full h-full object-cover pointer-events-none"
            />
          </motion.div>

          {/* Brand text reveal */}
          <motion.div
            className="absolute bottom-[25%] flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: [0, 0, 1], y: [30, 30, 0] }}
            transition={{ duration: 2.5, times: [0, 0.5, 0.8], ease: 'easeOut' }}
          >
            <span className="text-primary font-black text-2xl tracking-tighter italic">
              AFRICAN BOY
            </span>
            <motion.div
              className="h-[1px] bg-primary/40"
              initial={{ width: 0 }}
              animate={{ width: 120 }}
              transition={{ delay: 1.8, duration: 0.6, ease: 'easeOut' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
