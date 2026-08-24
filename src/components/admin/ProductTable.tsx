import { Edit2, Trash2, Eye } from 'lucide-react';
import { Product } from '../../types';

interface ProductTableProps {
  products: Product[];
  activeTab: string;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, newStock: number) => void;
  onQuickView?: (product: Product) => void;
}

export default function ProductTable({ products, activeTab, onEdit, onDelete, onUpdateStock, onQuickView }: ProductTableProps) {
  const getStatusBadge = (status?: string, stockQty?: number) => {
    if (status === 'inactive') {
      return 'bg-muted text-muted-foreground border-foreground/10';
    }
    if (status === 'stock_out' || (stockQty !== undefined && stockQty <= 0)) {
      return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (
    <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-foreground/5 bg-foreground/5">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Code / SKU</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category / Sub</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {products.map((product) => {
              const effectiveSalePrice = product.on_sale
                ? Math.round(product.price - (product.price * (product.discount_percent || 10) / 100))
                : (product.sale_price ? Number(product.sale_price) : null);

              return (
                <tr key={product.id} className="hover:bg-foreground/[0.02] transition-colors group">
                  {/* Product Name & Image - Clickable for Quick View */}
                  <td
                    onClick={() => onQuickView?.(product)}
                    className="px-8 py-6 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-foreground/10 flex-shrink-0 group-hover:border-primary transition-colors">
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black italic uppercase tracking-tight group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          {product.on_sale && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                              SALE -{product.discount_percent || 10}%
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate max-w-[180px]">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* SKU Code */}
                  <td
                    onClick={() => onQuickView?.(product)}
                    className="px-8 py-6 font-mono text-xs font-bold text-muted-foreground cursor-pointer"
                  >
                    {product.sku || `AFB-${product.id.substring(0, 5).toUpperCase()}`}
                  </td>

                  {/* Category & Subcategory */}
                  <td
                    onClick={() => onQuickView?.(product)}
                    className="px-8 py-6 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <span className="px-3 py-1 bg-foreground/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground inline-block">
                        {product.category}
                      </span>
                      {product.subcategory && (
                        <p className="text-[10px] font-mono text-muted-foreground/80 pl-1">{product.subcategory}</p>
                      )}
                    </div>
                  </td>

                  {/* Price (Price & optional sale price) */}
                  <td className="px-8 py-6 font-mono text-sm">
                    {effectiveSalePrice ? (
                      <div>
                        <span className="font-bold text-primary">{effectiveSalePrice.toLocaleString()} TZS</span>
                        <span className="text-xs text-muted-foreground line-through ml-2">{Number(product.price).toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="font-bold">{Number(product.price).toLocaleString()} TZS</span>
                    )}
                  </td>

                {/* Stock Quantity */}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${product.stock_quantity < 10 ? 'bg-destructive animate-pulse' : 'bg-emerald-500'}`} />
                    <div className="flex items-center bg-background/40 rounded-xl border border-foreground/10 overflow-hidden">
                      <button onClick={() => onUpdateStock(product.id, product.stock_quantity - 1)} className="px-3 py-1 hover:bg-foreground/10 text-muted-foreground transition-colors">-</button>
                      <span className="px-3 py-1 text-sm font-black italic min-w-[40px] text-center">{product.stock_quantity}</span>
                      <button onClick={() => onUpdateStock(product.id, product.stock_quantity + 1)} className="px-3 py-1 hover:bg-foreground/10 text-muted-foreground transition-colors">+</button>
                    </div>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(product.status, product.stock_quantity)}`}>
                    {product.status ? product.status.replace('_', ' ') : (product.stock_quantity > 0 ? 'Active' : 'Stock Out')}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onQuickView?.(product)}
                      title="Quick View"
                      className="p-2 hover:bg-foreground/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEdit(product)}
                      title="Edit Product"
                      className="p-2 hover:bg-foreground/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      title="Delete Product"
                      className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
    </div>
  );
}
