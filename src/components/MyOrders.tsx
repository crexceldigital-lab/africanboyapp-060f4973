import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, ChevronDown, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Row = {
  id: string;
  order_number: string | null;
  receipt_number: string | null;
  status: string;
  payment_status: string | null;
  total_amount: number;
  delivery_fee: number;
  currency: string;
  items: any;
  sale_type: string;
  delivery_address: string | null;
  created_at: string | null;
  is_voided: boolean | null;
};

const FILTERS = ['all', 'paid', 'unpaid', 'cancelled'] as const;

const orderLabel: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};
const payLabel: Record<string, string> = {
  paid: 'Paid', unpaid: 'Awaiting Payment', cancelled: 'Cancelled', failed: 'Failed', partial: 'Part Paid',
};

function tone(v: string) {
  if (v === 'paid' || v === 'completed') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (v === 'cancelled' || v === 'failed' || v === 'voided') return 'text-destructive bg-destructive/10 border-destructive/20';
  return 'text-primary bg-primary/10 border-primary/20';
}

const money = (n: number, c: string) => `${c === 'TZS' ? 'TSh' : c} ${Math.round(Number(n) || 0).toLocaleString()}`;

export default function MyOrders({ userId, email }: { userId: string; email?: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  useEffect(() => {
    let q = supabase
      .from('orders')
      .select('id, order_number, receipt_number, status, payment_status, total_amount, delivery_fee, currency, items, sale_type, delivery_address, created_at, is_voided')
      .order('created_at', { ascending: false })
      .limit(100);
    q = email ? q.or(`user_id.eq.${userId},customer_email.eq.${email}`) : q.eq('user_id', userId);
    q.then(({ data }) => { setRows((data as Row[]) || []); setLoading(false); });
  }, [userId, email]);

  const payOf = (r: Row) => (r.is_voided ? 'voided' : r.payment_status || 'unpaid');
  const shown = useMemo(() => rows.filter(r => {
    if (filter === 'all') return true;
    const p = payOf(r);
    if (filter === 'cancelled') return p === 'cancelled' || p === 'voided' || r.status === 'cancelled';
    return p === filter && r.status !== 'cancelled';
  }), [rows, filter]);

  return (
    <div className="bg-card rounded-[2rem] border border-foreground/5 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <ShoppingBag size={16} className="text-primary" /> Order History
        </h2>
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{rows.length} ORDERS</span>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-foreground/10 text-muted-foreground'}`}>
            {f === 'unpaid' ? 'Awaiting Payment' : f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-10 text-xs text-muted-foreground font-bold uppercase tracking-widest">Loading orders…</p>
        ) : shown.length === 0 ? (
          <div className="text-center py-14 bg-foreground/5 rounded-[2rem] border border-dashed border-foreground/10">
            <ShoppingBag size={40} className="mx-auto text-secondary mb-3" />
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">No orders here yet.</p>
          </div>
        ) : shown.map(r => {
          const items: any[] = Array.isArray(r.items) ? r.items : [];
          const ref = r.order_number || r.receipt_number || r.id.slice(0, 8).toUpperCase();
          const pay = payOf(r);
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="bg-foreground/5 rounded-2xl">
              <button onClick={() => setOpen(isOpen ? null : r.id)} className="w-full p-4 text-left">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-primary text-sm">#{ref}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {r.created_at && new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}{items.length} item{items.length === 1 ? '' : 's'}{r.sale_type === 'pos' ? ' · In store' : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-sm">{money(r.total_amount, r.currency)}</p>
                    <ChevronDown size={14} className={`ml-auto mt-1 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${tone(r.status)}`}>Order: {orderLabel[r.status] || r.status}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${tone(pay)}`}>Payment: {pay === 'voided' ? 'Voided' : payLabel[pay] || pay}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-foreground/5 pt-3">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {it.image_url && <img src={it.image_url} alt={it.name} className="w-12 h-12 rounded-lg object-cover" loading="lazy" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{it.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {[it.selectedSize || it.size, it.selectedColor?.name || it.color].filter(Boolean).join(' · ')} · Qty {it.quantity || 1}
                        </p>
                      </div>
                      <p className="text-xs font-bold">{money((it.price || 0) * (it.quantity || 1), r.currency)}</p>
                    </div>
                  ))}
                  {Number(r.delivery_fee) > 0 && (
                    <div className="flex justify-between text-[11px] text-muted-foreground"><span>Delivery</span><span>{money(r.delivery_fee, r.currency)}</span></div>
                  )}
                  {r.delivery_address && <p className="text-[10px] text-muted-foreground">Deliver to: {r.delivery_address}</p>}
                  {r.order_number && (
                    <a href={`/track-order?order_number=${encodeURIComponent(r.order_number)}`}
                      className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/10">
                      <Truck size={14} /> Track this order
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
