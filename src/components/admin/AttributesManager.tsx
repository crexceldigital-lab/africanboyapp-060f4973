import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromAny, castProducts } from '@/lib/supabase-helpers';
import { Category, Subcategory, AttributeSize, AttributeColor, Product } from '../../types';
import StaffManager from './StaffManager';
import { Plus, Trash2, Edit2, Tag, Layers, Maximize2, Palette, X, Save, Check, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

type AttributeSubTab = 'categories' | 'subcategories' | 'sizes' | 'colors' | 'staff';

export default function AttributesManager() {
  const [subTab, setSubTab] = useState<AttributeSubTab>('categories');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  // Attribute Lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [sizes, setSizes] = useState<AttributeSize[]>([]);
  const [colors, setColors] = useState<AttributeColor[]>([]);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [nameInput, setNameInput] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [sortOrderInput, setSortOrderInput] = useState('0');
  const [hexInput, setHexInput] = useState('#000000');

  const fetchAttributesData = async () => {
    setLoading(true);
    try {
      // 1. Fetch products to compute usage counts
      const { data: productsData } = await supabase.from('products').select('*');
      const loadedProducts = castProducts(productsData || []);
      setProducts(loadedProducts);

      // 2. Fetch categories
      const { data: catData } = await fromAny('product_categories')
        .select('*')
        .order('name');
      
      if (catData) {
        setCategories(catData.map((c: any) => ({
          ...c,
          product_count: loadedProducts.filter(p => p.category?.toLowerCase() === c.name.toLowerCase()).length
        })));
      }

      // 3. Fetch subcategories
      const { data: subCatData } = await fromAny('product_subcategories')
        .select('*, product_categories(name)')
        .order('name');
      
      if (subCatData) {
        setSubcategories(subCatData.map((sc: any) => ({
          ...sc,
          category_name: sc.product_categories?.name || 'General',
          product_count: loadedProducts.filter(p => p.subcategory?.toLowerCase() === sc.name.toLowerCase()).length
        })));
      }

      // 4. Fetch sizes
      const { data: sizesData } = await fromAny('product_sizes')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (sizesData) {
        setSizes(sizesData.map((s: any) => ({
          ...s,
          product_count: loadedProducts.filter(p => p.sizes?.includes(s.name)).length
        })));
      }

      // 5. Fetch colors
      const { data: colorsData } = await fromAny('product_colors')
        .select('*')
        .order('name');
      
      if (colorsData) {
        setColors(colorsData.map((c: any) => ({
          ...c,
          product_count: loadedProducts.filter(p => {
            const cols = Array.isArray(p.colors) ? p.colors : [];
            return cols.some((col: any) => col.name?.toLowerCase() === c.name.toLowerCase());
          }).length
        })));
      }

    } catch (err) {
      console.error('Error loading attributes data:', err);
      toast.error('Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributesData();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setNameInput('');
    setSelectedCategoryId(categories[0]?.id || '');
    setSortOrderInput('0');
    setHexInput('#c8a45c');
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setNameInput(item.name || '');
    if (subTab === 'subcategories') {
      setSelectedCategoryId(item.category_id || '');
    } else if (subTab === 'sizes') {
      setSortOrderInput(String(item.sort_order || 0));
    } else if (subTab === 'colors') {
      setHexInput(item.hex || '#000000');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    if (subTab === 'categories') {
      if (editingItem) {
        const { error } = await fromAny('product_categories').update({ name: nameInput.trim() }).eq('id', editingItem.id);
        if (error) toast.error('Failed to update category');
        else toast.success('Category updated');
      } else {
        const { error } = await fromAny('product_categories').insert({ name: nameInput.trim() });
        if (error) toast.error('Failed to add category');
        else toast.success('Category created');
      }
    } else if (subTab === 'subcategories') {
      if (!selectedCategoryId) {
        toast.error('Please select a parent category');
        return;
      }
      if (editingItem) {
        const { error } = await fromAny('product_subcategories').update({ category_id: selectedCategoryId, name: nameInput.trim() }).eq('id', editingItem.id);
        if (error) toast.error('Failed to update subcategory');
        else toast.success('Subcategory updated');
      } else {
        const { error } = await fromAny('product_subcategories').insert({ category_id: selectedCategoryId, name: nameInput.trim() });
        if (error) toast.error('Failed to add subcategory');
        else toast.success('Subcategory created');
      }
    } else if (subTab === 'sizes') {
      if (editingItem) {
        const { error } = await fromAny('product_sizes').update({ name: nameInput.trim(), sort_order: Number(sortOrderInput) }).eq('id', editingItem.id);
        if (error) toast.error('Failed to update size');
        else toast.success('Size updated');
      } else {
        const { error } = await fromAny('product_sizes').insert({ name: nameInput.trim(), sort_order: Number(sortOrderInput) });
        if (error) toast.error('Failed to add size');
        else toast.success('Size added');
      }
    } else if (subTab === 'colors') {
      if (editingItem) {
        const { error } = await fromAny('product_colors').update({ name: nameInput.trim(), hex: hexInput }).eq('id', editingItem.id);
        if (error) toast.error('Failed to update color');
        else toast.success('Color updated');
      } else {
        const { error } = await fromAny('product_colors').insert({ name: nameInput.trim(), hex: hexInput });
        if (error) toast.error('Failed to add color');
        else toast.success('Color added');
      }
    }

    setIsModalOpen(false);
    fetchAttributesData();
  };

  const handleDelete = async (id: string) => {
    let tableName = '';
    if (subTab === 'categories') tableName = 'product_categories';
    else if (subTab === 'subcategories') tableName = 'product_subcategories';
    else if (subTab === 'sizes') tableName = 'product_sizes';
    else if (subTab === 'colors') tableName = 'product_colors';

    const { error } = await supabase.from(tableName as any).delete().eq('id', id);
    if (error) {
      toast.error(`Failed to delete ${subTab.slice(0, -1)}`);
    } else {
      toast.success(`${subTab.slice(0, -1)} deleted`);
      fetchAttributesData();
    }
  };

  const handleToggleStatus = async (item: any) => {
    let tableName = '';
    if (subTab === 'categories') tableName = 'product_categories';
    else if (subTab === 'subcategories') tableName = 'product_subcategories';
    else if (subTab === 'sizes') tableName = 'product_sizes';
    else if (subTab === 'colors') tableName = 'product_colors';

    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from(tableName as any).update({ status: newStatus }).eq('id', item.id);

    if (error) {
      toast.error('Failed to toggle status');
    } else {
      toast.success('Status updated');
      fetchAttributesData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Pill Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 p-1.5 bg-card border border-foreground/5 rounded-full overflow-x-auto no-scrollbar">
          {[
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'subcategories', label: 'Subcategories', icon: Layers },
            { id: 'sizes', label: 'Sizes', icon: Maximize2 },
            { id: 'colors', label: 'Colors', icon: Palette },
            { id: 'staff', label: 'Store Staff', icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as AttributeSubTab)}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {subTab !== 'staff' && (
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={16} /> Add {subTab.slice(0, -1)}
          </button>
        )}
      </div>

      {subTab === 'staff' ? (
        <StaffManager />
      ) : (
        /* Main Table for current sub-tab */
        <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs font-bold text-muted-foreground">Loading attribute list...</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-foreground/5 bg-foreground/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</th>
                  {subTab === 'subcategories' && (
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parent Category</th>
                  )}
                  {subTab === 'colors' && (
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color Swatch</th>
                  )}
                  {subTab === 'sizes' && (
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sort Order</th>
                  )}
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Products Using</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {subTab === 'categories' && categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="px-8 py-6 font-black italic uppercase text-sm">{cat.name}</td>
                    <td className="px-8 py-6 font-mono text-sm font-bold">{cat.product_count || 0} product(s)</td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleToggleStatus(cat)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          cat.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-foreground/10'
                        }`}
                      >
                        {cat.status}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(cat)} className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {subTab === 'subcategories' && subcategories.map((sc) => (
                  <tr key={sc.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="px-8 py-6 font-black italic uppercase text-sm">{sc.name}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-foreground/5 border border-foreground/10 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {sc.category_name}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-mono text-sm font-bold">{sc.product_count || 0} product(s)</td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleToggleStatus(sc)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          sc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-foreground/10'
                        }`}
                      >
                        {sc.status}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(sc)} className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(sc.id)} className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {subTab === 'sizes' && sizes.map((sz) => (
                  <tr key={sz.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="px-8 py-6 font-black italic uppercase text-sm">{sz.name}</td>
                    <td className="px-8 py-6 font-mono text-sm">{sz.sort_order}</td>
                    <td className="px-8 py-6 font-mono text-sm font-bold">{sz.product_count || 0} product(s)</td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleToggleStatus(sz)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          sz.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-foreground/10'
                        }`}
                      >
                        {sz.status}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(sz)} className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(sz.id)} className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {subTab === 'colors' && colors.map((col) => (
                  <tr key={col.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="px-8 py-6 font-black italic uppercase text-sm">{col.name}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border border-foreground/20 shadow-inner" style={{ backgroundColor: col.hex }} />
                        <span className="font-mono text-xs text-muted-foreground uppercase">{col.hex}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-mono text-sm font-bold">{col.product_count || 0} product(s)</td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => handleToggleStatus(col)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          col.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground border-foreground/10'
                        }`}
                      >
                        {col.status}
                      </button>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(col)} className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(col.id)} className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {/* Add / Edit Attribute Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-foreground/10 rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-foreground/5 pb-4">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tight">
                  {editingItem ? `Edit ${subTab.slice(0, -1)}` : `New ${subTab.slice(0, -1)}`}
                </h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Manage streetwear product attributes</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</label>
                <input
                  required
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={`e.g. ${subTab === 'categories' ? 'Jackets' : subTab === 'sizes' ? 'XXL' : 'Acid Wash'}`}
                  className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
                />
              </div>

              {subTab === 'subcategories' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Parent Category</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-card text-foreground">{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {subTab === 'sizes' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrderInput}
                    onChange={(e) => setSortOrderInput(e.target.value)}
                    className="w-full px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
                  />
                </div>
              )}

              {subTab === 'colors' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color Hex Value</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={hexInput}
                      onChange={(e) => setHexInput(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border border-foreground/10"
                    />
                    <input
                      type="text"
                      value={hexInput}
                      onChange={(e) => setHexInput(e.target.value)}
                      className="flex-1 px-5 py-3.5 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-mono font-bold focus:border-primary outline-none uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-secondary border border-foreground/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-all">
                  <Save size={16} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
