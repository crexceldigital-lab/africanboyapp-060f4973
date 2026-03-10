import { Product } from '../types';
import { motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import { useCountry } from '../context/CountryContext';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { formatPrice } = useCountry();
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0]?.name || '');

  const isOutOfStock = product.stock_quantity <= 0;

  const handleAdd = () => {
    if (isOutOfStock || !selectedSize || !selectedColor) return;
    addToCart(product, selectedSize, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group relative bg-card rounded-2xl overflow-hidden border border-foreground/5 ${isOutOfStock ? 'opacity-60' : ''}`}
    >
      <div className="aspect-[3/4] overflow-hidden relative">
        <img
          src={product.image_url || undefined}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-sm text-foreground/90">{product.name}</h3>
          <span className="text-primary font-bold text-sm">
            {formatPrice(product.price)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{product.category}</p>

        {/* Colors */}
        {product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {product.colors.map(color => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color.name)}
                title={color.name}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  selectedColor === color.name
                    ? 'border-primary scale-110'
                    : 'border-foreground/10 hover:border-foreground/30'
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        )}

        {/* Sizes */}
        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {product.sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                  selectedSize === size
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-foreground/5 text-muted-foreground border-foreground/10 hover:border-foreground/20'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}
        
        <button 
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-full py-2 transition-all rounded-lg flex items-center justify-center gap-2 text-xs font-bold border ${
            isOutOfStock
              ? 'bg-secondary text-muted-foreground border-foreground/5 cursor-not-allowed'
              : added 
                ? 'bg-emerald-500 text-foreground border-emerald-500' 
                : 'bg-foreground/5 hover:bg-primary hover:text-primary-foreground border-foreground/10 hover:border-primary'
          }`}
        >
          {isOutOfStock ? (
            'OUT OF STOCK'
          ) : added ? (
            <>
              <Check size={14} /> ADDED
            </>
          ) : (
            <>
              <Plus size={14} /> ADD TO CART
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
