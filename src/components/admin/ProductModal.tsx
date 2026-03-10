import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { Product } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  formData: { name: string; category: string; price: string; stock_quantity: string; image_url: string; description: string };
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  categories: string[];
}

export default function ProductModal({ isOpen, onClose, editingProduct, formData, setFormData, onSubmit, categories }: ProductModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-foreground/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-8 border-b border-foreground/5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tight">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-foreground/5 rounded-2xl text-muted-foreground hover:text-foreground transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Product Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="e.g. AFB Signature Tee" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Category</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all appearance-none">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Price (TZS)</label>
              <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Initial Stock</label>
              <input required type="number" value={formData.stock_quantity} onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="0" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Image URL</label>
            <input required type="text" value={formData.image_url} onChange={e => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="https://example.com/image.jpg" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Description</label>
            <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all min-h-[120px] resize-none" placeholder="Tell us about this product..." />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-secondary border border-foreground/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Save size={18} /> {editingProduct ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
