import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { Product, ProductColor } from '../../types';

interface ProductFormData {
  name: string;
  category: string;
  price: string;
  stock_quantity: string;
  image_url: string;
  description: string;
  sizes: string[];
  colors: ProductColor[];
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  formData: ProductFormData;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  categories: string[];
}

const PRESET_SIZES_CLOTHING = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const PRESET_SIZES_JEANS = ['28', '30', '32', '34', '36', '38'];
const PRESET_COLORS: ProductColor[] = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Gold', hex: '#c8a45c' },
  { name: 'Navy', hex: '#1b2a4a' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Olive', hex: '#556b2f' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Red', hex: '#dc2626' },
];

export default function ProductModal({ isOpen, onClose, editingProduct, formData, setFormData, onSubmit, categories }: ProductModalProps) {
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#000000');

  if (!isOpen) return null;

  const presetSizes = formData.category === 'Jeans' ? PRESET_SIZES_JEANS : PRESET_SIZES_CLOTHING;
  const isAccessory = formData.category === 'Accessories';

  const toggleSize = (size: string) => {
    const sizes = formData.sizes || [];
    if (sizes.includes(size)) {
      setFormData({ ...formData, sizes: sizes.filter((s: string) => s !== size) });
    } else {
      setFormData({ ...formData, sizes: [...sizes, size] });
    }
  };

  const toggleColor = (color: ProductColor) => {
    const colors: ProductColor[] = formData.colors || [];
    if (colors.some(c => c.name === color.name)) {
      setFormData({ ...formData, colors: colors.filter(c => c.name !== color.name) });
    } else {
      setFormData({ ...formData, colors: [...colors, color] });
    }
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) return;
    const newColor = { name: customColorName.trim(), hex: customColorHex };
    const colors: ProductColor[] = formData.colors || [];
    if (!colors.some(c => c.name === newColor.name)) {
      setFormData({ ...formData, colors: [...colors, newColor] });
    }
    setCustomColorName('');
    setCustomColorHex('#000000');
  };

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
            <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all min-h-[100px] resize-none" placeholder="Tell us about this product..." />
          </div>

          {/* Sizes */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Available Sizes</label>
            {isAccessory ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sizes: formData.sizes?.includes('One Size') ? [] : ['One Size'] })}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                    formData.sizes?.includes('One Size')
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-foreground/5 text-muted-foreground border-foreground/10'
                  }`}
                >
                  One Size
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {presetSizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                      formData.sizes?.includes(size)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-foreground/5 text-muted-foreground border-foreground/10 hover:border-foreground/20'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Available Colors</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.colors?.some((c: ProductColor) => c.name === color.name)
                      ? 'border-primary bg-primary/10'
                      : 'border-foreground/10 bg-foreground/5 hover:border-foreground/20'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: color.hex }} />
                  {color.name}
                </button>
              ))}
            </div>
            {/* Custom color */}
            <div className="flex gap-2 items-end">
              <input
                type="color"
                value={customColorHex}
                onChange={e => setCustomColorHex(e.target.value)}
                className="w-10 h-10 rounded-lg border border-foreground/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={customColorName}
                onChange={e => setCustomColorName(e.target.value)}
                placeholder="Custom color name"
                className="flex-1 px-4 py-2.5 bg-background/50 border border-foreground/10 rounded-xl text-xs font-bold focus:border-primary outline-none"
              />
              <button type="button" onClick={addCustomColor} className="px-4 py-2.5 bg-foreground/5 border border-foreground/10 rounded-xl text-xs font-black uppercase hover:bg-foreground/10 transition-all">
                <Plus size={14} />
              </button>
            </div>
            {/* Selected colors display */}
            {formData.colors?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.colors.map((c: ProductColor) => (
                  <span key={c.name} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                    {c.name}
                    <button type="button" onClick={() => toggleColor(c)} className="text-muted-foreground hover:text-destructive ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
