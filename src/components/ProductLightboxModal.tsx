import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../lib/scrollLock';

interface ProductLightboxModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  productName: string;
  onClose: () => void;
}

export default function ProductLightboxModal({
  isOpen,
  images,
  initialIndex = 0,
  productName,
  onClose,
}: ProductLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
    setPanPosition({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  const handlePrev = useCallback(() => {
    setIsZoomed(false);
    setPanPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setIsZoomed(false);
    setPanPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Lock body scroll while open (ref-counted, shared with the product modal)
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, handlePrev, handleNext, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const toggleZoom = () => {
    if (isZoomed) {
      setIsZoomed(false);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setIsZoomed(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isZoomed) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl select-none overflow-hidden">
        {/* Top Control Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full p-4 sm:p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent"
        >
          <div>
            <span className="text-primary text-[10px] font-black tracking-widest uppercase block">
              AFRICAN BOY GALLERY
            </span>
            <h3 className="text-white font-black text-sm sm:text-base italic uppercase tracking-wider line-clamp-1">
              {productName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Toggle */}
            <button
              onClick={toggleZoom}
              aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
              className="p-3 bg-white/10 hover:bg-primary hover:text-black text-white rounded-full transition-all border border-white/10"
              title={isZoomed ? 'Reset Zoom' : 'Zoom In'}
            >
              {isZoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            </button>

            {isZoomed && (
              <button
                onClick={() => setPanPosition({ x: 0, y: 0 })}
                aria-label="Reset Pan Position"
                className="p-3 bg-white/10 hover:bg-primary hover:text-black text-white rounded-full transition-all border border-white/10"
                title="Reset Position"
              >
                <RotateCcw size={18} />
              </button>
            )}

            {/* Close Lightbox */}
            <button
              onClick={onClose}
              aria-label="Close fullscreen view"
              className="p-3 bg-primary text-black hover:bg-white rounded-full transition-all shadow-lg border border-primary/20"
            >
              <X size={20} />
            </button>
          </div>
        </motion.div>

        {/* Center Main Display Area */}
        <div
          className={`relative flex-1 w-full flex items-center justify-center p-4 sm:p-8 overflow-hidden ${
            isZoomed ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
          }`}
          onClick={(e) => {
            // Only toggle zoom if clicking directly on container/image without dragging
            if (!isDragging && e.target === e.currentTarget) {
              toggleZoom();
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Previous Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous image"
              className="absolute left-3 sm:left-6 z-20 p-3 sm:p-4 bg-black/60 hover:bg-primary hover:text-black text-white rounded-full border border-white/20 transition-all shadow-2xl backdrop-blur-md"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Large Uncropped Image */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: isZoomed ? 2.5 : 1,
              x: panPosition.x,
              y: panPosition.y,
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full h-full flex items-center justify-center pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              toggleZoom();
            }}
          >
            <img
              src={currentImage}
              alt={`${productName} view ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain shadow-2xl rounded-2xl select-none"
              draggable={false}
              referrerPolicy="no-referrer"
            />
          </motion.div>

          {/* Next Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next image"
              className="absolute right-3 sm:right-6 z-20 p-3 sm:p-4 bg-black/60 hover:bg-primary hover:text-black text-white rounded-full border border-white/20 transition-all shadow-2xl backdrop-blur-md"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Bottom Bar: Image Count & Indicator Thumbnails */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full p-4 flex flex-col items-center gap-3 z-20 bg-gradient-to-t from-black/90 to-transparent"
        >
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-full px-4 py-1 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsZoomed(false);
                    setPanPosition({ x: 0, y: 0 });
                    setCurrentIndex(idx);
                  }}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    idx === currentIndex
                      ? 'border-primary scale-110 shadow-[0_0_12px_hsl(43,96%,49%,0.8)]'
                      : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="text-[11px] font-black uppercase tracking-widest text-primary bg-black/70 px-4 py-1.5 rounded-full border border-primary/20">
            {images.length > 1 ? `IMAGE ${currentIndex + 1} OF ${images.length}` : 'FULL INSPECTION'}
            {isZoomed ? ' • ZOOMED 2.5X (DRAG TO PAN)' : ' • TAP TO ZOOM'}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
