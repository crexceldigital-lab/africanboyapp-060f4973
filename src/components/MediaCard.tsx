import { ContentItem } from '../types';
import { motion } from 'framer-motion';
import { Play, Lock } from 'lucide-react';

interface MediaCardProps {
  item: ContentItem;
}

export default function MediaCard({ item }: MediaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative aspect-video rounded-2xl overflow-hidden border border-foreground/5 bg-card"
    >
      <img
        src={item.thumbnail_url || undefined}
        alt={item.title}
        className="w-full h-full object-cover opacity-60 transition-all duration-500 group-hover:scale-105 group-hover:opacity-80"
        referrerPolicy="no-referrer"
      />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground shadow-xl transition-transform group-hover:scale-110">
          <Play size={24} fill="currentColor" />
        </div>
      </div>

      {item.is_vip && (
        <div className="absolute top-3 right-3 bg-background/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 border border-foreground/10">
          <Lock size={12} className="text-primary" />
          <span className="text-[10px] font-bold text-foreground uppercase tracking-tighter">VIP ONLY</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
        <h4 className="font-bold text-sm text-foreground truncate">{item.title}</h4>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{item.type}</p>
      </div>
    </motion.div>
  );
}
