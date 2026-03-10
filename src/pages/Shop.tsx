import { useState } from 'react';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { MOCK_PRODUCTS } from '../data/mockData';

export default function Shop() {
  const [category, setCategory] = useState('All');
  const [products] = useState<Product[]>(MOCK_PRODUCTS);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
