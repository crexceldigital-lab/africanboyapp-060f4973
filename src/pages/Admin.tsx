import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Product, ProductColor } from '../types';
import ProductTable from '../components/admin/ProductTable';
import ProductModal from '../components/admin/ProductModal';
import GalleryManager from '../components/admin/GalleryManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AdminTab = 'products' | 'inventory' | 'gallery';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'T-Shirt', price: '', stock_quantity: '', image_url: '', description: '',
    sizes: [] as string[], colors: [] as ProductColor[]
  });

  const categories = ['T-Shirt', 'Hoods', 'Jeans', 'Accessories'];

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data.map((p: any) => ({
        ...p,
        price: Number(p.price),
        colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
      })));
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name, category: product.category, price: String(product.price),
        stock_quantity: String(product.stock_quantity), image_url: product.image_url, description: product.description,
        sizes: [...product.sizes], colors: [...product.colors]
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: 'T-Shirt', price: '', stock_quantity: '', image_url: '', description: '', sizes: [], colors: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      stock_quantity: Number(formData.stock_quantity),
      image_url: formData.image_url,
      description: formData.description,
      sizes: formData.sizes,
      colors: formData.colors,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq('id', editingProduct.id);

      if (error) {
        toast.error('Failed to update product');
        return;
      }
      toast.success('Product updated!');
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) {
        toast.error('Failed to add product');
        return;
      }
      toast.success('Product added!');
    }
    setIsModalOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete product');
      return;
    }
    toast.success('Product deleted');
    fetchProducts();
  };

  const handleUpdateStock = async (id: string, newStock: number) => {
    if (newStock < 0) return;
    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: newStock } : p));
    }
  };

  const showProductViews = activeTab === 'products' || activeTab === 'inventory';

  return (
    <div className="pb-24 pt-20 px-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <span className="text-primary text-xs font-bold tracking-widest uppercase">Management</span>
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">ADMIN <span className="text-primary">PANEL</span></h1>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {(['products', 'inventory', 'gallery'] as AdminTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all border whitespace-nowrap ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-foreground/5 hover:border-foreground/20'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {showProductViews && (
        <>
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
          <ProductTable
            products={filteredProducts}
            activeTab={activeTab}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            onUpdateStock={handleUpdateStock}
          />
          <ProductModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            editingProduct={editingProduct}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            categories={categories}
          />
        </>
      )}

      {activeTab === 'gallery' && <GalleryManager />}
    </div>
  );
}
