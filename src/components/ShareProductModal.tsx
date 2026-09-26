import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Camera,
  Send,
  Facebook,
  Sparkles,
} from 'lucide-react';
import { Product } from '../types';
import { useCountry } from '../context/CountryContext';
import {
  getProductCanonicalUrl,
  shareToWhatsApp,
  shareToFacebook,
  shareToX,
  copyProductLink,
  shareNative,
  shareToInstagramStory,
  shareToInstagramDirect,
} from '../lib/shareUtils';
import { lockBodyScroll, unlockBodyScroll } from '../lib/scrollLock';

interface ShareProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareProductModal({ product, isOpen, onClose }: ShareProductModalProps) {
  const { formatPrice } = useCountry();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [hasNativeShare, setHasNativeShare] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'share' in navigator) {
      setHasNativeShare(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setToastMessage(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const effectivePrice = product.on_sale
    ? Math.round(product.price - (product.price * (product.discount_percent || 10)) / 100)
    : product.sale_price
    ? Number(product.sale_price)
    : product.price;

  const formattedPrice = formatPrice(effectivePrice);
  const canonicalUrl = getProductCanonicalUrl(product);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  };

  const handleCopyLink = async () => {
    const success = await copyProductLink({ product, formattedPrice });
    if (success) {
      setCopied(true);
      showToast('✓ Product link copied');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsApp = async () => {
    await shareToWhatsApp({ product, formattedPrice });
    onClose();
  };

  const handleInstagramStory = async () => {
    const res = await shareToInstagramStory({ product, formattedPrice });
    if (!res.isMobileNative) {
      showToast('Product link copied. Open Instagram and paste it into your Story.');
    } else {
      onClose();
    }
  };

  const handleInstagramDirect = async () => {
    await shareToInstagramDirect({ product, formattedPrice });
    showToast('Product link copied. Open Instagram and paste it into your Direct Message.');
  };

  const handleFacebook = async () => {
    await shareToFacebook({ product, formattedPrice });
    onClose();
  };

  const handleX = async () => {
    await shareToX({ product, formattedPrice });
    onClose();
  };

  const handleNative = async () => {
    const shared = await shareNative({ product, formattedPrice });
    if (shared) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4">
        {/* Dark Glass Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal / Bottom Sheet Panel */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full sm:max-w-md bg-card border-t sm:border border-foreground/10 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden z-10 p-6 space-y-5 max-h-[90vh] flex flex-col justify-between"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
            <div className="flex items-center gap-2">
              <Share2 className="text-primary w-5 h-5" />
              <h3 className="text-base font-black italic uppercase tracking-wider text-foreground">
                SHARE <span className="text-primary">PRODUCT</span>
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close share menu"
              className="p-2 hover:bg-foreground/10 rounded-full text-muted-foreground hover:text-foreground transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Product Info Preview Box */}
          <div className="flex items-center gap-3.5 p-3 bg-neutral-950/80 border border-foreground/10 rounded-2xl">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-14 h-14 object-contain rounded-xl bg-black/50 p-1 border border-foreground/10 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-xs text-foreground truncate">{product.name}</h4>
              <p className="text-xs font-mono font-black text-primary mt-0.5">{formattedPrice}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5 opacity-70">
                {canonicalUrl}
              </p>
            </div>
          </div>

          {/* Toast Banner Notice if Active */}
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 bg-primary text-black rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles size={14} className="shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}

          {/* Social Platforms Grid / Options List */}
          <div className="grid grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto no-scrollbar py-1">
            {/* 🟢 WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center gap-3 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <MessageCircle size={18} />
              </div>
              <div>
                <span className="font-black text-xs block leading-tight">WhatsApp</span>
                <span className="text-[9px] text-emerald-400/80 font-bold uppercase tracking-wider">Direct Chat</span>
              </div>
            </button>

            {/* 📸 Instagram Story */}
            <button
              onClick={handleInstagramStory}
              className="p-3.5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 rounded-2xl flex items-center gap-3 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0 group-hover:scale-110 transition-transform">
                <Camera size={18} />
              </div>
              <div>
                <span className="font-black text-xs block leading-tight">Instagram Story</span>
                <span className="text-[9px] text-pink-400/80 font-bold uppercase tracking-wider">Story Share</span>
              </div>
            </button>

            {/* 💬 Instagram Direct */}
            <button
              onClick={handleInstagramDirect}
              className="p-3.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-2xl flex items-center gap-3 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-110 transition-transform">
                <Send size={18} />
              </div>
              <div>
                <span className="font-black text-xs block leading-tight">Instagram DM</span>
                <span className="text-[9px] text-purple-400/80 font-bold uppercase tracking-wider">Direct Message</span>
              </div>
            </button>

            {/* 🟦 Facebook */}
            <button
              onClick={handleFacebook}
              className="p-3.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center gap-3 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <Facebook size={18} />
              </div>
              <div>
                <span className="font-black text-xs block leading-tight">Facebook</span>
                <span className="text-[9px] text-blue-400/80 font-bold uppercase tracking-wider">Post & Feed</span>
              </div>
            </button>

            {/* 𝕏 X (Twitter) */}
            <button
              onClick={handleX}
              className="p-3.5 bg-foreground/10 hover:bg-foreground/20 border border-foreground/20 text-foreground rounded-2xl flex items-center gap-3 transition-all group text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-foreground/15 flex items-center justify-center text-foreground shrink-0 font-black text-sm group-hover:scale-110 transition-transform">
                𝕏
              </div>
              <div>
                <span className="font-black text-xs block leading-tight">X / Twitter</span>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Tweet Product</span>
              </div>
            </button>

            {/* 📋 Copy Link */}
            <button
              onClick={handleCopyLink}
              className={`p-3.5 border rounded-2xl flex items-center gap-3 transition-all group text-left ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${
                copied ? 'bg-emerald-500/30 text-emerald-400' : 'bg-primary/20 text-primary'
              }`}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </div>
              <div>
                <span className="font-black text-xs block leading-tight">{copied ? 'Copied!' : 'Copy Link'}</span>
                <span className="text-[9px] opacity-80 font-bold uppercase tracking-wider">Clipboard</span>
              </div>
            </button>
          </div>

          {/* More / Native Share (if supported) */}
          {hasNativeShare && (
            <button
              onClick={handleNative}
              className="w-full py-3 bg-secondary hover:bg-foreground/10 border border-foreground/10 text-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink size={14} /> MORE / NATIVE SHARE
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
