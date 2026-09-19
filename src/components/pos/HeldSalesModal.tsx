import { useState, useEffect } from 'react';
import { HeldSale } from '@/types';
import { fromAny } from '@/lib/supabase-helpers';
import { PauseCircle, PlayCircle, Trash2, X, Clock } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import { toast } from 'sonner';

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: number;
  onResumeSale: (heldSale: HeldSale) => void;
}

export default function HeldSalesModal({
  isOpen,
  onClose,
  storeId,
  onResumeSale,
}: HeldSalesModalProps) {
  const { formatPrice } = useCountry();
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHeldSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await fromAny('held_sales')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHeldSales(
          data.map((h: any) => ({
            ...h,
            items: Array.isArray(h.items) ? h.items : JSON.parse(h.items || '[]'),
            subtotal: Number(h.subtotal) || 0,
            discount_amount: Number(h.discount_amount) || 0,
            total_amount: Number(h.total_amount) || 0,
          }))
        );
      }
    } catch (err) {
      console.error('Fetch held sales error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchHeldSales();
  }, [isOpen, storeId]);

  if (!isOpen) return null;

  const handleDeleteHeldSale = async (id: string, holdNumber: string) => {
    try {
      const { error } = await fromAny('held_sales').delete().eq('id', id);
      if (error) throw error;
      toast.success(`Held sale ${holdNumber} deleted.`);
      fetchHeldSales();
    } catch (err: any) {
      toast.error('Failed to delete held sale');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-foreground/10 rounded-[32px] w-full max-w-lg p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <PauseCircle size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg italic uppercase">Held Sales</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Temporarily saved carts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* List of Held Sales */}
        <div className="max-h-80 overflow-y-auto space-y-3 no-scrollbar">
          {loading ? (
            <p className="text-center text-xs text-muted-foreground py-8 font-bold">Loading held sales...</p>
          ) : heldSales.length > 0 ? (
            heldSales.map((sale) => (
              <div
                key={sale.id}
                className="bg-background border border-foreground/10 rounded-2xl p-4 space-y-3 hover:border-primary/40 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-primary">{sale.hold_number}</span>
                      <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                        <Clock size={12} /> {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      Customer: {sale.customer_data?.name || 'Walk-in Customer'}
                    </p>
                  </div>
                  <span className="font-mono font-black text-sm text-foreground">{formatPrice(sale.total_amount)}</span>
                </div>

                {/* Items Summary */}
                <div className="text-[11px] text-muted-foreground bg-foreground/5 p-2.5 rounded-xl font-medium">
                  {sale.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleDeleteHeldSale(sale.id, sale.hold_number)}
                    className="p-2.5 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-all"
                    title="Delete Held Sale"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      onResumeSale(sale);
                      handleDeleteHeldSale(sale.id, sale.hold_number);
                      onClose();
                    }}
                    className="flex-1 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.01] transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <PlayCircle size={16} /> Resume Sale
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground space-y-2">
              <PauseCircle size={32} className="mx-auto opacity-40" />
              <p className="text-xs font-bold">No held sales found for this store.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
