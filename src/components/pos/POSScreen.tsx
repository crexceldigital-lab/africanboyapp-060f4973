import { useState, useEffect } from 'react';
import { Product, CartItem, Store, StoreStaff, Order } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { castProducts, executePosSale, fromAny } from '@/lib/supabase-helpers';
import { useCountry } from '@/context/CountryContext';
import { PRODUCT_CATEGORIES } from '@/constants';
import BarcodeScannerInput from './BarcodeScannerInput';
import VariantSelectorModal from './VariantSelectorModal';
import CustomerModal, { SelectedCustomerInfo } from './CustomerModal';
import DiscountModal from './DiscountModal';
import PaymentModal, { PaymentLine } from './PaymentModal';
import ReceiptModal from './ReceiptModal';
import HeldSalesModal from './HeldSalesModal';
import { trackPosSaleCompleted } from '@/lib/analytics';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  UserCheck,
  Percent,
  PauseCircle,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Store as StoreIcon,
  Tag,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Clock,
  Scan,
  User,
  X,
  ChevronRight,
  Zap,
  Command,
  Package,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface POSScreenProps {
  staffAssignment: StoreStaff & { store?: Store };
}

export default function POSScreen({ staffAssignment }: POSScreenProps) {
  const { formatPrice, user } = useCountry();
  const storeId = staffAssignment.store_id;

  // Live Clock & Date
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Selected Product for Variant Modal
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer State (Default Walk-in)
  const [customer, setCustomer] = useState<SelectedCustomerInfo>({
    name: 'Walk-in Customer',
    isWalkIn: true,
  });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Discount State
  const [discount, setDiscount] = useState<{
    type: 'percent' | 'fixed' | 'none';
    value: number;
    amount: number;
  }>({ type: 'none', value: 0, amount: 0 });
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [processingSale, setProcessingSale] = useState(false);

  // Receipt Modal State
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Held Sales Modal State
  const [isHeldSalesModalOpen, setIsHeldSalesModalOpen] = useState(false);
  const [heldSalesCount, setHeldSalesCount] = useState(0);
  const [holdingSale, setHoldingSale] = useState(false);

  // UI Control State (Fullscreen & Mobile Cart Drawer)
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Fetch product catalog
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (!error && data) {
        setProducts(castProducts(data));
      }
    } catch (err) {
      console.error('POS product fetch error:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch count of held sales for store badge
  const fetchHeldSalesCount = async () => {
    try {
      const { count } = await fromAny('held_sales')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);
      setHeldSalesCount(count || 0);
    } catch (err) {
      console.error('Fetch held sales count error:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchHeldSalesCount();
  }, [storeId]);

  // Keyboard Shortcuts (Cmd+K for search, F2 for customer, F4 for payment, F8 for hold)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K -> Focus Search Input
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        searchInput?.focus();
      }
      // Esc -> Clear search
      if (e.key === 'Escape') {
        setSearchQuery('');
      }
      // F2 -> Open Customer Selector
      if (e.key === 'F2') {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      }
      // F4 -> Checkout / Payment
      if (e.key === 'F4' && cart.length > 0) {
        e.preventDefault();
        setIsPaymentModalOpen(true);
      }
      // F8 -> Hold Sale
      if (e.key === 'F8' && cart.length > 0) {
        e.preventDefault();
        handleHoldSale();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Filter Catalog Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  // Handle Barcode Scan or SKU Lookup
  const handleBarcodeScan = (scannedText: string) => {
    const matched = products.find(
      (p) => p.sku && p.sku.toLowerCase() === scannedText.toLowerCase()
    );
    if (matched) {
      handleAddProductToCart(matched);
      toast.success(`Scanned: ${matched.name}`);
    } else {
      setSearchQuery(scannedText);
    }
  };

  // Add Product to Cart (Trigger variant modal if sizes exist)
  const handleAddProductToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      return toast.error(`"${product.name}" is OUT OF STOCK.`);
    }

    const hasVariants =
      (product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0);

    if (hasVariants) {
      setVariantProduct(product);
    } else {
      executeAddToCart(product);
    }
  };

  const executeAddToCart = (product: Product, size?: string, color?: string) => {
    const itemKey = `${product.id}-${size || ''}-${color || ''}`;
    const existingIndex = cart.findIndex(
      (i) => `${i.id}-${i.selectedSize || ''}-${i.selectedColor || ''}` === itemKey
    );

    if (existingIndex > -1) {
      const existingItem = cart[existingIndex];
      if (existingItem.quantity + 1 > product.stock_quantity) {
        return toast.error(`Only ${product.stock_quantity} units available in stock.`);
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: 1,
          selectedSize: size,
          selectedColor: color,
        },
      ]);
    }
  };

  const updateCartQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          const itemKey = `${item.id}-${item.selectedSize || ''}-${item.selectedColor || ''}`;
          if (itemKey === key) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock_quantity) {
              toast.error(`Only ${item.stock_quantity} units available.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (key: string) => {
    setCart((prev) =>
      prev.filter(
        (i) => `${i.id}-${i.selectedSize || ''}-${i.selectedColor || ''}` !== key
      )
    );
  };

  // Cart Calculations
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Dynamic discount calculation
  const discountAmount =
    discount.type === 'percent'
      ? Math.round((subtotal * discount.value) / 100)
      : discount.type === 'fixed'
      ? Math.min(subtotal, discount.value)
      : 0;

  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Complete POS Sale
  const handleCompleteSale = async (payments: PaymentLine[]) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!user) {
      toast.error('Staff session invalid. Please log in again.');
      return;
    }

    setProcessingSale(true);
    try {
      const payload = {
        storeId,
        staffUserId: user.id,
        customerId: customer.id || null,
        customerName: customer.name,
        customerPhone: customer.phone || null,
        customerEmail: customer.email || null,
        items: cart.map((i) => ({
          product_id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.selectedSize || undefined,
          color: i.selectedColor || undefined,
          sku: i.sku || undefined,
          image_url: i.image_url,
        })),
        subtotal,
        discountAmount,
        discountType: discount.type,
        discountValue: discount.value,
        approvedBy: discount.type !== 'none' ? user.id : null,
        totalAmount,
        payments: payments.map((p) => ({
          payment_method: p.payment_method,
          amount: p.amount,
          reference: p.reference || null,
        })),
        notes: null,
      };

      const result = await executePosSale(payload);

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to complete transaction.');
      }

      // Track analytics event
      const currency = staffAssignment.store?.currency_code || 'TZS';
      trackPosSaleCompleted(result.receipt_number, cart, totalAmount, currency, storeId, user.id);

      // Create local order snapshot for receipt modal
      const newOrderSnapshot: Order = {
        id: result.order_id,
        store_id: storeId,
        staff_user_id: user.id,
        sale_type: 'in_store',
        receipt_number: result.receipt_number,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        currency,
        status: 'completed',
        payment_method: payments[0]?.payment_method || 'cash',
        payment_reference: payments[0]?.reference || null,
        items: cart.map((i) => ({
          product_id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.selectedSize,
          color: i.selectedColor,
          sku: i.sku || undefined,
        })),
        payments: payments.map((p) => ({
          payment_method: p.payment_method,
          amount: p.amount,
          reference: p.reference,
        })),
        created_at: new Date().toISOString(),
      };

      setCompletedOrder(newOrderSnapshot);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);

      // Refresh product stock & held sales count
      fetchProducts();
      fetchHeldSalesCount();
    } catch (err: any) {
      console.error('Complete sale error:', err);
      const msg = err?.message || '';
      if (/stock changed/i.test(msg) || /insufficient/i.test(msg)) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg || 'Transaction failed. No sale was created.');
      }
    } finally {
      setProcessingSale(false);
    }
  };

  const resetPosCart = () => {
    setCart([]);
    setDiscount({ type: 'none', value: 0, amount: 0 });
    setCustomer({ name: 'Walk-in Customer', isWalkIn: true });
  };

  // Hold Sale Handler
  const handleHoldSale = async () => {
    if (cart.length === 0) return toast.error('Cannot hold empty cart');
    if (!user) return;

    setHoldingSale(true);
    try {
      const holdNumber = `AB-HOLD-${Math.floor(100 + Math.random() * 900)}`;
      const { error } = await (supabase as any).from('held_sales').insert({
        hold_number: holdNumber,
        store_id: storeId,
        staff_user_id: user.id,
        customer_data: customer,
        items: cart,
        subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
      });

      if (error) throw error;
      toast.success(`Sale saved as ${holdNumber}`);
      resetPosCart();
      fetchHeldSalesCount();
    } catch (err: any) {
      toast.error('Failed to hold sale');
    } finally {
      setHoldingSale(false);
    }
  };

  const handleResumeSale = (heldSale: any) => {
    setCart(heldSale.items || []);
    if (heldSale.customer_data) setCustomer(heldSale.customer_data);
    toast.success(`Resumed sale ${heldSale.hold_number}`);
    fetchHeldSalesCount();
  };

  // Format header time string
  const timeFormatted = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateFormatted = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* ========================================================================= */}
      {/* 1. COMPACT POS TERMINAL HEADER */}
      {/* ========================================================================= */}
      <div className="bg-card border border-foreground/10 rounded-[28px] p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Brand & Terminal Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-amber-600 text-primary-foreground flex items-center justify-center font-black italic shadow-lg shadow-primary/20 shrink-0">
            <Zap size={22} className="fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg italic tracking-tighter uppercase text-foreground">
                AFRICAN <span className="text-primary">BOY</span> POS
              </h1>
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">
                RETAIL TERMINAL
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-bold mt-0.5">
              <span className="flex items-center gap-1">
                <StoreIcon size={12} className="text-primary" />
                {staffAssignment.store?.name || `Store #${storeId}`}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User size={12} className="text-primary" />
                {user?.email ? user.email.split('@')[0] : 'Cashier'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Digital Clock & Shortcuts Badge */}
        <div className="hidden xl:flex items-center gap-6 px-6 py-2 bg-background/60 border border-foreground/5 rounded-2xl">
          <div className="flex items-center gap-2 font-mono">
            <Clock size={16} className="text-primary animate-pulse" />
            <span className="text-sm font-black text-foreground">{timeFormatted}</span>
            <span className="text-xs text-muted-foreground font-bold">{dateFormatted}</span>
          </div>
          <div className="h-4 w-px bg-foreground/10" />
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            <span className="px-1.5 py-0.5 bg-foreground/10 rounded font-bold">⌘K</span> Search
            <span className="px-1.5 py-0.5 bg-foreground/10 rounded font-bold ml-1">F2</span> Customer
            <span className="px-1.5 py-0.5 bg-foreground/10 rounded font-bold ml-1">F4</span> Checkout
          </div>
        </div>

        {/* Right: Quick POS Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Held Sales Button */}
          <button
            onClick={() => setIsHeldSalesModalOpen(true)}
            className="px-3.5 py-2.5 bg-background border border-foreground/10 hover:border-amber-500/50 rounded-2xl text-amber-400 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all relative shadow-sm"
            title="View Held Carts (F8)"
          >
            <PauseCircle size={16} />
            <span>Held Sales</span>
            {heldSalesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center font-mono">
                {heldSalesCount}
              </span>
            )}
          </button>

          {/* New Sale Button */}
          <button
            onClick={resetPosCart}
            className="px-3.5 py-2.5 bg-background border border-foreground/10 hover:border-primary rounded-2xl text-foreground hover:text-primary font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
            title="Clear Cart & Start New Sale"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Sale</span>
          </button>

          {/* Catalog Refresh */}
          <button
            onClick={fetchProducts}
            disabled={loadingProducts}
            className="p-2.5 bg-background border border-foreground/10 hover:border-primary rounded-2xl text-muted-foreground hover:text-foreground transition-all shrink-0"
            title="Refresh Product Catalog"
          >
            <RefreshCw size={16} className={loadingProducts ? 'animate-spin text-primary' : ''} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-background border border-foreground/10 hover:border-primary rounded-2xl text-muted-foreground hover:text-foreground transition-all shrink-0"
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TWO-PANEL WORKSPACE (LEFT CATALOG 65% / RIGHT CART 35%) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-180px)]">
        {/* ======================================================================= */}
        {/* LEFT PANEL: PRODUCT CATALOG (COL 1 to 7/8) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4 flex flex-col min-w-0">
          {/* Product Search & Barcode Scan Bar */}
          <div className="bg-card border border-foreground/10 rounded-[24px] p-3 shadow-md flex items-center gap-3">
            <BarcodeScannerInput
              onScan={handleBarcodeScan}
              placeholder="Search products by name, SKU or scan barcode... (⌘K)"
            />
          </div>

          {/* Horizontal Category Selector Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
            {['All', ...PRODUCT_CATEGORIES].map((cat) => {
              const isSelected = categoryFilter === cat;
              const count =
                cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                      : 'bg-card text-muted-foreground border-foreground/5 hover:text-foreground hover:bg-foreground/5'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                      isSelected
                        ? 'bg-black/20 text-primary-foreground'
                        : 'bg-foreground/10 text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto min-h-[460px] pr-1">
            {loadingProducts ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock_quantity <= 0;
                  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
                  const hasVariants = (product.sizes && product.sizes.length > 0) || (product.colors && product.colors.length > 0);

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddProductToCart(product)}
                      disabled={isOutOfStock}
                      className={`group bg-card border rounded-[24px] p-3 text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                        isOutOfStock
                          ? 'opacity-60 border-destructive/20 cursor-not-allowed bg-destructive/5'
                          : 'border-foreground/10 hover:border-primary/60 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {/* Top Right Availability Badge */}
                      <div className="absolute top-4 right-4 z-10">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 bg-destructive text-destructive-foreground text-[9px] font-black uppercase tracking-widest rounded-full shadow-md">
                            OUT OF STOCK
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest rounded-full shadow-md backdrop-blur-md">
                            LOW — {product.stock_quantity} LEFT
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-card/90 backdrop-blur-md text-foreground border border-foreground/10 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm font-mono">
                            {product.stock_quantity} IN STOCK
                          </span>
                        )}
                      </div>

                      {/* Product Image */}
                      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-secondary mb-3 relative">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {hasVariants && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-primary rounded-md flex items-center gap-1">
                            <Sparkles size={10} /> Sizes
                          </div>
                        )}
                      </div>

                      {/* Product Metadata */}
                      <div className="space-y-1">
                        <h4 className="font-black text-xs italic uppercase truncate group-hover:text-primary transition-colors">
                          {product.name}
                        </h4>
                        {product.sku && (
                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                            SKU: {product.sku}
                          </p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-foreground/5 mt-2">
                          <span className="text-primary font-black text-sm font-mono">
                            {formatPrice(product.price)}
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                            <Plus size={16} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground bg-card rounded-[32px] border border-foreground/5 p-8">
                <ShoppingBag size={40} className="opacity-40 text-primary" />
                <p className="text-sm font-bold uppercase tracking-widest">No matching products found</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                  }}
                  className="px-4 py-2 bg-primary/10 text-primary font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/20 transition-all"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: CURRENT SALE / CART (COL 8 to 12) */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 bg-card border border-foreground/10 rounded-[36px] p-6 flex flex-col justify-between shadow-2xl space-y-5 flex-shrink-0">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h3 className="font-black text-base italic uppercase tracking-tight">
                  CURRENT SALE
                </h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  {totalCartItemsCount} item{totalCartItemsCount === 1 ? '' : 's'} in transaction
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={resetPosCart}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                title="Clear Cart"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Compact Customer Selector */}
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="p-3 bg-background border border-foreground/10 hover:border-primary rounded-2xl flex items-center justify-between transition-all group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck size={16} />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                  Customer (F2)
                </span>
                <span className="text-xs font-black uppercase truncate block group-hover:text-primary transition-colors">
                  {customer.name}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary underline">
              Change
            </span>
          </button>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[380px] min-h-[220px] pr-1 no-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground py-12">
                <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center text-muted-foreground/40">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest">POS Cart is Empty</p>
                  <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    Click products or scan barcode to add items to current sale
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const key = `${item.id}-${item.selectedSize || ''}-${item.selectedColor || ''}`;
                const itemLineTotal = item.price * item.quantity;
                return (
                  <div
                    key={key}
                    className="bg-background rounded-2xl p-3 border border-foreground/5 flex gap-3 items-center hover:border-foreground/10 transition-all shadow-sm"
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-14 h-14 object-cover rounded-xl bg-secondary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h5 className="font-bold text-xs truncate">{item.name}</h5>
                      {(item.selectedSize || item.selectedColor) && (
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                          {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-black text-xs font-mono">{formatPrice(item.price)}</span>
                        <span className="text-[10px] text-muted-foreground font-mono font-bold">× {item.quantity}</span>
                      </div>
                    </div>

                    {/* Quantity Tap Controls */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono font-black text-xs text-foreground">
                        {formatPrice(itemLineTotal)}
                      </span>
                      <div className="flex items-center gap-1.5 bg-card border border-foreground/10 rounded-xl p-1">
                        <button
                          onClick={() => updateCartQuantity(key, -1)}
                          className="w-6 h-6 rounded-lg bg-background hover:bg-foreground/10 flex items-center justify-center transition-all text-muted-foreground hover:text-foreground"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-black font-mono w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(key, 1)}
                          className="w-6 h-6 rounded-lg bg-background hover:bg-foreground/10 flex items-center justify-center transition-all text-muted-foreground hover:text-foreground"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeCartItem(key)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sale Totals & Checkout Panel */}
          <div className="space-y-4 pt-4 border-t border-foreground/10">
            {/* Subtotal & Discount rows */}
            <div className="space-y-2 text-xs font-bold">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono text-foreground">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                >
                  <Percent size={12} />
                  {discount.type !== 'none' ? `Discount (${discount.value}${discount.type === 'percent' ? '%' : ''})` : 'Apply Discount'}
                </button>
                {discountAmount > 0 && (
                  <span className="font-mono text-destructive font-black">-{formatPrice(discountAmount)}</span>
                )}
              </div>

              {/* Total Due Prominent Display */}
              <div className="flex justify-between items-center pt-3 border-t border-foreground/10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                    TOTAL DUE
                  </span>
                  <span className="text-3xl font-black text-primary font-mono italic tracking-tight">
                    {formatPrice(totalAmount)}
                  </span>
                </div>

                <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-full font-mono">
                  {staffAssignment.store?.currency_code || 'TZS'}
                </span>
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleHoldSale}
                disabled={cart.length === 0 || holdingSale}
                className="py-3.5 bg-background border border-foreground/10 text-amber-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-500/10 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <PauseCircle size={16} /> {holdingSale ? 'Holding...' : 'Hold (F8)'}
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                disabled={cart.length === 0}
                className="py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} /> CHECKOUT (F4)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE & TABLET FLOATING BOTTOM CART BAR */}
      {/* ========================================================================= */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-[70]">
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full py-4 px-6 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-between border border-primary/40 animate-in slide-in-from-bottom-5 duration-200"
          >
            <div className="flex items-center gap-2 font-mono">
              <ShoppingBag size={18} />
              <span>CHECKOUT ({totalCartItemsCount})</span>
            </div>
            <span className="font-mono text-base italic">{formatPrice(totalAmount)}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS */}
      {/* ========================================================================= */}

      {/* 1. Variant Selector Modal */}
      <VariantSelectorModal
        product={variantProduct}
        isOpen={!!variantProduct}
        onClose={() => setVariantProduct(null)}
        onAddToCart={executeAddToCart}
      />

      {/* 2. Customer Selector Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={setCustomer}
        currentCustomer={customer}
      />

      {/* 3. Discount Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        subtotal={subtotal}
        currentDiscount={discount}
        onApplyDiscount={setDiscount}
        staffRole={staffAssignment.staff_role}
      />

      {/* 4. Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={totalAmount}
        onCompleteSale={handleCompleteSale}
        processing={processingSale}
      />

      {/* 5. Receipt Modal */}
      <ReceiptModal
        order={completedOrder}
        store={staffAssignment.store}
        staffUserEmail={user?.email}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewSale={resetPosCart}
      />

      {/* 6. Held Sales Modal */}
      <HeldSalesModal
        isOpen={isHeldSalesModalOpen}
        onClose={() => setIsHeldSalesModalOpen(false)}
        storeId={storeId}
        onResumeSale={handleResumeSale}
      />
    </div>
  );
}
