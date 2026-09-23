import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { castOrders, castProducts, fromAny } from '@/lib/supabase-helpers';
import { Order, Product, Store, StoreStaff } from '../../types';
import { ShoppingBag, DollarSign, Users, Clock, Eye, ArrowUpRight, RefreshCw, TrendingUp, Boxes, AlertTriangle, Store as StoreIcon, Package, PackageCheck, PackageX, Calculator, Tag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import OrderDetailsModal from './OrderDetailsModal';
import ProductOfTheDayPicker from './ProductOfTheDayPicker';
import RankedBarList, { RankedItem } from './RankedBarList';
import RadialStatPair from './RadialStatPair';

interface StatMetrics {
  totalOrders: number;
  totalRevenue: number;
  onlineRevenue: number;
  inStoreRevenue: number;
  onlineOrdersCount: number;
  inStoreOrdersCount: number;
  activeCustomers: number;
  pendingOrders: number;
  inProgressOrders: number;
  cancelledOrders: number;
  completedOrders: number;
  repeatPurchaseRate: number;
  newCustomersCount: number;
  returningCustomersCount: number;

  // Stock Value Summary Metrics
  totalStockValue: number;
  potentialRetailValue: number;
  potentialGrossProfit: number;
  totalUnitsInStock: number;
  productsInStockCount: number;
  outOfStockCount: number;
  lowStockCount: number;
}

interface DashboardOverviewProps {
  onNavigateTab?: (tab: string) => void;
  staffAssignment?: StoreStaff & { store?: Store };
}

export default function DashboardOverview({ onNavigateTab, staffAssignment }: DashboardOverviewProps) {
  const [metrics, setMetrics] = useState<StatMetrics>({
    totalOrders: 0,
    totalRevenue: 0,
    onlineRevenue: 0,
    inStoreRevenue: 0,
    onlineOrdersCount: 0,
    inStoreOrdersCount: 0,
    activeCustomers: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    cancelledOrders: 0,
    completedOrders: 0,
    repeatPurchaseRate: 0,
    newCustomersCount: 0,
    returningCustomersCount: 0,
    totalStockValue: 0,
    potentialRetailValue: 0,
    potentialGrossProfit: 0,
    totalUnitsInStock: 0,
    productsInStockCount: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
  });

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [statusChartData, setStatusChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [topCustomersData, setTopCustomersData] = useState<RankedItem[]>([]);
  const [zoneBreakdownData, setZoneBreakdownData] = useState<RankedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Effective store scope
  const activeStoreScope = staffAssignment ? staffAssignment.store_id : selectedStoreId;

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch available stores for multi-store selection
      const { data: dbStores } = await fromAny('stores').select('*').order('id');
      if (dbStores && dbStores.length > 0) {
        setStores(dbStores);
      } else {
        setStores([
          { id: 1, name: 'AFRICAN BOY Tanzania', country_code: 'TZ', currency_code: 'TZS', is_active: true },
          { id: 2, name: 'AFRICAN BOY Nigeria', country_code: 'NG', currency_code: 'NGN', is_active: true },
        ]);
      }

      // 2. Fetch orders (filtered by store if store scope selected)
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeStoreScope !== 'all') {
        ordersQuery = ordersQuery.eq('store_id', activeStoreScope);
      }

      const { data: ordersData, error: ordersError } = await ordersQuery;

      // 3. Fetch customer profiles count
      const { count: customersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // 4. Fetch real products from database for stock valuation
      const { data: productsData } = await supabase
        .from('products')
        .select('*');

      // 5. Fetch store availability if specific store scope selected
      let storeAvailMap: Record<string, number> = {};
      if (activeStoreScope !== 'all') {
        const { data: availData } = await fromAny('product_store_availability')
          .select('product_id, stock_quantity')
          .eq('store_id', activeStoreScope);

        if (availData && Array.isArray(availData)) {
          availData.forEach((a: any) => {
            storeAvailMap[a.product_id] = Number(a.stock_quantity) || 0;
          });
        }
      }

      // -------------------------------------------------------------
      // INVENTORY STOCK VALUATION CALCULATION
      // -------------------------------------------------------------
      // Inventory figures must always come from the real catalogue
      const productsList: Product[] = productsData ? castProducts(productsData) : [];

      let calcTotalStockValue = 0;       // Inventory Cost Value = stock_qty * cost_price
      let calcPotentialRetailValue = 0;  // Potential Retail Value = stock_qty * selling_price
      let calcTotalUnitsInStock = 0;     // Sum of stock quantities for in-stock items
      let calcProductsInStockCount = 0;  // Count of distinct products with stock > 0
      let calcOutOfStockCount = 0;       // Count of distinct products with stock <= 0
      let calcLowStockCount = 0;         // Count of distinct products with 0 < stock <= 5

      const LOW_STOCK_THRESHOLD = 5;

      productsList.forEach((p) => {
        let stockQty = 0;

        if (activeStoreScope !== 'all') {
          // Store-specific inventory count
          stockQty = storeAvailMap[p.id] !== undefined ? storeAvailMap[p.id] : 0;
        } else {
          // All Stores: Calculate stock from variant-level inventory if variants exist
          if (p.stock && typeof p.stock === 'object' && Object.keys(p.stock).length > 0) {
            const variantSum = Object.values(p.stock).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
            if (variantSum > 0) {
              stockQty = variantSum;
            } else {
              stockQty = Number(p.stock_quantity) || 0;
            }
          } else {
            stockQty = Number(p.stock_quantity) || 0;
          }
        }

        // Use cost_price for inventory valuation (Do NOT use selling price as cost price if cost_price exists)
        const costPrice = Number(p.cost_price) || 0;
        const sellingPrice = p.on_sale && p.sale_price ? Number(p.sale_price) : Number(p.price) || 0;

        if (stockQty > 0) {
          calcProductsInStockCount += 1;
          calcTotalUnitsInStock += stockQty;

          // Do NOT include zero stock products in valuation calculations
          calcTotalStockValue += stockQty * costPrice;
          calcPotentialRetailValue += stockQty * sellingPrice;

          if (stockQty <= LOW_STOCK_THRESHOLD) {
            calcLowStockCount += 1;
          }
        } else {
          calcOutOfStockCount += 1;
        }
      });

      const calcPotentialGrossProfit = Math.max(0, calcPotentialRetailValue - calcTotalStockValue);

      // -------------------------------------------------------------
      // REVENUE & ORDER METRICS CALCULATION
      // -------------------------------------------------------------
      if (!ordersError && ordersData) {
        const orders = castOrders(ordersData);
        setRecentOrders(orders.slice(0, 7));

        const totalOrders = orders.length;
        let totalRevenue = 0;
        let onlineRevenue = 0;
        let inStoreRevenue = 0;
        let onlineOrdersCount = 0;
        let inStoreOrdersCount = 0;

        orders.forEach((o) => {
          const amt = Number(o.total_amount) || 0;
          const isOnline = o.sale_type !== 'in_store';
          if (isOnline) onlineOrdersCount += 1;
          else inStoreOrdersCount += 1;

          if (o.status !== 'cancelled' && o.status !== 'refunded') {
            totalRevenue += amt;
            if (isOnline) onlineRevenue += amt;
            else inStoreRevenue += amt;
          }
        });

        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length;

        // Calculate Customer Insights
        const customerOrderMap = new Map<string, { name: string; email: string; orderCount: number; totalSpent: number }>();
        const zoneMap = new Map<string, { count: number; revenue: number }>();

        orders.forEach((o) => {
          const email = o.customer_email?.toLowerCase().trim() || o.customer_name || 'Guest User';
          const name = o.customer_name || email;
          const amt = Number(o.total_amount) || 0;

          if (!customerOrderMap.has(email)) {
            customerOrderMap.set(email, { name, email, orderCount: 0, totalSpent: 0 });
          }
          const c = customerOrderMap.get(email)!;
          c.orderCount += 1;
          if (o.status !== 'cancelled' && o.status !== 'refunded') {
            c.totalSpent += amt;
          }

          // Delivery Zone breakdown
          const rawZone = o.delivery_zone?.trim() || 'Standard Delivery Zone';
          if (!zoneMap.has(rawZone)) {
            zoneMap.set(rawZone, { count: 0, revenue: 0 });
          }
          const z = zoneMap.get(rawZone)!;
          z.count += 1;
          if (o.status !== 'cancelled' && o.status !== 'refunded') {
            z.revenue += amt;
          }
        });

        const totalUniqueCustomers = customerOrderMap.size;
        let returningCount = 0;
        let newCount = 0;

        customerOrderMap.forEach((c) => {
          if (c.orderCount > 1) {
            returningCount += 1;
          } else {
            newCount += 1;
          }
        });

        const repeatRate = totalUniqueCustomers > 0 ? Math.round((returningCount / totalUniqueCustomers) * 100) : 0;

        // Top Customers ranked list
        const sortedCustomers: RankedItem[] = Array.from(customerOrderMap.values())
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5)
          .map((c) => ({
            label: c.name,
            sublabel: `${c.orderCount} order(s)`,
            value: c.totalSpent,
            formattedValue: `${c.totalSpent.toLocaleString()} TZS`,
          }));

        // Zone Breakdown ranked list
        const sortedZones: RankedItem[] = Array.from(zoneMap.entries())
          .map(([zoneName, zData]) => ({
            label: zoneName,
            sublabel: `${zData.revenue.toLocaleString()} TZS`,
            value: zData.count,
            formattedValue: `${zData.count} order(s)`,
          }))
          .sort((a, b) => b.value - a.value);

        setTopCustomersData(sortedCustomers);
        setZoneBreakdownData(sortedZones);

        setMetrics({
          totalOrders,
          totalRevenue,
          onlineRevenue,
          inStoreRevenue,
          onlineOrdersCount,
          inStoreOrdersCount,
          activeCustomers: customersCount || 0,
          pendingOrders,
          inProgressOrders,
          cancelledOrders,
          completedOrders,
          repeatPurchaseRate: repeatRate,
          newCustomersCount: newCount,
          returningCustomersCount: returningCount,

          // Stock Value Summary Metrics
          totalStockValue: calcTotalStockValue,
          potentialRetailValue: calcPotentialRetailValue,
          potentialGrossProfit: calcPotentialGrossProfit,
          totalUnitsInStock: calcTotalUnitsInStock,
          productsInStockCount: calcProductsInStockCount,
          outOfStockCount: calcOutOfStockCount,
          lowStockCount: calcLowStockCount,
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

    // Realtime Supabase Subscription for automatic live updates whenever inventory, products or orders change
    const channel = supabase
      .channel('dashboard-stock-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_store_availability' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_movements' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStoreId, staffAssignment?.store_id]);

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

  const totalUnique = metrics.newCustomersCount + metrics.returningCustomersCount;
  const newPct = totalUnique > 0 ? Math.round((metrics.newCustomersCount / totalUnique) * 100) : 0;
  const returningPct = totalUnique > 0 ? 100 - newPct : 0;

  const currentCurrency = activeStoreScope !== 'all'
    ? stores.find(s => s.id === activeStoreScope)?.currency_code || 'TZS'
    : 'TZS';

  const potentialMarginPct = metrics.potentialRetailValue > 0
    ? Math.round((metrics.potentialGrossProfit / metrics.potentialRetailValue) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header Bar & Multi-Store Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
            STORE <span className="text-primary">OVERVIEW</span>
          </h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            Real-time performance, inventory valuation & customer insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Multi-Store Scope Pills (if not locked to staff store) */}
          {!staffAssignment && stores.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-card border border-foreground/10 rounded-2xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedStoreId('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedStoreId === 'all'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                All Stores
              </button>
              {stores.map(st => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStoreId(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    selectedStoreId === st.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  {st.name.replace('AFRICAN BOY ', '')}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-card border border-foreground/10 hover:border-primary rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Product of the Day Picker */}
      <ProductOfTheDayPicker />

      {/* 4 Primary Top Stat Cards Grid: REVENUE -> ORDERS -> INVENTORY VALUE -> CUSTOMERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary/30 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black italic tracking-tight font-mono text-primary">
              {metrics.totalRevenue.toLocaleString()} <span className="text-xs font-normal">{currentCurrency}</span>
            </h3>
            <div className="flex gap-2 text-[9px] font-mono font-bold">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md">Online: {metrics.onlineRevenue.toLocaleString()} {currentCurrency}</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md">POS: {metrics.inStoreRevenue.toLocaleString()} {currentCurrency}</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary/30 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black italic tracking-tight font-mono">{metrics.totalOrders}</h3>
            <div className="flex gap-2 text-[9px] font-mono font-bold">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md">Online: {metrics.onlineOrdersCount}</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md">POS: {metrics.inStoreOrdersCount}</span>
            </div>
          </div>
        </div>

        {/* TOTAL STOCK VALUE (Prominent Inventory Card) */}
        <div className="bg-card border border-primary/30 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary transition-all shadow-xl bg-gradient-to-b from-card via-card to-primary/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <Boxes size={12} /> Total Stock Value
            </span>
            <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md">
              <Package size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black italic tracking-tight font-mono text-primary">
              {metrics.totalStockValue.toLocaleString()} <span className="text-xs font-normal">{currentCurrency}</span>
            </h3>
            <div className="flex flex-wrap gap-1.5 text-[9px] font-mono font-bold">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md">{metrics.totalUnitsInStock.toLocaleString()} Units</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md">{metrics.productsInStockCount} Products</span>
              {metrics.outOfStockCount > 0 && (
                <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded-md">{metrics.outOfStockCount} Out</span>
              )}
            </div>
          </div>
        </div>

        {/* Registered Customers */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-6 relative overflow-hidden group hover:border-primary/30 transition-all shadow-lg">
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
      </div>

      {/* ========================================================================= */}
      {/* REAL STOCK VALUE SUMMARY & INVENTORY VALUATION DETAILED PANEL */}
      {/* ========================================================================= */}
      <div className="bg-card border border-foreground/5 rounded-[32px] p-8 space-y-6 shadow-xl relative overflow-hidden">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-foreground/5 pb-6">
          <div>
            <span className="text-primary text-xs font-bold tracking-widest uppercase flex items-center gap-1.5">
              <Calculator size={14} /> Inventory & Asset Analytics
            </span>
            <h3 className="text-2xl font-black italic uppercase tracking-tight">STOCK VALUE SUMMARY</h3>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Current inventory valuation calculated from unit cost price & real store stock
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <StoreIcon size={12} />
              {activeStoreScope === 'all'
                ? 'All Authorized Stores'
                : (stores.find(s => s.id === activeStoreScope)?.name || `Store #${activeStoreScope}`)}
            </span>
          </div>
        </div>

        {/* Hero Stock Value Card + 4 Supporting Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Total Stock Value Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-background/80 via-card to-primary/10 border border-primary/30 rounded-3xl p-6 flex flex-col justify-between space-y-4 relative shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                  <Tag size={12} /> Total Stock Value (Cost)
                </span>
                <span className="px-2.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[9px] font-black uppercase tracking-wider">
                  REAL-TIME
                </span>
              </div>
              <h4 className="text-4xl sm:text-5xl font-black italic tracking-tighter font-mono text-primary">
                {metrics.totalStockValue.toLocaleString()}
              </h4>
              <p className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                {currentCurrency} (Unit Cost Basis)
              </p>
            </div>

            <div className="pt-4 border-t border-foreground/10 text-[10px] text-muted-foreground font-bold uppercase tracking-wider space-y-1">
              <div className="flex justify-between">
                <span>Valuation Basis:</span>
                <span className="text-foreground font-mono">Unit Cost / Purchase Price</span>
              </div>
              <div className="flex justify-between">
                <span>Zero Stock Exclusions:</span>
                <span className="text-foreground font-mono">Applied ({metrics.outOfStockCount} zero-stock products excluded)</span>
              </div>
            </div>
          </div>

          {/* 4 Supporting Metrics Mini-Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* TOTAL UNITS IN STOCK */}
            <div className="bg-background/40 border border-foreground/5 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Units</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <PackageCheck size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-black italic tracking-tight font-mono text-foreground">
                  {metrics.totalUnitsInStock.toLocaleString()}
                </h4>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Physical Units</p>
              </div>
            </div>

            {/* PRODUCTS IN STOCK */}
            <div className="bg-background/40 border border-foreground/5 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">In Stock</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Boxes size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-black italic tracking-tight font-mono text-emerald-400">
                  {metrics.productsInStockCount}
                </h4>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Available Products</p>
              </div>
            </div>

            {/* OUT OF STOCK */}
            <div className="bg-background/40 border border-foreground/5 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Out of Stock</span>
                <div className="w-8 h-8 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                  <PackageX size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-black italic tracking-tight font-mono text-destructive">
                  {metrics.outOfStockCount}
                </h4>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Zero Stock Products</p>
              </div>
            </div>

            {/* LOW STOCK ALERT */}
            <div className="bg-background/40 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between space-y-2 hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Low Stock</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-black italic tracking-tight font-mono text-amber-400">
                  {metrics.lowStockCount}
                </h4>
                <p className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider mt-0.5">≤ 5 Units Left</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Valuation Breakdown (Inventory Cost Value vs Potential Retail Value vs Potential Gross Profit) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* 1. Inventory Cost Value */}
          <div className="bg-background/30 border border-foreground/5 rounded-2xl p-5 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Inventory Cost Value
            </span>
            <div className="space-y-1">
              <h4 className="text-2xl font-black italic tracking-tight font-mono text-foreground">
                {metrics.totalStockValue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currentCurrency}</span>
              </h4>
              <p className="text-[10px] text-muted-foreground font-bold">
                Stock Quantity × Cost Price Per Unit
              </p>
            </div>
          </div>

          {/* 2. Potential Retail Value */}
          <div className="bg-background/30 border border-foreground/5 rounded-2xl p-5 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Potential Retail Value
            </span>
            <div className="space-y-1">
              <h4 className="text-2xl font-black italic tracking-tight font-mono text-blue-400">
                {metrics.potentialRetailValue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currentCurrency}</span>
              </h4>
              <p className="text-[10px] text-muted-foreground font-bold">
                Stock Quantity × Selling Price Per Unit
              </p>
            </div>
          </div>

          {/* 3. Potential Gross Profit */}
          <div className="bg-background/30 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Potential Gross Profit
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[9px] font-mono font-bold">
                {potentialMarginPct}% Margin
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-2xl font-black italic tracking-tight font-mono text-emerald-400">
                {metrics.potentialGrossProfit.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currentCurrency}</span>
              </h4>
              <p className="text-[10px] text-muted-foreground font-bold">
                Potential Retail Value − Inventory Cost Value
              </p>
            </div>
          </div>
        </div>

        {/* Visual Profit Margin Progress Bar */}
        <div className="p-4 bg-background/50 border border-foreground/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              Asset Margin Allocation
            </span>
            <span className="font-mono font-bold text-emerald-400 text-xs">
              {potentialMarginPct}% Expected Gross Profit Margin
            </span>
          </div>
          <div className="h-2.5 w-full bg-foreground/10 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${metrics.potentialRetailValue > 0 ? Math.round((metrics.totalStockValue / metrics.potentialRetailValue) * 100) : 50}%` }}
              title="Inventory Cost Portion"
            />
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${potentialMarginPct}%` }}
              title="Potential Profit Portion"
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground font-bold pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Cost Portion ({metrics.potentialRetailValue > 0 ? 100 - potentialMarginPct : 0}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Gross Profit Portion ({potentialMarginPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* CUSTOMER INSIGHTS SECTION */}
      <div className="space-y-4">
        <div>
          <span className="text-primary text-xs font-bold tracking-widest uppercase">Analytics & Demographics</span>
          <h3 className="text-2xl font-black italic uppercase tracking-tight">CUSTOMER INSIGHTS</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. New vs Returning (Radial Pair) */}
          <RadialStatPair
            title="New vs Returning Customers"
            subtitle="Customer Acquisition Split"
            primary={{
              label: 'New Customers',
              value: metrics.newCustomersCount,
              percentage: newPct,
              subtext: 'First-time buyers',
            }}
            secondary={{
              label: 'Returning',
              value: metrics.returningCustomersCount,
              percentage: returningPct,
              subtext: 'Repeat buyers',
            }}
          />

          {/* 2. Top Customers Ranked Bar List */}
          <RankedBarList
            title="Top Customers by Spend"
            subtitle="Highest Value Purchasers"
            items={topCustomersData}
            maxItems={5}
            actionLabel="View All"
            onAction={() => onNavigateTab?.('customers')}
            emptyMessage="No customer spend recorded yet"
          />

          {/* 3. Delivery Zone Breakdown Ranked Bar List */}
          <RankedBarList
            title="Delivery Zone Activity"
            subtitle="Most Active Regions"
            items={zoneBreakdownData}
            maxItems={5}
            barColorClass="bg-emerald-400"
            emptyMessage="No delivery zone data recorded"
          />
        </div>
      </div>

      {/* Main Content Grid: Recent Orders + Order Status Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Table (2 Cols) */}
        <div className="lg:col-span-2 bg-card border border-foreground/5 rounded-[32px] p-8 space-y-6 shadow-xl">
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
                      <td className="px-4 py-4 font-mono font-bold">{Number(ord.total_amount).toLocaleString()} {currentCurrency}</td>
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

        {/* Order Status Segmented Hybrid Breakdown Panel */}
        <div className="bg-card border border-foreground/5 rounded-[32px] p-8 flex flex-col justify-between space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight">Order Status Breakdown</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Fulfillment state distribution</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {metrics.totalOrders === 0 ? (
              <div className="text-center text-xs font-bold text-muted-foreground">No orders to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
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
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Segmented Horizontal Bar List */}
          <div className="space-y-3 pt-2 border-t border-foreground/5">
            {statusChartData.map((item) => {
              const pct = metrics.totalOrders > 0 ? Math.round((item.value / metrics.totalOrders) * 100) : 0;
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-foreground flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-muted-foreground">
                      {item.value} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-foreground/5 flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-bold">Fulfillment Rate</span>
            <span className="font-mono font-black text-emerald-400">
              {metrics.totalOrders > 0 ? `${Math.round((metrics.completedOrders / metrics.totalOrders) * 100)}%` : '0%'}
            </span>
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

