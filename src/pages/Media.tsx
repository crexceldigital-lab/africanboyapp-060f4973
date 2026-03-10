import { useState } from 'react';
import { GalleryItem } from '../types';
import { MOCK_GALLERY } from '../data/mockData';

export default function Media() {
  const [gallery] = useState<GalleryItem[]>(MOCK_GALLERY);

  return (
    <div className="pb-24 pt-20 px-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">Photo <span className="text-primary">Gallery</span></h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map(item => (
          <div key={item.id} className="group relative aspect-square bg-card border border-foreground/5 rounded-2xl overflow-hidden">
            <img src={item.image_url} alt="Gallery" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
        ))}
      </div>
    </div>
  );
}
