import { AppEvent } from '../types';
import { motion } from 'framer-motion';
import { MapPin, Calendar as CalendarIcon, Ticket, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import { useCountry } from '../context/CountryContext';

interface EventCardProps {
  event: AppEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const { addTicket } = useCart();
  const { formatPrice } = useCountry();
  const [added, setAdded] = useState(false);

  const handleBuy = () => {
    addTicket(event);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="relative h-80 rounded-3xl overflow-hidden group border border-foreground/5"
    >
      <img
        src={event.image_url || undefined}
        alt={event.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent p-6 flex flex-col justify-end">
        <div className="flex items-center gap-2 text-primary text-xs font-bold mb-2">
          <CalendarIcon size={14} />
          {event.date}
        </div>
        <h3 className="text-2xl font-black tracking-tight mb-2 uppercase italic">{event.title}</h3>
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-6">
          <MapPin size={14} />
          {event.location}
        </div>
        
        <button 
          onClick={handleBuy}
          className={`w-full flex items-center justify-center gap-2 text-sm py-3 rounded-2xl font-black tracking-widest transition-all ${
            added 
              ? 'bg-emerald-500 text-foreground' 
              : 'btn-primary'
          }`}
        >
          {added ? (
            <>
              <Check size={18} /> TICKET ADDED
            </>
          ) : (
            <>
              <Ticket size={18} />
              BUY TICKETS — {event.price === 0 ? 'FREE' : formatPrice(event.price)}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
