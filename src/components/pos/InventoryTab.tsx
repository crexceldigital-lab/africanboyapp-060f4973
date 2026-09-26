import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromAny } from '@/lib/supabase-helpers';
import { Boxes, AlertTriangle, PackageX, History, Lock, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

const LOW_STOCK = 5;
const TYPES = [
  { v: 'STOCK_RECEIVED', l: 'Stock Received' },
  { v: 'STOCK_ADJUSTMENT', l: 'Stock Adjustment' },
  { v: 'DAMAGED', l: 'Damaged' },
  { v: 'LOST', l: 'Lost' },
  { v: 'RETURNED', l: 'Returned' },
  { v: 'MANUAL_CORRECTION', l: 'Manual Correction' },
];
const typeLabel = (t: string) => TYPES.find(x => x.v === t)?.l || t.replace(/_/g, ' ').toLowerCase();

interface Row {
  product_id: string;
  stock_quantity: number;
  variant_stock: Record<string, number>;
  product: { id: string; name: string; sku: string | null; price: number; sale_price: number | null; on_sale: boolean; category: string; description: string; image_url: string; sizes: string[] };
}
interface Movement { id: string; product_id: string; variant_key: string | null; quantity: number; movement_type: string; reason: string | null; staff_user_id: string | null; created_at: string; new_stock: number; previous_stock: number }

const tsh = (n: number) => `TSh ${Math.round(Number(n) || 0).toLocaleString()}`;
const Locked = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-xl bg-muted/40 border border-foreground/10">
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><Lock size={10} /> {label}</div>
    <div className="text-sm font-bold text-foreground mt-1 break-words">{value || '—'}</div>
    <div className="text-[10px] text-muted-foreground mt-1">Only Admin can edit this field.</div>
  </div>
);

