import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fromAny, castOrders } from '@/lib/supabase-helpers';
import { Order, Customer, StoreStaff, Store } from '../types';
import { useCountry } from '../context/CountryContext';
import { ShoppingBag, Users, Eye, RefreshCw, LogOut, Store as StoreIcon, ShieldCheck, Monitor, DollarSign, PlusCircle } from 'lucide-react';
import OrderDetailsModal from '../components/admin/OrderDetailsModal';
import CustomerDetailsModal from '../components/admin/CustomerDetailsModal';
import POSScreen from '../components/pos/POSScreen';
import MySalesTab from '../components/pos/MySalesTab';
import { toast } from 'sonner';

interface StaffDashboardProps {
  staffAssignment: StoreStaff & { store?: Store };
  onNavigateHome?: () => void;
}

export default function StaffDashboard({ staffAssignment, onNavigateHome }: StaffDashboardProps) {
  const { logout, user } = useCountry();
  const [activeTab, setActiveTab] = useState<'pos' | 'orders' | 'customers' | 'my_sales'>('pos');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      // Fetch orders for staff store_id
      const { data: ordersData, error: ordersError } = await fromAny('orders')
        .select('*')
        .eq('store_id', staffAssignment.store_id)
        .order('created_at', { ascending: false });

      if (!ordersError && ordersData) {
        const ords = castOrders(ordersData);
        setOrders(ords);

        // Map unique customers from store orders
        const customerMap: Record<string, { email: string; name: string; phone: string; totalSpent: number; count: number; date: string }> = {};
        ords.forEach(o => {
          const key = o.customer_email || o.user_id || o.id;
          if (!customerMap[key]) {
            customerMap[key] = {
              email: o.customer_email || 'N/A',
              name: o.customer_name || 'Guest Customer',
              phone: o.customer_phone || 'N/A',
              totalSpent: 0,
              count: 0,
              date: o.created_at,
            };
          }
          if (o.status !== 'cancelled' && o.status !== 'refunded') {
            customerMap[key].totalSpent += Number(o.total_amount) || 0;
          }
          customerMap[key].count += 1;
        });

        const custs: Customer[] = Object.entries(customerMap).map(([id, c]) => ({
          id,
          full_name: c.name,
          email: c.email,
          phone_number: c.phone,
          joined_date: c.date,
          total_orders: c.count,
          total_spent: c.totalSpent,
          status: 'active',
        }));

        setCustomers(custs);
      }
    } catch (err) {
      console.error('Error fetching staff store data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [staffAssignment.store_id]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-order-status', {
        body: { orderId, status: newStatus },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Failed to update order status');
      } else {
        toast.success(`Order status updated to ${newStatus.replace('_', ' ')}`);
        fetchStaffData();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing status update');
    }
  };

  const filteredOrders = orders.filter(o =>
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (o.customer_email && o.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (o.receipt_number && o.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c =>
    (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone_number && c.phone_number.includes(searchQuery))
  );

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

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-foreground/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <StoreIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black italic uppercase tracking-tight">
                  {staffAssignment.store?.name || `STORE #${staffAssignment.store_id}`}
                </h1>
                <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full text-[9px] font-black uppercase tracking-widest">
                  {staffAssignment.staff_role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Staff POS Portal · {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('pos')}
              className="px-4 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-lg"
            >
              <PlusCircle size={16} /> NEW SALE
            </button>
            <button
              onClick={fetchStaffData}
              disabled={loading}
              className="p-2.5 bg-background border border-foreground/10 hover:border-primary rounded-xl text-xs font-bold transition-all"
              title="Refresh Store Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : ''} />
            </button>
            <button
              onClick={logout}
              className="px-4 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <LogOut size={14} /> SIGN OUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-foreground/10 pb-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'pos'
                ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                : 'bg-card border border-foreground/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Monitor size={16} /> POS (NEW SALE)
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                : 'bg-card border border-foreground/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag size={16} /> ORDERS ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                : 'bg-card border border-foreground/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={16} /> CUSTOMERS ({customers.length})
          </button>

          <button
            onClick={() => setActiveTab('my_sales')}
            className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'my_sales'
                ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                : 'bg-card border border-foreground/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            <DollarSign size={16} /> MY SALES
          </button>
        </div>

        {/* Tab 1: POS Screen */}
        {activeTab === 'pos' && <POSScreen staffAssignment={staffAssignment} />}

        {/* Tab 2: My Sales Tab */}
        {activeTab === 'my_sales' && <MySalesTab staffAssignment={staffAssignment} />}

        {/* Search Filter for Orders / Customers */}
        {(activeTab === 'orders' || activeTab === 'customers') && (
          <div className="flex justify-between items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full max-w-md px-5 py-3 bg-card border border-foreground/10 rounded-2xl text-sm font-bold focus:border-primary outline-none"
            />
          </div>
        )}

        {/* Content Area */}
        {activeTab === 'orders' ? (
          <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5 text-xs">
                  {filteredOrders.map(ord => (
                    <tr key={ord.id} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold">#{ord.id.substring(0, 8)}</td>
                      <td className="px-6 py-4 font-bold">{ord.customer_name || 'Guest'}</td>
                      <td className="px-6 py-4 font-mono font-bold text-primary">{Number(ord.total_amount).toLocaleString()} {ord.currency || 'TZS'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(ord.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(ord.status)}`}>
                          {ord.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-bold text-xs">
                        No store orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-foreground/5 rounded-[32px] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Orders</th>
                    <th className="px-6 py-4">Total Spent</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5 text-xs">
                  {filteredCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="px-6 py-4 font-bold">{cust.full_name || 'Customer'}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{cust.email} · {cust.phone_number}</td>
                      <td className="px-6 py-4 font-mono font-bold">{cust.total_orders}</td>
                      <td className="px-6 py-4 font-mono font-bold text-primary">{cust.total_spent.toLocaleString()} TZS</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedCustomer(cust)}
                          className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-bold text-xs">
                        No store customers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={fetchStaffData}
      />

      {/* Customer Details Modal */}
      <CustomerDetailsModal
        customer={selectedCustomer}
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
