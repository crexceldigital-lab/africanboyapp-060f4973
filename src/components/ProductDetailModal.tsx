import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Check,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  Sparkles,
  Tag,
  Hash,
} from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useCountry } from '../context/CountryContext';
import ProductLightboxModal from './ProductLightboxModal';

interface ProductDetailModalProps {
  product: Product | null;
  productsList?: Product[];
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
}

export default function ProductDetailModal({
  product,
  productsList = [],
  onClose,
  onSelectProduct,
}: ProductDetailModalProps) {
  const { addToCart } = useCart();
  const { formatPrice } = useCountry();

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [added, setAdded] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [sizeError, setSizeError] = useState<boolean>(false);

  // Derive gallery images list dynamically
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const imgs: string[] = [];
    if (product.image_url) {
      imgs.push(product.image_url);
    }
    // If product has extra images array (from database/json)
    if (Array.isArray((product as any).images)) {
      (product as any).images.forEach((url: string) => {
        if (url && !imgs.includes(url)) {
          imgs.push(url);
        }
      });
    }
    // If color swatches have corresponding image_url
    if (Array.isArray(product.colors)) {
      product.colors.forEach((c: any) => {
        if (c.image_url && !imgs.includes(c.image_url)) {
          imgs.push(c.image_url);
        }
      });
    }
    return imgs.length > 0 ? imgs : [product.image_url];
  }, [product]);

  // Reset local state whenever active product changes
  useEffect(() => {
    if (!product) return;
    const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0].name : '';
    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : '';
    setSelectedColor(defaultColor);
    setSelectedSize(defaultSize);
    setQuantity(1);
    setAdded(false);
    setActiveImageIndex(0);
    setSizeError(false);
  }, [product]);

  // Keyboard navigation & lock body scroll
  useEffect(() => {
    if (!product) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLightboxOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, isLightboxOpen, onClose]);

  if (!product) return null;

  const isOutOfStock = product.stock_quantity <= 0;
  const isOneSize =
    !product.sizes ||
    product.sizes.length === 0 ||
    (product.sizes.length === 1 && product.sizes[0].toLowerCase().includes('one size'));

  // Calculate pricing
  const effectivePrice = product.on_sale
    ? Math.round(product.price - (product.price * (product.discount_percent || 10)) / 100)
    : product.sale_price
    ? Number(product.sale_price)
    : product.price;

  const hasDiscount =
    product.on_sale || (product.sale_price && product.sale_price < product.price);

  // Find previous & next products for inline browsing navigation
  const currentIndex = productsList.findIndex((p) => p.id === product.id);
  const prevProduct =
    currentIndex > 0 ? productsList[currentIndex - 1] : productsList[productsList.length - 1];
  const nextProduct =
    currentIndex >= 0 && currentIndex < productsList.length - 1
      ? productsList[currentIndex + 1]
      : productsList[0];

  const handleColorSelect = (colorName: string) => {
    setSelectedColor(colorName);
    // Check if selected color has a specific image
    const matchingColorObj = product.colors.find((c) => c.name === colorName);
    if (matchingColorObj && (matchingColorObj as any).image_url) {
      const idx = galleryImages.indexOf((matchingColorObj as any).image_url);
      if (idx !== -1) {
        setActiveImageIndex(idx);
      }
    }
  };

  const handleSizeSelect = (sizeName: string) => {
    setSelectedSize(sizeName);
    setSizeError(false);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    if (!isOneSize && !selectedSize) {
      setSizeError(true);
      return;
    }

    const itemToAdd = {
      ...product,
      price: effectivePrice,
    };

    addToCart(itemToAdd, selectedSize || 'One Size', selectedColor || undefined, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const activeImage = galleryImages[activeImageIndex] || product.image_url;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto no-scrollbar">
          {/* Dark Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Product Detail Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl bg-card border border-foreground/10 rounded-3xl sm:rounded-[36px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] z-10 my-auto"
          >
            {/* Top Header Navigation Bar */}
            <div className="px-5 py-4 border-b border-foreground/10 flex items-center justify-between bg-card/90 backdrop-blur-md flex-shrink-0 z-20">
              <div className="flex items-center gap-3">
                <span className="text-primary text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5">
                  <Sparkles size={12} className="text-primary animate-pulse" />
                  AFRICAN BOY MERCH
                </span>
                {productsList.length > 1 && (
                  <span className="hidden sm:inline-block text-[10px] text-muted-foreground font-mono">
                    ITEM {currentIndex + 1} OF {productsList.length}
                  </span>
                )}
              </div>

              {/* Prev / Next Navigation & Close Button */}
              <div className="flex items-center gap-2">
                {productsList.length > 1 && onSelectProduct && (
                  <div className="flex items-center gap-1 mr-2 border-r border-foreground/10 pr-3">
                    <button
                      onClick={() => onSelectProduct(prevProduct)}
                      aria-label="Previous product"
                      className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-xs font-bold"
                      title={prevProduct.name}
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden md:inline">PREV</span>
                    </button>
                    <button
                      onClick={() => onSelectProduct(nextProduct)}
                      aria-label="Next product"
                      className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-xs font-bold"
                      title={nextProduct.name}
                    >
                      <span className="hidden md:inline">NEXT</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                <button
                  onClick={onClose}
                  aria-label="Close product details"
                  className="p-2.5 bg-foreground/5 hover:bg-primary hover:text-black rounded-full text-foreground/80 transition-all border border-foreground/10 shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
                
                {/* LEFT COLUMN: Large Uncropped Image & Gallery */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                  {/* Primary Large Image Frame */}
                  <div className="relative w-full aspect-square sm:aspect-[4/5] bg-neutral-950/90 border border-foreground/10 rounded-2xl sm:rounded-3xl overflow-hidden group flex items-center justify-center p-4 sm:p-6 shadow-inner">
                    {/* Discount Badge */}
                    {hasDiscount && (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="bg-primary text-black font-black text-xs px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl border border-primary-foreground/20">
                          -{product.discount_percent || 10}% OFF
                        </span>
                      </div>
                    )}

                    {/* Stock Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      {isOutOfStock ? (
                        <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                          OUT OF STOCK
                        </span>
                      ) : product.stock_quantity <= 5 ? (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          LOW STOCK — {product.stock_quantity} LEFT
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          IN STOCK
                        </span>
                      )}
                    </div>

                    {/* The Large Uncropped Image */}
                    <motion.img
                      key={activeImage}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      src={activeImage}
                      alt={product.name}
                      className="w-full h-full object-contain cursor-zoom-in transition-transform duration-500 group-hover:scale-105 select-none"
                      onClick={() => setIsLightboxOpen(true)}
                      referrerPolicy="no-referrer"
                    />

                    {/* Hover Zoom Prompt Overlay */}
                    <button
                      onClick={() => setIsLightboxOpen(true)}
                      className="absolute bottom-4 right-4 z-10 px-3.5 py-2 bg-black/70 hover:bg-primary hover:text-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all opacity-90 hover:opacity-100 group-hover:scale-105"
                    >
                      <ZoomIn size={14} />
                      <span>ZOOM / VIEW FULL</span>
                    </button>
                  </div>

                  {/* Thumbnail Gallery Row */}
                  {galleryImages.length > 1 && (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                      {galleryImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-neutral-900 border-2 transition-all flex-shrink-0 p-1 ${
                            idx === activeImageIndex
                              ? 'border-primary scale-105 shadow-[0_0_15px_hsl(43,96%,49%,0.4)]'
                              : 'border-foreground/10 opacity-60 hover:opacity-100 hover:border-foreground/30'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`${product.name} thumbnail ${idx + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Information & Purchase Controls */}
                <div className="lg:col-span-6 flex flex-col gap-6">
                  {/* Category & Title */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Tag size={12} />
                        {product.category}
                      </span>
                      {product.sku && (
                        <span className="px-3 py-1 bg-foreground/5 text-muted-foreground border border-foreground/10 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1">
                          <Hash size={12} />
                          {product.sku}
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter text-foreground leading-tight">
                      {product.name}
                    </h1>
                  </div>

                  {/* Price Section */}
                  <div className="flex items-baseline gap-3 pb-4 border-b border-foreground/10">
                    <span className="text-2xl sm:text-3xl font-black text-primary italic font-mono">
                      {formatPrice(effectivePrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm sm:text-base text-muted-foreground line-through font-mono">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>

                  {/* Color Swatches */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold uppercase tracking-wider text-foreground/80">
                          Select Color
                        </span>
                        <span className="text-primary font-black uppercase tracking-wider text-[11px] font-mono">
                          {selectedColor || product.colors[0].name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {product.colors.map((color) => {
                          const isSelected = selectedColor === color.name;
                          const isUnavailable = color.available === false;
                          return (
                            <button
                              key={color.name}
                              onClick={() => !isUnavailable && handleColorSelect(color.name)}
                              disabled={isUnavailable}
                              title={`${color.name}${isUnavailable ? ' (Unavailable)' : ''}`}
                              aria-label={`Select color ${color.name}`}
                              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-xs font-bold ${
                                isSelected
                                  ? 'bg-primary/10 border-primary text-foreground shadow-[0_0_15px_hsl(43,96%,49%,0.35)] scale-105'
                                  : isUnavailable
                                  ? 'bg-card/40 border-foreground/10 text-muted-foreground/40 opacity-40 cursor-not-allowed'
                                  : 'bg-card border-foreground/15 text-muted-foreground hover:border-foreground/50 hover:text-foreground'
                              }`}
                            >
                              <span
                                className="relative w-4 h-4 rounded-full border border-black/30 shadow-sm flex items-center justify-center overflow-hidden"
                                style={{ backgroundColor: color.hex }}
                              >
                                {isUnavailable && (
                                  <span className="w-full h-[1.5px] bg-red-500 rotate-45 absolute" />
                                )}
                              </span>
                              <span className={isUnavailable ? 'line-through' : ''}>
                                {color.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Size Options */}
                  {!isOneSize && product.sizes && product.sizes.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold uppercase tracking-wider text-foreground/80">
                          Select Size
                        </span>
                        {sizeError && (
                          <span className="text-destructive font-bold text-[11px] uppercase tracking-wider animate-bounce">
                            Please select a size
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map((size) => {
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              onClick={() => handleSizeSelect(size)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                                isSelected
                                  ? 'bg-primary text-black border-primary shadow-[0_0_15px_hsl(43,96%,49%,0.4)] scale-105'
                                  : sizeError
                                  ? 'bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20'
                                  : 'bg-foreground/5 text-foreground/90 border-foreground/15 hover:border-primary hover:text-primary'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ONE SIZE indicator if applicable */}
                  {isOneSize && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-foreground/5 border border-foreground/10 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground">
                      <span>SIZE:</span>
                      <span className="text-primary">ONE SIZE</span>
                    </div>
                  )}

                  {/* Quantity & Add to Cart Controls */}
                  <div className="space-y-3 pt-2">
                    <span className="font-extrabold uppercase tracking-wider text-xs text-foreground/80 block">
                      Quantity
                    </span>
                    <div className="flex gap-3 items-center">
                      {/* Quantity Stepper */}
                      <div className="flex items-center bg-card border border-foreground/20 rounded-2xl p-1 shadow-sm">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1 || isOutOfStock}
                          aria-label="Decrease quantity"
                          className="p-3 hover:bg-foreground/10 rounded-xl text-foreground disabled:opacity-30 transition-all"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-10 text-center font-mono font-black text-sm text-foreground">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            setQuantity((q) =>
                              product.stock_quantity ? Math.min(product.stock_quantity, q + 1) : q + 1
                            )
                          }
                          disabled={
                            isOutOfStock || (product.stock_quantity ? quantity >= product.stock_quantity : false)
                          }
                          aria-label="Increase quantity"
                          className="p-3 hover:bg-foreground/10 rounded-xl text-foreground disabled:opacity-30 transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Add to Cart Primary Button */}
                      <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        className={`flex-1 py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-black tracking-widest uppercase transition-all shadow-xl active:scale-95 border ${
                          isOutOfStock
                            ? 'bg-secondary text-muted-foreground border-foreground/10 cursor-not-allowed'
                            : added
                            ? 'bg-emerald-500 text-black border-emerald-500 shadow-emerald-500/20'
                            : 'bg-primary text-black hover:bg-white border-primary shadow-[0_0_25px_hsl(43,96%,49%,0.4)]'
                        }`}
                      >
                        {isOutOfStock ? (
                          'OUT OF STOCK'
                        ) : added ? (
                          <>
                            <Check size={18} /> ADDED TO CART ✓
                          </>
                        ) : (
                          <>
                            <Plus size={18} /> ADD TO CART — {formatPrice(effectivePrice * quantity)}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-2 bg-background/50 border border-foreground/10 rounded-2xl p-4 sm:p-5 mt-2">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <span>PRODUCT DESCRIPTION</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-foreground/80 font-medium leading-relaxed whitespace-pre-line">
                      {product.description ||
                        'Official African Boy luxury streetwear apparel. Crafted with high quality materials for comfort and style.'}
                    </p>
                  </div>

                  {/* Trust Badges */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2.5 p-3 bg-card border border-foreground/5 rounded-xl text-[11px] font-bold text-muted-foreground">
                      <Truck size={16} className="text-primary flex-shrink-0" />
                      <span>Fast Nationwide Delivery</span>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 bg-card border border-foreground/5 rounded-xl text-[11px] font-bold text-muted-foreground">
                      <ShieldCheck size={16} className="text-primary flex-shrink-0" />
                      <span>100% Authentic Merch</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Sticky Bar for Mobile */}
            <div className="lg:hidden p-4 border-t border-foreground/10 bg-card/95 backdrop-blur-md flex items-center justify-between gap-3 flex-shrink-0">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">TOTAL</span>
                <span className="text-lg font-black text-primary font-mono">{formatPrice(effectivePrice * quantity)}</span>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`py-3.5 px-6 rounded-2xl flex-1 flex items-center justify-center gap-2 text-xs font-black tracking-widest uppercase transition-all shadow-xl active:scale-95 ${
                  isOutOfStock
                    ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                    : added
                    ? 'bg-emerald-500 text-black'
                    : 'bg-primary text-black hover:bg-white'
                }`}
              >
                {isOutOfStock ? (
                  'OUT OF STOCK'
                ) : added ? (
                  <>
                    <Check size={16} /> ADDED ✓
                  </>
                ) : (
                  <>
                    <Plus size={16} /> ADD TO CART
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Fullscreen Lightbox Modal */}
      <ProductLightboxModal
        isOpen={isLightboxOpen}
        images={galleryImages}
        initialIndex={activeImageIndex}
        productName={product.name}
        onClose={() => setIsLightboxOpen(false)}
      />
    </>
  );
}
