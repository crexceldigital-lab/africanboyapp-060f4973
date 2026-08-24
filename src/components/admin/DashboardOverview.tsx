import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '../../types';
import { ShoppingBag, DollarSign, Users, Clock, AlertTriangle, Eye, ArrowUpRight, CheckCircle, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import OrderDetailsModal from './OrderDetailsModal';
import ProductOfTheDayPicker from './ProductOfTheDayPicker';

interface StatMetrics {
  totalOrders: number;
  totalRevenue: number;
  activeCustomers: number;
  pendingOrders: number;
  cancelledOrders: number;
  completedOrders: number;
}

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<StatMetrics>({
    totalOrders: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    completedOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [statusChartData, setStatusChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Fetch profiles count
      const { count: customersCount, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (!ordersError && ordersData) {
        const orders = ordersData as Order[];
        setRecentOrders(orders.slice(0, 7));

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => {
          if (o.status !== 'cancelled' && o.status !== 'refunded') {
            return sum + (Number(o.total_amount) || 0);
          }
          return sum;
        }, 0);

        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length;

        setMetrics({
          totalOrders,
          totalRevenue,
          activeCustomers: customersCount || 0,
          pendingOrders,
          cancelledOrders,
          completedOrders,
        });

        // Setup chart data
        setStatusChartData([
          { name: 'Completed', value: completedOrders, color: '#10b981' },
          { name: 'In Progress', value: inProgressOrders, color: '#eab308' },
          { name: 'Pending', value: pendingOrders, color: '#f59e0b' },
          { name: 'Cancelled / Refunded', value: cancelledOrders, color: '#ef4444' },
        ].filter(d => d.value > 0 || orders.length === 0));
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      return `${firstName} +${items.length - 1} other items`;
    }
    return firstName;
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tight">STORE <span className="text-primary">OVERVIEW</span></h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Real-time performance metrics</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-card border border-foreground/10 hover:border-primary rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} /> Refresh
        </button>
      </div>

      {/* Product of the Day Picker */}
      <ProductOfTheDayPicker />

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black italic tracking-tight font-mono">{metrics.totalOrders}</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle size={10} className="text-emerald-400" /> {metrics.completedOrders} completed
            </p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black italic tracking-tight font-mono text-primary">{metrics.totalRevenue.toLocaleString()} <span className="text-xs font-normal">TZS</span></h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Gross revenue from sales</p>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Registered Customers</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black italic tracking-tight font-mono">{metrics.activeCustomers}</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active user profiles</p>
          </div>
        </div>

        {/* Pending & Requests */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending / Cancelled</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black italic tracking-tight font-mono">{metrics.pendingOrders + metrics.cancelledOrders}</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="text-amber-400">{metrics.pendingOrders} pending</span> • <span className="text-destructive">{metrics.cancelledOrders} cancelled</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Orders + Order Status Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table (2 Cols) */}
        <div className="lg:col-span-2 bg-card border border-foreground/5 rounded-[32px] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-tight">Recent Orders</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Latest transactions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-xs font-bold text-muted-foreground">Loading recent orders...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-muted-foreground">No orders recorded yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-foreground/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-foreground/5">
                    <th className="px-4 py-4">Order ID</th>
                    <th className="px-4 py-4">Products</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5 text-xs">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="px-4 py-4 font-mono font-bold">#{ord.id.substring(0, 8)}</td>
                      <td className="px-4 py-4 font-bold max-w-[180px] truncate">{formatProductsSummary(ord.items)}</td>
                      <td className="px-4 py-4 text-muted-foreground">{ord.customer_name || 'Guest'}</td>
                      <td className="px-4 py-4 font-mono font-bold">{Number(ord.total_amount).toLocaleString()} TZS</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(ord.status)}`}>
                          {ord.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="p-2 hover:bg-foreground/10 rounded-xl text-muted-foreground hover:text-foreground transition-all"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Order Status Breakdown Chart (1 Col) */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-8 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight">Order Status Breakdown</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Distribution by order state</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {metrics.totalOrders === 0 ? (
              <div className="text-center text-xs font-bold text-muted-foreground">No orders to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fbbf24' }}
                  />
                  <Legend
                    formatter={(value) => <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-foreground/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-bold">Fulfillment Rate</span>
              <span className="font-mono font-black text-emerald-400">
                {metrics.totalOrders > 0 ? `${Math.round((metrics.completedOrders / metrics.totalOrders) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={fetchDashboardData}
      />
    </div>
  );
}
