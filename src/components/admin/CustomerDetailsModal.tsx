import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Customer, Order } from '../../types';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Phone, Calendar, ShoppingBag, DollarSign, TrendingUp, Eye } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';

interface CustomerDetailsModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerDetailsModal({ customer, isOpen, onClose }: CustomerDetailsModalProps) {
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (customer && isOpen) {
      fetchCustomerOrders();
    }
  }, [customer, isOpen]);

  const fetchCustomerOrders = async () => {
    if (!customer) return;
    setLoadingOrders(true);
    
    // Query orders by customer user_id or email
    let query = supabase.from('orders').select('*');
    if (customer.id && customer.id !== customer.email) {
      query = query.or(`user_id.eq.${customer.id},customer_email.eq.${customer.email}`);
    } else if (customer.email) {
      query = query.eq('customer_email', customer.email);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    setLoadingOrders(false);

    if (!error && data) {
      setCustomerOrders(data as Order[]);
    }
  };

  if (!customer) return null;

  const totalOrders = customerOrders.length > 0 ? customerOrders.length : customer.total_orders;
  const totalSpent = customerOrders.length > 0 
    ? customerOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
    : customer.total_spent;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl bg-card border border-foreground/10 rounded-[32px] p-8 text-foreground max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
          <DialogHeader className="border-b border-foreground/5 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xl italic uppercase">
                {customer.full_name ? customer.full_name.substring(0, 2) : 'CU'}
              </div>
              <div>
                <span className="text-primary text-[10px] font-black uppercase tracking-widest">Customer Profile</span>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tight">
                  {customer.full_name || 'Anonymous Customer'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Joined: {customer.joined_date ? new Date(customer.joined_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-6">
            {/* Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background/40 border border-foreground/5 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-primary" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</p>
                  <p className="text-xs font-mono font-bold">{customer.email || 'No email'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-primary" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone</p>
                  <p className="text-xs font-mono font-bold">{customer.phone_number || 'No phone'}</p>
                </div>
              </div>
            </div>

            {/* Mini Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-background/40 border border-foreground/5 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-black uppercase tracking-widest">Total Orders</span>
                  <ShoppingBag size={16} className="text-primary" />
                </div>
                <p className="text-2xl font-black italic font-mono">{totalOrders}</p>
              </div>

              <div className="bg-background/40 border border-foreground/5 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-black uppercase tracking-widest">Total Spent</span>
                  <DollarSign size={16} className="text-primary" />
                </div>
                <p className="text-2xl font-black italic font-mono text-primary">{totalSpent.toLocaleString()} TZS</p>
              </div>

              <div className="bg-background/40 border border-foreground/5 rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-black uppercase tracking-widest">Avg Order Value</span>
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <p className="text-2xl font-black italic font-mono">{avgOrderValue.toLocaleString()} TZS</p>
              </div>
            </div>

            {/* Order History */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Order History</h3>

              <div className="bg-background/40 border border-foreground/5 rounded-2xl overflow-hidden">
                {loadingOrders ? (
                  <div className="p-6 text-center text-xs text-muted-foreground font-bold">Loading order history...</div>
                ) : customerOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground font-bold">No orders found for this customer</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5 text-xs">
                      {customerOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-foreground/[0.02]">
                          <td className="px-4 py-3 font-mono font-bold">#{ord.id.substring(0, 8)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(ord.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-mono font-bold">{Number(ord.total_amount).toLocaleString()} TZS</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ord.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                              ord.status === 'in_progress' ? 'bg-primary text-primary-foreground' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="p-1.5 hover:bg-foreground/10 rounded-lg text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-modal for Order Details */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={fetchCustomerOrders}
      />
    </>
  );
}
