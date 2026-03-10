import { useState, useEffect } from 'react';
import { GalleryItem } from '../types';
import { supabase } from '@/integrations/supabase/client';

export default function Media() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
          {gallery.map(item => (
            <div key={item.id} className="group relative aspect-square bg-card border border-foreground/5 rounded-2xl overflow-hidden">
              <img src={item.image_url} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
