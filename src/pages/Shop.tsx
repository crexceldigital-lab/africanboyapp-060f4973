import { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { fromAny, castProducts } from '@/lib/supabase-helpers';
import { useCountry } from '../context/CountryContext';
import { AFRICAN_BOY_FASHION_COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { updateOpenGraphMeta } from '@/lib/shareUtils';

export default function Shop() {
  const { selectedCountry } = useCountry();
  const [category, setCategory] = useState('All');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, { is_available: boolean; stock_quantity: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchProductsAndAvailability = async () => {
      setLoading(true);
      try {
        // 1. Fetch products from database
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        // 2. Fetch matching store for visitor's country
        const countryCode = selectedCountry?.code || 'TZ';
        const { data: store } = await fromAny('stores')
          .select('id')
          .eq('country_code', countryCode)
          .maybeSingle();

        const storeId = store?.id || 1;

        // 3. Fetch product_store_availability for store
        const { data: availData } = await fromAny('product_store_availability')
          .select('product_id, is_available, stock_quantity')
          .eq('store_id', storeId);

        if (availData && availData.length > 0) {
          const map: Record<string, { is_available: boolean; stock_quantity: number }> = {};
          availData.forEach((a: any) => {
            map[a.product_id] = {
              is_available: a.is_available,
              stock_quantity: Number(a.stock_quantity),
            };
          });
          setAvailabilityMap(map);
        } else {
          setAvailabilityMap(null);
        }

        if (error) throw error;
        // Always use real catalogue data — never placeholder products in production
        const fetchedProducts: Product[] = data ? castProducts(data) : [];

        setProducts(fetchedProducts);

        // Parse URL params for ?category= or ?product=
        const params = new URLSearchParams(window.location.search);
        const catParam = params.get('category');
        if (catParam) {
          setCategory(catParam);
        }

        const productIdOrSlug = params.get('product');
        if (productIdOrSlug) {
          const found = fetchedProducts.find(
            (p) =>
              p.id === productIdOrSlug ||
              p.name.toLowerCase().replace(/\s+/g, '-') === productIdOrSlug.toLowerCase()
          );
          if (found) {
            setSelectedProduct(found);
          }
        }
      } catch (err) {
        console.error('Error fetching shop products:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProductsAndAvailability();
  }, [selectedCountry]);

  // Sync URL query string with selected product
  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      updateOpenGraphMeta(product);
    }
    const url = new URL(window.location.href);
    if (product) {
      const slug = product.name.toLowerCase().replace(/\s+/g, '-');
      url.searchParams.set('product', product.id || slug);
    } else {
      url.searchParams.delete('product');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handleSelectCategory = (catName: string) => {
    setCategory(catName);
    const url = new URL(window.location.href);
    if (catName !== 'All') {
      url.searchParams.set('category', catName);
    } else {
      url.searchParams.delete('category');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const categories = [
    'All',
    'Sale',
    'T-Shirt',
    'Shirts',
    'Shorts',
    'Jeans',
    'Jackets',
    'Leather Jackets',
    'Leather Coats',
    'Hoods',
    'Socks',
    'Caps',
    'Boxer',
    'Footwear',
    'Accessories',
    'Tracksuit',
  ];

  const availableSizesList = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', '28', '30', '32', '34', '36', '38'];

  // Filter products by availability in the current store
  const availableProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!availabilityMap) return true;
        const storeAvail = availabilityMap[p.id];
        if (!storeAvail) return true;
        return storeAvail.is_available === true;
      })
      .map((p) => {
        if (availabilityMap && availabilityMap[p.id]) {
          return {
            ...p,
            stock_quantity: availabilityMap[p.id].stock_quantity,
          };
        }
        return p;
      });
  }, [products, availabilityMap]);

  // Multi-criteria filtering logic
  const filteredProducts = useMemo(() => {
    return availableProducts.filter((p) => {
      // 1. Category filter
      if (category === 'Sale') {
        if (!p.on_sale) return false;
      } else if (category !== 'All') {
        // Match exact category or normalized substring
        const catMatch = p.category.toLowerCase() === category.toLowerCase() ||
          (category === 'T-Shirt' && p.category.toLowerCase().includes('t-shirt')) ||
          (category === 'Hoods' && (p.category.toLowerCase().includes('hood') || p.category.toLowerCase().includes('hoodie'))) ||
          (category === 'Socks' && (p.category.toLowerCase().includes('sock') || p.category.toLowerCase().includes('socks'))) ||
          (category === 'Jeans' && (p.category.toLowerCase().includes('jean') || p.category.toLowerCase().includes('trouser') || p.category.toLowerCase().includes('pant')));
        if (!catMatch) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        const matchesSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const matchesDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesCat && !matchesSku && !matchesDesc) return false;
      }

      // 3. Color filter
      if (selectedColorFilter) {
        const hasColor = p.colors && p.colors.some(
          c => c.name.toLowerCase() === selectedColorFilter.toLowerCase()
        );
        if (!hasColor) return false;
      }

      // 4. Size filter
      if (selectedSizeFilter) {
        const hasSize = p.sizes && p.sizes.some(
          s => s.toLowerCase() === selectedSizeFilter.toLowerCase()
        );
        if (!hasSize) return false;
      }

      // 5. In stock filter
      if (inStockOnly && p.stock_quantity <= 0) {
        return false;
      }

      return true;
    });
  }, [availableProducts, category, searchQuery, selectedColorFilter, selectedSizeFilter, inStockOnly]);

  const activeFiltersCount = (category !== 'All' ? 1 : 0) +
    (selectedColorFilter ? 1 : 0) +
    (selectedSizeFilter ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const clearAllFilters = () => {
    handleSelectCategory('All');
    setSelectedColorFilter(null);
    setSelectedSizeFilter(null);
    setSearchQuery('');
    setInStockOnly(false);
  };

  return (
    <div className="pb-28 pt-24 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <span className="text-primary text-xs font-bold tracking-widest uppercase">
          Official Merch & Outerwear
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter italic leading-none mt-1">
          SHOP <br className="sm:hidden" />
          <span className="text-foreground">COLLECTION</span>
        </h1>
      </motion.div>

      {/* Search & Filter Trigger Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, category, or SKU..."
            className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all placeholder:text-muted-foreground/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-5 py-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            showFilters || activeFiltersCount > 0
              ? 'bg-primary text-black border-primary shadow-[0_0_20px_hsl(43,96%,49%,0.4)]'
              : 'bg-card text-foreground border-foreground/10 hover:border-foreground/30'
          }`}
        >
          <Filter size={16} />
          <span>Filter</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-black text-primary font-mono text-[10px] rounded-full flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Collapsible Multi-Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="p-5 sm:p-6 bg-card/90 border border-foreground/10 rounded-3xl space-y-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Filter size={14} /> Refine Products
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={12} /> Clear Filters
                  </button>
                )}
              </div>

              {/* Color Filter Swatches */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                  Filter by Color
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedColorFilter(null)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      selectedColorFilter === null
                        ? 'bg-primary text-black border-primary'
                        : 'bg-background/50 border-foreground/10 text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    All Colors
                  </button>
                  {AFRICAN_BOY_FASHION_COLORS.slice(0, 12).map((col) => {
                    const isSelected = selectedColorFilter === col.name;
                    return (
                      <button
                        key={col.name}
                        onClick={() => setSelectedColorFilter(isSelected ? null : col.name)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-foreground shadow-[0_0_12px_hsl(43,96%,49%,0.4)]'
                            : 'bg-background/50 border-foreground/10 text-muted-foreground hover:border-foreground/30'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/30"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span>{col.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Filter Pills */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                  Filter by Size
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedSizeFilter(null)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      selectedSizeFilter === null
                        ? 'bg-primary text-black border-primary'
                        : 'bg-background/50 border-foreground/10 text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    All Sizes
                  </button>
                  {availableSizesList.map((sz) => {
                    const isSelected = selectedSizeFilter === sz;
                    return (
                      <button
                        key={sz}
                        onClick={() => setSelectedSizeFilter(isSelected ? null : sz)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                          isSelected
                            ? 'bg-primary text-black border-primary'
                            : 'bg-background/50 border-foreground/10 text-muted-foreground hover:border-foreground/30'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock Filter Checkbox */}
              <div className="pt-2 flex items-center gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    In Stock Only
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Pills Bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2 scroll-smooth"
      >
        {categories.map((cat) => {
          const isSelected = category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleSelectCategory(cat)}
              className={`relative px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 outline-none select-none border ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_hsl(43,96%,49%,0.4)] scale-105'
                  : 'bg-card/80 text-muted-foreground border-foreground/10 hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {cat === 'Jeans' ? 'Pants / Trousers' : cat === 'Hoods' ? 'Hoodies' : cat}
            </button>
          );
        })}
      </motion.div>

      {/* Active Filter Tags Bar */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Filters:</span>
          {category !== 'All' && (
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary flex items-center gap-1.5">
              Category: {category}
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => handleSelectCategory('All')} />
            </span>
          )}
          {selectedColorFilter && (
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary flex items-center gap-1.5">
              Color: {selectedColorFilter}
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => setSelectedColorFilter(null)} />
            </span>
          )}
          {selectedSizeFilter && (
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary flex items-center gap-1.5">
              Size: {selectedSizeFilter}
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => setSelectedSizeFilter(null)} />
            </span>
          )}
          {searchQuery && (
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary flex items-center gap-1.5">
              Query: "{searchQuery}"
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => setSearchQuery('')} />
            </span>
          )}
          {inStockOnly && (
            <span className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary flex items-center gap-1.5">
              In Stock Only
              <X size={12} className="cursor-pointer hover:opacity-80" onClick={() => setInStockOnly(false)} />
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary underline ml-2"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="bg-card rounded-3xl p-4 border border-foreground/5 space-y-4 animate-pulse">
              <div className="w-full aspect-[4/5] bg-secondary/60 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-4 bg-secondary/80 rounded-md w-3/4" />
                <div className="h-3 bg-secondary/60 rounded-md w-1/2" />
                <div className="h-4 bg-primary/20 rounded-md w-1/3 pt-1" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-card/40 rounded-3xl border border-foreground/5 space-y-3">
          <p className="text-foreground text-base font-black uppercase tracking-wider">
            No products match your selections
          </p>
          <p className="text-muted-foreground text-xs font-medium max-w-md mx-auto">
            Try resetting your color, size, or category filters to explore more of the African Boy merchandise collection.
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-6 py-2.5 bg-primary text-black rounded-full font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2"
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>
      ) : (
        <motion.div
          key={`${category}-${selectedColorFilter}-${selectedSizeFilter}-${searchQuery}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={(p) => handleSelectProduct(p)}
            />
          ))}
        </motion.div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          productsList={filteredProducts.length > 0 ? filteredProducts : availableProducts}
          onClose={() => handleSelectProduct(null)}
          onSelectProduct={(p) => handleSelectProduct(p)}
        />
      )}
    </div>
  );
}

