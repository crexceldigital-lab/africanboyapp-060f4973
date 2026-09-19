import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Order, OrderShipment, OrderActivity } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, User, MapPin, CreditCard, Calendar, CheckCircle2, Clock, AlertTriangle, Truck, PlusCircle, ShieldCheck } from 'lucide-react';
import { formatSizeDisplay } from '../../constants';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export default function OrderDetailsModal({ order, isOpen, onClose, onOrderUpdated }: OrderDetailsModalProps) {
  const [updating, setUpdating] = useState(false);
  const [shipments, setShipments] = useState<OrderShipment[]>([]);
  const [activities, setActivities] = useState<OrderActivity[]>([]);

  // Create Shipment Modal state
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const [carrier, setCarrier] = useState('Standard Courier');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipmentNotes, setShipmentNotes] = useState('');
  const [shipmentItemQuantities, setShipmentItemQuantities] = useState<Record<string, number>>({});
  const [shipmentSubmitting, setShipmentSubmitting] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      fetchFulfillmentData(order.id);
      // Initialize shipment quantities to remaining quantities
      const initialQtys: Record<string, number> = {};
      (order.items || []).forEach((item, idx) => {
        const key = item.product_id || item.name || `item-${idx}`;
        const remaining = item.quantity_remaining ?? Math.max(0, item.quantity - (item.quantity_shipped || 0));
        initialQtys[key] = remaining;
      });
      setShipmentItemQuantities(initialQtys);
    }
  }, [order, isOpen]);

  const fetchFulfillmentData = async (orderId: string) => {
    try {
      // Fetch Shipments
      const { data: sData } = await (supabase as any)
        .from('order_shipments')
        .select(`*, items:order_shipment_items(*)`)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (sData) setShipments(sData as OrderShipment[]);

      // Fetch Activities
      const { data: aData } = await (supabase as any)
        .from('order_activity')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (aData) setActivities(aData as OrderActivity[]);
    } catch (e) {
      console.error('Failed to fetch fulfillment data:', e);
    }
  };

  if (!order) return null;

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    setUpdating(false);
    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success(`Order status updated to ${newStatus.replace('_', ' ')}`);
      order.status = newStatus;
      if (onOrderUpdated) onOrderUpdated();
    }
  };

  const handleCreateShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShipmentSubmitting(true);

    try {
      const itemsToShip = (order.items || []).map((item, idx) => {
        const key = item.product_id || item.name || `item-${idx}`;
        const qtyToShip = shipmentItemQuantities[key] || 0;
        return {
          product_id: item.product_id || null,
          name: item.name,
          quantity: qtyToShip,
        };
      }).filter(i => i.quantity > 0);

      if (itemsToShip.length === 0) {
        toast.error('Select at least one item quantity to ship.');
        setShipmentSubmitting(false);
        return;
      }

      const { data, error } = await (supabase as any).rpc('create_order_shipment', {
        p_order_id: order.id,
        p_carrier: carrier,
        p_tracking_number: trackingNumber || null,
        p_notes: shipmentNotes || null,
        p_items: itemsToShip,
        p_actor_name: 'Admin / Staff',
      });

      if (error) throw error;

      toast.success('Shipment successfully created!');
      setIsShipmentModalOpen(false);
      setCarrier('Standard Courier');
      setTrackingNumber('');
      setShipmentNotes('');

      fetchFulfillmentData(order.id);
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: any) {
      console.error('Shipment error:', err);
      toast.error(err.message || 'Failed to create shipment');
    } finally {
      setShipmentSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_progress':
        return 'bg-primary text-primary-foreground border-primary';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'cancelled':
      case 'refunded':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-foreground/10';
    }
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const deliveryFee = Number(order.delivery_fee) || 0;
  const totalAmount = Number(order.total_amount) || (subtotal + deliveryFee);
  const amountPaid = order.amount_paid ?? (order.status === 'completed' ? totalAmount : 0);
  const balance = order.balance ?? Math.max(0, totalAmount - amountPaid);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl bg-card border border-foreground/10 rounded-[32px] p-8 text-foreground max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
          <DialogHeader className="border-b border-foreground/5 pb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="text-primary text-[10px] font-black uppercase tracking-widest">Order & Fulfillment Center</span>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2 mt-1">
                  Order #{order.order_number || order.id.substring(0, 8)}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-2">
                  <Calendar size={12} />
                  {new Date(order.created_at).toLocaleString()}
                  {order.is_guest && <span className="text-primary font-bold">• Guest Order</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsShipmentModalOpen(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Truck size={14} /> Mark as Shipped
                </button>
                <select
                  value={order.status}
                  disabled={updating}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border outline-none cursor-pointer transition-all ${getStatusBadge(order.status)}`}
                >
                  <option value="pending" className="bg-card text-foreground">Pending</option>
                  <option value="in_progress" className="bg-card text-foreground">In Progress</option>
                  <option value="completed" className="bg-card text-foreground">Completed</option>
                  <option value="cancelled" className="bg-card text-foreground">Cancelled</option>
                  <option value="refunded" className="bg-card text-foreground">Refunded</option>
                </select>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-6">
            {/* Customer & Financial Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Info Card */}
              <div className="bg-background/40 border border-foreground/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                  <User size={14} /> Customer Information
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black italic">{order.customer_name || 'Anonymous Customer'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{order.customer_email || 'No email provided'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{order.customer_phone || 'No phone provided'}</p>
                </div>
              </div>

              {/* Delivery & Payment Card */}
              <div className="bg-background/40 border border-foreground/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                  <MapPin size={14} /> Delivery & Financials
                </div>
                <div className="space-y-1 text-xs">
                  <p><span className="text-muted-foreground">Address:</span> <span className="font-bold">{order.delivery_zone || 'Standard Shipping'}</span></p>
                  <p><span className="text-muted-foreground">Payment Status:</span> <span className="font-bold uppercase text-emerald-500">{order.payment_status || 'Paid'}</span></p>
                  <p><span className="text-muted-foreground">Paid Amount:</span> <span className="font-mono text-primary font-bold">{amountPaid.toLocaleString()} {order.currency || 'TZS'}</span></p>
                  <p><span className="text-muted-foreground">Balance Due:</span> <span className="font-mono text-amber-500 font-bold">{balance.toLocaleString()} {order.currency || 'TZS'}</span></p>
                </div>
              </div>
            </div>

            {/* Item Fulfillment Matrix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><Package size={14} className="text-primary" /> Item Fulfillment Progress ({items.length})</span>
              </div>

              <div className="bg-background/40 border border-foreground/5 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-foreground/10 text-muted-foreground uppercase text-[10px] font-black bg-foreground/5">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4 text-center">Ordered</th>
                      <th className="py-3 px-4 text-center">Shipped</th>
                      <th className="py-3 px-4 text-center">Remaining</th>
                      <th className="py-3 px-4 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/5">
                    {items.map((item, idx) => {
                      const shipped = item.quantity_shipped || 0;
                      const remaining = item.quantity_remaining ?? Math.max(0, item.quantity - shipped);
                      return (
                        <tr key={idx} className="hover:bg-secondary/30">
                          <td className="py-3.5 px-4 font-bold">
                            {item.name}
                            {(item.size || item.color) && (
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                {[item.color, item.size ? formatSizeDisplay(item.size) : null].filter(Boolean).join(' / ')}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold">{item.quantity}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-500">{shipped}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-500">{remaining}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()} {order.currency || 'TZS'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shipments List */}
            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Truck size={14} className="text-primary" /> Active Package Shipments ({shipments.length})
              </span>
              {shipments.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground font-bold bg-secondary/30 rounded-2xl">
                  No shipments dispatched yet. Click "Mark as Shipped" above to log package tracking details.
                </div>
              ) : (
                <div className="space-y-3">
                  {shipments.map((s) => (
                    <div key={s.id} className="p-4 bg-secondary/40 border border-foreground/10 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-primary">{s.carrier}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">{new Date(s.shipped_at).toLocaleString()}</span>
                      </div>
                      {s.tracking_number && (
                        <div className="text-xs font-mono font-bold">Tracking Number: <span className="text-primary">{s.tracking_number}</span></div>
                      )}
                      {s.items && s.items.length > 0 && (
                        <div className="pt-2 border-t border-foreground/5 flex flex-wrap gap-2">
                          {s.items.map((si, sidx) => (
                            <span key={sidx} className="px-2 py-0.5 bg-card rounded border text-[10px] font-bold">
                              {si.product_name} × {si.quantity_shipped}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-card border border-foreground/10 rounded-2xl p-5 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground font-bold">
                <span>Subtotal</span>
                <span className="font-mono text-foreground">{subtotal.toLocaleString()} {order.currency || 'TZS'}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-bold">
                <span>Delivery Fee</span>
                <span className="font-mono text-foreground">{deliveryFee.toLocaleString()} {order.currency || 'TZS'}</span>
              </div>
              <div className="border-t border-foreground/10 pt-3 flex justify-between items-center font-black">
                <span className="text-sm uppercase tracking-widest text-primary">Total Amount</span>
                <span className="text-lg font-mono text-primary">{totalAmount.toLocaleString()} {order.currency || 'TZS'}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Shipment Sub-Modal */}
      <Dialog open={isShipmentModalOpen} onOpenChange={setIsShipmentModalOpen}>
        <DialogContent className="max-w-md bg-card border border-foreground/10 rounded-[32px] p-6 text-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
              <Truck className="text-primary" size={20} /> Mark Items as Shipped
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateShipmentSubmit} className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Carrier / Logistics Provider *</label>
              <input
                type="text"
                placeholder="e.g. DHL, BM Motors, SpeedAF, Local Courier"
                value={carrier}
                onChange={e => setCarrier(e.target.value)}
                required
                className="w-full px-4 py-3 bg-secondary/50 border border-foreground/10 rounded-2xl text-xs font-bold outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tracking Number / Waybill</label>
              <input
                type="text"
                placeholder="e.g. TZ-884029482"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                className="w-full px-4 py-3 bg-secondary/50 border border-foreground/10 rounded-2xl text-xs font-bold outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Quantities to Ship</label>
              <div className="space-y-2 bg-secondary/30 p-3 rounded-2xl max-h-48 overflow-y-auto">
                {items.map((item, idx) => {
                  const key = item.product_id || item.name || `item-${idx}`;
                  const remaining = item.quantity_remaining ?? Math.max(0, item.quantity - (item.quantity_shipped || 0));
                  return (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">Remaining: {remaining}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={shipmentItemQuantities[key] ?? remaining}
                        onChange={e => setShipmentItemQuantities({
                          ...shipmentItemQuantities,
                          [key]: Math.min(remaining, Math.max(0, Number(e.target.value) || 0)),
                        })}
                        className="w-16 px-2 py-1 bg-card border border-foreground/10 rounded-xl text-center font-bold text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes / Driver Details</label>
              <textarea
                placeholder="Driver phone, dispatch notes..."
                value={shipmentNotes}
                onChange={e => setShipmentNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-secondary/50 border border-foreground/10 rounded-2xl text-xs font-bold outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={shipmentSubmitting}
              className="w-full py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {shipmentSubmitting ? 'DISPATCHING...' : 'CONFIRM SHIPMENT'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
