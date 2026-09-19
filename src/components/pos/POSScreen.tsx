import { useState, useEffect } from 'react';
import { Product, CartItem, Store, StoreStaff, Order } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { castProducts, executePosSale } from '@/lib/supabase-helpers';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface POSScreenProps {
  staffAssignment: StoreStaff & { store?: Store };
}

export default function POSScreen({ staffAssignment }: POSScreenProps) {
  const { formatPrice, user } = useCountry();
  const storeId = staffAssignment.store_id;

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
  const [holdingSale, setHoldingSale] = useState(false);

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

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter Catalog
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

  // Handle SKU Scanner or Search Scan
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

  // Add Product to Cart (Checking variants)
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
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Recalculate discount amount dynamically if subtotal changes
  const discountAmount =
    discount.type === 'percent'
      ? Math.round((subtotal * discount.value) / 100)
      : discount.type === 'fixed'
      ? Math.min(subtotal, discount.value)
      : 0;

  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Complete POS Sale (Invokes process_pos_sale RPC)
  const handleCompleteSale = async (payments: PaymentLine[]) => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (!user) return toast.error('Staff session invalid. Please log in again.');

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

      // Refresh product stock
      fetchProducts();
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
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-100px)]">
      {/* LEFT / MAIN CATALOG AREA */}
      <div className="flex-1 space-y-6 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card p-4 rounded-[28px] border border-foreground/5 shadow-md">
          <BarcodeScannerInput onScan={handleBarcodeScan} />

          <button
            onClick={fetchProducts}
            disabled={loadingProducts}
            className="p-3 bg-background border border-foreground/10 hover:border-primary rounded-2xl text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
            title="Refresh Product Catalog"
          >
            <RefreshCw size={18} className={loadingProducts ? 'animate-spin text-primary' : ''} />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['All', ...PRODUCT_CATEGORIES].map((cat) => {
            const isSelected = categoryFilter === cat;
            const count =
              cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2 ${
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

        {/* Product Catalog Grid */}
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          {loadingProducts ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock_quantity <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddProductToCart(product)}
                    disabled={isOutOfStock}
                    className={`group bg-card border rounded-[24px] p-3 text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                      isOutOfStock
                        ? 'opacity-60 border-destructive/20 cursor-not-allowed bg-destructive/5'
                        : 'border-foreground/5 hover:border-primary/50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {/* Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      {isOutOfStock ? (
                        <span className="px-2.5 py-1 bg-destructive text-destructive-foreground text-[9px] font-black uppercase tracking-widest rounded-full shadow">
                          OUT OF STOCK
                        </span>
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow ${
                            product.stock_quantity <= 3
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-card/80 backdrop-blur-md text-foreground border border-foreground/10'
                          }`}
                        >
                          Stock: {product.stock_quantity}
                        </span>
                      )}
                    </div>

                    {/* Image */}
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-secondary mb-3 relative">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Meta */}
                    <div className="space-y-1">
                      <h4 className="font-black text-xs italic uppercase truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </h4>
                      {product.sku && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          SKU: {product.sku}
                        </p>
                      )}
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-primary font-black text-sm">
                          {formatPrice(product.price)}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
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
              <ShoppingBag size={40} className="opacity-40" />
              <p className="text-sm font-bold uppercase tracking-widest">No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT / CART & CHECKOUT PANEL */}
      <div className="w-full lg:w-[420px] bg-card border border-foreground/10 rounded-[36px] p-6 flex flex-col justify-between shadow-2xl space-y-6 flex-shrink-0">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <StoreIcon size={20} />
            </div>
            <div>
              <h3 className="font-black text-base italic uppercase tracking-tight">
                {staffAssignment.store?.name || `STORE #${storeId}`}
              </h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Active POS Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsHeldSalesModalOpen(true)}
            className="p-2.5 bg-background border border-foreground/10 hover:border-amber-500 rounded-2xl text-amber-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
            title="View Held Sales"
          >
            <PauseCircle size={16} /> Held
          </button>
        </div>

        {/* Customer Selector Pill */}
        <button
          onClick={() => setIsCustomerModalOpen(true)}
          className="p-3 bg-background border border-foreground/10 hover:border-primary rounded-2xl flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck size={16} />
            </div>
            <div className="text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                Customer
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
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] min-h-[220px] pr-1 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-muted-foreground py-12">
              <ShoppingBag size={36} className="opacity-30" />
              <p className="text-xs font-bold uppercase tracking-widest">POS Cart is empty</p>
              <p className="text-[10px]">Scan a barcode or select products to start a sale</p>
            </div>
          ) : (
            cart.map((item) => {
              const key = `${item.id}-${item.selectedSize || ''}-${item.selectedColor || ''}`;
              return (
                <div
                  key={key}
                  className="bg-background rounded-2xl p-3.5 border border-foreground/5 flex gap-3 items-center"
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-14 h-14 object-cover rounded-xl bg-secondary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs truncate">{item.name}</h5>
                    {(item.selectedSize || item.selectedColor) && (
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        {[item.selectedColor, item.selectedSize].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-primary font-black text-xs mt-0.5">{formatPrice(item.price)}</p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(key, -1)}
                      className="w-7 h-7 rounded-lg bg-card border border-foreground/10 flex items-center justify-center hover:bg-foreground/5"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-black font-mono w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(key, 1)}
                      className="w-7 h-7 rounded-lg bg-card border border-foreground/10 flex items-center justify-center hover:bg-foreground/5"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeCartItem(key)}
                      className="p-1.5 text-muted-foreground hover:text-destructive ml-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Totals & Action Controls */}
        <div className="space-y-4 pt-4 border-t border-foreground/5">
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
                <span className="font-mono text-destructive">-{formatPrice(discountAmount)}</span>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-foreground/10 text-base font-black">
              <span className="uppercase tracking-wider">Total Due</span>
              <span className="text-2xl font-black text-primary font-mono italic">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>

          {/* Buttons Action Bar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleHoldSale}
              disabled={cart.length === 0 || holdingSale}
              className="py-3.5 bg-background border border-foreground/10 text-amber-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-500/10 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <PauseCircle size={16} /> {holdingSale ? 'Holding...' : 'Hold Sale'}
            </button>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="py-3.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={16} /> Checkout
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Variant Selector Modal */}
      <VariantSelectorModal
        product={variantProduct}
        isOpen={!!variantProduct}
        onClose={() => setVariantProduct(null)}
        onAddToCart={executeAddToCart}
      />

      {/* 2. Customer Modal */}
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
