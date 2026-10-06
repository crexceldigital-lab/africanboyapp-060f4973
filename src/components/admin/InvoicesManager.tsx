import { useEffect, useMemo, useState } from 'react';
import { FileText, Search, Trash2, ChevronDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePdf } from '@/lib/invoicePdf';
import { DEFAULT_INVOICE_SETTINGS, type InvoiceSettings } from '../../types';

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  items: { name: string; description?: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  tax_percent: number;
  delivery_fee: number;
  discount_amount: number;
  total_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
};

const STATUSES = ['pending', 'unpaid', 'partially_paid', 'paid'];
const money = (n: number, c: string) => `${c === 'TZS' ? 'TSh' : c} ${Math.round(Number(n) || 0).toLocaleString()}`;
const tone = (s: string) =>
  s === 'paid' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  : s === 'unpaid' ? 'text-destructive bg-destructive/10 border-destructive/20'
  : 'text-primary bg-primary/10 border-primary/20';

export default function InvoicesManager() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('invoices').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) toast.error(`Could not load invoices: ${error.message}`);
    setRows((data as Invoice[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    (supabase as any)
      .from('invoice_settings').select('*').eq('store_id', 1).maybeSingle()
      .then(({ data }: { data: InvoiceSettings | null }) => {
        if (data) setSettings({ ...DEFAULT_INVOICE_SETTINGS, ...data });
      });
    const h = () => load();
    window.addEventListener('invoices:changed', h);
    return () => window.removeEventListener('invoices:changed', h);
  }, []);

  const download = async (r: Invoice) => {
    setDownloading(r.id);
    try {
      generateInvoicePdf({
        invoice_number: r.invoice_number,
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone,
        delivery_address: null,
        issue_date: r.issue_date,
        due_date: r.due_date,
        currency: r.currency,
        items: (r.items || []).map(it => ({ name: it.name, description: it.description, quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) || 0 })),
        subtotal: Number(r.subtotal) || 0,
        tax_percent: Number(r.tax_percent) || 0,
        delivery_fee: Number(r.delivery_fee) || 0,
        discount_amount: Number(r.discount_amount) || 0,
        total_amount: Number(r.total_amount) || 0,
        payment_status: r.payment_status,
        notes: r.notes,
      }, settings, `${r.invoice_number}-${r.customer_name.replace(/[^a-zA-Z0-9]+/g, '-')}`);
    } catch (e) {
      toast.error(`Could not generate the PDF: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setDownloading(null);
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r =>
      (status === 'all' || r.payment_status === status) &&
      (!q || [r.invoice_number, r.customer_name, r.customer_email, r.customer_phone].some(v => v?.toLowerCase().includes(q))));
  }, [rows, query, status]);

  const totals = useMemo(() => ({
    count: rows.length,
    paid: rows.filter(r => r.payment_status === 'paid').reduce((a, r) => a + Number(r.total_amount), 0),
    outstanding: rows.filter(r => r.payment_status !== 'paid').reduce((a, r) => a + Number(r.total_amount), 0),
  }), [rows]);

  const updateStatus = async (id: string, payment_status: string) => {
    const { error } = await (supabase as any).from('invoices').update({ payment_status }).eq('id', id);
    if (error) return toast.error(error.message);
    setRows(rs => rs.map(r => (r.id === id ? { ...r, payment_status } : r)));
    toast.success('Invoice status updated');
  };

  const remove = async (r: Invoice) => {
    if (!confirm(`Delete invoice ${r.invoice_number}?`)) return;
    const { error } = await (supabase as any).from('invoices').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    setRows(rs => rs.filter(x => x.id !== r.id));
    toast.success('Invoice deleted');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ['Invoices issued', String(totals.count)],
          ['Paid', money(totals.paid, 'TZS')],
          ['Outstanding', money(totals.outstanding, 'TZS')],
        ].map(([l, v]) => (
          <div key={l} className="bg-card border border-foreground/5 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{l}</p>
            <p className="text-2xl font-black mt-1">{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-foreground/5 rounded-[2rem] p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} className="text-primary" /> Issued Invoices
          </h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search invoice or customer"
                className="pl-8 pr-3 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-xs outline-none w-56" />
            </div>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-xs font-bold uppercase">
              <option value="all">All</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-10 text-xs text-muted-foreground font-bold uppercase tracking-widest">Loading invoices…</p>
        ) : shown.length === 0 ? (
          <p className="text-center py-14 text-sm text-muted-foreground font-bold uppercase tracking-widest">No invoices yet. Issue one from Customers or Orders.</p>
        ) : (
          <div className="space-y-2">
            {shown.map(r => {
              const isOpen = open === r.id;
              return (
                <div key={r.id} className="bg-foreground/5 rounded-2xl">
                  <div className="p-4 flex flex-wrap items-center gap-3">
                    <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex-1 min-w-[200px] text-left">
                      <p className="font-black text-primary text-sm font-mono">{r.invoice_number}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.customer_name} · Issued {r.issue_date}{r.due_date ? ` · Due ${r.due_date}` : ''}
                      </p>
                    </button>
                    <p className="font-black text-sm">{money(r.total_amount, r.currency)}</p>
                    <select value={r.payment_status} onChange={e => updateStatus(r.id, e.target.value)}
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-transparent ${tone(r.payment_status)}`}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <button onClick={() => setOpen(isOpen ? null : r.id)} aria-label="Show details">
                      <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={() => download(r)} aria-label="Download invoice PDF" title="Download PDF"
                      disabled={downloading === r.id} className="text-primary disabled:opacity-50">
                      {downloading === r.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </button>
                    <button onClick={() => remove(r)} aria-label="Delete invoice" className="text-destructive">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-3 border-t border-foreground/5 space-y-2 text-xs">
                      {(r.items || []).map((it, i) => (
                        <div key={i} className="flex justify-between gap-3">
                          <span><b>{it.name}</b>{it.description ? ` — ${it.description}` : ''} × {it.quantity}</span>
                          <span>{money(it.quantity * it.unitPrice, r.currency)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-foreground/5 space-y-1 text-muted-foreground">
                        <div className="flex justify-between"><span>Subtotal</span><span>{money(r.subtotal, r.currency)}</span></div>
                        {Number(r.tax_percent) > 0 && <div className="flex justify-between"><span>Tax ({r.tax_percent}%)</span><span>{money(r.subtotal * r.tax_percent / 100, r.currency)}</span></div>}
                        {Number(r.delivery_fee) > 0 && <div className="flex justify-between"><span>Delivery</span><span>{money(r.delivery_fee, r.currency)}</span></div>}
                        {Number(r.discount_amount) > 0 && <div className="flex justify-between"><span>Discount</span><span>-{money(r.discount_amount, r.currency)}</span></div>}
                        <div className="flex justify-between font-black text-foreground"><span>Total</span><span>{money(r.total_amount, r.currency)}</span></div>
                      </div>
                      {(r.customer_email || r.customer_phone) && <p className="text-muted-foreground">{[r.customer_email, r.customer_phone].filter(Boolean).join(' · ')}</p>}
                      {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
