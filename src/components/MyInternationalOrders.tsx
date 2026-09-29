import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { formatMoney, formatTsh, IntlRequest, intlTable, requestPath, statusLabel } from '@/lib/internationalOrders';

export default function MyInternationalOrders({ userId }: { userId: string }) {
  const [rows, setRows] = useState<IntlRequest[]>([]);

  useEffect(() => {
    intlTable()
      .select('reference_number, country, city, product_total, currency, shipping_cost, shipping_currency, final_total, final_currency, status, created_at')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => setRows(data || []));
  }, [userId]);

  return (
    <div className="bg-card rounded-[2rem] border border-foreground/5 p-6">
      <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
        <Globe size={16} className="text-primary" /> My International Orders
      </h2>
      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="text-center py-8 bg-foreground/5 rounded-2xl border border-dashed border-foreground/10 text-xs text-muted-foreground font-bold uppercase tracking-widest">No international requests yet.</p>
        )}
        {rows.map(r => (
          <a key={r.reference_number} href={requestPath(r.reference_number)} className="block bg-foreground/5 rounded-2xl p-4 hover:bg-foreground/10 transition-all">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="font-black text-primary text-sm">{r.reference_number}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {r.city}, {r.country}</p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-primary/30 text-primary whitespace-nowrap">{statusLabel(r.status)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
              <div><p className="text-muted-foreground uppercase">Products</p><p className="font-bold">{formatTsh(r.product_total)}</p></div>
              <div><p className="text-muted-foreground uppercase">Shipping</p><p className="font-bold">{r.shipping_cost == null ? 'Pending' : formatMoney(r.shipping_cost, r.shipping_currency)}</p></div>
              <div><p className="text-muted-foreground uppercase">Final</p><p className="font-bold">{r.final_total == null ? 'Pending' : formatMoney(r.final_total, r.final_currency)}</p></div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
