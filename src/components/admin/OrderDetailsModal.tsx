import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Order } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, User, MapPin, CreditCard, Calendar, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export default function OrderDetailsModal({ order, isOpen, onClose, onOrderUpdated }: OrderDetailsModalProps) {
  const [updating, setUpdating] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border border-foreground/10 rounded-[32px] p-8 text-foreground max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
        <DialogHeader className="border-b border-foreground/5 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-primary text-[10px] font-black uppercase tracking-widest">Order Details</span>
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2 mt-1">
                Order #{order.id.substring(0, 8)}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-2">
                <Calendar size={12} />
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
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
          {/* Customer & Delivery Grid */}
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
                <MapPin size={14} /> Delivery & Payment
              </div>
              <div className="space-y-1 text-xs">
                <p><span className="text-muted-foreground">Zone:</span> <span className="font-bold">{order.delivery_zone || 'Standard Shipping'}</span></p>
                <p><span className="text-muted-foreground">Payment Method:</span> <span className="font-bold uppercase">{order.payment_method || 'Card / Mobile'}</span></p>
                {order.payment_reference && (
                  <p><span className="text-muted-foreground">Ref:</span> <span className="font-mono">{order.payment_reference}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-2"><Package size={14} className="text-primary" /> Purchased Items ({items.length})</span>
            </div>
            
            <div className="bg-background/40 border border-foreground/5 rounded-2xl divide-y divide-foreground/5 overflow-hidden">
              {items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground font-bold">No item details recorded</div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-foreground/10 bg-secondary" />
                      )}
                      <div>
                        <p className="text-sm font-black italic uppercase">{item.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.color && <span>• Color: {item.color}</span>}
                          <span>• Qty: {item.quantity || 1}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-sm font-bold">
                      {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()} TZS
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-card border border-foreground/10 rounded-2xl p-5 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground font-bold">
              <span>Subtotal</span>
              <span className="font-mono text-foreground">{subtotal.toLocaleString()} TZS</span>
            </div>
            <div className="flex justify-between text-muted-foreground font-bold">
              <span>Delivery Fee</span>
              <span className="font-mono text-foreground">{deliveryFee.toLocaleString()} TZS</span>
            </div>
            <div className="border-t border-foreground/10 pt-3 flex justify-between items-center font-black">
              <span className="text-sm uppercase tracking-widest text-primary">Total Amount</span>
              <span className="text-lg font-mono text-primary">{totalAmount.toLocaleString()} TZS</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
