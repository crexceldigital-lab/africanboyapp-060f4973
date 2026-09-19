import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { castOrders } from '@/lib/supabase-helpers';
import { Order } from '../../types';
import { Search, Eye, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import OrderDetailsModal from './OrderDetailsModal';

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    setLoading(false);
    if (error) {
      toast.error('Failed to load orders');
    } else if (data) {
      setOrders(castOrders(data));
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to Realtime order updates
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success('Order status updated');
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
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

  const formatProductsSummary = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return 'Standard Item';
    const firstName = items[0]?.name || 'Item';
    if (items.length > 1) {
      return `${firstName} (+${items.length - 1} more)`;
    }
    return firstName;
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.order_number && o.order_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, customer name or email..."
            className="w-full pl-12 pr-4 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-foreground/5 hover:border-foreground/20'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
          
          <button
            onClick={fetchOrders}
            className="p-3 bg-card border border-foreground/10 hover:border-primary rounded-2xl text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs font-bold text-muted-foreground">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-16 text-center text-xs font-bold text-muted-foreground">No orders match your filter criteria.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-foreground/5 bg-foreground/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order ID</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Products</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="px-8 py-6 font-mono text-sm font-bold">
                      #{order.order_number || order.id.substring(0, 8)}
                      <span className={`block text-[9px] font-black uppercase tracking-wider mt-1 ${order.sale_type === 'in_store' ? 'text-blue-400' : 'text-emerald-400'}`}>
                        {order.sale_type === 'in_store' ? 'IN-STORE POS' : 'ONLINE ORDER'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black italic uppercase">{formatProductsSummary(order.items)}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        {Array.isArray(order.items) ? `${order.items.length} item(s)` : '1 item'}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold">{order.customer_name || 'Guest User'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{order.customer_email || order.customer_phone || ''}</p>
                    </td>
                    <td className="px-8 py-6 text-xs text-muted-foreground font-bold">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 font-mono text-sm font-bold text-primary">
                      {Number(order.total_amount).toLocaleString()} TZS
                    </td>
                    <td className="px-8 py-6">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer ${getStatusBadge(order.status)}`}
                      >
                        <option value="pending" className="bg-card text-foreground">Pending</option>
                        <option value="in_progress" className="bg-card text-foreground">In Progress</option>
                        <option value="completed" className="bg-card text-foreground">Completed</option>
                        <option value="cancelled" className="bg-card text-foreground">Cancelled</option>
                        <option value="refunded" className="bg-card text-foreground">Refunded</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={fetchOrders}
      />
    </div>
  );
}
