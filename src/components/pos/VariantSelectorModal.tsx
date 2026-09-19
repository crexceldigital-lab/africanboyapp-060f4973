import { useState } from 'react';
import { Product, ProductColor } from '@/types';
import { X, Check, ShoppingBag } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import { isFootwearCategory } from '@/constants';

interface VariantSelectorModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, selectedSize?: string, selectedColor?: string) => void;
}

export default function VariantSelectorModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: VariantSelectorModalProps) {
  const { formatPrice } = useCountry();

  if (!isOpen || !product) return null;

  const isFootwear = isFootwearCategory(product.category, product.subcategory);
  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasColors = product.colors && product.colors.length > 0;

  const [selectedSize, setSelectedSize] = useState<string>(hasSizes ? product.sizes[0] : '');
  const [selectedColor, setSelectedColor] = useState<string>(hasColors ? product.colors[0]?.name : '');

  const handleConfirm = () => {
    onAddToCart(product, selectedSize, selectedColor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-foreground/10 rounded-[32px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-foreground/5 pb-4">
          <div className="flex items-center gap-3">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-14 h-14 object-cover rounded-2xl bg-secondary flex-shrink-0"
            />
            <div>
              <h3 className="font-black text-base italic uppercase">{product.name}</h3>
              <p className="text-primary font-bold text-sm">{formatPrice(product.price)}</p>
              {product.sku && (
                <p className="text-[10px] text-muted-foreground font-mono">SKU: {product.sku}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Size Selection */}
        {hasSizes && (
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {isFootwear ? 'Select Size (EU)' : 'Select Size'} <span className="text-primary">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                const sizeStock = product.stock ? (product.stock[size] ?? (product.stock_quantity > 0 ? 1 : 0)) : (product.stock_quantity > 0 ? 1 : 0);
                const isOutOfStock = sizeStock <= 0;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => !isOutOfStock && setSelectedSize(size)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all ${
                      selectedSize === size
                        ? 'border-primary bg-primary text-primary-foreground shadow-md scale-105'
                        : isOutOfStock
                        ? 'border-foreground/10 bg-background/50 text-muted-foreground/40 line-through opacity-50 cursor-not-allowed'
                        : 'border-foreground/10 bg-background hover:border-foreground/20 text-foreground'
                    }`}
                  >
                    {size}{isOutOfStock ? ' (N/A)' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Color Selection */}
        {hasColors && (
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Select Color <span className="text-primary">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {product.colors.map((color: ProductColor) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 text-left ${
                    selectedColor === color.name
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-foreground/10 bg-background hover:border-foreground/20'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-black/20 flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: color.hex || '#000000' }}
                  />
                  <span className="text-xs font-bold truncate flex-1">{color.name}</span>
                  {selectedColor === color.name && <Check size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-foreground/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-background border border-foreground/10 text-muted-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-foreground/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <ShoppingBag size={16} /> Add to POS Cart
          </button>
        </div>
      </div>
    </div>
  );
}
