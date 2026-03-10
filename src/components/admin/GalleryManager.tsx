import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Save, Image as ImageIcon } from 'lucide-react';
import { GalleryItem } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function GalleryManager() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [formData, setFormData] = useState({ image_url: '' });

  const fetchGallery = async () => {
    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setGallery(data as GalleryItem[]);
    }
  };

  useEffect(() => { fetchGallery(); }, []);

  const handleOpenModal = (item?: GalleryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ image_url: item.image_url });
    } else {
      setEditingItem(null);
      setFormData({ image_url: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const { error } = await supabase
        .from('gallery_items')
        .update({ image_url: formData.image_url })
        .eq('id', editingItem.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Image updated!');
    } else {
      const { error } = await supabase
        .from('gallery_items')
        .insert({ image_url: formData.image_url });
      if (error) { toast.error('Failed to upload'); return; }
      toast.success('Image added!');
    }
    setIsModalOpen(false);
    fetchGallery();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('gallery_items').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Image deleted');
    fetchGallery();
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={18} /> Add Image
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative bg-card border border-foreground/5 rounded-[24px] overflow-hidden"
          >
            <div className="aspect-square overflow-hidden">
              <img src={item.image_url} alt="Gallery" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{item.created_at?.split('T')[0]}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleOpenModal(item)} className="px-3 py-1.5 bg-foreground/10 backdrop-blur-sm rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-foreground/20 transition-all">
                  Edit
                </button>
                <button onClick={() => handleDelete(item.id)} className="px-3 py-1.5 bg-destructive/20 backdrop-blur-sm rounded-lg text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/30 transition-all">
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {gallery.length === 0 && (
        <div className="text-center py-20">
          <ImageIcon size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-bold text-sm">No gallery images yet</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-lg bg-card border border-foreground/10 rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-foreground/5 flex justify-between items-center">
              <h2 className="text-2xl font-black italic uppercase tracking-tight">
                {editingItem ? 'Edit Image' : 'Add Image'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-foreground/5 rounded-2xl text-muted-foreground hover:text-foreground transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Image URL</label>
                <input required type="text" value={formData.image_url} onChange={e => setFormData({ image_url: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="https://example.com/image.jpg" />
              </div>
              {formData.image_url && (
                <div className="rounded-2xl overflow-hidden border border-foreground/10 aspect-square">
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary border border-foreground/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> {editingItem ? 'Update' : 'Upload'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
