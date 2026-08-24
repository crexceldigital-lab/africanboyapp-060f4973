import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Product, ProductColor, AdminTab } from '../types';
import ProductTable from '../components/admin/ProductTable';
import ProductModal, { ProductFormData } from '../components/admin/ProductModal';
import GalleryManager from '../components/admin/GalleryManager';
import DashboardOverview from '../components/admin/DashboardOverview';
import OrdersManager from '../components/admin/OrdersManager';
import CustomersManager from '../components/admin/CustomersManager';
import AttributesManager from '../components/admin/AttributesManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    category: 'T-Shirt',
    subcategory: '',
    price: '',
    sale_price: '',
    stock_quantity: '',
    stock: {},
    image_url: '',
    description: '',
    sizes: [],
    colors: [],
    status: 'active',
  });

  const categories = ['T-Shirt', 'Hoods', 'Jeans', 'Accessories', 'Footwear', 'Tracksuit', 'Caps'];

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data.map((p: any) => ({
        ...p,
        price: Number(p.price),
        sale_price: p.sale_price ? Number(p.sale_price) : null,
        colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
        stock: typeof p.stock === 'object' && p.stock !== null ? p.stock : {},
      })));
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku || '',
        category: product.category,
        subcategory: product.subcategory || '',
        price: String(product.price),
        sale_price: product.sale_price ? String(product.sale_price) : '',
        stock_quantity: String(product.stock_quantity),
        stock: product.stock || {},
        image_url: product.image_url,
        description: product.description,
        sizes: [...(product.sizes || [])],
        colors: [...(product.colors || [])],
        status: product.status || 'active',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        sku: '',
        category: 'T-Shirt',
        subcategory: '',
        price: '',
        sale_price: '',
        stock_quantity: '',
        stock: {},
        image_url: '',
        description: '',
        sizes: [],
        colors: [],
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      sku: formData.sku || null,
      category: formData.category,
      subcategory: formData.subcategory || null,
      price: Number(formData.price),
      sale_price: formData.sale_price ? Number(formData.sale_price) : null,
      stock_quantity: Number(formData.stock_quantity),
      stock: formData.stock,
      image_url: formData.image_url,
      description: formData.description,
      sizes: formData.sizes,
      colors: formData.colors,
      status: formData.status || 'active',
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update({ ...productData, colors: productData.colors as any, updated_at: new Date().toISOString() })
        .eq('id', editingProduct.id);

      if (error) {
        toast.error('Failed to update product');
        return;
      }
      toast.success('Product updated!');
    } else {
      const { error } = await supabase
        .from('products')
        .insert({ ...productData, colors: productData.colors as any });

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

  const tabLabels: Record<AdminTab, string> = {
    dashboard: 'Dashboard',
    products: 'Products',
    orders: 'Orders',
    customers: 'Customers',
    attributes: 'Attributes',
    gallery: 'Gallery',
  };

  return (
    <div className="pb-24 pt-20 px-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div>
        <span className="text-primary text-xs font-bold tracking-widest uppercase">Management Suite</span>
        <h1 className="text-4xl font-black tracking-tighter italic uppercase">
          ADMIN <span className="text-primary">PANEL</span>
        </h1>
      </div>

      {/* Main Navigation Pill Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar p-1.5 bg-card border border-foreground/5 rounded-full">
        {(['dashboard', 'products', 'orders', 'customers', 'attributes', 'gallery'] as AdminTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]'
                : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'dashboard' && <DashboardOverview />}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products by name, category, or SKU..."
                className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={18} /> Add Product
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
        </div>
      )}

      {activeTab === 'orders' && <OrdersManager />}

      {activeTab === 'customers' && <CustomersManager />}

      {activeTab === 'attributes' && <AttributesManager />}

      {activeTab === 'gallery' && <GalleryManager />}
    </div>
  );
}
