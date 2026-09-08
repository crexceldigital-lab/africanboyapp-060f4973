import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Package, Tag, Hash, Layers } from 'lucide-react';
import { Product } from '../../types';

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
}

export default function ProductQuickView({ product, onClose, onEdit }: ProductQuickViewProps) {
  if (!product) return null;

  const getStatusBadgeClass = (status?: string, stockQty?: number) => {
    if (status === 'inactive') {
      return 'bg-muted text-muted-foreground border-foreground/10';
    }
    if (status === 'stock_out' || (stockQty !== undefined && stockQty <= 0)) {
      return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  const getStatusLabel = (status?: string, stockQty?: number) => {
    if (status) return status.replace('_', ' ');
    return stockQty !== undefined && stockQty > 0 ? 'active' : 'stock out';
  };

  const handleEditClick = () => {
    onClose();
    onEdit(product);
  };

  const stockMap = product.stock || {};
  const hasPerSizeStock = Object.keys(stockMap).length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto no-scrollbar">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Quick View Dialog Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-foreground/10 rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Header Bar */}
          <div className="p-6 sm:p-8 border-b border-foreground/5 flex justify-between items-center flex-shrink-0 bg-card/50">
            <div>
              <span className="text-primary text-[10px] font-bold tracking-widest uppercase">QUICK INSPECTION</span>
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-foreground">
                Product Details
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-foreground/5 rounded-2xl text-muted-foreground hover:text-foreground transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar">
            {/* Top Showcase Image */}
            <div className="relative w-full h-64 sm:h-80 rounded-3xl overflow-hidden bg-secondary border border-foreground/10 group">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md shadow-lg ${getStatusBadgeClass(product.status, product.stock_quantity)}`}>
                  {getStatusLabel(product.status, product.stock_quantity)}
                </span>
              </div>
            </div>

            {/* Title & Category & SKU */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-foreground">
                  {product.name}
                </h1>
                {/* Price Display */}
                <div className="font-mono text-lg sm:text-xl">
                  {product.sale_price ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{Number(product.sale_price).toLocaleString()} TZS</span>
                      <span className="text-xs text-muted-foreground line-through">{Number(product.price).toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-foreground">{Number(product.price).toLocaleString()} TZS</span>
                  )}
                </div>
              </div>

              {/* Cost & Profit */}
              {Number(product.cost_price) > 0 && (() => {
                const cost = Number(product.cost_price);
                const effective = Number(product.sale_price) || Number(product.price);
                const profit = effective - cost;
                const margin = effective > 0 ? (profit / effective) * 100 : 0;
                return (
                  <div className="flex flex-wrap gap-4 text-xs font-mono font-bold">
                    <span className="px-3.5 py-1.5 bg-foreground/5 rounded-xl border border-foreground/5 text-muted-foreground">
                      COST {cost.toLocaleString()} TZS
                    </span>
                    <span className={`px-3.5 py-1.5 rounded-xl border border-foreground/5 ${profit >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      PROFIT {profit.toLocaleString()} TZS · {margin.toFixed(1)}%
                    </span>
                  </div>
                );
              })()}


              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1.5 bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-foreground/5 flex items-center gap-1.5">
                  <Tag size={12} className="text-primary" />
                  {product.category} {product.subcategory ? `· ${product.subcategory}` : ''}
                </span>

                <span className="px-3.5 py-1.5 bg-foreground/5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground border border-foreground/5 flex items-center gap-1.5">
                  <Hash size={12} className="text-primary" />
                  {product.sku || `AFB-${product.id.substring(0, 5).toUpperCase()}`}
                </span>

                <span className="px-3.5 py-1.5 bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-foreground/5 flex items-center gap-1.5">
                  <Package size={12} className="text-primary" />
                  Total Stock: {product.stock_quantity}
                </span>
              </div>
            </div>

            {/* Full Description */}
            <div className="space-y-2 bg-background/40 border border-foreground/5 rounded-2xl p-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Full Description
              </span>
              <p className="text-sm text-foreground/80 font-medium leading-relaxed whitespace-pre-line">
                {product.description || 'No description provided.'}
              </p>
            </div>

            {/* Size & Per-Size Stock Breakdown */}
            {hasPerSizeStock || (product.sizes && product.sizes.length > 0) ? (
              <div className="space-y-3 bg-background/40 border border-foreground/5 rounded-2xl p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                  Size Inventory Breakdown
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(product.sizes || Object.keys(stockMap)).map(size => {
                    const qty = stockMap[size] ?? product.stock_quantity;
                    return (
                      <div
                        key={size}
                        className="p-3 bg-card border border-foreground/10 rounded-xl text-center space-y-1"
                      >
                        <span className="text-xs font-black uppercase tracking-wider text-foreground block">
                          {size}
                        </span>
                        <span className="text-[11px] font-mono font-extrabold text-primary block">
                          {qty} in stock
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Available Color Swatches */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3 bg-background/40 border border-foreground/5 rounded-2xl p-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                  Available Color Options
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map(color => (
                    <div
                      key={color.name}
                      className="flex items-center gap-2 px-3 py-1.5 bg-card border border-foreground/10 rounded-xl text-xs font-bold"
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-foreground/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span>{color.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions Bar */}
          <div className="p-6 border-t border-foreground/5 flex gap-4 bg-card/80 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-secondary border border-foreground/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-muted transition-all"
            >
              Close
            </button>
            <button
              onClick={handleEditClick}
              className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <Edit2 size={16} /> Edit Product
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
