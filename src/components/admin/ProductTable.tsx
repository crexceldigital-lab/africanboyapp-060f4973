import { Edit2, Trash2 } from 'lucide-react';
import { Product } from '../../types';

interface ProductTableProps {
  products: Product[];
  activeTab: string;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, newStock: number) => void;
}

export default function ProductTable({ products, activeTab, onEdit, onDelete, onUpdateStock }: ProductTableProps) {
  return (
    <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-foreground/5 bg-foreground/5">
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock</th>
              <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-foreground/[0.02] transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-foreground/10">
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-black italic uppercase tracking-tight">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate max-w-[200px]">
                        {product.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-foreground/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {product.category}
                  </span>
                </td>
                <td className="px-8 py-6 font-mono text-sm">
                  {product.price.toLocaleString()} TZS
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${product.stock_quantity < 10 ? 'bg-destructive animate-pulse' : 'bg-emerald-500'}`} />
                    {activeTab === 'inventory' ? (
                      <div className="flex items-center bg-background/40 rounded-xl border border-foreground/10 overflow-hidden">
                        <button onClick={() => onUpdateStock(product.id, product.stock_quantity - 1)} className="px-3 py-1 hover:bg-foreground/10 text-muted-foreground transition-colors">-</button>
                        <span className="px-3 py-1 text-sm font-black italic min-w-[40px] text-center">{product.stock_quantity}</span>
                        <button onClick={() => onUpdateStock(product.id, product.stock_quantity + 1)} className="px-3 py-1 hover:bg-foreground/10 text-muted-foreground transition-colors">+</button>
                      </div>
                    ) : (
                      <span className={`text-sm font-black italic ${product.stock_quantity < 10 ? 'text-destructive' : ''}`}>
                        {product.stock_quantity}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(product)} className="p-2 hover:bg-foreground/10 rounded-lg text-muted-foreground hover:text-foreground transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDelete(product.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
