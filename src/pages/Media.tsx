import { useState, useEffect } from 'react';
import { GalleryItem } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="pb-24 pt-20 px-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">Photo <span className="text-primary">Gallery</span></h1>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading gallery...</p>
        </div>
      ) : gallery.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm font-bold">No gallery images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map((item, index) => (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-square bg-card border border-foreground/5 rounded-2xl overflow-hidden cursor-pointer"
            >
              <img src={item.image_url} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox Preview */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-xl"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Close */}
            <button onClick={() => setSelectedIndex(null)} className="absolute top-6 right-6 z-10 p-3 bg-foreground/10 hover:bg-foreground/20 rounded-full transition-all">
              <X size={24} />
            </button>

            {/* Prev */}
            {gallery.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-4 z-10 p-3 bg-foreground/10 hover:bg-foreground/20 rounded-full transition-all">
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              src={gallery[selectedIndex].image_url}
              alt="Gallery preview"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next */}
            {gallery.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-4 z-10 p-3 bg-foreground/10 hover:bg-foreground/20 rounded-full transition-all">
                <ChevronRight size={24} />
              </button>
            )}

            {/* Counter */}
            <div className="absolute bottom-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
              {selectedIndex + 1} / {gallery.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
