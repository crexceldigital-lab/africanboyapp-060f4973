import { useState, useEffect } from 'react';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { supabase } from '@/integrations/supabase/client';

export default function Shop() {
  const [category, setCategory] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const categories = ['All', 'T-Shirt', 'Jeans', 'Caps', 'Hoods', 'Boxer', 'Footwear', 'Accessories', 'Tracksuits'];
  const filteredProducts = category === 'All' ? products : products.filter(p => p.category === category);

  return (
    <div className="pb-24 pt-20 px-6">
      <div className="mb-8">
        <span className="text-primary text-xs font-bold tracking-widest uppercase">Official Merch</span>
        <h1 className="text-5xl font-black tracking-tighter italic leading-none">SHOP <br />COLLECTION</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              category === cat 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-card text-muted-foreground border-foreground/5 hover:border-foreground/20'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm font-bold">No products available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
