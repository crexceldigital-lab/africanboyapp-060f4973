import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Plus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { Product, ProductColor, Category, Subcategory, AttributeSize, AttributeColor } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';

export interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  price: string;
  cost_price: string;

  sale_price: string;
  on_sale: boolean;
  discount_percent: string;
  stock_quantity: string;
  stock: Record<string, number>;
  image_url: string;
  description: string;
  sizes: string[];
  colors: ProductColor[];
  status: string;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  categories: string[];
  submitting?: boolean;
}

const PRESET_SIZES_CLOTHING = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
const PRESET_SIZES_JEANS = ['28', '30', '32', '34', '36', '38'];

export default function ProductModal({ isOpen, onClose, editingProduct, formData, setFormData, onSubmit, submitting = false }: ProductModalProps) {
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbSubcategories, setDbSubcategories] = useState<Subcategory[]>([]);
  const [dbSizes, setDbSizes] = useState<AttributeSize[]>([]);
  const [dbColors, setDbColors] = useState<AttributeColor[]>([]);

  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#000000');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploadError(null);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setUploadError('Please choose a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image is too large (max 10MB).');
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('products').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (err: any) {
      console.error('Product image upload failed:', err);
      const raw = String(err?.message || '');
      const permission = /permission|denied|policy|unauthor|row-level/i.test(raw);
      setUploadError(
        permission
          ? 'Unable to upload product image. Please check your permissions and try again.'
          : 'Unable to upload product image. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };



  useEffect(() => {
    if (isOpen) {
      fetchAttributes();
    }
  }, [isOpen]);

  const fetchAttributes = async () => {
    const { data: cats } = await fromAny('product_categories').select('*').eq('status', 'active');
    if (cats) setDbCategories(cats as unknown as Category[]);

    const { data: subs } = await fromAny('product_subcategories').select('*').eq('status', 'active');
    if (subs) setDbSubcategories(subs as unknown as Subcategory[]);

    const { data: szs } = await fromAny('product_sizes').select('*').eq('status', 'active').order('sort_order');
    if (szs) setDbSizes(szs as unknown as AttributeSize[]);

    const { data: cols } = await fromAny('product_colors').select('*').eq('status', 'active');
    if (cols) setDbColors(cols as unknown as AttributeColor[]);
  };

  if (!isOpen) return null;

  const currentCategoryObj = dbCategories.find(c => c.name.toLowerCase() === formData.category.toLowerCase());
  const availableSubcategories = dbSubcategories.filter(sc => !currentCategoryObj || sc.category_id === currentCategoryObj.id);

  const availableSizes = dbSizes.length > 0 
    ? dbSizes.map(s => s.name)
    : (formData.category === 'Jeans' ? PRESET_SIZES_JEANS : PRESET_SIZES_CLOTHING);

  const availableColors = dbColors.length > 0
    ? dbColors.map(c => ({ name: c.name, hex: c.hex }))
    : [
        { name: 'Black', hex: '#1a1a1a' },
        { name: 'White', hex: '#f5f5f5' },
        { name: 'Gold', hex: '#c8a45c' },
        { name: 'Navy', hex: '#1b2a4a' },
        { name: 'Burgundy', hex: '#800020' },
        { name: 'Olive', hex: '#556b2f' },
      ];

  const handlePerSizeStockChange = (size: string, qtyStr: string) => {
    const qty = Math.max(0, parseInt(qtyStr, 10) || 0);
    const newStockMap = { ...(formData.stock || {}), [size]: qty };
    
    // Ensure size is included in sizes array if stock > 0
    let newSizes = [...(formData.sizes || [])];
    if (qty > 0 && !newSizes.includes(size)) {
      newSizes.push(size);
    }

    // Compute live total stock
    const computedTotal = Object.values(newStockMap).reduce((sum, val) => sum + val, 0);

    setFormData({
      ...formData,
      stock: newStockMap,
      stock_quantity: String(computedTotal),
      sizes: newSizes,
    });
  };

  const toggleSizeSelection = (size: string) => {
    const sizes = formData.sizes || [];
    if (sizes.includes(size)) {
      const updatedSizes = sizes.filter(s => s !== size);
      const updatedStockMap = { ...formData.stock };
      delete updatedStockMap[size];
      const computedTotal = Object.values(updatedStockMap).reduce((sum, val) => sum + val, 0);
      setFormData({ ...formData, sizes: updatedSizes, stock: updatedStockMap, stock_quantity: String(computedTotal) });
    } else {
      const updatedStockMap = { ...formData.stock, [size]: formData.stock?.[size] || 1 };
      const computedTotal = Object.values(updatedStockMap).reduce((sum, val) => sum + val, 0);
      setFormData({ ...formData, sizes: [...sizes, size], stock: updatedStockMap, stock_quantity: String(computedTotal) });
    }
  };

  const toggleColorSelection = (color: ProductColor) => {
    const colors = formData.colors || [];
    if (colors.some(c => c.name === color.name)) {
      setFormData({ ...formData, colors: colors.filter(c => c.name !== color.name) });
    } else {
      setFormData({ ...formData, colors: [...colors, color] });
    }
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) return;
    const newColor = { name: customColorName.trim(), hex: customColorHex };
    const colors = formData.colors || [];
    if (!colors.some(c => c.name === newColor.name)) {
      setFormData({ ...formData, colors: [...colors, newColor] });
    }
    setCustomColorName('');
    setCustomColorHex('#000000');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-3xl max-h-[90vh] bg-card border border-foreground/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-foreground/5 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tight">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Configure product details & stock breakdown</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-foreground/5 rounded-2xl text-muted-foreground hover:text-foreground transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
          {/* Top Row: Name, SKU, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Product Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="e.g. AFB Signature Heavyweight Tee" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">SKU Code</label>
              <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-mono font-bold focus:border-primary outline-none transition-all" placeholder="AFB-TEE-01" />
            </div>
          </div>

          {/* Categories & Subcategories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Category</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '' })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all appearance-none">
                {dbCategories.length > 0 ? (
                  dbCategories.map(c => <option key={c.id} value={c.name} className="bg-card text-foreground">{c.name}</option>)
                ) : (
                  ['T-Shirt', 'Hoods', 'Jeans', 'Accessories', 'Footwear', 'Tracksuit', 'Caps'].map(c => <option key={c} value={c} className="bg-card text-foreground">{c}</option>)
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Subcategory</label>
              <select value={formData.subcategory || ''} onChange={e => setFormData({ ...formData, subcategory: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all appearance-none">
                <option value="" className="bg-card text-foreground">-- None --</option>
                {availableSubcategories.map(sc => (
                  <option key={sc.id} value={sc.name} className="bg-card text-foreground">{sc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Product Status</label>
              <select value={formData.status || 'active'} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all appearance-none">
                <option value="active" className="bg-card text-emerald-400 font-bold">Active</option>
                <option value="inactive" className="bg-card text-muted-foreground">Inactive</option>
                <option value="stock_out" className="bg-card text-destructive font-bold">Stock Out</option>
              </select>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Purchasing Price (Cost, TZS)</label>
              <input type="number" min="0" value={formData.cost_price || ''} onChange={e => setFormData({ ...formData, cost_price: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="0" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Selling Price (TZS)</label>
              <input required type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="0" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Sale Price (Optional Override, TZS)</label>
              <input type="number" value={formData.sale_price || ''} onChange={e => setFormData({ ...formData, sale_price: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold text-primary focus:border-primary outline-none transition-all" placeholder="Leave empty for auto-derived" />
            </div>
          </div>

          {/* Live Profit Preview */}
          {(() => {
            const cost = Number(formData.cost_price) || 0;
            const base = Number(formData.price) || 0;
            const derived = formData.on_sale
              ? Math.round(base - (base * (Number(formData.discount_percent) || 10) / 100))
              : (formData.sale_price ? Number(formData.sale_price) : base);
            const effective = derived || base;
            if (!cost || !effective) return null;
            const profit = effective - cost;
            const margin = effective > 0 ? (profit / effective) * 100 : 0;
            return (
              <div className="bg-background/40 border border-foreground/5 rounded-3xl p-6 flex flex-wrap gap-6 items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Profit Per Unit</span>
                  <span className={`text-lg font-black italic font-mono ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {profit.toLocaleString()} TZS
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Margin</span>
                  <span className={`text-lg font-black italic font-mono ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Based On Selling Price</span>
                  <span className="text-lg font-black italic font-mono text-foreground">{effective.toLocaleString()} TZS</span>
                </div>
              </div>
            );
          })()}


          {/* On Sale Controls */}
          <div className="bg-background/40 border border-foreground/5 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.on_sale || false}
                  onChange={e => setFormData({ ...formData, on_sale: e.target.checked })}
                  className="w-5 h-5 rounded-lg accent-primary border-foreground/20 cursor-pointer"
                />
                <span className="text-xs font-black uppercase tracking-widest text-foreground">
                  ON SALE (APPLY DISCOUNT)
                </span>
              </label>

              {formData.on_sale && Number(formData.price) > 0 && (
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Derived Sale Price</span>
                  <span className="text-sm font-black italic font-mono text-primary">
                    {Number(formData.price).toLocaleString()} → {Math.round(Number(formData.price) - (Number(formData.price) * (Number(formData.discount_percent) || 10) / 100)).toLocaleString()} TZS (-{formData.discount_percent || 10}%)
                  </span>
                </div>
              )}
            </div>

            {formData.on_sale && (
              <div className="pt-2">
                <div className="space-y-2 max-w-xs">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={formData.discount_percent || '10'}
                    onChange={e => setFormData({ ...formData, discount_percent: e.target.value })}
                    className="w-full px-6 py-3.5 bg-card border border-foreground/10 rounded-2xl text-sm font-mono font-bold focus:border-primary outline-none transition-all"
                    placeholder="10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Image: upload or URL */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Product Image</label>

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-24 h-24 rounded-2xl border border-foreground/10 bg-background/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                {formData.image_url && !formData.image_url.startsWith('file://') ? (
                  <img src={formData.image_url} alt="Product preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={22} className="text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 space-y-3 w-full">
                <label className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : 'hover:bg-foreground/10'} bg-foreground/5 border-foreground/10`}>
                  <Upload size={16} />
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                <input
                  required
                  type="text"
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
                  placeholder="Or paste an image link (https://...)"
                />
                {uploadError && <p className="text-[11px] font-bold text-destructive ml-2">{uploadError}</p>}
              </div>
            </div>
          </div>


          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Description</label>
            <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all min-h-[90px] resize-none" placeholder="Product details, material, fit guidance..." />
          </div>

          {/* Per-Size Stock Breakdown Matrix (Image 7 Reference Pattern) */}
          <div className="space-y-4 bg-background/40 border border-foreground/5 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Size & Stock Inventory</label>
                <p className="text-[11px] text-muted-foreground font-bold">Specify inventory count per size. Total updates automatically.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Total Stock</span>
                <span className="text-lg font-black italic font-mono text-primary">{formData.stock_quantity || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
              {availableSizes.map(size => {
                const isSelected = formData.sizes?.includes(size);
                const currentQty = formData.stock?.[size] ?? 0;
                return (
                  <div key={size} className={`p-3 rounded-2xl border transition-all ${isSelected ? 'bg-card border-primary' : 'bg-background/40 border-foreground/5 opacity-60'}`}>
                    <div className="flex justify-between items-center mb-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSizeSelection(size)}
                        className={`text-xs font-black uppercase px-2 py-0.5 rounded-lg border transition-all ${
                          isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-foreground/5 text-muted-foreground border-foreground/10'
                        }`}
                      >
                        {size}
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={currentQty}
                      onChange={(e) => handlePerSizeStockChange(size, e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 bg-background border border-foreground/10 rounded-xl text-xs font-mono font-bold text-center outline-none focus:border-primary"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Available Colors</label>
            <div className="flex flex-wrap gap-2">
              {availableColors.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleColorSelection(color)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.colors?.some(c => c.name === color.name)
                      ? 'border-primary bg-primary/10'
                      : 'border-foreground/10 bg-foreground/5 hover:border-foreground/20'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: color.hex }} />
                  {color.name}
                </button>
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex gap-2 items-end pt-1">
              <input
                type="color"
                value={customColorHex}
                onChange={e => setCustomColorHex(e.target.value)}
                className="w-10 h-10 rounded-xl border border-foreground/10 cursor-pointer bg-transparent"
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-secondary border border-foreground/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting || uploading} className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-60 disabled:pointer-events-none">
              <Save size={18} /> {submitting ? (editingProduct ? 'Saving Product...' : 'Creating Product...') : (editingProduct ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
