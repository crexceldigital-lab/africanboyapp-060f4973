import { Product } from '../types';
import { motion } from 'framer-motion';
import { Plus, Check, Eye, Share2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import { useCountry } from '../context/CountryContext';
import ShareProductModal from './ShareProductModal';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const { addToCart } = useCart();
  const { formatPrice } = useCountry();
  const [added, setAdded] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0]?.name || '');

  const isOutOfStock = product.stock_quantity <= 0;

  const effectivePrice = product.on_sale
    ? Math.round(product.price - (product.price * (product.discount_percent || 10)) / 100)
    : product.sale_price
    ? Number(product.sale_price)
    : product.price;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || !selectedSize) {
      // If user hasn't selected a size, open detail modal for size selection
      if (onSelect) onSelect(product);
      return;
    }
    const itemToAdd = {
      ...product,
      price: effectivePrice,
    };
    addToCart(itemToAdd, selectedSize, selectedColor || undefined);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareOpen(true);
  };

  const selectedColorObj = product.colors?.find(c => c.name === selectedColor);
  const displayedImage = selectedColorObj?.image_url || product.image_url;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -6 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={handleCardClick}
        className={`group relative bg-card rounded-2xl overflow-hidden border border-foreground/10 shadow-lg hover:shadow-2xl hover:border-primary/40 transition-all duration-300 cursor-pointer flex flex-col justify-between ${
          isOutOfStock ? 'opacity-65' : ''
        }`}
      >
        <div>
          {/* Product Image Box */}
          <div className="aspect-[3/4] overflow-hidden relative bg-neutral-950/80 p-2 flex items-center justify-center">
            {product.on_sale && (
              <div className="absolute top-3 left-3 z-10">
                <span className="bg-primary text-black font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg border border-primary-foreground/20 flex items-center gap-1">
                  -{product.discount_percent || 10}%
                </span>
              </div>
            )}

            {/* Unobtrusive Share Button */}
            <button
              onClick={handleShareClick}
              title="Share product"
              aria-label={`Share ${product.name}`}
              className="absolute top-3 right-3 z-20 p-2 bg-black/60 hover:bg-primary text-foreground/80 hover:text-black rounded-full border border-foreground/10 shadow-lg backdrop-blur-md transition-all hover:scale-110 active:scale-95"
            >
              <Share2 size={13} />
            </button>

          {/* Image object-contain to display full product clearly */}
          <img
            src={displayedImage || undefined}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 select-none"
            referrerPolicy="no-referrer"
          />

          {/* Hover Overlay with "QUICK INSPECT" button */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
            <span className="px-4 py-2 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
              <Eye size={14} /> INSPECT PRODUCT
            </span>
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-10">
              <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Info Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="font-extrabold text-sm text-foreground/90 leading-tight group-hover:text-primary transition-colors line-clamp-2">
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
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {product.category}
          </p>

          {/* Swatch Previews */}
          {product.colors && product.colors.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
              {product.colors.map((color) => {
                const isSelected = selectedColor === color.name;
                const isUnavailable = color.available === false;
                return (
                  <button
                    key={color.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isUnavailable) setSelectedColor(color.name);
                    }}
                    title={`${color.name}${isUnavailable ? ' (Out of stock)' : ''}`}
                    aria-label={`Select colour ${color.name}`}
                    aria-pressed={isSelected}
                    disabled={isUnavailable}
                    className={`relative w-4 h-4 rounded-full border transition-all ${
                      isSelected
                        ? 'border-primary scale-125 shadow-[0_0_8px_hsl(43,96%,49%,0.7)]'
                        : isUnavailable
                        ? 'border-foreground/10 opacity-30 cursor-not-allowed'
                        : 'border-foreground/20 hover:border-foreground/60 hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {isUnavailable && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-full h-[1px] bg-red-500 rotate-45" />
                      </span>
                    )}
                  </button>
                );
              })}
              {selectedColor && (
                <span className="text-[10px] text-muted-foreground font-semibold ml-1">
                  {selectedColor}
                </span>
              )}
            </div>
          )}

          {/* Size Pills */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4" onClick={(e) => e.stopPropagation()}>
              {product.sizes.slice(0, 5).map((size) => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSize(size);
                  }}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border transition-all ${
                    selectedSize === size
                      ? 'bg-primary text-black border-primary'
                      : 'bg-foreground/5 text-muted-foreground border-foreground/10 hover:border-foreground/30'
                  }`}
                >
                  {size}
                </button>
              ))}
              {product.sizes.length > 5 && (
                <span className="text-[9px] text-muted-foreground font-bold self-center">
                  +{product.sizes.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add To Cart Quick Action */}
      <div className="px-4 pb-4">
        <button
          onClick={handleQuickAdd}
          disabled={isOutOfStock}
          className={`w-full py-2.5 transition-all rounded-xl flex items-center justify-center gap-2 text-xs font-black tracking-wider uppercase border active:scale-95 ${
            isOutOfStock
              ? 'bg-secondary text-muted-foreground border-foreground/5 cursor-not-allowed'
              : added
              ? 'bg-emerald-500 text-black border-emerald-500 shadow-md'
              : 'bg-foreground/5 group-hover:bg-primary group-hover:text-black border-foreground/10 group-hover:border-primary shadow-sm'
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

    <ShareProductModal
      product={product}
      isOpen={isShareOpen}
      onClose={() => setIsShareOpen(false)}
    />
  </>
  );
}
