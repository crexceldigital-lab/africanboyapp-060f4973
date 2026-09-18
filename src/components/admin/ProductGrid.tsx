import { Edit2, Trash2, Eye, Minus, Plus } from 'lucide-react';
import { Product } from '../../types';

interface ProductGridProps {
  products: Product[];
  activeTab: string;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, newStock: number) => void;
  onQuickView?: (product: Product) => void;
}

export default function ProductGrid({
  products,
  onEdit,
  onDelete,
  onUpdateStock,
  onQuickView,
}: ProductGridProps) {
  const getStatusBadge = (status?: string, stockQty?: number) => {
    if (status === 'inactive') {
      return 'bg-muted text-muted-foreground border-foreground/10';
    }
    if (status === 'stock_out' || (stockQty !== undefined && stockQty <= 0)) {
      return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  if (products.length === 0) {
    return (
      <div className="bg-card border border-foreground/5 rounded-[32px] p-12 text-center space-y-3">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          No products found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        const effectiveSalePrice = product.on_sale
          ? Math.round(product.price - (product.price * (product.discount_percent || 10)) / 100)
          : product.sale_price
          ? Number(product.sale_price)
          : null;

        return (
          <div
            key={product.id}
            className="group bg-card border border-foreground/10 rounded-[28px] overflow-hidden flex flex-col hover:border-primary/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-primary/5"
          >
            {/* Image & Overlay Badges */}
            <div
              onClick={() => onQuickView?.(product)}
              className="relative aspect-square w-full bg-secondary overflow-hidden cursor-pointer"
            >
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Status / Sale Badges Overlay */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                {product.on_sale && (
                  <span className="px-2.5 py-1 bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-widest rounded-full shadow-md">
                    SALE -{product.discount_percent || 10}%
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-md shadow-sm ${getStatusBadge(
                    product.status,
                    product.stock_quantity
                  )}`}
                >
                  {product.status
                    ? product.status.replace('_', ' ')
                    : product.stock_quantity > 0
                    ? 'Active'
                    : 'Stock Out'}
                </span>
              </div>

              {/* Hover Quick Action Overlay */}
              <div className="absolute inset-0 bg-background/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickView?.(product);
                  }}
                  title="Quick View"
                  className="p-3 bg-card border border-foreground/10 rounded-2xl text-foreground hover:text-primary hover:border-primary transition-all shadow-lg hover:scale-110"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                  }}
                  title="Edit Product"
                  className="p-3 bg-card border border-foreground/10 rounded-2xl text-foreground hover:text-primary hover:border-primary transition-all shadow-lg hover:scale-110"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(product.id);
                  }}
                  title="Delete Product"
                  className="p-3 bg-card border border-foreground/10 rounded-2xl text-muted-foreground hover:text-destructive hover:border-destructive transition-all shadow-lg hover:scale-110"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Product Body Details */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span className="uppercase tracking-widest text-primary font-black">AFRICAN BOY</span>
                  <span className="font-mono text-muted-foreground/80">
                    {product.sku || `AFB-${product.id.substring(0, 5).toUpperCase()}`}
                  </span>
                </div>

                <h4
                  onClick={() => onQuickView?.(product)}
                  className="font-black italic uppercase tracking-tight text-base hover:text-primary transition-colors cursor-pointer line-clamp-1"
                >
                  {product.name}
                </h4>

                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-0.5 bg-foreground/5 rounded-md text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {product.category}
                  </span>
                  {product.subcategory && (
                    <span className="text-[9px] font-mono text-muted-foreground/70">
                      {product.subcategory}
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Stock Adjustment */}
              <div className="pt-3 border-t border-foreground/5 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Price
                  </span>
                  <div className="text-right font-mono">
                    {effectiveSalePrice ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground line-through">
                          {Number(product.price).toLocaleString()}
                        </span>
                        <span className="font-bold text-primary text-sm">
                          {effectiveSalePrice.toLocaleString()} TZS
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-sm">
                        {Number(product.price).toLocaleString()} TZS
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center justify-between bg-foreground/[0.03] p-2 rounded-2xl border border-foreground/5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        product.stock_quantity < 10
                          ? 'bg-destructive animate-pulse'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Stock
                    </span>
                  </div>

                  <div className="flex items-center bg-card rounded-xl border border-foreground/10 overflow-hidden">
                    <button
                      onClick={() => onUpdateStock(product.id, product.stock_quantity - 1)}
                      className="px-2.5 py-1 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Decrease Stock"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-3 py-1 text-xs font-black italic min-w-[32px] text-center">
                      {product.stock_quantity}
                    </span>
                    <button
                      onClick={() => onUpdateStock(product.id, product.stock_quantity + 1)}
                      className="px-2.5 py-1 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Increase Stock"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-5 py-3 bg-foreground/[0.02] border-t border-foreground/5 flex items-center justify-between text-xs">
              <button
                onClick={() => onQuickView?.(product)}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
              >
                <Eye size={12} /> Quick View
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(product)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Edit Product"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete Product"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
