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

  const effectivePrice = product.on_sale
    ? Math.round(product.price - (product.price * (product.discount_percent || 10) / 100))
    : (product.sale_price ? Number(product.sale_price) : product.price);

  const handleAdd = () => {
    if (isOutOfStock || !selectedSize || !selectedColor) return;
    const itemToAdd = {
      ...product,
      price: effectivePrice,
    };
    addToCart(itemToAdd, selectedSize, selectedColor);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative bg-card rounded-2xl overflow-hidden border border-foreground/10 shadow-lg hover:shadow-2xl transition-all duration-300 ${
        isOutOfStock ? 'opacity-60' : ''
      }`}
    >
      <div className="aspect-[3/4] overflow-hidden relative bg-black/40">
        {product.on_sale && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-primary text-primary-foreground font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg border border-primary-foreground/20 flex items-center gap-1">
              -{product.discount_percent || 10}%
            </span>
          </div>
        )}

        <img
          src={product.image_url || undefined}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* Subtle dark gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className="font-extrabold text-sm text-foreground/90 leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex flex-col items-end whitespace-nowrap">
            {product.on_sale || (product.sale_price && product.sale_price < product.price) ? (
              <>
                <span className="text-primary font-black text-sm">
                  {formatPrice(effectivePrice)}
                </span>
                <span className="text-[10px] text-muted-foreground line-through font-mono">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-primary font-black text-sm">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {product.category}
        </p>

        {/* Colors */}
        {product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {product.colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color.name)}
                title={color.name}
                aria-label={`Select colour ${color.name}`}
                aria-pressed={selectedColor === color.name}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  selectedColor === color.name
                    ? 'border-primary scale-110 shadow-[0_0_8px_hsl(43,96%,49%,0.6)]'
                    : 'border-foreground/20 hover:border-foreground/40'
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        )}

        {/* Sizes */}
        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border transition-all ${
                  selectedSize === size
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-foreground/5 text-muted-foreground border-foreground/10 hover:border-foreground/30'
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
          className={`w-full py-2.5 transition-all rounded-xl flex items-center justify-center gap-2 text-xs font-black tracking-wider uppercase border active:scale-95 ${
            isOutOfStock
              ? 'bg-secondary text-muted-foreground border-foreground/5 cursor-not-allowed'
              : added
              ? 'bg-emerald-500 text-foreground border-emerald-500 shadow-md'
              : 'bg-foreground/5 hover:bg-primary hover:text-primary-foreground border-foreground/10 hover:border-primary shadow-sm hover:shadow-[0_0_15px_hsl(43,96%,49%,0.3)]'
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

