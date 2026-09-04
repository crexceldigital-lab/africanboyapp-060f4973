import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  DollarSign, ShoppingBag, Truck, Users, XCircle, TrendingUp, Store as StoreIcon
} from 'lucide-react';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, format,
  eachHourOfInterval, eachDayOfInterval, isSameDay, isSameHour
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { fromAny, castOrders } from '@/lib/supabase-helpers';
import { Order, OrderItem, Store } from '../../types';
import RankedBarList, { RankedItem } from './RankedBarList';
import RadialStatPair from './RadialStatPair';

type PeriodMode = 'daily' | 'weekly' | 'monthly';

interface ReportsPanelProps {
  staffStoreId?: number | null;
}

export default function ReportsPanel({ staffStoreId }: ReportsPanelProps) {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<'all' | number>(staffStoreId || 'all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [priorEmails, setPriorEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch active stores
  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await fromAny('stores')
        .select('*')
        .eq('is_active', true)
        .order('id');

      if (data) {
        setStores(data as unknown as Store[]);
      }
    };
    fetchStores();
  }, []);

  // Lock to staff store if passed
  useEffect(() => {
    if (staffStoreId) {
      setSelectedStoreId(staffStoreId);
    }
  }, [staffStoreId]);

  const getRange = (mode: PeriodMode, refDate: Date) => {
    if (mode === 'daily') {
      const start = startOfDay(refDate);
      const end = endOfDay(refDate);
      return {
        start,
        end,
        label: format(refDate, 'EEE, dd MMM yyyy'),
        slug: format(refDate, 'ddMMM').toLowerCase(),
      };
    }
    if (mode === 'weekly') {
      const start = startOfWeek(refDate, { weekStartsOn: 1 });
      const end = endOfWeek(refDate, { weekStartsOn: 1 });
      return {
        start,
        end,
        label: `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`,
        slug: `${format(start, 'dd')}-${format(end, 'ddMMM')}`.toLowerCase(),
      };
    }
    const start = startOfMonth(refDate);
    const end = endOfMonth(refDate);
    return {
      start,
      end,
      label: format(refDate, 'MMMM yyyy'),
      slug: format(refDate, 'MMM-yyyy').toLowerCase(),
    };
  };

  const handlePrev = () => {
    if (periodMode === 'daily') setSelectedDate(d => subDays(d, 1));
    else if (periodMode === 'weekly') setSelectedDate(d => subWeeks(d, 1));
    else setSelectedDate(d => subMonths(d, 1));
  };

  const handleNext = () => {
    if (periodMode === 'daily') setSelectedDate(d => addDays(d, 1));
    else if (periodMode === 'weekly') setSelectedDate(d => addWeeks(d, 1));
    else setSelectedDate(d => addMonths(d, 1));
  };

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      const { start, end } = getRange(periodMode, selectedDate);

      // 1. Build base query for range orders (use fromAny to avoid stale
      // generated-types deep-instantiation errors)
      let query = fromAny('orders')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (selectedStoreId !== 'all') {
        query = query.eq('store_id', selectedStoreId);
      }

      const { data: rangeData } = await query;

      // 2. Query prior customer emails for new customer metric
      let priorQuery = supabase
        .from('orders')
        .select('customer_email')
        .lt('created_at', start.toISOString());

      if (selectedStoreId !== 'all') {
        priorQuery = priorQuery.eq('store_id', selectedStoreId);
      }

      const { data: priorData } = await priorQuery;

      const emailSet = new Set<string>();
      priorData?.forEach(o => {
        if (o.customer_email) emailSet.add(o.customer_email.toLowerCase().trim());
      });

      const parsedOrders = castOrders(rangeData || []);

      setOrders(parsedOrders);
      setPriorEmails(emailSet);
      setLoading(false);
    };

    fetchReportData();
  }, [periodMode, selectedDate, selectedStoreId]);

  // Derived Metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalDeliveryFees = orders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  const periodCustomerEmails = new Set(
    orders.map(o => o.customer_email?.toLowerCase().trim()).filter((e): e is string => !!e)
  );

  const newCustomers = Array.from(periodCustomerEmails).filter(e => !priorEmails.has(e)).length;
  const returningCustomers = periodCustomerEmails.size - newCustomers;
  const cancelledCount = orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length;

  const currentStore = stores.find(s => s.id === selectedStoreId);
  const storeLabel = selectedStoreId === 'all'
    ? 'All Stores'
    : currentStore?.name || `Store #${selectedStoreId}`;

  const storeSlug = selectedStoreId === 'all'
    ? 'all-stores'
    : (currentStore?.country_code?.toLowerCase() || `store-${selectedStoreId}`);

  // Chart Data
  const getTrendData = () => {
    const { start, end } = getRange(periodMode, selectedDate);
    if (periodMode === 'daily') {
      const hours = eachHourOfInterval({ start, end });
      return hours.map(h => {
        const hOrders = orders.filter(o => isSameHour(new Date(o.created_at), h));
        return {
          label: format(h, 'HH:00'),
          revenue: hOrders.reduce((sum, o) => sum + o.total_amount, 0),
          orders: hOrders.length,
        };
      });
    }
    if (periodMode === 'weekly') {
      const days = eachDayOfInterval({ start, end });
      return days.map(d => {
        const dOrders = orders.filter(o => isSameDay(new Date(o.created_at), d));
        return {
          label: format(d, 'EEE dd'),
          revenue: dOrders.reduce((sum, o) => sum + o.total_amount, 0),
          orders: dOrders.length,
        };
      });
    }
    const days = eachDayOfInterval({ start, end });
    return days.map(d => {
      const dOrders = orders.filter(o => isSameDay(new Date(o.created_at), d));
      return {
        label: format(d, 'dd'),
        revenue: dOrders.reduce((sum, o) => sum + o.total_amount, 0),
        orders: dOrders.length,
      };
    });
  };

  const getStatusData = () => {
    const counts: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
    };
    orders.forEach(o => {
      const s = o.status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });

    const COLORS: Record<string, string> = {
      completed: '#10B981',
      in_progress: '#3B82F6',
      pending: '#F59E0B',
      cancelled: '#EF4444',
      refunded: '#8B5CF6',
    };

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.replace('_', ' ').toUpperCase(),
        value: count,
        color: COLORS[status] || '#9CA3AF',
      }));
  };

  const getTopProducts = () => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach(order => {
      (order.items || []).forEach((item: OrderItem) => {
        const name = item.name || 'Unknown Product';
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        if (!map[name]) map[name] = { name, quantity: 0, revenue: 0 };
        map[name].quantity += qty;
        map[name].revenue += qty * price;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const getTopCustomersList = (): RankedItem[] => {
    const map: Record<string, { name: string; email: string; orderCount: number; totalSpent: number }> = {};
    orders.forEach(o => {
      const email = o.customer_email?.toLowerCase().trim() || o.customer_name || 'Guest User';
      const name = o.customer_name || email;
      const amt = Number(o.total_amount) || 0;
      if (!map[email]) map[email] = { name, email, orderCount: 0, totalSpent: 0 };
      map[email].orderCount += 1;
      if (o.status !== 'cancelled' && o.status !== 'refunded') {
        map[email].totalSpent += amt;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map(c => ({
        label: c.name,
        sublabel: `${c.orderCount} order(s)`,
        value: c.totalSpent,
        formattedValue: `${c.totalSpent.toLocaleString()} TZS`,
      }));
  };

  const getZoneBreakdownList = (): RankedItem[] => {
    const map: Record<string, { zone: string; orderCount: number; revenue: number }> = {};
    orders.forEach(o => {
      const zone = o.delivery_zone?.trim() || 'Standard Delivery Zone';
      const amt = Number(o.total_amount) || 0;
      if (!map[zone]) map[zone] = { zone, orderCount: 0, revenue: 0 };
      map[zone].orderCount += 1;
      if (o.status !== 'cancelled' && o.status !== 'refunded') {
        map[zone].revenue += amt;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5)
      .map(z => ({
        label: z.zone,
        sublabel: `${z.revenue.toLocaleString()} TZS`,
        value: z.orderCount,
        formattedValue: `${z.orderCount} order(s)`,
      }));
  };

  // Export handlers
  const exportCSV = () => {
    const { slug } = getRange(periodMode, selectedDate);
    const filename = `african-boy-report-${storeSlug}-${periodMode}-${slug}.csv`;
    const topCusts = getTopCustomersList();
    const zoneList = getZoneBreakdownList();

    const headers = ['Order ID', 'Store', 'Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'Delivery Zone', 'Items Count', 'Total Amount', 'Currency', 'Delivery Fee', 'Status'];
    const rows = orders.map(o => {
      const st = stores.find(s => s.id === o.store_id);
      return [
        o.id,
        `"${(st?.name || 'Tanzania Store').replace(/"/g, '""')}"`,
        format(new Date(o.created_at), 'yyyy-MM-dd HH:mm:ss'),
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${(o.customer_email || '').replace(/"/g, '""')}"`,
        `"${(o.customer_phone || '').replace(/"/g, '""')}"`,
        `"${(o.delivery_zone || 'Standard Zone').replace(/"/g, '""')}"`,
        (o.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0),
        o.total_amount,
        o.currency || 'TZS',
        o.delivery_fee || 0,
        o.status,
      ];
    });

    // Add Top Customers section to CSV
    const topCustomerHeader = ['', '', '', '--- TOP CUSTOMERS BY SPEND IN PERIOD ---'];
    const topCustomerRows = topCusts.map(c => ['', '', '', `"${c.label}"`, `${c.value} TZS`, `"${c.sublabel}"`]);

    // Add Zone Breakdown section to CSV
    const zoneHeader = ['', '', '', '--- DELIVERY ZONE BREAKDOWN ---'];
    const zoneRows = zoneList.map(z => ['', '', '', `"${z.label}"`, `${z.value} orders`, `"${z.sublabel}"`]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      topCustomerHeader.join(','),
      ...topCustomerRows.map(r => r.join(',')),
      '',
      zoneHeader.join(','),
      ...zoneRows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const { label, slug } = getRange(periodMode, selectedDate);
    const doc = new jsPDF();
    const topProducts = getTopProducts();
    const topCusts = getTopCustomersList();
    const zoneList = getZoneBreakdownList();

    // Clean black text on white header for printability
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AFRICAN BOY', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('MANAGEMENT SUITE — SALES & PERFORMANCE REPORT', 14, 26);

    doc.setLineWidth(0.5);
    doc.line(14, 29, 196, 29);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Store Scope: ${storeLabel.toUpperCase()}`, 14, 37);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${label} (${periodMode.toUpperCase()})`, 14, 43);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 48);

    autoTable(doc, {
      startY: 53,
      head: [['Total Revenue', 'Total Orders', 'Avg Order Value', 'Delivery Fees', 'New Customers', 'Cancelled']],
      body: [[
        `${totalRevenue.toLocaleString()} TZS`,
        String(totalOrders),
        `${Math.round(avgOrderValue).toLocaleString()} TZS`,
        `${totalDeliveryFees.toLocaleString()} TZS`,
        String(newCustomers),
        String(cancelledCount),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 9, fontStyle: 'bold' },
    });

    // Top Customers Table
    const lastY0 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Customers by Spend', 14, lastY0);

    const custRows = topCusts.map((c, idx) => [
      `#${idx + 1}`,
      c.label,
      c.sublabel || '-',
      `${c.value.toLocaleString()} TZS`,
    ]);

    autoTable(doc, {
      startY: lastY0 + 4,
      head: [['Rank', 'Customer Name', 'Orders', 'Total Spend (TZS)']],
      body: custRows.length > 0 ? custRows : [['-', 'No customer spend recorded', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    // Zone Breakdown Table
    const lastY1 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Zone Breakdown', 14, lastY1);

    const zoneRows = zoneList.map((z, idx) => [
      `#${idx + 1}`,
      z.label,
      `${z.value} order(s)`,
      z.sublabel || '-',
    ]);

    autoTable(doc, {
      startY: lastY1 + 4,
      head: [['Rank', 'Delivery Zone', 'Total Orders', 'Revenue (TZS)']],
      body: zoneRows.length > 0 ? zoneRows : [['-', 'No delivery zone activity', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    // Top Products Table
    const lastY2 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Products (by Revenue)', 14, lastY2);

    const productRows = topProducts.map((p, idx) => [
      `#${idx + 1}`,
      p.name,
      String(p.quantity),
      `${p.revenue.toLocaleString()} TZS`,
    ]);

    autoTable(doc, {
      startY: lastY2 + 4,
      head: [['Rank', 'Product Name', 'Qty Sold', 'Revenue (TZS)']],
      body: productRows.length > 0 ? productRows : [['-', 'No product sales recorded in period', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    // Order Log Table
    const lastY3 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Log for Period', 14, lastY3);

    const orderRows = orders.slice(0, 30).map(o => [
      o.id.substring(0, 8).toUpperCase(),
      format(new Date(o.created_at), 'dd MMM yyyy HH:mm'),
      o.customer_name || o.customer_email || 'Customer',
      String((o.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)),
      `${Number(o.total_amount).toLocaleString()} ${o.currency || 'TZS'}`,
      o.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: lastY3 + 4,
      head: [['Order ID', 'Date', 'Customer', 'Items', 'Amount', 'Status']],
      body: orderRows.length > 0 ? orderRows : [['-', 'No orders in period', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    const filename = `african-boy-report-${storeSlug}-${periodMode}-${slug}.pdf`;
    doc.save(filename);
  };

  const currentRange = getRange(periodMode, selectedDate);
  const trendData = getTrendData();
  const statusData = getStatusData();
  const topProducts = getTopProducts();
  const topCustomersList = getTopCustomersList();
  const zoneBreakdownList = getZoneBreakdownList();

  const totalPeriodUnique = periodCustomerEmails.size;
  const newPct = totalPeriodUnique > 0 ? Math.round((newCustomers / totalPeriodUnique) * 100) : 0;
  const returningPct = totalPeriodUnique > 0 ? 100 - newPct : 0;

  return (
    <div className="space-y-8">
      {/* Header Bar with Period Controls, Store Selector & Export Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card border border-foreground/5 p-6 rounded-[32px] shadow-lg">
        {/* Left: Period Selector & Date Stepper */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {(['daily', 'weekly', 'monthly'] as PeriodMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setPeriodMode(mode)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  periodMode === mode
                    ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]'
                    : 'bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-foreground/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground hover:bg-foreground/10 active:scale-95 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-extrabold text-foreground tracking-tight min-w-[180px] text-center">
              {currentRange.label}
            </span>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground hover:bg-foreground/10 active:scale-95 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Center: Store Filter Pills (Hidden if staffStoreId is locked) */}
        {!staffStoreId && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Store Scope</span>
            <div className="flex items-center gap-2 p-1.5 bg-background/50 border border-foreground/10 rounded-2xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedStoreId('all')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
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
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    selectedStoreId === st.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  {st.name.replace('AFRICAN BOY ', '')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right: Export Buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={exportCSV}
            className="px-5 py-3 bg-card border border-foreground/10 text-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-foreground/5 active:scale-95 transition-all"
          >
            <FileSpreadsheet size={16} className="text-emerald-500" /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="px-5 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-4 bg-card border border-foreground/5 rounded-[32px]">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-primary font-bold text-xs tracking-widest uppercase">Calculating Metrics...</p>
        </div>
      ) : (
        <>
          {/* Per-Store Comparison Row (when "All Stores" is selected) */}
          {selectedStoreId === 'all' && stores.length > 1 && (
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Market Comparison Overview</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map(st => {
                  const stOrders = orders.filter(o => o.store_id === st.id);
                  const stRevenue = stOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                  return (
                    <div key={st.id} className="p-5 bg-card border border-primary/20 rounded-[28px] flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StoreIcon size={14} className="text-primary" />
                          <span className="text-xs font-black uppercase tracking-wider text-foreground">{st.name}</span>
                        </div>
                        <p className="text-lg font-black italic font-mono text-primary">
                          {stRevenue.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">{st.currency_code}</span>
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-foreground/5 rounded-full text-[10px] font-mono font-extrabold text-muted-foreground border border-foreground/10">
                        {stOrders.length} order(s)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-5 bg-card border border-foreground/5 rounded-3xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-widest">Revenue</span>
                <DollarSign size={16} className="text-primary" />
              </div>
              <p className="text-lg font-black italic tracking-tight text-foreground truncate">
                {totalRevenue.toLocaleString()} <span className="text-xs text-primary font-bold">TZS</span>
              </p>
            </div>

            <div className="p-5 bg-card border border-foreground/5 rounded-3xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-widest">Total Orders</span>
                <ShoppingBag size={16} className="text-blue-500" />
              </div>
              <p className="text-lg font-black italic tracking-tight text-foreground">{totalOrders}</p>
            </div>

            <div className="p-5 bg-card border border-foreground/5 rounded-3xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-widest">Avg Order</span>
                <TrendingUp size={16} className="text-emerald-500" />
              </div>
              <p className="text-lg font-black italic tracking-tight text-foreground truncate">
                {Math.round(avgOrderValue).toLocaleString()} <span className="text-xs text-primary font-bold">TZS</span>
              </p>
            </div>

            <div className="p-5 bg-card border border-foreground/5 rounded-3xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-widest">Delivery Fees</span>
                <Truck size={16} className="text-amber-500" />
              </div>
              <p className="text-lg font-black italic tracking-tight text-foreground truncate">
                {totalDeliveryFees.toLocaleString()} <span className="text-xs text-primary font-bold">TZS</span>
              </p>
            </div>

            <div className="p-5 bg-card border border-foreground/5 rounded-3xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-widest">New Customers</span>
                <Users size={16} className="text-purple-500" />
              </div>
              <p className="text-lg font-black italic tracking-tight text-foreground">{newCustomers}</p>
            </div>

            <div className="p-5 bg-card border border-foreground/5 rounded-3xl space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-widest">Cancelled</span>
                <XCircle size={16} className="text-destructive" />
              </div>
              <p className="text-lg font-black italic tracking-tight text-foreground">{cancelledCount}</p>
            </div>
          </div>

          {/* CUSTOMER INSIGHTS SECTION (Reused Components) */}
          <div className="space-y-4">
            <div>
              <span className="text-primary text-xs font-bold tracking-widest uppercase">Demographics & Analytics</span>
              <h3 className="text-xl font-black italic uppercase tracking-tight text-foreground">
                CUSTOMER INSIGHTS ({currentRange.label})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1. New vs Returning (Radial Pair) */}
              <RadialStatPair
                title="New vs Returning Customers"
                subtitle="Period Acquisition Split"
                primary={{
                  label: 'New Customers',
                  value: newCustomers,
                  percentage: newPct,
                  subtext: 'First order in period',
                }}
                secondary={{
                  label: 'Returning',
                  value: returningCustomers,
                  percentage: returningPct,
                  subtext: 'Ordered prior to period',
                }}
              />

              {/* 2. Top Customers in Period */}
              <RankedBarList
                title="Top Customers in Period"
                subtitle="Highest Spend in Selected Range"
                items={topCustomersList}
                maxItems={5}
                emptyMessage="No customer spend recorded in period"
              />

              {/* 3. Delivery Zone Activity */}
              <RankedBarList
                title="Delivery Zone Activity"
                subtitle="Orders by Regional Zone"
                items={zoneBreakdownList}
                maxItems={5}
                barColorClass="bg-emerald-400"
                emptyMessage="No delivery zone data in period"
              />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Chart */}
            <div className="lg:col-span-2 p-6 bg-card border border-foreground/5 rounded-[32px] space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-primary text-[10px] font-bold tracking-widest uppercase">Performance Trend</span>
                  <h3 className="text-lg font-black tracking-tight uppercase italic text-foreground">
                    Revenue Breakdown ({storeLabel})
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{currentRange.label}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', borderRadius: '16px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} TZS`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="hsl(43, 96%, 49%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Breakdown Panel with Segmented Progress List */}
            <div className="p-6 bg-card border border-foreground/5 rounded-[32px] space-y-4 flex flex-col justify-between shadow-lg">
              <div>
                <span className="text-primary text-[10px] font-bold tracking-widest uppercase">Distribution</span>
                <h3 className="text-lg font-black tracking-tight uppercase italic text-foreground">
                  Order Statuses
                </h3>
              </div>
              {statusData.length > 0 ? (
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', borderRadius: '16px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  No orders in period
                </div>
              )}

              {/* Segmented horizontal bars for order status */}
              <div className="space-y-2 pt-2 border-t border-foreground/5">
                {statusData.map(s => {
                  const pct = totalOrders > 0 ? Math.round((s.value / totalOrders) * 100) : 0;
                  return (
                    <div key={s.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                        <span className="font-mono font-bold text-muted-foreground">
                          {s.value} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="p-6 bg-card border border-foreground/5 rounded-[32px] space-y-4 shadow-lg">
            <div>
              <span className="text-primary text-[10px] font-bold tracking-widest uppercase">Top Performers</span>
              <h3 className="text-xl font-black tracking-tight uppercase italic text-foreground">
                Best Selling Products
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-foreground/5 bg-foreground/5">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rank</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Product Name</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Units Sold</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Revenue (TZS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {topProducts.length > 0 ? (
                    topProducts.map((p, idx) => (
                      <tr key={p.name} className="hover:bg-foreground/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-primary">#{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-black italic uppercase">{p.name}</td>
                        <td className="px-6 py-4 font-mono text-sm font-bold text-foreground">{p.quantity}</td>
                        <td className="px-6 py-4 font-mono text-sm font-bold text-primary text-right">
                          {p.revenue.toLocaleString()} TZS
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
                        No product sales recorded in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Period Orders Log Table */}
          <div className="p-6 bg-card border border-foreground/5 rounded-[32px] space-y-4 shadow-lg">
            <div>
              <span className="text-primary text-[10px] font-bold tracking-widest uppercase">Detailed Audit</span>
              <h3 className="text-xl font-black tracking-tight uppercase italic text-foreground">
                Orders for Period ({orders.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-foreground/5 bg-foreground/5">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Store</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Zone</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Items</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {orders.length > 0 ? (
                    orders.map(order => {
                      const st = stores.find(s => s.id === order.store_id);
                      return (
                        <tr key={order.id} className="hover:bg-foreground/[0.02] transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-muted-foreground">
                            {order.id.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-foreground/5 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted-foreground border border-foreground/10">
                              {st?.name.replace('AFRICAN BOY ', '') || 'Tanzania'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                            {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-foreground">{order.customer_name || 'Customer'}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{order.customer_email || order.customer_phone || '-'}</p>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                            {order.delivery_zone || 'Standard Zone'}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-foreground">
                            {(order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)} items
                          </td>
                          <td className="px-6 py-4 font-mono text-sm font-bold text-primary">
                            {Number(order.total_amount).toLocaleString()} {order.currency || 'TZS'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              order.status === 'cancelled' || order.status === 'refunded' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
                        No orders recorded in this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
