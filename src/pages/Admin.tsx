import { useState, useEffect } from 'react';
import { Search, Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { Product, ProductColor, AdminTab } from '../types';
import { PRODUCT_CATEGORIES } from '../constants';
import ProductTable from '../components/admin/ProductTable';
import ProductGrid from '../components/admin/ProductGrid';
import ProductModal, { ProductFormData } from '../components/admin/ProductModal';
import ProductQuickView from '../components/admin/ProductQuickView';
import GalleryManager from '../components/admin/GalleryManager';
import DashboardOverview from '../components/admin/DashboardOverview';
import OrdersManager from '../components/admin/OrdersManager';
import CustomersManager from '../components/admin/CustomersManager';
import AttributesManager from '../components/admin/AttributesManager';
import ReportsPanel from '../components/admin/ReportsPanel';
import StaffManager from '../components/admin/StaffManager';
import POSScreen from '../components/pos/POSScreen';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ab_admin_view_mode');
      if (saved === 'list' || saved === 'grid') return saved;
    }
    return 'list';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('ab_admin_view_mode', mode);
  };


  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    category: 'T-Shirt',
    subcategory: '',
    price: '',
    cost_price: '',

    sale_price: '',
    on_sale: false,
    discount_percent: '10',
    stock_quantity: '',
    stock: {},
    image_url: '',
    description: '',
    sizes: [],
    colors: [],
    status: 'active',
  });

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data.map((p: any) => ({
        ...p,
        price: Number(p.price),
        cost_price: Number(p.cost_price) || 0,

        sale_price: p.sale_price ? Number(p.sale_price) : null,
        colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
        stock: typeof p.stock === 'object' && p.stock !== null ? p.stock : {},
      })));
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = categoryFilter === 'SALE'
      ? p.on_sale === true
      : (categoryFilter === 'All' || p.category === categoryFilter);

    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku || '',
        category: product.category,
        subcategory: product.subcategory || '',
        price: String(product.price),
        cost_price: product.cost_price ? String(product.cost_price) : '',

        sale_price: product.sale_price ? String(product.sale_price) : '',
        on_sale: product.on_sale || false,
        discount_percent: String(product.discount_percent || 10),
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
        cost_price: '',

        sale_price: '',
        on_sale: false,
        discount_percent: '10',
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
    if (isSaving) return;

    const rawPrice = Number(formData.price) || 0;
    const rawDiscount = Number(formData.discount_percent) || 10;
    const derivedSalePrice = Math.round(rawPrice - (rawPrice * rawDiscount / 100));

    // Explicit validation with clear messages
    if (!formData.name.trim()) return toast.error('Product name is required.');
    if (!formData.category) return toast.error('Product category is required.');
    if (rawPrice <= 0) return toast.error('Selling price must be greater than 0.');
    if (!formData.image_url.trim() || formData.image_url.startsWith('file://')) {
      return toast.error('Please upload a product image or paste a valid image link.');
    }

    const productData = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || null,
      category: formData.category,
      subcategory: formData.subcategory || null,
      price: rawPrice,
      cost_price: Number(formData.cost_price) || 0,
      on_sale: formData.on_sale,
      discount_percent: rawDiscount,
      sale_price: formData.on_sale ? derivedSalePrice : (formData.sale_price ? Number(formData.sale_price) : null),
      stock_quantity: Number(formData.stock_quantity) || 0,
      stock: formData.stock || {},
      image_url: formData.image_url.trim(),
      description: formData.description,
      sizes: formData.sizes,
      colors: formData.colors,
      status: formData.status || 'active',
    };

    setIsSaving(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({ ...productData, colors: productData.colors as any, updated_at: new Date().toISOString() } as any)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Product updated successfully.');
      } else {
        const { data: newProd, error } = await supabase
          .from('products')
          .insert({ ...productData, colors: productData.colors as any } as any)
          .select()
          .single();

        if (error) throw error;

        // Populate store availability so storefront immediately lists it for all stores
        if (newProd && newProd.id) {
          try {
            await (supabase as any).from('product_store_availability').upsert([
              { product_id: newProd.id, store_id: 1, is_available: true, stock_quantity: productData.stock_quantity },
              { product_id: newProd.id, store_id: 2, is_available: true, stock_quantity: productData.stock_quantity },
            ], { onConflict: 'product_id,store_id' });
          } catch (availErr) {
            console.warn('Store availability sync warning:', availErr);
          }
        }
        toast.success(`Product ${productData.name} (SKU: ${productData.sku || 'N/A'}) created successfully.`);
      }

      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      console.error('Product save error:', err);
      const msg = String(err?.message || '');
      if (/duplicate key|unique/i.test(msg) && /sku/i.test(msg)) {
        toast.error('A product with this SKU already exists.');
      } else if (/permission|row-level|policy/i.test(msg)) {
        toast.error('Unable to save product to database. Please verify your admin session.');
      } else {
        toast.error(msg || 'Failed to save product.');
      }
    } finally {
      setIsSaving(false);
    }
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
    pos: 'POS (Store)',
    products: 'Products',
    orders: 'Orders',
    customers: 'Customers',
    attributes: 'Attributes',
    gallery: 'Gallery',
    reports: 'Reports',
    staff: 'Staff',
  };

  const adminStaffAssignment = {
    id: 'admin-pos-session',
    user_id: 'admin',
    store_id: 1,
    staff_role: 'admin',
    store: {
      id: 1,
      name: 'African Boy Tanzania',
      country_code: 'TZ',
      currency_code: 'TZS',
      is_active: true,
    },
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
        {(['dashboard', 'pos', 'products', 'orders', 'customers', 'attributes', 'gallery', 'reports', 'staff'] as AdminTab[]).map(tab => (
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
      {activeTab === 'dashboard' && <DashboardOverview onNavigateTab={(t) => setActiveTab(t as AdminTab)} />}

      {activeTab === 'pos' && <POSScreen staffAssignment={adminStaffAssignment} />}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products by name, category, or SKU..."
                className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
              />
            </div>

            {/* List / Grid View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-card border border-foreground/10 rounded-2xl flex-shrink-0 self-end sm:self-auto">
              <button
                onClick={() => handleViewModeChange('list')}
                title="List View"
                className={`px-3 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <LayoutList size={18} />
                <span className="hidden md:inline">List</span>
              </button>
              <button
                onClick={() => handleViewModeChange('grid')}
                title="Grid View"
                className={`px-3 py-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <LayoutGrid size={18} />
                <span className="hidden md:inline">Grid</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0"
            >
              <Plus size={18} /> Add Product
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['All', 'SALE', ...PRODUCT_CATEGORIES].map((cat) => {
              const isSelected = categoryFilter === cat;
              const count = cat === 'All'
                ? products.length
                : cat === 'SALE'
                ? products.filter(p => p.on_sale).length
                : products.filter(p => p.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : 'bg-card text-muted-foreground border-foreground/5 hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                    isSelected ? 'bg-black/20 text-primary-foreground' : 'bg-foreground/10 text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {viewMode === 'list' ? (
            <ProductTable
              products={filteredProducts}
              activeTab={activeTab}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onUpdateStock={handleUpdateStock}
              onQuickView={setQuickViewProduct}
            />
          ) : (
            <ProductGrid
              products={filteredProducts}
              activeTab={activeTab}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onUpdateStock={handleUpdateStock}
              onQuickView={setQuickViewProduct}
            />
          )}

          <ProductQuickView
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onEdit={handleOpenModal}
          />

          <ProductModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            editingProduct={editingProduct}
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            categories={PRODUCT_CATEGORIES}
            submitting={isSaving}
          />
        </div>
      )}

      {activeTab === 'orders' && <OrdersManager />}

      {activeTab === 'customers' && <CustomersManager />}

      {activeTab === 'attributes' && <AttributesManager />}

      {activeTab === 'gallery' && <GalleryManager />}

      {activeTab === 'reports' && <ReportsPanel />}

      {activeTab === 'staff' && <StaffManager />}
    </div>
  );
}
