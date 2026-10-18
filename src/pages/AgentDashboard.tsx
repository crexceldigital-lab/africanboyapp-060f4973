import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Package, ShoppingBag, TrendingUp, User, HelpCircle,
  Search, Filter, Plus, CheckCircle2, Clock, Truck, AlertCircle,
  FileText, ShieldCheck, Download, ExternalLink, ArrowRight, X, Phone, Mail, Globe, Check,
  Sparkles, DollarSign, Layers
} from 'lucide-react';
import { agentService } from '@/services/agentService';
import { wholesaleProgramService, SHIPPING_TAXES_DISCLAIMER } from '@/services/wholesaleProgramService';
import AgentWholesalePriceList from '@/components/agent/AgentWholesalePriceList';
import AgentMarketingAssets from '@/components/agent/AgentMarketingAssets';
import { useCountry } from '@/context/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  AgentProfile,
  AgentReplenishmentOrder,
  Product,
  OrderItem,
  WholesaleProgramSettings,
  AgentShippingQuote,
  ShippingOrigin
} from '@/types';
import { generateInvoicePdf, type InvoicePdfData } from '@/lib/invoicePdf';
import Login from './Login';

export default function AgentDashboard() {
  const { user } = useCountry();
  const [activeSection, setActiveSection] = useState<'overview' | 'catalogue' | 'pricelist' | 'replenishment' | 'assets' | 'performance' | 'profile' | 'support'>('overview');
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [wholesaleSettings, setWholesaleSettings] = useState<WholesaleProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AgentReplenishmentOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('All');

  // Replenishment Cart state (product prices strictly exclude shipping)
  const [replenishmentCart, setReplenishmentCart] = useState<{ product: Product; quantity: number; selectedSize: string; selectedColor: string }[]>([]);
  const [isOrdering, setIsOrdering] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Shipping Quotes State (separated product sales vs shipping arrangements)
  const [shippingQuotes, setShippingQuotes] = useState<Record<string, AgentShippingQuote>>({});

  // Modal: Request Shipping Quote
  const [showShippingRequestModal, setShowShippingRequestModal] = useState(false);
  const [selectedOrderForQuote, setSelectedOrderForQuote] = useState<AgentReplenishmentOrder | null>(null);
  const [availableOriginsForOrder, setAvailableOriginsForOrder] = useState<ShippingOrigin[]>(['Tanzania', 'China']);
  const [quoteOrigin, setQuoteOrigin] = useState<ShippingOrigin>('Tanzania');
  const [quoteDestCountry, setQuoteDestCountry] = useState('');
  const [quoteDestCity, setQuoteDestCity] = useState('');
  const [quoteDestPostcode, setQuoteDestPostcode] = useState('');
  const [quoteDeliveryAddress, setQuoteDeliveryAddress] = useState('');
  const [quoteSpecialRequirements, setQuoteSpecialRequirements] = useState('');
  const [isSubmittingQuoteRequest, setIsSubmittingQuoteRequest] = useState(false);

  // Modal: Decline / Request Revision
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [quoteToReject, setQuoteToReject] = useState<AgentShippingQuote | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Modal: Record Shipping Payment
  const [showShippingPaymentModal, setShowShippingPaymentModal] = useState(false);
  const [quoteToPay, setQuoteToPay] = useState<AgentShippingQuote | null>(null);
  const [shippingPaymentRefInput, setShippingPaymentRefInput] = useState('');

  // Territory change request state
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [territoryRequestText, setTerritoryRequestText] = useState('');

  useEffect(() => {
    const loadAgentData = async () => {
      setLoading(true);
      try {
        const [profile, settings] = await Promise.all([
          agentService.getAgentProfile(user?.id),
          wholesaleProgramService.getSettings(),
        ]);
        setAgentProfile(profile);
        setWholesaleSettings(settings);

        if (profile) {
          const [ords, allQuotes] = await Promise.all([
            agentService.getAgentReplenishmentOrders(profile.id),
            agentService.getAllShippingQuotes(),
          ]);
          setOrders(ords);
          const qMap: Record<string, AgentShippingQuote> = {};
          allQuotes.forEach(q => {
            if (q.order_id) qMap[q.order_id] = q;
          });
          setShippingQuotes(qMap);
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

  // Catalogue calculations - Initial wholesale catalogue enabled categories (T-Shirts and Caps by default)
  const enabledCategories = wholesaleSettings?.enabledCategories || ['T-Shirt', 'Caps'];
  const wholesaleEligibleProducts = products.filter(p => {
    const norm = wholesaleProgramService.normalizeCategory(p.category);
    return enabledCategories.includes(norm);
  });

  const enrichedProducts = agentService.getAgentProducts(wholesaleEligibleProducts, agentProfile);

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

  // Wholesale Pricing Engine calculation for replenishment cart
  // Product prices strictly exclude shipping (arranged and charged separately)
  const cartQuotation = wholesaleProgramService.calculateQuotation(
    replenishmentCart.map(i => ({
      productId: i.product.id,
      name: i.product.name,
      sku: i.product.sku,
      category: i.product.category,
      quantity: i.quantity,
      retailPrice: i.product.price,
      size: i.selectedSize,
      color: i.selectedColor,
      imageUrl: i.product.image_url,
    })),
    {
      targetCurrency: agentProfile.currency,
      confirmedShippingRate: null, // Strictly merchandise only!
      settings: wholesaleSettings || undefined,
      combineMixedQuantities: wholesaleSettings?.combineMixedQuantitiesForTiers,
    }
  );

  const cartTotalQty = cartQuotation.totalUnits;
  const cartSubtotal = cartQuotation.merchandiseSubtotalConverted;

  const refreshShippingQuotes = async () => {
    const allQuotes = await agentService.getAllShippingQuotes();
    const qMap: Record<string, AgentShippingQuote> = {};
    allQuotes.forEach(q => {
      if (q.order_id) qMap[q.order_id] = q;
    });
    setShippingQuotes(qMap);
  };

  const openShippingRequestModal = (order: AgentReplenishmentOrder) => {
    const origins = agentService.getOrderAvailableOrigins(order.items, products);
    setAvailableOriginsForOrder(origins);
    setQuoteOrigin(origins[0] || 'Tanzania');
    setQuoteDestCountry(order.destination_country || agentProfile?.assigned_country_name || '');
    setQuoteDestCity(order.destination_city || agentProfile?.assigned_territory || '');
    setQuoteDestPostcode('');
    setQuoteDeliveryAddress(order.shipping_address || '');
    setQuoteSpecialRequirements('');
    setSelectedOrderForQuote(order);
    setShowShippingRequestModal(true);
  };

  const handleRequestShippingQuote = async () => {
    if (!selectedOrderForQuote || !agentProfile) return;
    if (!quoteDestCountry.trim() || !quoteDestCity.trim() || !quoteDeliveryAddress.trim()) {
      toast.error('Please specify destination country, city, and delivery address.');
      return;
    }
    setIsSubmittingQuoteRequest(true);
    try {
      const res = await agentService.requestShippingQuote({
        orderId: selectedOrderForQuote.id,
        orderNumber: selectedOrderForQuote.order_number,
        agentId: agentProfile.id,
        userId: agentProfile.user_id,
        shippingOrigin: quoteOrigin,
        destinationCountry: quoteDestCountry.trim(),
        destinationCity: quoteDestCity.trim(),
        destinationPostcode: quoteDestPostcode.trim() || undefined,
        deliveryAddress: quoteDeliveryAddress.trim(),
        specialRequirements: quoteSpecialRequirements.trim() || undefined,
      });
      if (res.success && res.quote) {
        toast.success(`Shipping quotation requested from ${quoteOrigin}! Logistics desk will verify rates.`);
        await refreshShippingQuotes();
        setShowShippingRequestModal(false);
        setSelectedOrderForQuote(null);
      } else {
        toast.error(res.error || 'Failed to request shipping quote.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error requesting shipping quotation.');
    } finally {
      setIsSubmittingQuoteRequest(false);
    }
  };

  const handleApproveQuote = async (quoteId: string) => {
    try {
      const res = await agentService.respondToShippingQuote(quoteId, true);
      if (res.success && res.quote) {
        toast.success('Shipping quotation approved! Please settle shipping payment before dispatch.');
        await refreshShippingQuotes();
      } else {
        toast.error(res.error || 'Failed to approve shipping quote.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error approving shipping quote.');
    }
  };

  const handleRejectQuote = async () => {
    if (!quoteToReject) return;
    if (!rejectionReasonText.trim()) {
      toast.error('Please state why this quotation was declined so logistics can revise.');
      return;
    }
    try {
      const res = await agentService.respondToShippingQuote(quoteToReject.id, false, rejectionReasonText.trim());
      if (res.success && res.quote) {
        toast.info('Quotation revision requested. Logistics desk will provide an updated quote.');
        await refreshShippingQuotes();
        setShowRejectModal(false);
        setQuoteToReject(null);
        setRejectionReasonText('');
      } else {
        toast.error(res.error || 'Failed to decline quote.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error declining quote.');
    }
  };

  const handleRecordShippingPayment = async () => {
    if (!quoteToPay) return;
    if (!shippingPaymentRefInput.trim()) {
      toast.error('Please enter payment reference or transaction code.');
      return;
    }
    try {
      const res = await agentService.recordShippingPayment(quoteToPay.id, shippingPaymentRefInput.trim());
      if (res.success && res.quote) {
        toast.success('Shipping payment recorded! Shipment is ready for dispatch.');
        await refreshShippingQuotes();
        setShowShippingPaymentModal(false);
        setQuoteToPay(null);
        setShippingPaymentRefInput('');
      } else {
        toast.error(res.error || 'Failed to record shipping payment.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error recording shipping payment.');
    }
  };

  const handleDownloadMerchandiseInvoice = (order: AgentReplenishmentOrder) => {
    const invoiceData: InvoicePdfData = {
      invoice_number: `INV-${order.order_number}`,
      customer_name: agentProfile?.full_name || 'African Boy Agent',
      customer_email: agentProfile?.email || null,
      customer_phone: agentProfile?.phone_number || null,
      delivery_address: order.shipping_address,
      issue_date: new Date(order.created_at).toLocaleDateString(),
      currency: order.currency,
      items: order.items.map(i => ({
        name: i.name,
        description: `Size: ${i.size || 'STD'}${i.color ? ` | Color: ${i.color}` : ''}`,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
      subtotal: order.subtotal,
      tax_percent: 0,
      delivery_fee: 0, // Strictly 0 - merchandise sales only!
      discount_amount: order.discount_amount || 0,
      total_amount: order.total_amount,
      payment_status: order.payment_status,
      notes: order.notes || 'Commercial merchandise order. Shipping is not included and will be arranged and charged separately.',
    };
    generateInvoicePdf(invoiceData, { business_name: 'African Boy Worldwide' }, `Invoice-${order.order_number}`);
  };

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
      const items: OrderItem[] = cartQuotation.proposalItems.map(pItem => {
        const orig = replenishmentCart.find(r => r.product.id === pItem.productId);
        return {
          product_id: pItem.productId,
          name: pItem.name,
          price: pItem.unitPrice,
          quantity: pItem.quantity,
          size: pItem.size || orig?.selectedSize,
          color: pItem.color || orig?.selectedColor,
          sku: pItem.sku || undefined,
          image_url: pItem.imageUrl || orig?.product.image_url,
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

        {/* Header CTAs */}
        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
          <button
            onClick={() => wholesaleProgramService.downloadAgentAgreementPdf(agentProfile)}
            className="flex-1 md:flex-none px-4 py-3.5 bg-zinc-900 border border-white/20 hover:border-primary/50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2"
            title="Download Official Agreement & Commercial Offer (PDF)"
          >
            <Download size={15} className="text-primary" /> Agreement (PDF)
          </button>
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
          { id: 'pricelist', label: 'Price List & Tiers', icon: DollarSign },
          { id: 'replenishment', label: `Orders (${orders.length})`, icon: Package },
          { id: 'assets', label: 'Marketing Assets', icon: Sparkles },
          { id: 'performance', label: 'Sales & Margin', icon: TrendingUp },
          { id: 'profile', label: 'Profile & Agreement', icon: FileText },
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

          {/* Annual Collection Commitment Card */}
          <div className="p-6 rounded-3xl bg-zinc-950 border border-primary/30 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-black font-black text-[9px] uppercase tracking-wider">
                  ANNUAL COMMITMENT
                </span>
                <h3 className="text-sm font-black uppercase text-white tracking-wide">
                  Country Distributor Collection Commitments
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-black text-xs">
                4 Collections · 1,000 Pcs / Collection · 4,000 Pcs Annual
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 space-y-2 text-xs">
              <p className="text-white font-bold text-xs sm:text-sm leading-relaxed">
                “Country Distributors are required to purchase a minimum of 1,000 pieces from each of African Boy’s four annual collections, representing a planned minimum commitment of 4,000 pieces per year.”
              </p>
              <p className="text-white/60 text-[11px] leading-relaxed">
                The 1,000-piece requirement applies to <strong>EACH new collection individually</strong>, not merely to your initial opening order or total annual purchases.
                The system tracks each quarterly release separately to support your planned annual minimum of 4,000 pieces.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-white/50">Contract Term</span>
                <p className="text-sm font-black text-white">12 Months</p>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-white/50">Annual Drops</span>
                <p className="text-sm font-black text-white">4 Collections</p>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-white/50">MOQ / Collection</span>
                <p className="text-sm font-black text-primary font-mono">1,000 Pieces</p>
              </div>
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-white/50">Planned Annual Total</span>
                <p className="text-sm font-black text-primary font-mono">4,000 Pieces</p>
              </div>
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

                    {/* Logistics snippet if tracked */}
                    {(order.courier_name || order.tracking_number) && (
                      <div className="w-full mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/60">
                        <span className="flex items-center gap-1.5 text-primary">
                          <Truck size={13} /> {order.courier_name || 'Courier'}: {order.tracking_number || 'Tracking Active'}
                        </span>
                        {order.estimated_delivery && (
                          <span>Est: {order.estimated_delivery}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Partner Tools Banner */}
          <div className="p-6 rounded-3xl bg-zinc-950 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase text-white">Authorized Partner Commercial Document</h4>
                <p className="text-xs text-white/50">Agreement Reference: {agentProfile.agreement_reference || 'Active'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveSection('assets')}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-primary" /> Marketing Assets
              </button>
              <button
                onClick={() => wholesaleProgramService.downloadAgentAgreementPdf(agentProfile)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>
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

      {/* SECTION: WHOLESALE PRICE LIST */}
      {activeSection === 'pricelist' && (
        <AgentWholesalePriceList agentProfile={agentProfile} settings={wholesaleSettings} />
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
            {orders.map(order => {
              const quote = shippingQuotes[order.id];

              return (
                <div
                  key={order.id}
                  className="p-6 rounded-3xl bg-zinc-950 border border-white/10 space-y-5"
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
                          Merchandise Payment: {order.payment_status}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        Date: {new Date(order.created_at).toLocaleString()} · Destination: {order.destination_city}, {order.destination_country}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">Merchandise Subtotal</span>
                        <p className="text-xl font-black text-white">
                          {Number(order.total_amount).toLocaleString()} {order.currency}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadMerchandiseInvoice(order)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10 transition-colors"
                      >
                        <FileText size={12} /> Merchandise Invoice
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-white/50 block">Merchandise Items in Order:</span>
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

                  {/* Merchandise Subtotal Notice */}
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-white/60 flex items-center justify-between">
                    <span>
                      ℹ <strong>Merchandise Invoice Policy:</strong> Shipping is not included and will be arranged and charged separately.
                    </span>
                    <span className="font-mono text-primary font-bold">EX-WORKS</span>
                  </div>

                  {/* SEPARATE SHIPPING QUOTATION & LOGISTICS CARD */}
                  <div className="rounded-2xl border border-white/15 bg-zinc-900/80 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Truck size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                            Separate Shipping Quotation & Logistics
                            {quote && (
                              <span className="text-[10px] font-mono text-white/50 font-normal">
                                #{quote.id}
                              </span>
                            )}
                          </h4>
                          <span className="text-[11px] text-white/50">
                            Independent quotation & payment obligation. Requires approval before dispatch.
                          </span>
                        </div>
                      </div>

                      {/* Status / Request CTA */}
                      {!quote ? (
                        <button
                          onClick={() => openShippingRequestModal(order)}
                          className="px-4 py-2 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 transition-transform flex items-center gap-1.5 shadow-md"
                        >
                          <Plus size={14} /> Request Shipping Quote
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                            quote.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            quote.status === 'sent' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            quote.status === 'dispatched' || quote.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                            quote.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {quote.status === 'pending' ? 'Pending Logistics Verification' :
                             quote.status === 'sent' ? 'Quotation Ready for Approval' :
                             quote.status === 'accepted' ? 'Quotation Approved' :
                             quote.status === 'rejected' ? 'Revision Requested' :
                             quote.status === 'dispatched' ? 'Dispatched / In Transit' :
                             quote.status === 'delivered' ? 'Delivered' : quote.status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* When no quote has been requested yet */}
                    {!quote && (
                      <div className="p-4 rounded-xl bg-black/30 border border-dashed border-white/10 text-xs text-white/60 space-y-2">
                        <p>
                          No separate shipping quotation requested for this order yet. You can request shipping from either <strong>Tanzania</strong> (local inventory) or direct from <strong>China</strong> (factory fulfillment) based on stock availability.
                        </p>
                        <p className="text-[11px] text-white/40">
                          African Boy forwarders will verify real courier rates. No unverified estimates will be added to your invoice.
                        </p>
                      </div>
                    )}

                    {/* When a quotation exists */}
                    {quote && (
                      <div className="space-y-4">
                        {/* Origin and Destination Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-white/50 block">Shipping Origin</span>
                            <span className={`font-bold inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] ${
                              quote.shipping_origin === 'China'
                                ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            }`}>
                              {quote.shipping_origin === 'China' ? '🇨🇳 Ship from China' : '🇹🇿 Ship from Tanzania'}
                            </span>
                          </div>

                          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-white/50 block">Destination</span>
                            <span className="font-bold text-white block truncate">
                              {quote.destination_city}, {quote.destination_country}
                            </span>
                            {quote.destination_postcode && (
                              <span className="text-[10px] text-white/40 block">Postal: {quote.destination_postcode}</span>
                            )}
                          </div>

                          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-white/50 block">Courier / Transit</span>
                            <span className="font-bold text-white block truncate">
                              {quote.courier_name || 'Pending forwarder verification'}
                            </span>
                            {quote.estimated_delivery_time && (
                              <span className="text-[10px] text-white/40 block">Est: {quote.estimated_delivery_time}</span>
                            )}
                          </div>

                          <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-white/50 block">Quote Validity</span>
                            <span className="font-mono text-white block text-[11px]">
                              {quote.quote_date ? `${quote.quote_date} → ${quote.expiry_date || 'N/A'}` : 'Pending rate issuance'}
                            </span>
                            {quote.revision_number > 1 && (
                              <span className="text-[10px] text-amber-400 font-bold block">Revision #{quote.revision_number}</span>
                            )}
                          </div>
                        </div>

                        {quote.delivery_address && (
                          <p className="text-[11px] text-white/50">
                            <strong>Delivery Address:</strong> {quote.delivery_address}
                            {quote.special_requirements && (
                              <span> · <strong>Instructions:</strong> {quote.special_requirements}</span>
                            )}
                          </p>
                        )}

                        {/* Verified Pricing Breakdown (Shown when quote has been verified by logistics staff) */}
                        {quote.is_verified && quote.shipping_amount != null && (
                          <div className="p-4 bg-zinc-950 rounded-xl border border-white/10 space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                              <span className="text-[11px] uppercase font-bold text-white/70">
                                Verified Freight & Handling Charges
                              </span>
                              <span className="text-[10px] text-green-400 font-mono">
                                Official forwarder quotation verified
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="text-white/50 text-[10px] block">Courier Freight Rate:</span>
                                <span className="font-mono font-bold text-white text-sm">
                                  {quote.shipping_amount.toLocaleString()} {quote.currency}
                                </span>
                              </div>
                              <div>
                                <span className="text-white/50 text-[10px] block">Customs & Handling:</span>
                                <span className="font-mono font-bold text-white text-sm">
                                  {quote.customs_and_handling_fee > 0
                                    ? `${quote.customs_and_handling_fee.toLocaleString()} ${quote.currency}`
                                    : 'None recorded'}
                                </span>
                              </div>
                              <div className="sm:text-right">
                                <span className="text-primary text-[10px] uppercase font-bold block">Total Shipping Due:</span>
                                <span className="font-mono font-black text-primary text-base">
                                  {((quote.shipping_amount || 0) + (quote.customs_and_handling_fee || 0)).toLocaleString()} {quote.currency}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ACTION 1: Agent Approval Required (status === 'sent') */}
                        {quote.status === 'sent' && (
                          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <p className="font-bold text-blue-300">Quotation Ready for Approval</p>
                              <p className="text-[11px] text-blue-200/70">
                                Please review and approve the verified shipping cost. Dispatch will not occur without your approval.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setQuoteToReject(quote);
                                  setShowRejectModal(true);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs uppercase"
                              >
                                Decline / Request Revision
                              </button>
                              <button
                                onClick={() => handleApproveQuote(quote.id)}
                                className="px-4 py-2 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 transition-transform shadow-md"
                              >
                                Accept & Approve Quote
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Rejected notice */}
                        {quote.status === 'rejected' && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                            <p className="font-bold">Revision Requested by You</p>
                            <p className="text-[11px] text-red-200/70">
                              Reason: {quote.agent_rejection_reason || 'Quotation declined'}. Headquarters logistics staff has been notified to obtain alternative quotations.
                            </p>
                          </div>
                        )}

                        {/* ACTION 2: Separate Shipping Payment (status === 'accepted') */}
                        {quote.status === 'accepted' && (
                          <div className="p-4 bg-zinc-950 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">Shipping Payment Obligation:</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  quote.shipping_payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {quote.shipping_payment_status}
                                </span>
                              </div>
                              <p className="text-[11px] text-white/50">
                                {quote.shipping_payment_status === 'paid'
                                  ? `Payment recorded with ref: ${quote.shipping_payment_reference} on ${quote.shipping_payment_date ? new Date(quote.shipping_payment_date).toLocaleDateString() : 'recent'}.`
                                  : 'Recorded separately from product purchase. Payment must be approved before goods dispatch.'}
                              </p>
                            </div>

                            {quote.shipping_payment_status !== 'paid' && (
                              <button
                                onClick={() => {
                                  setQuoteToPay(quote);
                                  setShowShippingPaymentModal(true);
                                }}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                              >
                                Record Shipping Payment
                              </button>
                            )}
                          </div>
                        )}

                        {/* ACTION 3: Tracking & Delivery (status === 'dispatched' || status === 'delivered') */}
                        {(quote.status === 'dispatched' || quote.status === 'delivered') && (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                <Truck size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-white">{quote.courier_name}</span>
                                  {quote.tracking_number && (
                                    <span className="font-mono bg-black/60 px-2 py-0.5 rounded text-primary font-bold text-[11px]">
                                      {quote.tracking_number}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-white/60 block mt-0.5">
                                  Dispatched: {quote.dispatched_at ? new Date(quote.dispatched_at).toLocaleDateString() : 'Recent'} · Est Delivery: {quote.estimated_delivery_date || 'In transit'}
                                </span>
                              </div>
                            </div>

                            {quote.tracking_url && (
                              <a
                                href={quote.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary hover:bg-primary hover:text-black font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                              >
                                <ExternalLink size={13} /> Track Courier
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION: MARKETING ASSETS */}
      {activeSection === 'assets' && (
        <AgentMarketingAssets agentProfile={agentProfile} settings={wholesaleSettings} />
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

            {/* Official Agreement & Commercial Offer Document Block */}
            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black uppercase text-white">Commercial Proposal & Partner Agreement</h4>
                    <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    Ref: {agentProfile.agreement_reference || `AGR-${agentProfile.agent_code}-2026`} · Signed Bilateral Commercial Terms
                  </p>
                </div>
              </div>

              <button
                onClick={() => wholesaleProgramService.downloadAgentAgreementPdf(agentProfile)}
                className="w-full sm:w-auto px-5 py-3 bg-primary text-black font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
              >
                <Download size={15} /> Download Agreement (PDF)
              </button>
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
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white/70">Selected Merchandise Units ({cartTotalQty}):</p>
                {cartTotalQty < agentProfile.minimum_order_quantity ? (
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Below MOQ ({cartTotalQty}/{agentProfile.minimum_order_quantity})
                  </span>
                ) : (
                  <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/30">
                    ✓ MOQ Met ({cartTotalQty} units)
                  </span>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {cartQuotation.proposalItems.map((pItem, i) => {
                  const origItem = replenishmentCart.find(r => r.product.id === pItem.productId);
                  return (
                    <div key={i} className="p-3.5 bg-zinc-900 rounded-2xl border border-white/5 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white truncate">{pItem.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-white/50">
                            <span>Size: {origItem?.selectedSize || 'Standard'}</span>
                            <span>·</span>
                            <span>Color: {origItem?.selectedColor || 'Standard'}</span>
                            {pItem.sku && (
                              <>
                                <span>·</span>
                                <span className="font-mono">SKU: {pItem.sku}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateCartQty(i, -1)}
                            className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <span className="font-bold w-6 text-center text-sm">{pItem.quantity}</span>
                          <button
                            onClick={() => updateCartQty(i, 1)}
                            className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                          {pItem.appliedTierLabel} · {pItem.unitPrice.toLocaleString()} {agentProfile.currency} / unit
                        </span>
                        <span className="font-mono font-black text-white text-xs">
                          Line Total: {pItem.lineTotal.toLocaleString()} {agentProfile.currency}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Delivery Address / Destination Hub *</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  placeholder="e.g. Kariakoo Storefront or Bonded Warehouse Destination..."
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Special Instructions / Dispatch Notes</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="e.g. Export packing list and commercial invoice required..."
                  className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                />
              </div>

            </div>

            {/* Commercial Subtotal & Shipping Disclaimer */}
            <div className="p-4 bg-zinc-900 rounded-2xl space-y-2 text-xs border border-white/5">
              <div className="flex justify-between text-white/70">
                <span>Merchandise Subtotal ({cartTotalQty} units):</span>
                <span className="font-mono font-bold text-white">
                  {cartSubtotal.toLocaleString()} {agentProfile.currency}
                </span>
              </div>

              <div className="flex justify-between items-center text-white/70">
                <span>Shipping & Freight:</span>
                <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                  Excluded (Charged Separately)
                </span>
              </div>

              {/* Explicit separate shipping requirement notice */}
              <div className="p-3 rounded-xl bg-black/60 border border-primary/20 text-[11px] text-white/80 leading-relaxed space-y-1">
                <p className="font-bold text-primary flex items-center gap-1.5">
                  <AlertCircle size={13} /> Product Sales Policy
                </p>
                <p className="text-white/60">
                  Shipping is not included and will be arranged and charged separately. After order confirmation, you will select your shipping origin (<strong>Tanzania</strong> or <strong>China</strong>) and receive a verified logistics quotation.
                </p>
              </div>

              <div className="flex justify-between text-base font-black text-primary pt-2 border-t border-white/10">
                <span>Merchandise Total:</span>
                <span className="font-mono">
                  {cartSubtotal.toLocaleString()} {agentProfile.currency}
                </span>
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

      {/* Modal 1: Separate Shipping Request Modal */}
      {showShippingRequestModal && selectedOrderForQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 space-y-5 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Truck size={18} className="text-primary" /> Request Shipping Quotation
                </h3>
                <p className="text-xs text-white/60">
                  Order #{selectedOrderForQuote.order_number} · ({selectedOrderForQuote.items.reduce((s, i) => s + i.quantity, 0)} units)
                </p>
              </div>
              <button
                onClick={() => setShowShippingRequestModal(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Shipping Origin Selection: Tanzania vs China */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase font-bold text-white/60 block">
                Select Shipping Origin (Fulfilment Location):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option: Ship from Tanzania */}
                <button
                  type="button"
                  disabled={!availableOriginsForOrder.includes('Tanzania')}
                  onClick={() => setQuoteOrigin('Tanzania')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    quoteOrigin === 'Tanzania'
                      ? 'bg-primary/10 border-primary shadow-lg ring-1 ring-primary'
                      : 'bg-zinc-900 border-white/10 hover:border-white/20'
                  } ${!availableOriginsForOrder.includes('Tanzania') ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white">🇹🇿 Ship from Tanzania</span>
                    {quoteOrigin === 'Tanzania' && <Check size={16} className="text-primary" />}
                  </div>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    Use stock currently available in Tanzania (Dar es Salaam warehouse).
                  </p>
                  {!availableOriginsForOrder.includes('Tanzania') && (
                    <span className="text-[10px] text-amber-400 block mt-1">
                      ⚠️ Unavailable for some items in this order
                    </span>
                  )}
                </button>

                {/* Option: Ship from China */}
                <button
                  type="button"
                  disabled={!availableOriginsForOrder.includes('China')}
                  onClick={() => setQuoteOrigin('China')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    quoteOrigin === 'China'
                      ? 'bg-primary/10 border-primary shadow-lg ring-1 ring-primary'
                      : 'bg-zinc-900 border-white/10 hover:border-white/20'
                  } ${!availableOriginsForOrder.includes('China') ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-white">🇨🇳 Ship from China</span>
                    {quoteOrigin === 'China' && <Check size={16} className="text-primary" />}
                  </div>
                  <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                    Direct shipment arranged from Chinese manufacturing hub.
                  </p>
                  {!availableOriginsForOrder.includes('China') && (
                    <span className="text-[10px] text-amber-400 block mt-1">
                      ⚠️ Factory stock not eligible for all items
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Destination inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-white/50">Destination Country *</label>
                  <input
                    type="text"
                    value={quoteDestCountry}
                    onChange={e => setQuoteDestCountry(e.target.value)}
                    placeholder="e.g. Kenya, South Africa, UAE..."
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-white/50">Destination City *</label>
                  <input
                    type="text"
                    value={quoteDestCity}
                    onChange={e => setQuoteDestCity(e.target.value)}
                    placeholder="e.g. Nairobi, Johannesburg, Dubai..."
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Postcode / Postal Code (Optional)</label>
                <input
                  type="text"
                  value={quoteDestPostcode}
                  onChange={e => setQuoteDestPostcode(e.target.value)}
                  placeholder="e.g. 00100"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Delivery Address *</label>
                <input
                  type="text"
                  value={quoteDeliveryAddress}
                  onChange={e => setQuoteDeliveryAddress(e.target.value)}
                  placeholder="Full street address or airport/bonded cargo warehouse..."
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-white/50">Special Delivery Requirements</label>
                <input
                  type="text"
                  value={quoteSpecialRequirements}
                  onChange={e => setQuoteSpecialRequirements(e.target.value)}
                  placeholder="e.g. Air express needed, forklift on site, specific customs broker..."
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-white/50 leading-relaxed">
              ℹ Our forwarding desk will negotiate verified quotes with partner couriers (DHL, FedEx, Air Freight) and issue a binding quotation for your review.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowShippingRequestModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestShippingQuote}
                disabled={isSubmittingQuoteRequest}
                className="flex-1 py-3 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
              >
                {isSubmittingQuoteRequest ? 'Submitting...' : 'Submit Shipping Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Decline / Request Revision Modal */}
      {showRejectModal && quoteToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 space-y-4 text-white">
            <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400" /> Decline Shipping Quotation
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Please describe why this quotation is being declined so logistics staff can seek alternative routes, freight forwarders, or transport modes.
            </p>
            <textarea
              rows={3}
              value={rejectionReasonText}
              onChange={e => setRejectionReasonText(e.target.value)}
              placeholder="e.g. Rate is too high; please provide sea freight quote or alternative courier..."
              className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setQuoteToReject(null);
                  setRejectionReasonText('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectQuote}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-wider rounded-xl"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Record Shipping Payment Reference Modal */}
      {showShippingPaymentModal && quoteToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 space-y-4 text-white">
            <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
              <DollarSign size={18} className="text-emerald-400" /> Record Shipping Payment
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Shipping payment is separate from merchandise purchases. Enter your bank transfer reference, wire code, or receipt number for the shipping fee of{' '}
              <strong className="text-white">
                {((quoteToPay.shipping_amount || 0) + (quoteToPay.customs_and_handling_fee || 0)).toLocaleString()} {quoteToPay.currency}
              </strong>.
            </p>
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-white/50">Payment Reference / Transaction ID *</label>
              <input
                type="text"
                value={shippingPaymentRefInput}
                onChange={e => setShippingPaymentRefInput(e.target.value)}
                placeholder="e.g. TXN-SHIP-992812 or Bank Ref 4029"
                className="w-full px-4 py-3 bg-zinc-900 border border-white/15 rounded-xl text-xs text-white outline-none focus:border-primary font-mono"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowShippingPaymentModal(false);
                  setQuoteToPay(null);
                  setShippingPaymentRefInput('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordShippingPayment}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl"
              >
                Record Payment
              </button>
            </div>
          </div>
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
