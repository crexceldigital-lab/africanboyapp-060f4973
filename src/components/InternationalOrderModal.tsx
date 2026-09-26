import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, CheckCircle2, Loader2, MessageCircle, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { useCart } from '../context/CartContext';
import { useCountry } from '../context/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatSizeDisplay } from '../constants';
import { trackEvent } from '@/lib/analytics';
import {
  buildWhatsAppMessage, formatTsh, getIntlWhatsAppNumber, IntlCartItem, rememberRequest, requestPath, whatsappUrl,
} from '@/lib/internationalOrders';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(100),
  phone: z.string().trim().min(6, 'Please enter your WhatsApp / phone number').max(30).regex(/^\+?[\d\s()-]+$/, 'Use digits only, e.g. +1 555 123 4567'),
  email: z.string().trim().max(255).email('Invalid email').or(z.literal('')),
  country: z.string().trim().min(2, 'Please enter your country').max(80),
  city: z.string().trim().min(1, 'Please enter your city').max(80),
  address: z.string().trim().max(300),
  postcode: z.string().trim().max(20),
});

interface Props { isOpen: boolean; onClose: () => void }

interface Created { reference_number: string; access_token: string; product_total: number; cart_items: IntlCartItem[] }

export default function InternationalOrderModal({ isOpen, onClose }: Props) {
  const { cart } = useCart();
  const { user } = useCountry();
  const [form, setForm] = useState({ name: '', phone: '', email: '', country: '', city: '', address: '', postcode: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [waNumber, setWaNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(f => ({ ...f, name: f.name || user?.full_name || '', email: f.email || user?.email || '' }));
    getIntlWhatsAppNumber().then(setWaNumber);
  }, [isOpen, user]);

  const items = cart.filter(i => !String(i.id).startsWith('ticket-'));
  const productTotal = items.reduce((t, i) => t + i.price * i.quantity, 0);

  const close = () => { setCreated(null); setErrors({}); onClose(); };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      parsed.error.issues.forEach(i => { e[String(i.path[0])] = i.message; });
      setErrors(e);
      return;
    }
    if (items.length === 0) { toast({ title: 'Your cart is empty', variant: 'destructive' }); return; }
    setErrors({});
    setLoading(true);
    const d = parsed.data;
    const { data, error } = await (supabase as any).rpc('create_international_request', {
      p_customer_name: d.name, p_customer_email: d.email || null, p_customer_phone: d.phone,
      p_country: d.country, p_city: d.city, p_address: d.address || null, p_postcode: d.postcode || null,
      p_items: items.map(i => ({ product_id: i.id, size: i.selectedSize || null, colour: i.selectedColor || null, quantity: i.quantity })),
    });
    setLoading(false);
    if (error || !data) {
      toast({ title: 'Could not send request', description: error?.message || 'Please try again.', variant: 'destructive' });
      return;
    }
    rememberRequest(data.reference_number, data.access_token);
    trackEvent('international_order_request', { reference: data.reference_number, country: d.country, value: data.product_total, currency: 'TZS' });
    setCreated(data);
  };

  const waLink = created && waNumber
    ? whatsappUrl(waNumber, buildWhatsAppMessage({ ...created, customer_name: form.name.trim(), country: form.country.trim(), city: form.city.trim(), customer_phone: form.phone.trim() }))
    : null;

  const field = (key: keyof typeof form, label: string, required = false, type = 'text') => (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}{required && <span className="text-primary"> *</span>}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full bg-background border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
      />
      {errors[key] && <p className="text-[10px] text-destructive mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-popover border border-foreground/10 rounded-t-[2rem] sm:rounded-[2rem] p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                  <Globe size={20} className="text-primary" /> International <span className="text-primary">Order</span>
                </h2>
                {!created && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    International shipping is currently handled manually. Share your cart with our international fulfillment team and we'll confirm availability, shipping cost and final payment details.
                  </p>
                )}
              </div>
              <button onClick={close} aria-label="Close" className="p-2 rounded-full hover:bg-foreground/5"><X size={20} /></button>
            </div>

            {created ? (
              <div className="space-y-6 text-center">
                <CheckCircle2 size={48} className="mx-auto text-primary" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">International order request created</p>
                  <p className="text-sm text-muted-foreground mt-1">Your request has been sent successfully.</p>
                </div>
                <div className="bg-card border border-primary/30 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Reference</p>
                  <p className="text-2xl font-black text-primary tracking-wider">{created.reference_number}</p>
                </div>
                <div className="text-left bg-card rounded-2xl p-4 space-y-1 text-xs">
                  <p className="font-black uppercase tracking-widest text-[10px] mb-2">Our international team will confirm:</p>
                  {['Product availability', 'Fulfillment location', 'International shipping cost', 'Final order total', 'Payment instructions'].map(t => (
                    <p key={t} className="flex items-center gap-2"><CheckCircle2 size={12} className="text-primary" /> {t}</p>
                  ))}
                </div>
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl flex items-center justify-center gap-2">
                    <MessageCircle size={18} /> SHARE ORDER ON WHATSAPP
                  </a>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Our team has your request and will contact you on WhatsApp.</p>
                )}
                <a href={requestPath(created.reference_number, created.access_token)} className="w-full py-3 border border-foreground/15 font-black tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 hover:border-primary">
                  <ExternalLink size={14} /> VIEW MY REQUEST
                </a>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {field('name', 'Customer Name', true)}
                  {field('phone', 'WhatsApp / Phone', true, 'tel')}
                  {field('country', 'Country', true)}
                  {field('city', 'City', true)}
                  {field('email', 'Email', false, 'email')}
                  {field('postcode', 'Postcode / ZIP')}
                  <div className="sm:col-span-2">{field('address', 'Address')}</div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Cart</p>
                  {items.map(i => (
                    <div key={`${i.id}-${i.selectedSize}-${i.selectedColor}`} className="flex gap-3 bg-card rounded-2xl p-3 border border-foreground/5">
                      <img src={i.image_url} alt={i.name} className="w-14 h-14 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-bold truncate">{i.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {i.sku ? `SKU ${i.sku} · ` : ''}{i.selectedSize ? `Size ${formatSizeDisplay(i.selectedSize)} · ` : ''}{i.selectedColor ? `${i.selectedColor} · ` : ''}Qty {i.quantity}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatTsh(i.price)} each</p>
                      </div>
                      <p className="text-xs font-black text-primary whitespace-nowrap">{formatTsh(i.price * i.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-card rounded-2xl p-4 space-y-2 text-xs border border-foreground/5">
                  <div className="flex justify-between"><span className="font-bold uppercase tracking-widest text-muted-foreground">Product Total</span><span className="font-black">{formatTsh(productTotal)}</span></div>
                  <div className="flex justify-between"><span className="font-bold uppercase tracking-widest text-muted-foreground">International Shipping</span><span className="font-bold">To be confirmed</span></div>
                  <div className="flex justify-between pt-2 border-t border-foreground/10"><span className="font-black uppercase tracking-widest">Final Total</span><span className="font-black text-primary">To be confirmed</span></div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  International shipping is currently handled manually so we can find the best available shipping option for your destination.
                </p>

                <button onClick={submit} disabled={loading} className="w-full py-4 bg-primary text-primary-foreground font-black tracking-widest text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />} SEND INTERNATIONAL REQUEST
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
