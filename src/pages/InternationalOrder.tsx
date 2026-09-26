import { useCallback, useEffect, useState } from 'react';
import { Globe, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatMoney, formatTsh, IntlRequest, statusLabel, tokenFor } from '@/lib/internationalOrders';

export default function InternationalOrder() {
  const ref = decodeURIComponent(window.location.pathname.split('/').pop() || '');
  const token = new URLSearchParams(window.location.search).get('t') || tokenFor(ref);
  const [req, setReq] = useState<IntlRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).rpc('get_international_request', { p_reference: ref, p_token: token || null });
    setReq(data || null);
    setLoading(false);
  }, [ref, token]);

  useEffect(() => { load(); }, [load]);

  const respond = async (accept: boolean) => {
    if (!accept && !confirm('Decline this quote and cancel the request?')) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('respond_international_quote', { p_reference: ref, p_token: token || null, p_accept: accept });
    setBusy(false);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    toast({ title: accept ? 'Order confirmed' : 'Quote declined', description: accept ? 'Our team will send you payment instructions.' : undefined });
    load();
  };

  const hasQuote = req && req.shipping_cost != null;
  const canRespond = req && hasQuote && (req.status === 'SHIPPING_QUOTE' || req.status === 'AWAITING_CUSTOMER');

  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <a href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"><ArrowLeft size={14} /> African Boy</a>
        <h1 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2"><Globe className="text-primary" /> International <span className="text-primary">Order Request</span></h1>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : !req ? (
          <div className="bg-card rounded-2xl p-6 text-sm text-muted-foreground border border-foreground/5">
            We couldn't find this request. Open it from the link you received, or sign in to the account you used.
          </div>
        ) : (
          <>
            <div className="bg-card rounded-2xl p-5 border border-primary/30 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reference</p>
                <p className="text-xl font-black text-primary">{req.reference_number}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{req.city}, {req.country} · {new Date(req.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-primary/40 text-primary">{statusLabel(req.status)}</span>
            </div>

            <div className="space-y-2">
              {req.cart_items.map((i, idx) => (
                <div key={idx} className="flex gap-3 bg-card rounded-2xl p-3 border border-foreground/5 text-xs">
                  {i.product_image && <img src={i.product_image} alt={i.product_name} className="w-14 h-14 rounded-xl object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{i.product_name}</p>
                    <p className="text-[10px] text-muted-foreground">{i.sku ? `SKU ${i.sku} · ` : ''}{i.size ? `Size ${i.size} · ` : ''}{i.colour ? `${i.colour} · ` : ''}Qty {i.quantity}</p>
                  </div>
                  <p className="font-black text-primary whitespace-nowrap">{formatTsh(i.total_price)}</p>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-2xl p-5 space-y-2 text-xs border border-foreground/5">
              {hasQuote && <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">International Shipping Quote</p>}
              <div className="flex justify-between"><span className="text-muted-foreground font-bold uppercase tracking-widest">Products</span><span className="font-black">{formatTsh(req.product_total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground font-bold uppercase tracking-widest">Shipping</span><span className="font-bold">{formatMoney(req.shipping_cost, req.shipping_currency)}</span></div>
              {req.shipping_provider && <div className="flex justify-between"><span className="text-muted-foreground font-bold uppercase tracking-widest">Provider</span><span>{req.shipping_provider}</span></div>}
              {req.estimated_delivery && <div className="flex justify-between"><span className="text-muted-foreground font-bold uppercase tracking-widest">Estimated delivery</span><span>{req.estimated_delivery}</span></div>}
              <div className="flex justify-between pt-2 border-t border-foreground/10"><span className="font-black uppercase tracking-widest">Final Total</span><span className="font-black text-primary">{formatMoney(req.final_total, req.final_currency)}</span></div>
              {req.shipping_notes && <p className="text-[11px] text-muted-foreground pt-2">{req.shipping_notes}</p>}
            </div>

            {canRespond ? (
              <div className="grid grid-cols-2 gap-3">
                <button disabled={busy} onClick={() => respond(false)} className="py-4 border border-foreground/15 rounded-2xl font-black text-xs tracking-widest disabled:opacity-50">DECLINE</button>
                <button disabled={busy} onClick={() => respond(true)} className="py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs tracking-widest disabled:opacity-50">CONFIRM ORDER</button>
              </div>
            ) : req.status === 'PAYMENT_PENDING' ? (
              <p className="text-xs flex items-center gap-2"><CheckCircle2 size={14} className="text-primary" /> Confirmed. Our team will send you payment instructions.</p>
            ) : !hasQuote ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">International shipping is currently handled manually so we can find the best available shipping option for your destination. We'll share your quote here.</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
