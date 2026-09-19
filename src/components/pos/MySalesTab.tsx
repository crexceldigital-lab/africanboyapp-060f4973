import { useState, useEffect } from 'react';
import { Order, Store, StoreStaff } from '@/types';
import { fromAny, castOrders } from '@/lib/supabase-helpers';
import { useCountry } from '@/context/CountryContext';
import { ShoppingBag, DollarSign, PackageCheck, Eye, Calendar, RefreshCw, Filter } from 'lucide-react';
import ReceiptModal from './ReceiptModal';

interface MySalesTabProps {
  staffAssignment: StoreStaff & { store?: Store };
}

type DateRangeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function MySalesTab({ staffAssignment }: MySalesTabProps) {
  const { formatPrice, user } = useCountry();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateRangeFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const fetchMySales = async () => {
    setLoading(true);
    try {
      let query = fromAny('orders')
        .select('*')
        .eq('store_id', staffAssignment.store_id)
        .eq('sale_type', 'in_store')
        .order('created_at', { ascending: false });

      // If user is sales_rep, limit to their staff_user_id
      if (staffAssignment.staff_role === 'sales_rep') {
        query = query.eq('staff_user_id', user?.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setOrders(castOrders(data));
      }
    } catch (err) {
      console.error('Error fetching staff sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySales();
  }, [staffAssignment.store_id, filter, customStart, customEnd]);

  // Filter orders by selected date range
  const filteredOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    const now = new Date();

    if (filter === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (filter === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return d.toDateString() === y.toDateString();
    }
    if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (filter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (filter === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }
    return true;
  });

  // Calculate Metrics
  const validOrders = filteredOrders.filter((o) => !o.is_voided && o.status === 'completed');
  const totalTransactions = validOrders.length;
  const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalItemsSold = validOrders.reduce(
    (sum, o) => sum + o.items.reduce((iSum, i) => iSum + (i.quantity || 1), 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase">MY SALES DASHBOARD</h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            Store: {staffAssignment.store?.name} · Cashier Activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['today', 'yesterday', 'week', 'month'] as DateRangeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                  : 'bg-card border-foreground/10 text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
          <button
            onClick={fetchMySales}
            disabled={loading}
            className="p-2.5 bg-card border border-foreground/10 rounded-xl text-muted-foreground hover:text-foreground"
            title="Refresh Sales"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} />
          </button>
        </div>
      </div>

      {/* Daily Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 bg-card border border-foreground/5 rounded-[28px] shadow-lg flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ShoppingBag size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Transactions
            </span>
            <span className="text-2xl font-black italic font-mono">{totalTransactions}</span>
          </div>
        </div>

        <div className="p-6 bg-card border border-foreground/5 rounded-[28px] shadow-lg flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <PackageCheck size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Items Sold
            </span>
            <span className="text-2xl font-black italic font-mono">{totalItemsSold}</span>
          </div>
        </div>

        <div className="p-6 bg-card border border-foreground/5 rounded-[28px] shadow-lg flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Total Revenue
            </span>
            <span className="text-2xl font-black italic font-mono text-primary">
              {formatPrice(totalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Sales Transactions Table */}
      <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden shadow-xl">
        <div className="p-5 border-b border-foreground/5 flex justify-between items-center">
          <h3 className="font-black text-sm uppercase tracking-widest italic">In-Store Sales History</h3>
          <span className="text-xs font-mono font-bold text-muted-foreground">
            {filteredOrders.length} records found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Receipt #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-center">Items</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5 text-xs">
              {filteredOrders.map((ord) => {
                const totalItemsCount = ord.items.reduce((s, i) => s + (i.quantity || 1), 0);
                return (
                  <tr key={ord.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-primary">
                      {ord.receipt_number || `#${ord.id.substring(0, 8)}`}
                    </td>
                    <td className="px-6 py-4 font-bold">{ord.customer_name || 'Walk-in Customer'}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold">{totalItemsCount}</td>
                    <td className="px-6 py-4 font-mono font-black text-foreground">
                      {formatPrice(ord.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-foreground/10 bg-foreground/5">
                        {ord.payment_method?.replace('_', ' ') || 'CASH'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedReceiptOrder(ord)}
                        className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"
                        title="View & Print Receipt"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground font-bold text-xs">
                    No sales recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        store={staffAssignment.store}
        staffUserEmail={user?.email}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
        onNewSale={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
}
