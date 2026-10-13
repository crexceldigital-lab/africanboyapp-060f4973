import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Package, ShoppingBag, TrendingUp, User, HelpCircle,
  Search, Filter, Plus, CheckCircle2, Clock, Truck, AlertCircle,
  FileText, ShieldCheck, Download, ExternalLink, ArrowRight, X, Phone, Mail, Globe, Check
} from 'lucide-react';
import { agentService } from '@/services/agentService';
import { useCountry } from '@/context/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AgentProfile, AgentReplenishmentOrder, Product, OrderItem } from '@/types';
import Login from './Login';

export default function AgentDashboard() {
  const { user } = useCountry();
  const [activeSection, setActiveSection] = useState<'overview' | 'catalogue' | 'replenishment' | 'performance' | 'profile' | 'support'>('overview');
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AgentReplenishmentOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('All');

  // Replenishment Cart state
  const [replenishmentCart, setReplenishmentCart] = useState<{ product: Product; quantity: number; selectedSize: string; selectedColor: string }[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Territory change request state
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [territoryRequestText, setTerritoryRequestText] = useState('');

  useEffect(() => {
    const loadAgentData = async () => {
      setLoading(true);
      try {
        const profile = await agentService.getAgentProfile(user?.id);
        setAgentProfile(profile);

        if (profile) {
          const ords = await agentService.getAgentReplenishmentOrders(profile.id);
          setOrders(ords);
        }

        // Fetch real products from products table
        const { data: dbProducts } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbProducts) {
          setProducts(
            dbProducts.map((p: any) => ({
              ...p,
              price: Number(p.price),
              colors: Array.isArray(p.colors) ? p.colors : JSON.parse(p.colors || '[]'),
              sizes: Array.isArray(p.sizes) ? p.sizes : JSON.parse(p.sizes || '[]'),
            }))
          );
        }
      } catch (err) {
        console.error('Error loading agent data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAgentData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 pb-16 px-6">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary mx-auto flex items-center justify-center text-primary">
            <Briefcase size={32} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">PORTAL AUTHENTICATION</span>
            <h2 className="text-2xl font-black italic uppercase tracking-tight text-white mt-1">Authorized Agent Login</h2>
            <p className="text-xs text-white/60 mt-2">
              Please sign in with your approved African Boy agent account to access your commercial dashboard.
            </p>
          </div>
          <div className="bg-card p-6 rounded-3xl border border-white/10 text-left">
            <Login />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">Loading Agent Portal...</p>
        </div>
      </div>
    );
  }

  // If no agent profile exists for user, show guidance
  if (!agentProfile) {
    return (
      <div className="min-h-screen bg-black text-white pt-28 pb-16 px-6">
        <div className="max-w-lg mx-auto text-center space-y-6 bg-zinc-950 p-8 rounded-3xl border border-white/10">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500 mx-auto flex items-center justify-center text-yellow-500">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black italic uppercase tracking-tight">Agent Account Required</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              Your account <strong>({user.email})</strong> is registered as a customer, but does not currently have an active Agent or Distributor agreement on file.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/become-an-agent');
                window.location.reload();
              }}
              className="flex-1 py-3.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
            >
              Apply to Become an Agent
            </button>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                window.location.reload();
              }}
              className="py-3.5 px-6 bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/20 transition-colors"
            >
              Return to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Catalogue calculations
  const enrichedProducts = agentService.getAgentProducts(products, agentProfile);

  const filteredCatalogue = enrichedProducts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(catalogueSearch.toLowerCase()));

    const matchesCategory =
      selectedCatFilter === 'All'
        ? true
        : selectedCatFilter === 'Approved Only'
        ? p.isCategoryApproved
        : p.category.toLowerCase() === selectedCatFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Calculate order stats
  const totalOrdersCount = orders.length;
  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const pendingOrders = orders.filter(o => o.status === 'submitted' || o.status === 'confirmed');
  const outstandingBal = orders.reduce((sum, o) => sum + Math.max(0, Number(o.total_amount) - Number(o.amount_paid)), 0);

  // Commission or Gross Margin reporting according to approved model
  const isCommissionModel = agentProfile.business_model === 'Commission-Based Agent';
  const earnedCommission = isCommissionModel
    ? Math.round(totalSpent * (agentProfile.commission_rate / 100))
    : 0;
  const estimatedGrossMargin = !isCommissionModel
    ? Math.round(totalSpent * (agentProfile.wholesale_discount_percent / 100))
    : 0;

  // Replenishment cart handlers
  const addToReplenishment = (product: Product, size?: string, color?: string) => {
    const selectedSize = size || (product.sizes?.[0] || 'Standard');
    const selectedColor = color || (product.colors?.[0]?.name || 'Standard');

    setReplenishmentCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id && item.selectedSize === selectedSize && item.selectedColor === selectedColor);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { product, quantity: 1, selectedSize, selectedColor }];
    });
    toast.success(`Added ${product.name} to replenishment order.`);
  };

  const updateCartQty = (idx: number, delta: number) => {
    setReplenishmentCart(prev => {
      const copy = [...prev];
      copy[idx].quantity += delta;
      if (copy[idx].quantity <= 0) {
        return copy.filter((_, i) => i !== idx);
      }
      return copy;
    });
  };

  const cartTotalQty = replenishmentCart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = replenishmentCart.reduce((sum, i) => {
    const discount = agentProfile.wholesale_discount_percent || 0;
    const wholesalePrice = Math.round(i.product.price * (1 - discount / 100));
    return sum + wholesalePrice * i.quantity;
  }, 0);

  const handleCreateReplenishmentOrder = async () => {
    if (cartTotalQty < agentProfile.minimum_order_quantity) {
      toast.error(`Minimum order quantity is ${agentProfile.minimum_order_quantity} units. You currently have ${cartTotalQty}.`);
      return;
    }
    if (!shippingAddress.trim()) {
      toast.error('Please enter delivery address or warehouse destination.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const items: OrderItem[] = replenishmentCart.map(i => {
        const discount = agentProfile.wholesale_discount_percent || 0;
        const wholesalePrice = Math.round(i.product.price * (1 - discount / 100));
        return {
          product_id: i.product.id,
          name: i.product.name,
          price: wholesalePrice,
          quantity: i.quantity,
          size: i.selectedSize,
          color: i.selectedColor,
          sku: i.product.sku || undefined,
          image_url: i.product.image_url,
        };
      });

      const res = await agentService.createReplenishmentOrder(
        agentProfile,
        items,
        shippingAddress.trim(),
        orderNotes.trim()
      );

      if (res.success && res.order) {
        toast.success(`Replenishment order #${res.order.order_number} submitted!`);
        setOrders(prev => [res.order!, ...prev]);
        setReplenishmentCart([]);
        setIsOrdering(false);
        setActiveSection('replenishment');
      } else {
        toast.error(res.error || 'Failed to create order.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error creating order.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleRequestTerritoryChange = () => {
    if (!territoryRequestText.trim()) return toast.error('Please describe the territory you wish to request.');
    toast.success('Territory change request submitted to administrative desk.');
    setShowTerritoryModal(false);
    setTerritoryRequestText('');
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-black pt-20 pb-28 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Agent Header Banner */}
      <div className="rounded-3xl bg-zinc-950 border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary px-3 py-1 rounded-full bg-primary/15 border border-primary/30">
              AGENT PORTAL · {agentProfile.agent_code}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              STATUS: {agentProfile.status.toUpperCase()}
            </span>
            {agentProfile.is_exclusive && (
              <span className="text-[10px] font-black uppercase tracking-wider text-black bg-primary px-3 py-1 rounded-full">
                TERRITORY EXCLUSIVE
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
            {agentProfile.business_name || agentProfile.full_name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
            <span><strong>Model:</strong> {agentProfile.business_model}</span>
            <span>·</span>
            <span><strong>Territory:</strong> {agentProfile.assigned_territory} ({agentProfile.assigned_country_name})</span>
            <span>·</span>
            <span><strong>Agreement:</strong> {agentProfile.agreement_reference || 'Active'}</span>
          </div>
        </div>

        {/* Quick Replenishment CTA */}
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button
            onClick={() => setActiveSection('catalogue')}
            className="flex-1 md:flex-none px-6 py-3.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> New Replenishment Order
          </button>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-white/10">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'catalogue', label: 'Wholesale Catalogue', icon: ShoppingBag },
          { id: 'replenishment', label: `Orders (${orders.length})`, icon: Package },
          { id: 'performance', label: 'Sales & Margin', icon: TrendingUp },
          { id: 'profile', label: 'Profile & Territory', icon: User },
          { id: 'support', label: 'Partner Support', icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-black shadow-lg scale-[1.02]'
                  : 'bg-zinc-950 text-white/60 hover:text-white hover:bg-zinc-900 border border-white/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION: OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Total Replenishments</span>
              <p className="text-2xl sm:text-3xl font-black text-white">{totalOrdersCount}</p>
              <span className="text-[11px] text-primary font-bold">Lifetime Volume</span>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Total Order Value</span>
              <p className="text-2xl sm:text-3xl font-black text-white">{totalSpent.toLocaleString()} {agentProfile.currency}</p>
              <span className="text-[11px] text-green-400 font-bold">Recorded Transactions</span>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                {isCommissionModel ? 'Commission Earned' : 'Est. Wholesale Margin'}
              </span>
              <p className="text-2xl sm:text-3xl font-black text-primary">
                {(isCommissionModel ? earnedCommission : estimatedGrossMargin).toLocaleString()} {agentProfile.currency}
              </p>
              <span className="text-[11px] text-white/50">
                {isCommissionModel ? `${agentProfile.commission_rate}% rate` : `${agentProfile.wholesale_discount_percent}% margin tier`}
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Pending Processing</span>
              <p className="text-2xl sm:text-3xl font-black text-yellow-400">{pendingOrders.length}</p>
              <span className="text-[11px] text-white/50">In Transit or Review</span>
            </div>
          </div>

          {/* Approved Categories Banner */}
          <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Authorized Merchandise Lines
              </h3>
              <span className="text-[11px] text-primary font-bold">
                {agentProfile.approved_categories.length} Lines Permitted
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {agentProfile.approved_categories.map(cat => (
                <span
                  key={cat}
                  className="px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-wider"
                >
                  ✓ {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Orders Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase tracking-tight text-white">
                Recent Purchase & Replenishment Orders
              </h3>
              <button
                onClick={() => setActiveSection('replenishment')}
                className="text-xs font-bold text-primary hover:underline"
              >
                View All ({orders.length}) →
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-10 rounded-3xl bg-zinc-950 border border-white/10 text-center space-y-3">
                <Package size={36} className="text-white/30 mx-auto" />
                <p className="text-sm font-bold text-white">No replenishment orders placed yet.</p>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  Browse your authorized wholesale catalogue and place your first stock replenishment order.
                </p>
                <button
                  onClick={() => setActiveSection('catalogue')}
                  className="mt-2 px-6 py-2.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl"
                >
                  Browse Catalogue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 3).map(order => (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black font-mono text-primary">{order.order_number}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white">
                          {order.status}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          Payment: {order.payment_status}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        {order.items.length} product lines · Placed on {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-auto">
                      <span className="text-base font-black text-white">
                        {Number(order.total_amount).toLocaleString()} {order.currency}
                      </span>
                      <span className="text-[11px] text-white/50">
                        Paid: {Number(order.amount_paid).toLocaleString()} {order.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: CATALOGUE */}
      {activeSection === 'catalogue' && (
        <div className="space-y-6">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={catalogueSearch}
                onChange={e => setCatalogueSearch(e.target.value)}
                placeholder="Search products by title, category, or SKU..."
                className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-white/15 rounded-2xl text-sm font-medium focus:border-primary outline-none text-white"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {['All', 'Approved Only', ...agentProfile.approved_categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCatFilter(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    selectedCatFilter === cat
                      ? 'bg-primary text-black font-black'
                      : 'bg-zinc-950 text-white/60 border border-white/10 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Replenishment Order Cart Drawer Preview if items added */}
          {replenishmentCart.length > 0 && (
            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/40 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-20 z-30 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-black font-black flex items-center justify-center text-sm">
                  {cartTotalQty}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-primary">
                    Replenishment Cart ({cartTotalQty} units)
                  </p>
                  <p className="text-xs text-white/70">
                    Subtotal: <strong>{cartSubtotal.toLocaleString()} {agentProfile.currency}</strong> (MOQ: {agentProfile.minimum_order_quantity})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setReplenishmentCart([])}
                  className="px-4 py-2.5 rounded-xl border border-white/20 text-xs font-bold text-white hover:bg-white/10"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsOrdering(true)}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                >
                  Review Order →
                </button>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCatalogue.map(product => {
              return (
                <div
                  key={product.id}
                  className={`rounded-3xl bg-zinc-950 border overflow-hidden flex flex-col justify-between transition-all ${
                    product.isCategoryApproved
                      ? 'border-white/15 hover:border-primary/50'
                      : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="relative h-64 sm:h-72 overflow-hidden bg-zinc-900 group">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.isCategoryApproved ? (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-black text-[9px] font-black uppercase tracking-widest shadow-lg">
                        APPROVED LINE
                      </span>
                    ) : (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-zinc-800 text-white/60 text-[9px] font-bold uppercase tracking-widest">
                        LINE RESTRICTED
                      </span>
                    )}

                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[10px] font-bold text-white/80">
                      Stock: {product.stock_quantity}
                    </div>
                  </div>

                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/50">
                        <span>{product.category}</span>
                        {product.sku && <span>SKU: {product.sku}</span>}
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-white line-clamp-1">
                        {product.name}
                      </h4>
                    </div>

                    {/* Pricing breakdown */}
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/50">Retail Price:</span>
                        <span className="text-white/70 line-through">
                          {product.price.toLocaleString()} TZS
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-primary font-bold">Your Wholesale Price:</span>
                        <span className="text-primary font-black text-sm">
                          {product.agentWholesalePrice.toLocaleString()} {agentProfile.currency}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-green-400 font-bold">
                        <span>Wholesale Margin:</span>
                        <span>{product.agentMarginPercent}% Margin</span>
                      </div>
                    </div>

                    <button
                      onClick={() => addToReplenishment(product)}
                      disabled={!product.isCategoryApproved}
                      className="w-full py-3 rounded-xl bg-white/10 hover:bg-primary hover:text-black font-black text-xs uppercase tracking-widest text-white transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add to Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION: REPLENISHMENT ORDERS */}
      {activeSection === 'replenishment' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Purchase & Replenishment History
              </h2>
              <p className="text-xs text-white/60">
                Track stock deliveries, payment status, and order fulfillment.
              </p>
            </div>
            <button
              onClick={() => setActiveSection('catalogue')}
              className="px-5 py-2.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center gap-1.5"
            >
              <Plus size={16} /> Create Order
            </button>
          </div>

          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black font-mono text-primary">{order.order_number}</span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        Fulfillment: {order.status}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        Payment: {order.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">
                      Date: {new Date(order.created_at).toLocaleString()} · Destination: {order.destination_city}, {order.destination_country}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-black text-white">
                      {Number(order.total_amount).toLocaleString()} {order.currency}
                    </p>
                    <p className="text-xs text-white/60">
                      Paid: {Number(order.amount_paid).toLocaleString()} {order.currency}
                    </p>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-white/50 block">Items in Order:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="p-3 bg-zinc-900 rounded-xl flex items-center gap-3 text-xs">
                        {item.image_url && (
                          <img src={item.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <p className="text-[11px] text-white/60">
                            {item.quantity} units · {item.size || 'STD'} {item.color ? `· ${item.color}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {order.shipping_address && (
                  <p className="text-xs text-white/50 pt-1">
                    <strong>Shipping Address:</strong> {order.shipping_address}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: PERFORMANCE */}
      {activeSection === 'performance' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">
              Commercial Financial Statement
            </h2>
            <p className="text-xs text-white/60">
              Audited according to recorded transactions and approved commercial agreement terms.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Total Replenishment Volume</span>
                <p className="text-2xl font-black text-white">{totalSpent.toLocaleString()} {agentProfile.currency}</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">
                  {isCommissionModel ? 'Commission Accrued' : 'Estimated Gross Margin'}
                </span>
                <p className="text-2xl font-black text-primary">
                  {(isCommissionModel ? earnedCommission : estimatedGrossMargin).toLocaleString()} {agentProfile.currency}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900 border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Outstanding Balance</span>
                <p className={`text-2xl font-black ${outstandingBal > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {outstandingBal.toLocaleString()} {agentProfile.currency}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: PROFILE & TERRITORY */}
      {activeSection === 'profile' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  Agent Profile & Commercial Agreement
                </h2>
                <p className="text-xs text-white/60">Official partner credentials registered with African Boy HQ.</p>
              </div>
              <button
                onClick={() => setShowTerritoryModal(true)}
                className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Request Territory Expansion
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Agent Identification Code</span>
                <p className="text-base font-black font-mono text-primary">{agentProfile.agent_code}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Operating Business Model</span>
                <p className="text-base font-black text-white">{agentProfile.business_model}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Assigned Country & Territory</span>
                <p className="text-sm font-bold text-white">
                  {agentProfile.assigned_territory} ({agentProfile.assigned_country_name})
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Exclusivity Status</span>
                <p className="text-sm font-bold text-white">
                  {agentProfile.is_exclusive ? 'Exclusive Territory Assigned' : 'Non-Exclusive Territory'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Wholesale Discount Tier</span>
                <p className="text-sm font-bold text-primary">{agentProfile.wholesale_discount_percent}% off retail</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-white/50">Minimum Order Quantity (MOQ)</span>
                <p className="text-sm font-bold text-white">{agentProfile.minimum_order_quantity} units per replenishment</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: SUPPORT */}
      {activeSection === 'support' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-zinc-950 border border-white/10 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary mx-auto flex items-center justify-center text-primary">
              <ShieldCheck size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">
                Dedicated Agent Partner Support
              </h2>
              <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
                Connect directly with African Boy’s partner operations team for bulk replenishment assistance, shipping logistics, or marketing asset requests.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-left">
              <a
                href="https://wa.me/255627997928?text=Hello%20African%20Boy%20Agent%20Support"
                target="_blank"
                rel="noreferrer"
                className="p-5 rounded-2xl bg-zinc-900 border border-white/10 hover:border-green-500/50 flex items-center gap-4 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                  <Phone size={22} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white group-hover:text-green-400 transition-colors">
                    Agent VIP WhatsApp
                  </p>
                  <p className="text-[11px] text-white/50">+255 627 997 928</p>
                </div>
              </a>

              <a
                href="mailto:partners@africanboy.africa"
                className="p-5 rounded-2xl bg-zinc-900 border border-white/10 hover:border-primary/50 flex items-center gap-4 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Mail size={22} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white group-hover:text-primary transition-colors">
                    Official Partner Email
                  </p>
                  <p className="text-[11px] text-white/50">partners@africanboy.africa</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Review & Submit Order Modal */}
      {isOrdering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 text-white max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase tracking-tight">Review Replenishment Order</h3>
              <button onClick={() => setIsOrdering(false)} className="p-1 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-white/70">Selected Units ({cartTotalQty}):</p>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {replenishmentCart.map((item, i) => (
                  <div key={i} className="p-3 bg-zinc-900 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{item.product.name}</p>
                      <p className="text-[11px] text-white/50">Size: {item.selectedSize} · Color: {item.selectedColor}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQty(i, -1)} className="w-6 h-6 rounded bg-white/10 font-bold">-</button>
                      <span className="font-bold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQty(i, 1)} className="w-6 h-6 rounded bg-white/10 font-bold">+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Delivery Address / Destination Hub *</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  placeholder="e.g. Kariakoo Storefront or Warehouse Destination..."
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Special Instructions / Notes</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="e.g. Deliver via standard coastal cargo freight..."
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-900 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Wholesale Subtotal:</span>
                <span>{cartSubtotal.toLocaleString()} {agentProfile.currency}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Freight / Cargo Handling:</span>
                <span>35,000 {agentProfile.currency}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-primary pt-2 border-t border-white/10">
                <span>Total Amount:</span>
                <span>{(cartSubtotal + 35000).toLocaleString()} {agentProfile.currency}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsOrdering(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReplenishmentOrder}
                disabled={isSubmittingOrder}
                className="flex-1 py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isSubmittingOrder ? 'Submitting...' : 'Confirm Order'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Territory Expansion Modal */}
      {showTerritoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 space-y-4 text-white">
            <h3 className="text-base font-black uppercase tracking-tight">Request Territory Expansion</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Submit your request to add new regional territories or upgrade to nationwide distribution exclusivity.
            </p>
            <textarea
              rows={3}
              value={territoryRequestText}
              onChange={e => setTerritoryRequestText(e.target.value)}
              placeholder="Specify the region or cities you wish to add and your sales projections..."
              className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowTerritoryModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestTerritoryChange}
                className="flex-1 py-2.5 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