export default function InventoryTab({ storeId, storeName }: { storeId: number; storeName?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [moves, setMoves] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [open, setOpen] = useState<Row | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: m }, { data: u }, { data: nm }] = await Promise.all([
      fromAny('product_store_availability')
        .select('product_id, stock_quantity, variant_stock, product:products(id,name,sku,price,sale_price,on_sale,category,description,image_url,sizes)')
        .eq('store_id', storeId),
      fromAny('inventory_movements').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(200),
      supabase.auth.getUser(),
      (supabase as any).rpc('get_inventory_actor_names', { p_store_id: storeId }),
    ]);
    setNames(Object.fromEntries(((nm as any[]) || []).map(x => [x.user_id, x.display_name])));
    setRows(((a as any[]) || []).filter(r => r.product) as Row[]);
    setMoves((m as Movement[]) || []);
    setMe(u.user?.id ?? null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [storeId]);

  const stats = useMemo(() => ({
    products: rows.length,
    units: rows.reduce((s, r) => s + (r.stock_quantity || 0), 0),
    low: rows.filter(r => r.stock_quantity > 0 && r.stock_quantity <= LOW_STOCK).length,
    out: rows.filter(r => r.stock_quantity <= 0).length,
  }), [rows]);

  const nameOf = (id: string) => rows.find(r => r.product_id === id)?.product.name || 'Product';
  const visible = rows
    .filter(r => r.product.name.toLowerCase().includes(q.toLowerCase()) || (r.product.sku || '').toLowerCase().includes(q.toLowerCase()))
    .filter(r => filter === 'all' ? true : filter === 'out' ? r.stock_quantity <= 0 : r.stock_quantity > 0 && r.stock_quantity <= LOW_STOCK)
    .sort((x, y) => x.product.name.localeCompare(y.product.name));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black uppercase tracking-widest text-foreground">My Store {storeName ? `— ${storeName}` : ''}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {[
            { l: 'Total Products', v: stats.products, i: Boxes, f: 'all' },
            { l: 'Total Stock Units', v: stats.units, i: Boxes, f: 'all' },
            { l: 'Low Stock Items', v: stats.low, i: AlertTriangle, f: 'low' },
            { l: 'Out of Stock', v: stats.out, i: PackageX, f: 'out' },
          ].map(s => (
            <button key={s.l} onClick={() => setFilter(s.f as any)} className="text-left p-4 rounded-2xl bg-card border border-foreground/10 hover:border-primary/50">
              <s.i size={16} className="text-primary" />
              <div className="text-2xl font-black text-foreground mt-2">{s.v.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products or SKU..." className="flex-1 min-w-[200px] px-4 py-3 rounded-2xl bg-card border border-foreground/10 text-sm text-foreground" />
        {(['all', 'low', 'out'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-foreground/10 text-muted-foreground'}`}>
            {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
          </button>
        ))}
        <button onClick={load} className="p-3 rounded-2xl bg-card border border-foreground/10 text-muted-foreground" aria-label="Refresh"><RefreshCw size={16} /></button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading inventory...</p> : (
        <div className="grid gap-2">
          {visible.map(r => (
            <div key={r.product_id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-foreground/10">
              <img src={r.product.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate">{r.product.name}</div>
                <div className="text-[11px] text-muted-foreground">{r.product.sku || 'No SKU'} · {tsh(r.product.on_sale && r.product.sale_price ? r.product.sale_price : r.product.price)}</div>
              </div>
              <div className={`text-sm font-black ${r.stock_quantity <= 0 ? 'text-destructive' : r.stock_quantity <= LOW_STOCK ? 'text-primary' : 'text-foreground'}`}>{r.stock_quantity} units</div>
              <button onClick={() => setOpen(r)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">Manage Inventory</button>
            </div>
          ))}
          {!visible.length && <p className="text-sm text-muted-foreground">No products found.</p>}
        </div>
      )}

      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2"><History size={14} /> Recent Inventory Adjustments</h3>
        <div className="mt-3 grid gap-2">
          {moves.slice(0, 15).map(m => <MoveRow key={m.id} m={m} name={nameOf(m.product_id)} me={me} names={names} />)}
          {!moves.length && <p className="text-sm text-muted-foreground">No adjustments yet.</p>}
        </div>
      </div>

      {open && <AdjustModal row={open} storeId={storeId} me={me} names={names} moves={moves.filter(m => m.product_id === open.product_id)}
        onClose={() => setOpen(null)} onDone={async () => { await load(); setOpen(null); }} />}
    </div>
  );
}

function MoveRow({ m, name, me, names }: { m: Movement; name: string; me: string | null; names: Record<string, string> }) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-card border border-foreground/10 text-sm">
      <div className="min-w-0">
        <div className="font-bold text-foreground truncate">{name}{m.variant_key ? ` — ${m.variant_key}` : ''}</div>
        <div className="text-[11px] text-muted-foreground">
          {new Date(m.created_at).toLocaleString()} · {typeLabel(m.movement_type)}{m.reason ? ` · ${m.reason}` : ''} · By: {m.staff_user_id ? `${names[m.staff_user_id] || 'Staff member'}${m.staff_user_id === me ? ' — you' : ''}` : 'System'}
        </div>
      </div>
      <div className={`font-black whitespace-nowrap ${m.quantity < 0 ? 'text-destructive' : 'text-primary'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</div>
    </div>
  );
}

function AdjustModal({ row, storeId, moves, me, names, onClose, onDone }: { row: Row; storeId: number; moves: Movement[]; me: string | null; names: Record<string, string>; onClose: () => void; onDone: () => void }) {
  const sizes = row.product.sizes || [];
  const [variant, setVariant] = useState<string>('');
  const current = variant ? Number(row.variant_stock?.[variant] ?? 0) : row.stock_quantity;
  const [qty, setQty] = useState<string>(String(current));
  const [type, setType] = useState('STOCK_RECEIVED');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setQty(String(current)); }, [variant]);

  const n = Number(qty);
  const diff = Number.isFinite(n) ? n - current : 0;

  const save = async () => {
    if (!Number.isInteger(n) || n < 0) return toast.error('Enter a whole number of 0 or more');
    if (reason.trim().length < 2) return toast.error('Please enter a reason');
    if (diff === 0) return toast.error('Quantity has not changed');
    setSaving(true);
    const { error } = await (supabase as any).rpc('adjust_store_inventory', {
      p_product_id: row.product_id, p_store_id: storeId, p_variant: variant || null,
      p_new_quantity: n, p_adjustment_type: type, p_reason: reason.trim(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Inventory updated');
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-foreground/10 p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <h3 className="text-base font-black uppercase tracking-widest text-foreground">Manage Inventory</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <img src={row.product.image_url} alt="" className="w-20 h-20 rounded-xl object-cover" />
            <Lock size={12} className="absolute top-1 right-1 text-primary" />
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <Locked label="Product Name" value={row.product.name} />
            <Locked label="SKU" value={row.product.sku || ''} />
            <Locked label="Price" value={tsh(row.product.price)} />
            <Locked label="Sale Price" value={row.product.on_sale && row.product.sale_price ? tsh(row.product.sale_price) : 'Not on sale'} />
            <Locked label="Category" value={row.product.category} />
            <Locked label="Store Assignment" value={`Store #${storeId}`} />
          </div>
        </div>
        <Locked label="Description" value={row.product.description} />

        <div className="space-y-3 p-4 rounded-2xl border border-primary/30">
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">Variant</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setVariant('')} className={`px-3 py-2 rounded-xl text-xs font-bold ${!variant ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>Store total ({row.stock_quantity})</button>
            {sizes.map(s => (
              <button key={s} onClick={() => setVariant(s)} className={`px-3 py-2 rounded-xl text-xs font-bold ${variant === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                {s} ({Number(row.variant_stock?.[s] ?? 0)})
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">Current stock</label>
              <div className="text-2xl font-black text-foreground">{current}</div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">New stock</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(String(Math.max(0, (Number(qty) || 0) - 1)))} className="w-9 h-9 rounded-xl bg-muted text-foreground font-black">−</button>
                <input type="number" min={0} value={qty} onChange={e => setQty(e.target.value)} className="w-24 px-3 py-2 rounded-xl bg-background border border-foreground/10 text-foreground font-bold" />
                <button onClick={() => setQty(String((Number(qty) || 0) + 1))} className="w-9 h-9 rounded-xl bg-muted text-foreground font-black">+</button>
              </div>
              <div className={`text-xs font-bold mt-1 ${diff < 0 ? 'text-destructive' : 'text-primary'}`}>{diff > 0 ? '+' : ''}{diff}</div>
            </div>
          </div>
          {variant && <p className="text-[11px] text-muted-foreground">Changing a size also moves this store's total by the same amount.</p>}
          <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-foreground/10 text-foreground text-sm">
            {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder='Reason, e.g. "New stock received"' className="w-full px-3 py-2 rounded-xl bg-background border border-foreground/10 text-foreground text-sm" />
          <button disabled={saving} onClick={save} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Adjustment'}
          </button>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2"><History size={12} /> Inventory History</h4>
          <div className="mt-2 grid gap-2">
            {moves.map(m => <MoveRow key={m.id} m={m} name={row.product.name} me={me} names={names} />)}
            {!moves.length && <p className="text-xs text-muted-foreground">No history yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
