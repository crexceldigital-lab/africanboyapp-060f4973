import { useEffect, useState } from 'react';
import { Globe, Loader2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney, formatTsh, INTL_LOCATIONS, INTL_STATUSES, IntlRequest, intlTable, statusLabel } from '@/lib/internationalOrders';

export default function InternationalOrdersManager() {
  const [rows, setRows] = useState<IntlRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<IntlRequest | null>(null);
  const [wa, setWa] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = async () => {
    setLoading(true);
    const { data, error } = await intlTable().select('*').order('created_at', { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    setRows((data || []) as IntlRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    (supabase as any).from('app_settings').select('value').eq('key', 'intl_whatsapp_number').maybeSingle().then(({ data }: any) => setWa(data?.value || ''));
  }, []);

  const saveWa = async () => {
    const digits = wa.replace(/\D/g, '');
    if (digits && (digits.length < 8 || digits.length > 15)) { toast.error('Enter the full international number, e.g. +234 803 123 4567'); return; }
    const { error } = await (supabase as any).from('app_settings').upsert({ key: 'intl_whatsapp_number', value: digits ? `+${digits}` : '', is_public: true, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { setWa(digits ? `+${digits}` : ''); toast.success('WhatsApp number saved'); }
  };

  const shown = statusFilter === 'ALL' ? rows : rows.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-foreground/5 rounded-2xl p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nigeria fulfillment WhatsApp (international format)</label>
          <input value={wa} onChange={e => setWa(e.target.value)} placeholder="+234..." className="mt-1 w-full bg-background border border-foreground/10 rounded-xl px-4 py-2.5 text-sm" />
        </div>
        <button onClick={saveWa} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black tracking-widest">SAVE</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Globe size={16} className="text-primary" /> International Orders ({shown.length})</h2>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-card border border-foreground/10 rounded-xl px-3 py-2 text-xs">
          <option value="ALL">All statuses</option>
          {INTL_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div> : (
        <div className="overflow-x-auto bg-card border border-foreground/5 rounded-2xl">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>{['Reference', 'Customer', 'Country', 'City', 'Products', 'Product Total', 'Shipping', 'Final Total', 'Fulfillment', 'Status', 'Created', ''].map(h => <th key={h} className="text-left p-3 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id} className="border-t border-foreground/5 hover:bg-foreground/5">
                  <td className="p-3 font-black text-primary whitespace-nowrap">{r.reference_number}</td>
                  <td className="p-3 whitespace-nowrap">{r.customer_name}</td>
                  <td className="p-3">{r.country}</td>
                  <td className="p-3">{r.city}</td>
                  <td className="p-3">{r.cart_items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="p-3 whitespace-nowrap">{formatTsh(r.product_total)}</td>
                  <td className="p-3 whitespace-nowrap">{formatMoney(r.shipping_cost, r.shipping_currency)}</td>
                  <td className="p-3 whitespace-nowrap">{formatMoney(r.final_total, r.final_currency)}</td>
                  <td className="p-3">{INTL_LOCATIONS.find(l => l.value === r.fulfillment_location)?.label || '—'}</td>
                  <td className="p-3 whitespace-nowrap">{statusLabel(r.status)}</td>
                  <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="p-3"><button onClick={() => setOpen(r)} className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary font-black text-[10px] tracking-widest">OPEN</button></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={12} className="p-8 text-center text-muted-foreground">No international requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {open && <Detail req={open} onClose={() => setOpen(null)} onSaved={(r) => { setRows(rows.map(x => x.id === r.id ? r : x)); setOpen(r); }} />}
    </div>
  );
}

function Detail({ req, onClose, onSaved }: { req: IntlRequest; onClose: () => void; onSaved: (r: IntlRequest) => void }) {
  const [f, setF] = useState({
    fulfillment_location: req.fulfillment_location || '',
    status: req.status,
    shipping_cost: req.shipping_cost?.toString() || '',
    shipping_currency: req.shipping_currency || 'USD',
    final_total: req.final_total?.toString() || '',
    final_currency: req.final_currency || 'USD',
    shipping_provider: req.shipping_provider || '',
    estimated_delivery: req.estimated_delivery || '',
    shipping_notes: req.shipping_notes || '',
  });
  const [saving, setSaving] = useState(false);

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const save = async (asQuote = false) => {
    const sc = num(f.shipping_cost), ft = num(f.final_total);
    if ((sc != null && (isNaN(sc) || sc < 0)) || (ft != null && (isNaN(ft) || ft < 0))) { toast.error('Amounts must be positive numbers'); return; }
    if (asQuote && (sc == null || ft == null)) { toast.error('Enter shipping cost and final total to send a quote'); return; }
    setSaving(true);
    const patch = {
      fulfillment_location: f.fulfillment_location || null,
      status: asQuote ? 'SHIPPING_QUOTE' : f.status,
      shipping_cost: sc, shipping_currency: f.shipping_currency.trim().toUpperCase().slice(0, 3) || null,
      final_total: ft, final_currency: f.final_currency.trim().toUpperCase().slice(0, 3) || null,
      shipping_provider: f.shipping_provider.trim().slice(0, 80) || null,
      estimated_delivery: f.estimated_delivery.trim().slice(0, 80) || null,
      shipping_notes: f.shipping_notes.trim().slice(0, 1000) || null,
    };
    const { data, error } = await intlTable().update(patch).eq('id', req.id).select('*').single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(asQuote ? 'Quote sent — customer can now confirm' : 'Saved');
    setF(x => ({ ...x, status: data.status }));
    onSaved(data as IntlRequest);
  };

  const input = 'mt-1 w-full bg-background border border-foreground/10 rounded-xl px-3 py-2 text-sm';
  const label = 'text-[10px] font-black uppercase tracking-widest text-muted-foreground';

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-popover border border-foreground/10 rounded-[2rem] p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <p className={label}>International Order</p>
            <h3 className="text-2xl font-black text-primary">{req.reference_number}</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-foreground/5"><X size={20} /></button>
        </div>

        <section className="grid grid-cols-2 gap-3 text-xs bg-card rounded-2xl p-4">
          <p className={`${label} col-span-2`}>Customer</p>
          {[['Name', req.customer_name], ['Phone', req.customer_phone], ['Email', req.customer_email], ['Country', req.country], ['City', req.city], ['Postcode', req.postcode], ['Address', req.address]].map(([k, v]) => (
            <div key={k as string} className={k === 'Address' ? 'col-span-2' : ''}><span className="text-muted-foreground">{k}: </span><span className="font-bold">{v || '—'}</span></div>
          ))}
        </section>

        <section className="space-y-2">
          <p className={label}>Order Items</p>
          {req.cart_items.map((i, idx) => (
            <div key={idx} className="flex gap-3 bg-card rounded-xl p-3 text-xs">
              {i.product_image && <img src={i.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
              <div className="flex-1"><p className="font-bold">{i.product_name}</p><p className="text-[10px] text-muted-foreground">SKU {i.sku || '—'} · Size {i.size || '—'} · Colour {i.colour || '—'} · Qty {i.quantity}</p></div>
              <p className="font-black">{formatTsh(i.unit_price)}</p>
            </div>
          ))}
          <p className="text-right text-xs font-black">Product total: {formatTsh(req.product_total)}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <p className={`${label} col-span-2`}>Fulfillment & Status</p>
          <div className="col-span-2 flex gap-2">
            {INTL_LOCATIONS.map(l => (
              <button key={l.value} onClick={() => setF({ ...f, fulfillment_location: l.value })} className={`flex-1 py-2.5 rounded-xl border text-xs font-black ${f.fulfillment_location === l.value ? 'bg-primary text-primary-foreground border-primary' : 'border-foreground/10'}`}>{l.label}</button>
            ))}
          </div>
          <div className="col-span-2 flex flex-wrap gap-1.5">
            {INTL_STATUSES.map(s => (
              <button key={s} onClick={() => setF({ ...f, status: s })} className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${f.status === s ? 'bg-primary text-primary-foreground border-primary' : 'border-foreground/10 text-muted-foreground'}`}>{statusLabel(s)}</button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <p className={`${label} col-span-2`}>Shipping Quote</p>
          <div><label className={label}>Shipping cost</label><input className={input} inputMode="decimal" value={f.shipping_cost} onChange={e => setF({ ...f, shipping_cost: e.target.value })} /></div>
          <div><label className={label}>Currency</label><input className={input} value={f.shipping_currency} onChange={e => setF({ ...f, shipping_currency: e.target.value })} /></div>
          <div><label className={label}>Final total</label><input className={input} inputMode="decimal" value={f.final_total} onChange={e => setF({ ...f, final_total: e.target.value })} /></div>
          <div><label className={label}>Currency</label><input className={input} value={f.final_currency} onChange={e => setF({ ...f, final_currency: e.target.value })} /></div>
          <div><label className={label}>Shipping provider</label><input className={input} placeholder="DHL" value={f.shipping_provider} onChange={e => setF({ ...f, shipping_provider: e.target.value })} /></div>
          <div><label className={label}>Estimated delivery</label><input className={input} placeholder="5–8 business days" value={f.estimated_delivery} onChange={e => setF({ ...f, estimated_delivery: e.target.value })} /></div>
          <div className="col-span-2"><label className={label}>Shipping notes</label><textarea className={input} rows={2} value={f.shipping_notes} onChange={e => setF({ ...f, shipping_notes: e.target.value })} /></div>
          <p className="col-span-2 text-[10px] text-muted-foreground">Enter the final total yourself — products are priced in TSh and no currency conversion is applied automatically.</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button disabled={saving} onClick={() => save(false)} className="py-3 border border-foreground/15 rounded-2xl text-xs font-black tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"><Save size={14} /> SAVE</button>
          <button disabled={saving} onClick={() => save(true)} className="py-3 bg-primary text-primary-foreground rounded-2xl text-xs font-black tracking-widest disabled:opacity-50">SEND QUOTE</button>
        </div>
      </div>
    </div>
  );
}
