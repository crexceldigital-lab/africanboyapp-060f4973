import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, Truck, CheckCircle2, Clock, MapPin, AlertCircle, Phone, Mail, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { castOrders } from '@/lib/supabase-helpers';
import type { Order, OrderShipment, OrderActivity } from '@/types';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function TrackOrder() {
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [contactInput, setContactInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searched, setSearched] = useState(false);

  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [shipments, setShipments] = useState<OrderShipment[]>([]);
  const [activities, setActivities] = useState<OrderActivity[]>([]);

  // Auto query if URL parameters are present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderNum = params.get('order_number') || params.get('order_id');
    const phoneOrEmail = params.get('phone') || params.get('email');

    if (orderNum) {
      setOrderNumberInput(orderNum);
      if (phoneOrEmail) {
        setContactInput(phoneOrEmail);
        performLookup(orderNum, phoneOrEmail);
      }
    }
  }, []);

  const performLookup = async (orderNum: string, contact: string) => {
    if (!orderNum.trim()) {
      setErrorMsg('Please enter your Order Number');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSearched(true);
    setFoundOrder(null);
    setShipments([]);
    setActivities([]);

    try {
      const cleanOrderNum = orderNum.trim();
      const cleanContact = contact.trim().toLowerCase();

      // Query order matching order_number OR id
      let query = (supabase as any).from('orders').select('*');

      if (cleanOrderNum.startsWith('AFB-')) {
        query = query.eq('order_number', cleanOrderNum);
      } else {
        query = query.or(`order_number.eq.${cleanOrderNum},id.eq.${cleanOrderNum}`);
      }

      const { data: orderData, error: orderErr } = await query;

      if (orderErr) throw orderErr;
      if (!orderData || orderData.length === 0) {
        setErrorMsg('No order found with that Order Number. Please check and try again.');
        return;
      }

      const orderList = castOrders(orderData);
      let matchedOrder = orderList[0];

      // If contact provided, verify phone or email
      if (cleanContact) {
        const matchesPhone = matchedOrder.customer_phone?.toLowerCase().includes(cleanContact);
        const matchesEmail = matchedOrder.customer_email?.toLowerCase().includes(cleanContact);
        if (!matchesPhone && !matchesEmail) {
          setErrorMsg('Verification failed. Phone number or email does not match order records.');
          return;
        }
      }

      setFoundOrder(matchedOrder);

      // Fetch shipments for this order
      const { data: shipmentData } = await (supabase as any)
        .from('order_shipments')
        .select(`
          *,
          items:order_shipment_items(*)
        `)
        .eq('order_id', matchedOrder.id)
        .order('created_at', { ascending: false });

      if (shipmentData) {
        setShipments(shipmentData as OrderShipment[]);
      }

      // Fetch order activities
      const { data: activityData } = await (supabase as any)
        .from('order_activity')
        .select('*')
        .eq('order_id', matchedOrder.id)
        .order('created_at', { ascending: false });

      if (activityData) {
        setActivities(activityData as OrderActivity[]);
      }
    } catch (err: any) {
      console.error('Track order error:', err);
      setErrorMsg(err.message || 'Failed to search order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(orderNumberInput, contactInput);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'shipped' || s === 'delivered') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
          <CheckCircle2 size={12} /> {status}
        </span>
      );
    }
    if (s === 'in_progress' || s === 'partially_shipped') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1.5">
          <Truck size={12} /> In Progress
        </span>
      );
    }
    if (s === 'cancelled' || s === 'refunded') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1.5">
          <AlertCircle size={12} /> {status}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
        <Clock size={12} /> Pending Fulfillment
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 space-y-8">
        {/* Banner Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-widest uppercase">
            <Package size={14} /> Official African Boy Order Tracker
          </div>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight">
            Track Your <span className="text-primary">Order</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Enter your Order Number and registered Phone/Email to check live status, item fulfillment, and courier tracking details.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-card border border-foreground/10 rounded-3xl p-6 md:p-8 shadow-xl max-w-2xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Order Number *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. AFB-2026-100024"
                  value={orderNumberInput}
                  onChange={e => setOrderNumberInput(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-secondary/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all uppercase"
                />
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number or Email</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. +255 700 000 000 or email@domain.com"
                  value={contactInput}
                  onChange={e => setContactInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-secondary/50 border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
                />
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              </div>
            </div>

            {errorMsg && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'LOOKING UP ORDER...' : (
                <>
                  <Search size={18} /> Track Order
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Details Display */}
        {foundOrder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header Card */}
            <div className="bg-card border border-foreground/10 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black italic uppercase tracking-tight">
                    Order <span className="text-primary">#{foundOrder.order_number || foundOrder.id.slice(0, 8)}</span>
                  </h2>
                  {getStatusBadge(foundOrder.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Placed on {new Date(foundOrder.created_at).toLocaleString()} {foundOrder.is_guest && '• Guest Order'}
                </p>
              </div>

              <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-foreground/10 pt-4 md:pt-0 md:pl-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Total Amount</span>
                  <span className="text-xl font-black text-primary">{foundOrder.total_amount.toLocaleString()} {foundOrder.currency || 'TZS'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Payment Status</span>
                  <span className="text-sm font-bold uppercase text-emerald-500">{foundOrder.payment_status || 'Paid'}</span>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Columns: Items & Shipments */}
              <div className="lg:col-span-2 space-y-6">
                {/* Order Items Table */}
                <div className="bg-card border border-foreground/10 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
                    <Package size={20} className="text-primary" /> Order Items & Fulfillment
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-foreground/10 text-muted-foreground uppercase text-[10px] font-black">
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3 text-center">Ordered</th>
                          <th className="py-2.5 px-3 text-center">Shipped</th>
                          <th className="py-2.5 px-3 text-center">Remaining</th>
                          <th className="py-2.5 px-3 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-foreground/5">
                        {foundOrder.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-secondary/30">
                            <td className="py-3 px-3 font-bold">
                              {item.name}
                              {(item.size || item.color) && (
                                <span className="block text-[10px] text-muted-foreground font-normal">
                                  {[item.color, item.size].filter(Boolean).join(' / ')}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                            <td className="py-3 px-3 text-center font-bold text-emerald-500">{item.quantity_shipped || 0}</td>
                            <td className="py-3 px-3 text-center font-bold text-amber-500">{item.quantity_remaining ?? Math.max(0, item.quantity - (item.quantity_shipped || 0))}</td>
                            <td className="py-3 px-3 text-right font-bold">{item.price.toLocaleString()} {foundOrder.currency || 'TZS'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Shipments List */}
                <div className="bg-card border border-foreground/10 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
                    <Truck size={20} className="text-primary" /> Package Shipments ({shipments.length})
                  </h3>

                  {shipments.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs font-bold bg-secondary/30 rounded-2xl">
                      No shipments created yet. Your order is being prepared by our fulfillment team.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shipments.map((s) => (
                        <div key={s.id} className="p-4 bg-secondary/40 border border-foreground/10 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-primary tracking-wider">{s.carrier}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{new Date(s.shipped_at).toLocaleString()}</span>
                          </div>
                          {s.tracking_number && (
                            <div className="text-xs font-mono font-bold bg-card px-3 py-1.5 rounded-lg border border-foreground/5 inline-block">
                              Tracking #: <span className="text-primary">{s.tracking_number}</span>
                            </div>
                          )}
                          {s.items && s.items.length > 0 && (
                            <div className="pt-2 border-t border-foreground/5 space-y-1">
                              <span className="text-[10px] font-black uppercase text-muted-foreground">Items in this package:</span>
                              <div className="flex flex-wrap gap-2">
                                {s.items.map((si, sidx) => (
                                  <span key={sidx} className="px-2.5 py-1 bg-card rounded-md border text-[11px] font-bold">
                                    {si.product_name} × {si.quantity_shipped}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 1 Column: Address & Timeline */}
              <div className="space-y-6">
                {/* Customer Details */}
                <div className="bg-card border border-foreground/10 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-black italic uppercase tracking-tight flex items-center gap-2 text-primary">
                    <MapPin size={16} /> Delivery Information
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Recipient</span>
                      <span className="font-bold">{foundOrder.customer_name || 'Customer'}</span>
                    </div>
                    {foundOrder.customer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-muted-foreground" />
                        <span className="font-medium">{foundOrder.customer_phone}</span>
                      </div>
                    )}
                    {foundOrder.customer_email && (
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-muted-foreground" />
                        <span className="font-medium">{foundOrder.customer_email}</span>
                      </div>
                    )}
                    {foundOrder.delivery_zone && (
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mt-2">Delivery Address / Zone</span>
                        <p className="font-medium bg-secondary/50 p-2.5 rounded-xl border border-foreground/5">{foundOrder.delivery_zone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="bg-card border border-foreground/10 rounded-3xl p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-black italic uppercase tracking-tight flex items-center gap-2 text-primary">
                    <Clock size={16} /> Order Activity Log
                  </h3>

                  {activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Order recorded into database.</p>
                  ) : (
                    <div className="relative pl-4 space-y-4 border-l-2 border-primary/20">
                      {activities.map((act) => (
                        <div key={act.id} className="relative text-xs space-y-0.5">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                          <div className="font-bold text-foreground">{act.action.replace('_', ' ')}</div>
                          <p className="text-[11px] text-muted-foreground">{act.details}</p>
                          <span className="text-[9px] text-muted-foreground font-mono block">{new Date(act.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
