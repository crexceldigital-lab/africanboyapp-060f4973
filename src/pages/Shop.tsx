import { useState, useEffect } from 'react';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { fromAny, castProducts } from '@/lib/supabase-helpers';
import { useCountry } from '../context/CountryContext';
import { motion } from 'framer-motion';

export default function Shop() {
  const { selectedCountry } = useCountry();
  const [category, setCategory] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, { is_available: boolean; stock_quantity: number }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductsAndAvailability = async () => {
      setLoading(true);
      try {
        // 1. Fetch products
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

        if (!error && data) {
          setProducts(castProducts(data));
        }
      } catch (err) {
        console.error('Error fetching shop products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductsAndAvailability();
  }, [selectedCountry]);

  const categories = [
    'All',
    'Sale',
    'T-Shirt',
    'Jeans',
    'Caps',
    'Hoods',
    'Boxer',
    'Footwear',
    'Accessories',
    'Tracksuits',
  ];

  // Filter products by availability in the current store
  const availableProducts = products
    .filter((p) => {
      if (!availabilityMap) return true; // Default fallback if no per-store rows defined
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

  const filteredProducts =
    category === 'Sale'
      ? availableProducts.filter((p) => p.on_sale)
      : category === 'All'
      ? availableProducts
      : availableProducts.filter((p) => p.category === category);

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
          Official Merch
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tighter italic leading-none mt-1">
          SHOP <br className="sm:hidden" />
          <span className="text-foreground">COLLECTION</span>
        </h1>
      </motion.div>

      {/* Category Pills Bar */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex gap-2 overflow-x-auto no-scrollbar mb-10 pb-2 scroll-smooth"
      >
        {categories.map((cat) => {
          const isSelected = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`relative px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 outline-none select-none border ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_20px_hsl(43,96%,49%,0.4)] scale-105'
                  : 'bg-card/80 text-muted-foreground border-foreground/10 hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </motion.div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-24 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
            Loading products...
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-card/40 rounded-3xl border border-foreground/5">
          <p className="text-muted-foreground text-sm font-bold uppercase tracking-wider">
            No products found in this category
          </p>
        </div>
      ) : (
        <motion.div
          key={category}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

