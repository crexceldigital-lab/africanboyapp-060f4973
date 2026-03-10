import { useState } from 'react';
import { ContentItem, GalleryItem } from '../types';
import MediaCard from '../components/MediaCard';
import { MOCK_CONTENT, MOCK_GALLERY } from '../data/mockData';

export default function Media() {
  const [content] = useState<ContentItem[]>(MOCK_CONTENT);
  const [gallery] = useState<GalleryItem[]>(MOCK_GALLERY);

  return (
    <div className="pb-24 pt-20 px-6 space-y-12">
      <section>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase">Exclusive <span className="text-primary">Videos</span></h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.map(item => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase">Photo <span className="text-primary">Gallery</span></h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map(item => (
            <div key={item.id} className="group relative aspect-square bg-card border border-foreground/5 rounded-2xl overflow-hidden">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              {item.title && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-black uppercase tracking-widest">{item.title}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
