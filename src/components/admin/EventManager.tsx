import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Save, Calendar, MapPin } from 'lucide-react';
import { AppEvent } from '../../types';
import { MOCK_EVENTS } from '../../data/mockData';

export default function EventManager() {
  const [events, setEvents] = useState<AppEvent[]>(MOCK_EVENTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [formData, setFormData] = useState({ title: '', date: '', location: '', price: '', image_url: '' });

  const handleOpenModal = (event?: AppEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({ title: event.title, date: event.date, location: event.location, price: String(event.price), image_url: event.image_url });
    } else {
      setEditingEvent(null);
      setFormData({ title: '', date: '', location: '', price: '', image_url: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, title: formData.title, date: formData.date, location: formData.location, price: Number(formData.price), image_url: formData.image_url } : ev));
    } else {
      const newEvent: AppEvent = {
        id: Math.max(...events.map(ev => ev.id), 0) + 1,
        title: formData.title,
        date: formData.date,
        location: formData.location,
        price: Number(formData.price),
        image_url: formData.image_url,
      };
      setEvents([...events, newEvent]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setEvents(events.filter(ev => ev.id !== id));
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={18} /> Add Event
        </button>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <motion.div
            key={event.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-card border border-foreground/5 rounded-[24px] overflow-hidden flex flex-col md:flex-row"
          >
            <div className="w-full md:w-48 h-40 md:h-auto overflow-hidden flex-shrink-0">
              <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="flex-1 p-6 flex items-center justify-between gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-black italic uppercase tracking-tight">{event.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <Calendar size={14} className="text-primary" /> {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <MapPin size={14} className="text-primary" /> {event.location}
                  </span>
                </div>
                <p className="text-sm font-mono">
                  {event.price === 0 ? (
                    <span className="text-emerald-500 font-black">FREE</span>
                  ) : (
                    <span>{event.price.toLocaleString()} TZS</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => handleOpenModal(event)} className="p-2.5 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(event.id)} className="p-2.5 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20">
          <Calendar size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-bold text-sm">No events scheduled</p>
        </div>
      )}

      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl bg-card border border-foreground/10 rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-foreground/5 flex justify-between items-center">
              <h2 className="text-2xl font-black italic uppercase tracking-tight">
                {editingEvent ? 'Edit Event' : 'New Event'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-foreground/5 rounded-2xl text-muted-foreground hover:text-foreground transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Event Title</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="e.g. JUX LIVE IN DAR" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Ticket Price (TZS)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="0 for free" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Location</label>
                <input required type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="e.g. Mlimani City Hall, Dar es Salaam" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Cover Image URL</label>
                <input required type="text" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="https://example.com/image.jpg" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary border border-foreground/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
