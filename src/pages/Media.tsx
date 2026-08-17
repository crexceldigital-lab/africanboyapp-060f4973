import { useState, useEffect } from 'react';
import { GalleryItem } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export default function Media() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      const { data } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setGallery(data as GalleryItem[]);
      setLoading(false);
    };
    fetchGallery();
  }, []);

  const goNext = () => {
    if (selectedIndex !== null) setSelectedIndex((selectedIndex + 1) % gallery.length);
  };
  const goPrev = () => {
    if (selectedIndex !== null) setSelectedIndex((selectedIndex - 1 + gallery.length) % gallery.length);
  };

  return (
    <div className="pb-28 pt-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <span className="text-primary text-xs font-bold tracking-widest uppercase">
            Exclusive Visuals
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter italic uppercase mt-1">
            Photo <span className="text-primary">Gallery</span>
          </h1>
        </div>
      </motion.div>

      {loading ? (
        <div className="text-center py-24 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
            Loading gallery...
          </p>
        </div>
      ) : gallery.length === 0 ? (
        <div className="text-center py-24 bg-card/40 rounded-3xl border border-foreground/5">
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">
            No gallery images yet
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {gallery.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-square bg-card border border-foreground/10 rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <img
                src={item.image_url}
                alt="Gallery"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Subtle dark vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-primary/30 text-primary text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 shadow-xl">
                  <Eye size={12} />
                  <span>View</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Lightbox Preview */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-6 right-6 z-10 p-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-full transition-all active:scale-95 border border-foreground/10"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            {/* Prev */}
            {gallery.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 z-10 p-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-full transition-all active:scale-95 border border-foreground/10"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Image Container */}
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-[92vw] max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={gallery[selectedIndex].image_url}
                alt="Gallery preview"
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-foreground/10"
              />
            </motion.div>

            {/* Next */}
            {gallery.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 z-10 p-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-full transition-all active:scale-95 border border-foreground/10"
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Counter */}
            <div className="absolute bottom-6 text-xs font-black uppercase tracking-widest text-muted-foreground bg-black/60 px-4 py-1.5 rounded-full border border-foreground/10 backdrop-blur-md">
              {selectedIndex + 1} / {gallery.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

