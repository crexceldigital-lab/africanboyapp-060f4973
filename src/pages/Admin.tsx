import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  TrendingUp, 
  CheckCircle2,
  X,
  Upload,
  Save,
  Image as ImageIcon,
  Calendar
} from 'lucide-react';
import { Product, AppEvent } from '../types';
import { MOCK_PRODUCTS, MOCK_EVENTS } from '../data/mockData';

type AdminTab = 'products' | 'inventory' | 'events';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [events, setEvents] = useState<AppEvent[]>(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'T-Shirt', price: '', stock_quantity: '', image_url: '', description: ''
  });

  const categories = ['T-Shirt', 'Hoods', 'Jeans', 'Accessories'];

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category,
        price: String(product.price),
        stock_quantity: String(product.stock_quantity),
        image_url: product.image_url,
        description: product.description
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: 'T-Shirt', price: '', stock_quantity: '', image_url: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? {
        ...p,
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url,
        description: formData.description
      } : p));
    } else {
      const newProduct: Product = {
        id: Math.max(...products.map(p => p.id)) + 1,
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url,
        description: formData.description
      };
      setProducts([...products, newProduct]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleUpdateStock = (id: number, newStock: number) => {
    if (newStock < 0) return;
    setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: newStock } : p));
  };

  return (
    <div className="pb-24 pt-20 px-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <span className="text-primary text-xs font-bold tracking-widest uppercase">Management</span>
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">ADMIN <span className="text-primary">PANEL</span></h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {(['products', 'inventory', 'events'] as AdminTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border ${
              activeTab === tab 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-card text-muted-foreground border-foreground/5 hover:border-foreground/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search & Add */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={18} /> Add
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-foreground/5 bg-foreground/5">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-foreground/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-foreground/10">
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-black italic uppercase tracking-tight">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate max-w-[200px]">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-foreground/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-mono text-sm">
                    {product.price.toLocaleString()} TZS
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${product.stock_quantity < 10 ? 'bg-destructive animate-pulse' : 'bg-emerald-500'}`} />
                      {activeTab === 'inventory' ? (
                        <div className="flex items-center bg-background/40 rounded-xl border border-foreground/10 overflow-hidden">
                          <button onClick={() => handleUpdateStock(product.id, product.stock_quantity - 1)} className="px-3 py-1 hover:bg-foreground/10 text-muted-foreground transition-colors">-</button>
                          <span className="px-3 py-1 text-sm font-black italic min-w-[40px] text-center">{product.stock_quantity}</span>
                          <button onClick={() => handleUpdateStock(product.id, product.stock_quantity + 1)} className="px-3 py-1 hover:bg-foreground/10 text-muted-foreground transition-colors">+</button>
                        </div>
                      ) : (
                        <span className={`text-sm font-black italic ${product.stock_quantity < 10 ? 'text-destructive' : ''}`}>
                          {product.stock_quantity}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(product)} className="p-2 hover:bg-foreground/10 rounded-lg text-muted-foreground hover:text-foreground transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-foreground/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-foreground/5 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Fill in the details below</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-foreground/5 rounded-2xl text-muted-foreground hover:text-foreground transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Product Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="e.g. AFB Signature Tee" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all appearance-none">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Price (TZS)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Initial Stock</label>
                  <input required type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="0" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Image URL</label>
                <input required type="text" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all" placeholder="https://example.com/image.jpg" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-6 py-4 bg-background/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all min-h-[120px] resize-none" placeholder="Tell us about this product..." />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary border border-foreground/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Save size={18} /> {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
